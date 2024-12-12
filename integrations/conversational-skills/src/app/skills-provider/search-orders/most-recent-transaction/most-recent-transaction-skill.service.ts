import { Logger } from '@nestjs/common';
import { SearchOrdersSkillService } from '../search-orders-skill.service';
import { get } from 'lodash';
import { Constants } from '../../../common/constants';
import { Skill } from 'src/decorators';
import { SearchOrdersSlotNames } from '../slot-names';
import { getArray } from 'src/app/common/functions';

/**
 * This skill is an extension of the {@link SearchOrdersSkillService}
 */
@Skill({
  skillId: Constants.MOST_RECENT_TRANSACTION_SKILL_ID,
  slots: [],
})
export class MostRecentTransactionSkillService extends SearchOrdersSkillService {
  protected logger: Logger = new Logger('MostRecentTransactionSkillService');

  private readonly LOCAL_VAR_DOC_TYPES_LIST = 'documentTypeList';

  protected async initializeSlotsInFlight(): Promise<void> {
    super.initializeSlotsInFlight();
    if (!this.getLocalVariable(this.LOCAL_VAR_DOC_TYPES_LIST)) {
      this.setLocalVariable(this.LOCAL_VAR_DOC_TYPES_LIST, await this.commonService.getDocumentTypeList());
    }
    this.removeSlot([SearchOrdersSlotNames.NUMBER_OF_ORDERS_SLOT, SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT]);
  }

  protected getTemplateName(): string {
    return Constants.MOST_RECENT_TRANSACTION_SKILL_ID;
  }

  protected async sendOrderListResponse(searchResponse: any, parameters: any): Promise<void> {
    const Order = getArray(get(searchResponse, 'Output.OrderList.Order'))[0];
    await this.constructOrderDetailsResponse(Order, parameters);
    this.setCurrentOrderInContext(Order);
    this.markSkillComplete({ order: Order });
  }

  protected async constructOrderDetailsResponse(Order: any, parameters: any) {
    const documentType = getArray(this.getLocalVariable(this.LOCAL_VAR_DOC_TYPES_LIST)).find(
      (el) => el.DocumentType === Order.DocumentType,
    ).Description;
    Order.DocumentTypeDescription = documentType;
    const responseLiterals = this.getStringLiteralArray('actionResponses.searchResult', {
      Order,
      parameters,
    });
    responseLiterals.forEach((rl, i) =>
      i === 1
        ? this.commonService.sendOrderDetailsLinkResponse(this.getSkillResponse(), rl, Order)
        : this.addTextResponse(rl),
    );
    this.commonService.gotoOrderDetailsTab(this.getSkillResponse(), Order);
  }

  protected gatherSearchParameters(): Record<string, any> {
    return { ...super.gatherSearchParameters(), numberOfOrders: 1, includeDrafts: 'N' };
  }
}
