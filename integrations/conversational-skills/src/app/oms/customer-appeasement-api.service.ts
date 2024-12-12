import { Injectable, Logger, Scope } from '@nestjs/common';
import { SearchOrdersApiService } from './search-orders-api.service';
import { ApplyCouponApiService } from './apply-coupon-api.service';

@Injectable({ scope: Scope.REQUEST })
export class CustomerAppeasementApiService {
  private readonly logger = new Logger(CustomerAppeasementApiService.name);

  constructor(
    private readonly searchOrdersApiSvc: SearchOrdersApiService,
    private readonly applyCouponApiSvc: ApplyCouponApiService,
  ) {}

  public async getAppeasements(criteria: any) {
    const today = new Date();
    const FromOrderDate = new Date(today.setMonth(today.getMonth() - 6)).toISOString();
    const ToOrderDate = new Date().toISOString();
    return this.searchOrdersApiSvc.getOrderList(
      {
        DraftOrderFlag: 'N',
        ComplexQuery: {
          And: {
            Exp: [criteria],
          },
        },
        FromOrderDate,
        ToOrderDate,
        OrderDateQryType: 'BETWEEN',
      },
      'find-appeasements',
      {
        PageNumber: 1,
        PageSize: 10,
        PaginationStrategy: 'GENERIC',
        Refresh: 'N',
      },
    );
  }

  public async applyCoupon(input: { OrderHeaderKey: string; PromotionId: string; Note?: any }): Promise<boolean> {
    return await this.applyCouponApiSvc.applyCoupon(input);
  }
}
