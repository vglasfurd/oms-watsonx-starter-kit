import { Injectable, Logger, Scope } from '@nestjs/common';
import { JwtHelperService } from '../core';
import { OmsApiClient } from './oms-api-client';

@Injectable({ scope: Scope.REQUEST })
export class CancelOrderApiService {
  private readonly logger = new Logger(CancelOrderApiService.name);

  constructor(
    private readonly omsClient: OmsApiClient,
    private jwtHelperService: JwtHelperService,
  ) {}

  public async cancelOrder(OrderHeaderKey: string) {
    return this.omsClient.invokeApiAsync('invoke/cancelOrder', this.jwtHelperService.jwt, {
      OrderHeaderKey,
    });
  }
}
