import { Logger } from '@nestjs/common';
import { SearchOrdersSkillService } from '../search-orders-skill.service';
import { get } from 'lodash';
import { getArray } from '../../../common/functions';
import { Constants } from '../../../common/constants';
import { Skill } from '../../../../decorators';
import { SearchOrdersSlotNames } from '../slot-names';

/**
 * This skill is an extension of the order search skill which limits the search results to a single order.
 */
@Skill({
  skillId: Constants.MOST_RECENT_ORDER_SKILL_ID,
  slots: [],
})
export class MostRecentOrderSkillService extends SearchOrdersSkillService {
  protected logger: Logger = new Logger('MostRecentOrderSkillService');

  protected async initializeSlotsInFlight(): Promise<void> {
    super.initializeSlotsInFlight();
    this.removeSlot(SearchOrdersSlotNames.NUMBER_OF_ORDERS_SLOT);
  }

  protected gatherSearchParameters(): Record<string, any> {
    return { ...super.gatherSearchParameters(), numberOfOrders: 1 };
  }

  protected async sendOrderListResponse(searchResponse: any, parameters: any): Promise<void> {
    const Order = getArray(get(searchResponse, 'Output.OrderList.Order'))[0];
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
    this.setCurrentOrderInContext(Order);
    this.markSkillComplete({ order: Order });
  }
}
