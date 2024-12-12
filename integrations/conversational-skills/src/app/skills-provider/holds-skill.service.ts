import { Logger } from '@nestjs/common';
import { Slot, EntityValue, Entity, SlotType, SlotValue } from '../../conv-sdk/index';
import { Constants } from '../common/constants';
import { areAllParametersSet, getArray, getModificationType, isModificationAllowed, isVoid } from '../common/functions';
import { OnSlotChange, Skill } from 'src/decorators';
import { ENTERPRISE_CODE_SLOT, LookupOrderSkillService, ORDER_NO_SLOT } from './lookup-order-skill.service';
import { HoldsApiService } from '../oms';

const APPLY_OR_CANCEL_SLOT = 'ApplyOrCancelHold';
const HOLD_TYPE_SLOT = 'HoldType';
const HOLD_REASON_SLOT = 'HoldReason';

/**
 * This skill cancels or applies a hold on the order.
 * The skill does not consider the order in context until it is told do so using `useCurrentOrderInContext` session variable.
 * The skill leverages the {@link LookupOrderSkillService} by extension to gather the order.
 */
@Skill({
  skillId: Constants.HOLDS_SKILL_ID,
  slots: [
    { name: APPLY_OR_CANCEL_SLOT, type: SlotType.ENTITY },
    { name: HOLD_REASON_SLOT, type: SlotType.STRING },
    { name: HOLD_TYPE_SLOT, type: SlotType.ENTITY, hidden: true },
  ],
})
export class HoldsSkillService extends LookupOrderSkillService {
  protected readonly logger: Logger = new Logger('HoldsSkillService');
  private readonly MODIFICATION_TYPE_HOLD = 'HOLD';

  private readonly additionalApiInput = {
    Modifications: {
      Modification: [{ ModificationType: this.MODIFICATION_TYPE_HOLD }],
    },
  };

  constructor(private holdsSvc: HoldsApiService) {
    super();
    this.additionalSkillInput = {
      additionalApiInput: this.additionalApiInput,
      stopAtLookup: false,
    };
  }

  protected async initializeSlotsInFlight() {
    await super.initializeSlotsInFlight();
    await this.setApplyOrCancelOptionsInSlot();
    const useCurrentOrderInContext = this.canUseCurrentOrderFromContext();
    if (!useCurrentOrderInContext) {
      this.deleteCurrentOrderFromContext();
    }
  }

  protected async postOnSlotStateChange(): Promise<void> {
    const isCurrentOrderProcessed = await this.processCurrentOrder();
    if (!isCurrentOrderProcessed) {
      await super.postOnSlotStateChange();
      await this.processCurrentOrder();
    }
  }

  private async processCurrentOrder() {
    const currentOrder = this.getCurrentOrderFromContext();
    if (currentOrder) {
      if (await this.isHoldAllowed(currentOrder)) {
        this.setLocalVariable(Constants.SESSION_VARIABLE_USE_CURRENT_ORDER_IN_CONTEXT, true);
        this.setSlotStringValue(ORDER_NO_SLOT, currentOrder.OrderNo);
        this.setSlotStringValue(ENTERPRISE_CODE_SLOT, currentOrder.EnterpriseCode);
        const parameters = this.getNormalizedSlotValues([
          ORDER_NO_SLOT,
          ENTERPRISE_CODE_SLOT,
          APPLY_OR_CANCEL_SLOT,
          HOLD_TYPE_SLOT,
          HOLD_REASON_SLOT,
        ]);
        if (areAllParametersSet(parameters)) {
          let skillResponseMetadata: any = {};
          try {
            parameters.order = currentOrder;
            if (parameters[APPLY_OR_CANCEL_SLOT] === 'apply') {
              await this.applyHold(parameters);
            } else {
              await this.cancelHold(parameters);
            }
            skillResponseMetadata.actionPerformed = true;
          } catch (error) {
            this.logger.error('Failed to process hold request', error);
            const message = this.getStringLiteral('actionResponses.error', parameters);
            this.addTextResponse(message);
            skillResponseMetadata = { actionPerformed: false, failed: true, message };
          } finally {
            this.commonService.gotoOrderDetailsTab(this.getSkillResponse(), currentOrder);
            this.setLocalVariable(Constants.SESSION_VARIABLE_USE_CURRENT_ORDER_IN_CONTEXT, true);
            this.deleteCurrentOrderFromContext();
            this.markSkillComplete(skillResponseMetadata);
          }
        } else if (!parameters[HOLD_TYPE_SLOT]) {
          this.getSkillResponseSlot(HOLD_TYPE_SLOT).show();
          await this.setHoldTypeInSlot();
        }
      } else {
        this.addTextResponse(this.getStringLiteral('actionResponses.holdNotAllowed'));
        this.markSkillComplete({ actionPerformed: false, modificationAllowed: isModificationAllowed });
        this.deleteCurrentOrderFromContext();
      }
      return true;
    }
    return false;
  }

  @OnSlotChange(APPLY_OR_CANCEL_SLOT)
  private async onApplyOrCancelChange(slot: Slot, slotInFlight: Slot) {
    const value = slot.value.normalized;
    if (value === 'apply' || value === 'cancel') {
      slotInFlight.value = new SlotValue(value, value);
    } else {
      slotInFlight.value = undefined;
      slotInFlight.setError = this.getErrorForSlot(APPLY_OR_CANCEL_SLOT, 'invalid', { value });
    }
  }

  private async setApplyOrCancelOptionsInSlot() {
    const options = [
      new EntityValue({ label: 'Apply', value: 'apply', synonyms: ['apply', 'add'], patterns: undefined }),
      new EntityValue({ label: 'Cancel', value: 'cancel', synonyms: ['cancel', 'remove'], patterns: undefined }),
    ];

    this.getSkillResponseSlot(APPLY_OR_CANCEL_SLOT).schema = new Entity(APPLY_OR_CANCEL_SLOT, options);
  }

  private async setHoldTypeInSlot() {
    const response = await this.holdsSvc.getHoldTypeList({
      order: this.getCurrentOrderFromContext(),
    });
    const result = getArray(response.HoldType);
    const options = result.map(
      (e) =>
        new EntityValue({
          label: e.HoldTypeDescription,
          value: e.HoldType,
          synonyms: [e.HoldType],
          patterns: undefined,
        }),
    );

    this.getSkillResponseSlot(HOLD_TYPE_SLOT).schema = new Entity(HOLD_TYPE_SLOT, options);
  }

  private async applyHold(parameters: any) {
    const holdResult = await this.holdsSvc.applyHold(parameters);
    this.addTextResponse(this.getStringLiteral('actionResponses.holdApplied', holdResult));
  }

  private async cancelHold(parameters: any) {
    const cancelResult = await this.holdsSvc.cancelHold(parameters);
    this.addTextResponse(this.getStringLiteral('actionResponses.holdCancelled', cancelResult));
  }

  private async isHoldAllowed(currentOrder: any) {
    let isHoldAllowed = this.getLocalVariable(`${this.MODIFICATION_TYPE_HOLD}-${currentOrder.OrderHeaderKey}`);
    if (isVoid(isHoldAllowed)) {
      isHoldAllowed =
        getModificationType(currentOrder, this.MODIFICATION_TYPE_HOLD).length === 0
          ? this.commonService.isModificationAllowed(this.MODIFICATION_TYPE_HOLD, currentOrder.OrderHeaderKey)
          : isModificationAllowed(currentOrder, this.MODIFICATION_TYPE_HOLD);
      this.setLocalVariable(`${this.MODIFICATION_TYPE_HOLD}-${currentOrder.OrderHeaderKey}`, isHoldAllowed);
    }
    return isHoldAllowed;
  }
}
