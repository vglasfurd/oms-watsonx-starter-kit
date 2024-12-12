import { catchError, lastValueFrom, of, switchMap, throwError } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { isVoid } from '../common/functions';
import { AppConfigService } from '../core/app-config.service';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Constants, PaginationParams } from '../common/constants';

/**
 * This service helps invoke OMS REST APIs.
 */
@Injectable()
export class OmsApiClient {
  private readonly logger = new Logger(OmsApiClient.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * This method invokes an OMS API.
   * @param apiName The OMS API name
   * @param jwt The JWT to authenticate the user on OMS
   * @param body The request body
   * @param headers Optional headers to pass to the REST API
   * @returns An observable that returns the API response
   */
  public invokeApi(apiName: string, jwt: string, body?: any, headers?: any) {
    return this._invokeApi(apiName, body, { ...headers, ...(isVoid(jwt) ? {} : { Authorization: `Bearer ${jwt}` }) });
  }

  /**
   * This method is a Promise version of {@link invokeApi}.
   * @param apiName The OMS API name
   * @param jwt The JWT to authenticate the user on OMS
   * @param body the request body
   * @param headers Optional headers to pass to the REST API
   * @returns A promise that resolves to the API response
   */
  public async invokeApiAsync(apiName: string, jwt: string, body?: any, headers?: any) {
    return lastValueFrom(this.invokeApi(apiName, jwt, body, headers));
  }

  /**
   * This method invokes an OMS API using `getPage`
   * @param api The OMS API name
   * @param jwt The JWT to authenticate the user on OMS
   * @param pagination The pagination parameters if the API is a paginated API
   * @param headers Optional headers to pass to the REST API
   * @returns An observable that emits the `getPage` response
   */
  public getPage(
    api: { IsFlow?: string; Name: string; Input: any; Template: any },
    jwt: string,
    pagination?: PaginationParams,
    headers?: any,
  ) {
    const apiInput = {
      ...(pagination ?? Constants.GET_PAGE_PAGINATION_DEFAULTS),
      API: {
        IsFlow: api.IsFlow || 'N',
        Name: api.Name,
        Input: api.Input,
        Template: api.Template,
      },
    };
    this.logger.log(`Invoking ${apiInput.API.Name} via getPage`);
    return this.invokeApi('invoke/getPage', jwt, apiInput, headers);
  }

  /**
   * This method is a Promise version of {@link getPage}
   * @param api The OMS API name
   * @param jwt The JWT to authenticate the user on OMS
   * @param pagination The pagination parameters if the API is a paginated API
   * @param headers Optional headers to pass to the REST API
   * @returns A promise that resolves to the `getPage` response
   */
  public async getPageAsync(
    api: { IsFlow?: string; Name: string; Input: any; Template: any },
    jwt: string,
    pagination?: PaginationParams,
    headers?: any,
  ): Promise<any> {
    return lastValueFrom(this.getPage(api, jwt, pagination, headers));
  }

  private _invokeApi(apiName: string, body?: any, headers?: any) {
    const endpoint = AppConfigService.INSTANCE.getApplicationConfiguration().oms_client.endpoint;
    this.logger.log(`Invoking oms api: ${endpoint}/restapi/${apiName}`);

    return this.httpService
      .request({
        url: `${endpoint}/restapi/${apiName}`,
        headers,
        data: body,
        method: body ? 'POST' : 'GET',
      })
      .pipe(switchMap(this._processResponse.bind(this)), catchError(this._catchApiError.bind(this)));
  }

  private _catchApiError(err) {
    return throwError(() => {
      this.logger.log('Api Invocation failed', err);
      throw err;
    });
  }

  private _processResponse(response: AxiosResponse) {
    if (response.status === 200) {
      // OK return data
      return of(response.data);
    } else {
      // Server is returning a status requiring the client to try something else.
      const cause = {
        error: true,
        status: response.status,
        statusText: response.statusText,
        response: response.data,
      };
      return throwError(() => {
        this.logger.log('Api Invocation failed', response.data);
        throw cause;
      });
    }
  }
}
