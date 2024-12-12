import { Injectable, Logger, Scope } from '@nestjs/common';
import { JwtHelperService } from '../core';
import { merge } from 'lodash';
import { Constants, PaginationParams } from '../common/constants';
import { OmsApiClient } from './oms-api-client';
import { GetPageTemplatesService } from './getPage-templates.service';

@Injectable({ scope: Scope.REQUEST })
export class SearchOrdersApiService {
  private readonly logger = new Logger(SearchOrdersApiService.name);

  constructor(
    private readonly omsClient: OmsApiClient,
    private readonly templatesSvc: GetPageTemplatesService,
    public jwtHelperService: JwtHelperService,
  ) {}

  public async getOrderList(apiInput: any, templatePath: string, pagination?: PaginationParams) {
    const Template = this.templatesSvc.getPageTemplate(Constants.SEARCH_ORDERS_SKILL_ID, templatePath);
    return this.omsClient.getPageAsync(
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
}
