import { Injectable, Logger } from '@nestjs/common';
import { OmsApiClient } from './oms-api-client';
import { GetPageTemplatesService } from './getPage-templates.service';
import { get, merge } from 'lodash';
import { SkillResponse } from '../../conv-sdk';
import { createLinkResponse, createRefreshTabResponse, getArray, getModificationType } from '../common/functions';
import { Constants, PaginationParams } from '../common/constants';
import { JwtHelperService } from './jwt-helper.service';

@Injectable()
export class OmsCommonService {
  private readonly logger = new Logger(OmsCommonService.name);

  constructor(
    private readonly omsClient: OmsApiClient,
    public readonly templatesSvc: GetPageTemplatesService,
    public jwtHelperService: JwtHelperService,
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
    return this.getPageAsync(
      {
        Name: 'getResourcesForUser',
        Input: {
          getResourcesForUser: {
            Loginid,
            ApplicationCode: 'icc',
          },
        },
        Template,
      },
      this.jwtHelperService.jwt,
    ).then((res) => res.Output);
  }

  public async getOrganizationList(): Promise<any> {
    const Template = this.templatesSvc.getPageTemplate('common', 'getOrganizationList');
    return this.getPageAsync(
      {
        Name: 'getOrganizationList',
        Input: {
          Organization: {
            DataAccessFilter: { UserId: this.jwtHelperService.userId },
            OrgRoleList: { OrgRole: [{ RoleKey: 'ENTERPRISE' }] },
          },
        },
        Template,
      },
      this.jwtHelperService.jwt,
    ).then((res) => get(res, 'Output.OrganizationList'));
  }

  public async getOrderDetails(
    order: any,
    templateName: string = 'default',
    scenario: string = Constants.LOOKUP_ORDER_SKILL_ID,
  ) {
    return this.getPageAsync(
      {
        Name: 'getCompleteOrderDetails',
        Input: {
          Order: { DocumentType: '0001', ...order },
        },
        Template: this.templatesSvc.getPageTemplate(scenario, templateName),
      },
      this.jwtHelperService.jwt,
    ).then((res) => res.Output);
  }

  public async getDocumentTypeList() {
    return this.getPageAsync(
      {
        Name: 'getDocumentTypeList',
        Input: {
          DocumentType: {},
        },
        Template: this.templatesSvc.getPageTemplate('common', Constants.DOCUMENT_TYPE_LIST_TEMPLATE),
      },
      this.jwtHelperService.jwt,
    );
  }

  public async getOrderList(apiInput: any, Template: any, pagination?: PaginationParams) {
    return this.getPageAsync(
      {
        Name: 'getOrderList',
        Input: {
          Order: merge(
            {
              DisplayLocalizedFieldInLocale: 'en_US_EST',
              DraftOrderFlag: 'N',
              MaximumRecords: 500,
              OrderBy: {
                Attribute: {
                  Name: 'OrderDate',
                  Desc: true,
                },
              },
            },
            apiInput,
          ),
        },
        Template,
      },
      this.jwtHelperService.jwt,
      pagination,
    );
  }

  public async isModificationAllowed(modType: string[] | string, OrderHeaderKey: string) {
    const output = await this.getOrderDetails(
      {
        OrderHeaderKey,
        Modifications: {
          Modification: getArray(modType).map((m) => ({ ModificationType: m })),
        },
      },
      this.jwtHelperService.jwt,
    );
    const modTypesObj = getModificationType(output.Order, modType);
    return modTypesObj.length > 0 && modTypesObj.every((m) => m.ModificationAllowed === 'Y');
  }

  public sendOrderDetailsLinkResponse(skillResponse: SkillResponse, text: string) {
    skillResponse.addResponseItem(
      createLinkResponse({
        text,
        dataBinding: 'currentOrder',
        params: {
          title: 'OrderNo',
          orderNo: 'OrderNo',
          enterprise: 'EnterpriseCode',
          orderHeaderKey: 'OrderHeaderKey',
        },
        route: '/order-details',
      }),
    );
  }

  public gotoOrderDetailsTab(skillResponse: SkillResponse) {
    skillResponse.addResponseItem(
      createRefreshTabResponse({
        text: '',
        dataBinding: 'currentOrder',
        params: {
          title: 'OrderNo',
          orderNo: 'OrderNo',
          enterprise: 'EnterpriseCode',
          orderHeaderKey: 'OrderHeaderKey',
        },
        route: '/order-details',
      }),
    );
  }
}
