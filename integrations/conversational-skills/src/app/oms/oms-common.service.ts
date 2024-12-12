import { Injectable, Logger } from '@nestjs/common';
import { OmsApiClient } from './oms-api-client';
import { GetPageTemplatesService } from './getPage-templates.service';
import { createLinkResponse, createRefreshTabResponse, getArray, getModificationType } from '../common/functions';
import { Constants, PaginationParams } from '../common/constants';
import { JwtHelperService } from '../core/jwt-helper.service';
import { SkillResponse } from 'src/conv-sdk';
import { get } from 'lodash';

@Injectable()
export class OmsCommonService {
  private readonly logger = new Logger(OmsCommonService.name);

  constructor(
    private readonly omsClient: OmsApiClient,
    private readonly templatesSvc: GetPageTemplatesService,
    private jwtHelperService: JwtHelperService,
  ) {}

  public async invokeApiAsync(apiName: string, body?: any, headers?: any): Promise<any> {
    return this.omsClient.invokeApiAsync(apiName, this.jwtHelperService.jwt, body, headers);
  }

  public async getPageAsync(
    api: { IsFlow?: string; Name: string; Input: any; Template: any },
    pagination?: PaginationParams,
    headers?: any,
  ) {
    return this.omsClient.getPageAsync(api, this.jwtHelperService.jwt, pagination, headers);
  }

  public async getResourcesForUser(Loginid: string): Promise<any> {
    const Template = this.templatesSvc.getPageTemplate('common', 'getResourcesForUser');
    return this.getPageAsync({
      Name: 'getResourcesForUser',
      Input: {
        getResourcesForUser: {
          Loginid,
          ApplicationCode: 'icc',
        },
      },
      Template,
    }).then((res) => res.Output);
  }

  public sendOrderDetailsLinkResponse(skillResponse: SkillResponse, text: string, order: any) {
    skillResponse.addResponseItem(
      createLinkResponse({
        text,
        params: {
          title: order.OrderNo,
          orderNo: order.OrderNo,
          enterprise: order.EnterpriseCode,
          orderHeaderKey: order.OrderHeaderKey,
        },
        route: '/order-details',
      }),
    );
  }

  public gotoOrderDetailsTab(skillResponse: SkillResponse, order: any) {
    skillResponse.addResponseItem(
      createRefreshTabResponse({
        text: '',
        params: {
          title: order.OrderNo,
          orderNo: order.OrderNo,
          enterprise: order.EnterpriseCode,
          orderHeaderKey: order.OrderHeaderKey,
        },
        route: '/order-details',
      }),
    );
  }

  public async getDocumentTypeList() {
    return this.getPageAsync({
      Name: 'getDocumentTypeList',
      Input: {
        DocumentType: {},
      },
      Template: this.templatesSvc.getPageTemplate('common', Constants.DOCUMENT_TYPE_LIST_TEMPLATE),
    }).then((res) => getArray(get(res, 'Output.DocumentParamsList.DocumentParams')));
  }

  public async getPaymentTypeList(CallingOrganizationCode: string) {
    return this.invokeApiAsync('invoke/getPaymentTypeList', {
      CallingOrganizationCode,
    }).then((res) => getArray(res.PaymentType));
  }

  public async isModificationAllowed(modType: string[] | string, OrderHeaderKey: string) {
    const output = await this.getPageAsync({
      Name: 'getCompleteOrderDetails',
      Input: {
        Order: {
          OrderHeaderKey,
          Modifications: {
            Modification: getArray(modType).map((m) => ({ ModificationType: m })),
          },
        },
      },
      Template: this.templatesSvc.getPageTemplate('common', 'isModificationAllowed'),
    }).then((res) => res.Output);
    const modTypesObj = getModificationType(output.Order, modType);
    return modTypesObj.length > 0 && modTypesObj.every((m) => m.ModificationAllowed === 'Y');
  }
}
