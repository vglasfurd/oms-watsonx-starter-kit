import { Injectable, Logger, Scope } from '@nestjs/common';
import { JwtHelperService } from '../core';
import { OmsApiClient } from './oms-api-client';
import { GetPageTemplatesService } from './getPage-templates.service';

@Injectable({ scope: Scope.REQUEST })
export class HoldsApiService {
  private readonly logger = new Logger(HoldsApiService.name);

  constructor(
    private readonly omsClient: OmsApiClient,
    private readonly templatesSvc: GetPageTemplatesService,
    private jwtHelperService: JwtHelperService,
  ) {}

  public async applyHold(parameters: any): Promise<any> {
    return this.omsClient.invokeApiAsync('invoke/changeOrder', this.jwtHelperService.jwt, {
      CallingOrganizationCode: parameters.order.EnterpriseCode,
      Action: 'MODIFY',
      OrderHeaderKey: parameters.order.OrderHeaderKey,
      OrderHoldTypes: {
        OrderHoldType: [
          {
            HoldLevel: 'ORDER',
            HoldType: parameters.HoldType,
            Status: '1100',
            ReasonText: parameters.HoldReason,
          },
        ],
      },
    });
  }

  public async cancelHold(parameters: any): Promise<any> {
    return this.omsClient.invokeApiAsync('invoke/changeOrder', this.jwtHelperService.jwt, {
      CallingOrganizationCode: parameters.order.EnterpriseCode,
      Action: 'MODIFY',
      OrderHeaderKey: parameters.order.OrderHeaderKey,
      OrderHoldTypes: {
        OrderHoldType: [
          {
            HoldLevel: 'ORDER',
            HoldType: parameters.HoldType,
            Status: '1300',
            ReasonText: parameters.HoldReason,
          },
        ],
      },
    });
  }

  public async getHoldTypeList(parameters: any): Promise<any> {
    return this.omsClient.invokeApiAsync('invoke/getHoldTypeList', this.jwtHelperService.jwt, {
      CallingOrganizationCode: parameters.order.EnterpriseCode,
      DisplayLocalizedFieldInLocale: 'en_US_EST',
      DocumentType: parameters.order.DocumentType,
      HoldLevel: 'ORDER',
    });
  }
}
