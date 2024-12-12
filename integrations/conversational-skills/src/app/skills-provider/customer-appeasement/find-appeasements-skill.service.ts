import { Logger } from '@nestjs/common';
import { get } from 'lodash';
import { Slot } from '../../../conv-sdk';
import { OnSlotChange, Skill } from '../../../decorators';
import { AbstractSkillProviderService } from '../../skills-api/abstract-skill-provider.service';
import { getArray, isPhoneNumber, isValidEmail } from '../../common/functions';
import { CustomerAppeasementApiService } from '../../oms';
import { CustomerAppeasementConstants } from './constants';

@Skill({
  skillId: 'find-appeasements-skill',
  slots: [{ name: CustomerAppeasementConstants.CUSTOMER_SELECTOR_SLOT }],
})
export class FindAppeasementsSkillService extends AbstractSkillProviderService {
  protected readonly logger: Logger = new Logger(FindAppeasementsSkillService.name);

  constructor(protected appeasementApiSvc: CustomerAppeasementApiService) {
    super();
  }

  @OnSlotChange(CustomerAppeasementConstants.CUSTOMER_SELECTOR_SLOT)
  protected async onCustomerSelectorSlotChange(slot: Slot, slotInFlight: Slot) {
    const Value = slot.value.normalized;
    this.logger.log(`The customer information provided is ${Value}`);
    let searchCriteria;
    if (isPhoneNumber(Value)) {
      searchCriteria = { Name: 'CustomerPhoneNo', QryType: 'FLIKE', Value };
    } else if (isValidEmail(Value)) {
      searchCriteria = { Name: 'CustomerEMailID', QryType: 'FLIKE', Value };
    } else {
      slotInFlight.setError = this.getErrorForSlot(CustomerAppeasementConstants.CUSTOMER_SELECTOR_SLOT, 'notInferred');
    }
    this.setLocalVariable(CustomerAppeasementConstants.CUSTOMER_SELECTOR_SLOT, searchCriteria);
  }

  protected async postOnSlotStateChange(): Promise<void> {
    const searchCriteria = this.getLocalVariable(CustomerAppeasementConstants.CUSTOMER_SELECTOR_SLOT);
    if (searchCriteria) {
      let skillResponseMetadata: any = {};
      try {
        const apiResponse = await this.appeasementApiSvc.getAppeasements(searchCriteria);
        const previousAppeasements = getArray(get(apiResponse, 'Output.OrderList.Order')).filter((o) =>
          getArray(get(o, 'Notes.Note')).some((n) => n.ReasonCode === 'YCD_CUSTOMER_APPEASE'),
        );
        this.setLocalVariable(CustomerAppeasementConstants.LOCAL_VARIABLE_PREVIOUS_APPEASEMENTS, previousAppeasements);
        skillResponseMetadata.previousAppeasementsCount = previousAppeasements.length;
        skillResponseMetadata.previousAppeasements = previousAppeasements;
        this.addTextResponse(
          this.getStringLiteral(
            previousAppeasements.length > 0
              ? 'actionResponses.nPreviousAppeasements'
              : 'actionResponses.noPreviousAppeasements',
            {
              prevAppeasements: previousAppeasements.length,
            },
          ),
        );
      } catch (err) {
        this.logger.error(`An error occurred when searching for previous appeasmenents ${err}`);
        const message = this.getStringLiteral('actionResponses.failed');
        this.addTextResponse(message);
        skillResponseMetadata = { failed: true, message };
        this.setLocalVariable(CustomerAppeasementConstants.LOCALE_VARIABLE_FIND_APPEASEMENTS_FAILED, true);
      } finally {
        this.markSkillComplete(skillResponseMetadata);
      }
    }
  }
}
