import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { map, ReplaySubject, skipWhile, Subscription, switchMap, take, throwError, timer } from 'rxjs';
import { AppConfigService } from './app-config.service';
import { ApplicationConfiguration, WatsonxConfig } from './app-configuration';
import { getArray } from '../common/functions';
import { AxiosError, AxiosResponse } from 'axios';

/**
 * This service invokes a skill on watsonx orchestrate.
 */
@Injectable()
export class WatsonXService {
  private watsonxConfig: WatsonxConfig;

  private jwt$: ReplaySubject<string> = new ReplaySubject(1);
  private jwtRefreshTimerSub: Subscription;

  private readonly logger: Logger = new Logger('WatsonXService');

  constructor(private readonly httpService: HttpService) {
    const appConfig: ApplicationConfiguration = AppConfigService.INSTANCE.getApplicationConfiguration();
    this.watsonxConfig = appConfig.watsonx;
    this._refreshJwt();
  }

  /**
   * Executes a watsonx orchestrate skill.
   * @param skillId The unique ID of the watsonx orchestrate skill in the application configuration
   * @param data The request body
   * @param headers Additional headers
   * @returns The skill response
   */
  public executeSkill(skillId: string, data: any, headers?: any) {
    const task = this.getSkillConfig(skillId);
    const skillEndpoint = this.constructSkillEndpoint(task);
    return this.jwt$.pipe(
      skipWhile((v) => v === undefined),
      take(1),
      switchMap((jwt) =>
        jwt === 'JWT_REFRESH_FAILED'
          ? throwError(() => {
              throw Error('Cannot invoke API since JWT expired');
            })
          : this.httpService.request({
              method: task.method,
              url: skillEndpoint,
              data,
              headers: {
                Authorization: `Bearer ${jwt}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
                ...headers,
              },
            }),
      ),
      map((res: AxiosResponse) => res.data),
    );
  }

  private constructSkillEndpoint(task: any) {
    const { endpoint, tenant_id, skill_set } = this.watsonxConfig.orchestrate;
    return `${endpoint}/instances/${tenant_id}/v1/skills/${skill_set.id}/${task.id}/${task.path}`;
  }

  private getSkillConfig(skillId: string): any {
    return getArray(this.watsonxConfig.orchestrate.skill_set.skills).find((s) => s.name === skillId);
  }

  private _refreshJwt() {
    const { tokenEndpoint, api_key } = this.watsonxConfig.orchestrate;
    this.httpService
      .post(
        tokenEndpoint,
        { apikey: api_key },
        {
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          responseType: 'json',
        },
      )
      .subscribe({
        next: this._onTokenRefreshSuccess.bind(this),
        error: this._onTokenRefreshFailure.bind(this),
      });
  }

  private _onTokenRefreshSuccess(res: AxiosResponse) {
    const { token, expiry } = res.data;
    this.jwt$.next(token);
    if (!this.jwtRefreshTimerSub) {
      this.jwtRefreshTimerSub = timer(0, (expiry - 300) * 1000).subscribe({
        next: this._refreshJwt.bind(this),
      });
    }
  }

  private _onTokenRefreshFailure(err: AxiosError) {
    this.logger.error(`An error occurred when refreshing the WxO token ${err.response.data}`);
    this.jwt$.next('JWT_REFRESH_FAILED');
  }
}
