import { Logger } from '@nestjs/common';
import { AbstractSkillProviderService } from '../../skills-api/abstract-skill-provider.service';
import { Slot, SlotType } from 'src/conv-sdk';
import { Constants, PaginationParams } from '../../common/constants';
import { areAllParametersSet, getArray, isPhoneNumber, isValidEmail, isVoid } from '../../common/functions';
import { get } from 'lodash';
import { OmsCommonService } from '../../oms/oms-common.service';
import { OnSlotChange, Skill } from '../../../decorators';
import { SearchOrdersSlotNames } from './slot-names';
import { SearchOrdersApiService } from '../../oms/search-orders-api.service';

/**
 * This skill searches for orders based on the criteria specified.
 * The skill uses three slots:
 * - CustomerProfileCriteria - This slot expects an email address or the phone number.
 * - NumberOfOrders - The number of orders to retreive.
 * - IncludeDraftOrders - This is a confirmation slot asking the CSR if draft orders shoul be included.
 */
@Skill({
  skillId: Constants.SEARCH_ORDERS_SKILL_ID,
  slots: [
    { name: SearchOrdersSlotNames.CUSTOMER_SELECTOR_SLOT },
    { name: SearchOrdersSlotNames.NUMBER_OF_ORDERS_SLOT },
    { name: SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT, type: SlotType.CONFIRMATION },
  ],
})
export class SearchOrdersSkillService extends AbstractSkillProviderService {
  protected readonly logger: Logger = new Logger('SearchOrdersSkillService');

  constructor(
    protected commonService: OmsCommonService,
    protected searchOrdersSvc: SearchOrdersApiService,
  ) {
    super();
  }

  protected async postOnSlotStateChange(): Promise<void> {
    const parameters = this.gatherSearchParameters();
    if (!this.isSkillCompleteOrCancelled() && areAllParametersSet(parameters)) {
      const searchResponse = await this.searchForOrders(parameters);
      if (searchResponse) {
        await this.processSearchResultsResponse(searchResponse, parameters);
      }
    }
  }

  protected gatherSearchParameters(): Record<string, any> {
    return {
      searchCriteria: this.getLocalVariable(SearchOrdersSlotNames.CUSTOMER_SELECTOR_SLOT),
      numberOfOrders: this.getLocalVariable(SearchOrdersSlotNames.NUMBER_OF_ORDERS_SLOT),
      includeDrafts: this.getLocalVariable(SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT),
    };
  }

  protected async processSearchResultsResponse(searchResponse: any, parameters: any) {
    searchResponse.totalNumOfRecords = parseInt(get(searchResponse, 'Output.OrderList.TotalNumberOfRecords', '0'));
    if (searchResponse.totalNumOfRecords > 0) {
      await this.sendOrderListResponse(searchResponse, parameters);
      !this.isSkillCompleteOrCancelled() ? this.markSkillComplete({ searchResponse }) : '';
    } else {
      if (
        this.getSkillResponseSlot(SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT) &&
        this.includeDraftOrders() === 'N'
      ) {
        // ask if we want to include draft orders in the search
        this.addTextResponse(this.getStringLiteral('actionResponses.noResultsWithoutDrafts', parameters));
        this.askAgainToIncludeDraftOrders();
      } else {
        // we have already included draft orders
        this.addTextResponse(this.getStringLiteral('actionResponses.noResults', parameters));
        !this.isSkillCompleteOrCancelled() ? this.markSkillComplete({ searchResponse }) : '';
      }
    }
  }

  protected askAgainToIncludeDraftOrders() {
    const includeDraftsSlot: Slot = this.getSkillResponseSlot(SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT);
    includeDraftsSlot.value = undefined;
    includeDraftsSlot.setPrompt = this.getStringLiteral(`${SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT}.askAgain`);
  }

  protected async sendOrderListResponse(searchResponse: any, parameters: any) {
    const orders = getArray(get(searchResponse, 'Output.OrderList.Order'));
    this.addTextResponse(this.getStringLiteral('actionResponses.totalResults', { searchResponse, parameters }));
    this.addTextResponse(this.getStringLiteral('actionResponses.resultList', parameters));
    if (!isVoid(this.searchOrdersSvc.jwtHelperService.userId)) {
      this.sendResultsTableResponse(orders);
    } else {
      orders.forEach((o) => this.addTextResponse(this.getStringLiteral('actionResponses.order', o)));
    }
  }

  protected defaultSlotChangeHandler(_: Slot, inFlight: Slot): void {
    this.setLocalVariable(inFlight.name, inFlight.value.normalized);
  }

  protected async searchForOrders(parameters: Record<string, any>) {
    try {
      const { apiInput, pagination } = this.constructSearchInput(parameters);
      return await this.searchOrdersSvc.getOrderList(apiInput, this.getTemplateName(), pagination);
    } catch (err) {
      this.logger.error(`An error occurred when searching for orders ${err}`);
      const message = this.getStringLiteral('actionResponses.failed');
      this.addTextResponse(message);
      this.markSkillComplete({ failed: true, message });
    }
  }

  protected constructSearchInput(parameters: Record<string, any>): { apiInput: any; pagination: PaginationParams } {
    return {
      apiInput: {
        DocumentType: '0001',
        DraftOrderFlag: this.includeDraftOrders(),
        ComplexQuery: {
          And: {
            Exp: [parameters.searchCriteria],
          },
        },
      },
      pagination: {
        PageNumber: 1,
        PageSize: parameters.numberOfOrders,
        PaginationStrategy: 'GENERIC',
        Refresh: 'N',
      },
    };
  }

  protected getTemplateName() {
    return 'default';
  }

  private includeDraftOrders() {
    return this.getCurrentSlotValue(SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT) === 'yes' ? '' : 'N';
  }

  @OnSlotChange(SearchOrdersSlotNames.CUSTOMER_SELECTOR_SLOT)
  private onCustomerProfileCriteriaSlotChange(_: Slot, slotInFlight: Slot) {
    const Value = slotInFlight.value.normalized;
    this.logger.log(`The customer information provided is ${Value}`);

    let searchCriteria;
    if (isPhoneNumber(Value)) {
      searchCriteria = { Name: 'CustomerPhoneNo', QryType: 'EQ', Value };
    } else if (isValidEmail(Value)) {
      searchCriteria = { Name: 'CustomerEMailID', QryType: 'EQ', Value };
    } else {
      slotInFlight.setError = this.getErrorForSlot(SearchOrdersSlotNames.CUSTOMER_SELECTOR_SLOT, 'notInferred');
    }
    this.setLocalVariable(SearchOrdersSlotNames.CUSTOMER_SELECTOR_SLOT, searchCriteria);
  }

  @OnSlotChange(SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT)
  private onIncludeDraftOrderSlotChange(slot: Slot, slotInFlight: Slot) {
    const prev = this.getLocalVariable(SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT);
    if (prev === slotInFlight.value.normalized) {
      this.markSkillComplete({ searchComplete: true });
    }
    this.setLocalVariable(SearchOrdersSlotNames.INCLUDE_DRAFT_ORDERS_SLOT, slotInFlight.value.normalized);
  }

  private sendResultsTableResponse(orders: Array<any>) {
    this.setSessionVariable('orderSearchResults', orders);
    this.addResponseItem({
      user_defined: {
        id: 'order_list',
        type: 'results-table',
        convSkill: true,
        config: {
          columns: [
            {
              id: 'orderNo',
              name: 'Order No',
              route: 'order-details',
              params: {
                title: 'OrderNo',
                orderNo: 'OrderNo',
                enterprise: 'EnterpriseCode',
                orderHeaderKey: 'OrderHeaderKey',
              },
              formatter: 'link',
              dataBinding: 'OrderNo',
            },
            {
              id: 'orderDate',
              name: 'Order date',
              format: 'L',
              formatter: 'dateTime',
              dataBinding: 'OrderDate',
            },
            {
              id: 'status',
              name: 'Status',
              nowrap: false,
              dataBinding: 'Status',
            },
          ],
          listVariable: 'orderSearchResults',
        },
      },
      response_type: 'user_defined',
    });
  }
}
