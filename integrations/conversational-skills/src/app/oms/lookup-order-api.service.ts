import { Injectable, Logger, Scope } from '@nestjs/common';
import { JwtHelperService } from '../core';
import { Constants } from '../common/constants';
import { get } from 'lodash';
import { OmsApiClient } from './oms-api-client';
import { GetPageTemplatesService } from './getPage-templates.service';

@Injectable({ scope: Scope.REQUEST })
export class LookupOrderApiService {
  private readonly logger = new Logger(LookupOrderApiService.name);

  constructor(
    private readonly omsClient: OmsApiClient,
    private readonly templatesSvc: GetPageTemplatesService,
    private jwtHelperService: JwtHelperService,
  ) {}

  public async getOrderDetails(order: any, templateName: string = 'default') {
    return this.omsClient
      .getPageAsync(
        {
          Name: 'getCompleteOrderDetails',
          Input: {
            Order: { DocumentType: '0001', ...order },
          },
          Template: this.templatesSvc.getPageTemplate(Constants.LOOKUP_ORDER_SKILL_ID, templateName),
        },
        this.jwtHelperService.jwt,
      )
      .then((res) => res.Output);
  }

  public async getOrganizationList(): Promise<any> {
    const Template = this.templatesSvc.getPageTemplate('common', 'getOrganizationList');
    return this.omsClient
      .getPageAsync(
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
      )
      .then((res) => get(res, 'Output.OrganizationList'));
  }
}
