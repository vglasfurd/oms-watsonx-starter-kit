import { Logger } from '@nestjs/common';
import { AbstractSkillProviderService } from '../skills-api/abstract-skill-provider.service';
import { Slot, SlotType, EntityValue, Entity, SlotValue } from '../../conv-sdk/index';
import { Constants } from '../common/constants';
import { areAllParametersSet, getArray } from '../common/functions';
import { OmsCommonService } from '../core/oms-common.service';
import { Skill } from '../../decorators';
import { SlotNames } from './slot-names';
import { OnSlotChange } from '../../decorators';

@Skill({
  skillId: Constants.LOOKUP_ORDER_SKILL_ID,
  slots: [{ name: SlotNames.ORDER_NO_SLOT }, { name: SlotNames.ENTERPRISE_CODE_SLOT, type: SlotType.ENTITY }],
})
export class LookupOrderSkillService extends AbstractSkillProviderService {
  protected readonly logger: Logger = new Logger('LookupOrderSkillService');

  private readonly ORDER_NO_REGEX = new RegExp('(OM|Y|ORD|RET)(\\w+|((-|_)\\w+)+)', 'g');

  constructor(protected commonService: OmsCommonService) {
    super();
    this.additionalSkillInput = { additionalApiInput: {} };
  }

  protected async initializeSlotsInFlight() {
    await this.setEnterpriseListInSlot();
  }

  protected async postOnSlotStateChange() {
    const parameters = this.getNormalizedSlotValues([SlotNames.ORDER_NO_SLOT, SlotNames.ENTERPRISE_CODE_SLOT]);
    if (areAllParametersSet(parameters)) {
      try {
        const orderDetails = await this.commonService.getOrderDetails({
          ...parameters,
          ...this.additionalSkillInput.additionalApiInput,
        });
        this.constructOrderDetailsResponse(orderDetails);
        this.setSessionVariable(Constants.SESSION_VARIABLE_CURRENT_ORDER, orderDetails.Order);
        this.additionalSkillInput.stopAtLookup ?? this.markSkillComplete();
      } catch (err) {
        this.logger.error('Failed to retrieve order', err);
        this.addTextResponse(this.getStringLiteral('actionResponses.notFound', parameters));
        this.markSkillComplete();
      }
    }
  }

  protected getCurrentOrderFromContext() {
    return this.getFromSessionOrContext(Constants.SESSION_VARIABLE_CURRENT_ORDER).value;
  }

  private constructOrderDetailsResponse(orderDetails: any) {
    const responseLiterals = this.getStringLiteralArray('actionResponses.success', orderDetails);
    responseLiterals.forEach((rl, i) =>
      i === 1 ? this.commonService.sendOrderDetailsLinkResponse(this.getSkillResponse(), rl) : this.addTextResponse(rl),
    );
    this.commonService.gotoOrderDetailsTab(this.getSkillResponse());
  }

  private gatherEnterpriseCode(): void {
    const enterpriseCodeSlot: Slot = this.getSkillResponseSlot(SlotNames.ENTERPRISE_CODE_SLOT);
    const ctxEnterpriseCode = this.getFromSessionOrContext(Constants.SESSION_VARIABLE_ENTERPRISE_CODE);
    if (ctxEnterpriseCode.value) {
      enterpriseCodeSlot.value = new SlotValue(ctxEnterpriseCode.value, ctxEnterpriseCode.value);
    }
  }

  @OnSlotChange(SlotNames.ENTERPRISE_CODE_SLOT)
  private async onEnterpriseCodeChange(slot: Slot, slotInFlight: Slot) {
    const value = slot.value.normalized;
    // validate the enterprise
    const selectedEnterprise = (await this.getEnterpriseList()).find((e) => e.id === value);
    if (selectedEnterprise) {
      this.logger.log(`The enterprise code is ${selectedEnterprise.id}`);
      slotInFlight.value = new SlotValue(selectedEnterprise.label, selectedEnterprise.id);
    } else {
      this.logger.log(`The enterprise code ${value} is invalid`);
      slotInFlight.value = undefined;
      slotInFlight.setError = this.getErrorForSlot(SlotNames.ENTERPRISE_CODE_SLOT, 'invalid', { value });
    }
    this.setSessionVariable(Constants.SESSION_VARIABLE_CURRENT_ORDER, undefined);
  }

  @OnSlotChange(SlotNames.ORDER_NO_SLOT)
  private async onOrderNoChange(slot: Slot, slotInFlight: Slot) {
    const value = slot.value.normalized;
    const orderNumberMatches = (value || '').match(this.ORDER_NO_REGEX);
    if (orderNumberMatches === null || orderNumberMatches.length === 0) {
      this.logger.log(`The order number ${value} does not match the pattern`);
      slotInFlight.value = undefined;
      slotInFlight.setError = this.getErrorForSlot(SlotNames.ORDER_NO_SLOT, 'notInferred', { value });
    } else if (orderNumberMatches.length === 1) {
      this.logger.log(`The order number is ${orderNumberMatches[0]}`);
      slotInFlight.value = { literal: orderNumberMatches[0], normalized: orderNumberMatches[0] };
    } else if (orderNumberMatches.length > 1) {
      const slotValue = { literal: orderNumberMatches.join(','), normalized: orderNumberMatches };
      this.logger.log(`Found multiple order numbers in the prompt : ${slotValue.literal}`);
      slotInFlight.value = slotValue;
    }
    slotInFlight.value ? this.gatherEnterpriseCode() : '';
    this.setSessionVariable(Constants.SESSION_VARIABLE_CURRENT_ORDER, undefined);
  }

  private async setEnterpriseListInSlot() {
    const options = (await this.getEnterpriseList()).map(
      (e) => new EntityValue({ label: e.label, value: e.id, synonyms: [e.label, e.id], patterns: undefined }),
    );
    this.getSkillResponseSlot(SlotNames.ENTERPRISE_CODE_SLOT).schema = new Entity(
      SlotNames.ENTERPRISE_CODE_SLOT,
      options,
    );
  }

  private async getEnterpriseList() {
    let enterpriseList: any[] = this.getFromSessionOrContext(Constants.SESSION_VARIABLE_ENTERPRISE_LIST).value;
    if (!enterpriseList) {
      // fetch orgs for user
      const orgsListResponse = await this.commonService.getOrganizationList();
      if (orgsListResponse) {
        enterpriseList = getArray(orgsListResponse.Organization).map((o) => ({
          id: o.OrganizationCode,
          label: o.OrganizationName,
        }));
      }
      this.setSessionVariable(Constants.SESSION_VARIABLE_ENTERPRISE_LIST, enterpriseList);
    }
    return enterpriseList;
  }
}
