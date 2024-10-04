import { Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { isEmpty } from 'lodash';
import { OmsApiClient } from '../core/oms-api-client';

@Injectable()
export class AppHealthService {
  constructor(private readonly omsApiClient: OmsApiClient) {}

  public isReady(): Observable<boolean> {
    return this.isAlive();
  }

  public isAlive(): Observable<boolean> {
    return this.omsApiClient.invokeApi('invoke/getApplicationVersionList', undefined, {}).pipe(map((v) => !isEmpty(v)));
  }
}
