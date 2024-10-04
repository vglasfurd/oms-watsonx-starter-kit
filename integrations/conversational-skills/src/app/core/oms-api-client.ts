import { catchError, lastValueFrom, of, switchMap, throwError } from 'rxjs';
import { Injectable, Logger } from '@nestjs/common';
import { isVoid } from '../common/functions';
import { AppConfigService } from './app-config.service';
import { HttpService } from '@nestjs/axios';
import { AxiosResponse } from 'axios';
import { Constants, PaginationParams } from '../common/constants';

@Injectable()
export class OmsApiClient {
  public static readonly _ERR_FETCHING_JWT = '_ERR_FETCHING_JWT';

  private readonly logger = new Logger(OmsApiClient.name);

  constructor(private readonly httpService: HttpService) {}

  public login() {
    const { username, password } = { username: '', password: '' };
    return this._invokeApi(
      'invoke/login',
      { LoginID: username, Password: password },
      { authorization: `Basic ${Buffer.from(`${username}:${password}`, 'utf-8').toString('base64')}` },
    );
  }

  public jwt(userToken: string) {
    const { username } = { username: '' };
    this.logger.log('Fetching/Refreshing jwt');
    return this._invokeApi(`jwt?_token=${userToken}&_loginid=${username}`);
  }

  public invokeApi(apiName: string, jwt: string, body?: any, headers?: any) {
    return this._invokeApi(apiName, body, { ...headers, ...(isVoid(jwt) ? {} : { Authorization: `Bearer ${jwt}` }) });
  }

  public async invokeApiAsync(apiName: string, jwt: string, body?: any, headers?: any) {
    return lastValueFrom(this.invokeApi(apiName, jwt, body, headers));
  }

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
