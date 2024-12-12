import { HttpsOptions } from '@nestjs/common/interfaces/external/https-options.interface';
import { ConversationalSkill } from '../../api-model/conversationalSkill';

export interface ServerConfig {
  port?: number;
  https: boolean;
  httpsOptions?: HttpsOptions;
  domain: string;
  securityDisabled?: boolean;
}

export interface OmsClientConfig {
  endpoint: string;
}

export interface WatsonxConfig extends Record<string, any> {
  orchestrate: Record<string, any>;
}

export enum AuthMethodEnum {
  bearer = 'bearer',
  basic = 'basic',
  api_key = 'api_key',
  none = 'none',
}

export type SkillProviderSecurity = {
  [x in AuthMethodEnum]?: BasicAuth | BearerAuth | ApiKeyAuth;
} & { authentication_method: AuthMethodEnum };

export interface SkillProviderConfig {
  provider_id: string;
  security: SkillProviderSecurity;
  conversational_skills: Array<ConversationalSkill>;
}

export type BasicAuth = {
  username: string;
  password: string;
};

export type BearerAuth = {
  token: string;
};

export type ApiKeyAuth = {
  name: string;
  in: 'header' | 'cookie' | 'param';
  value: string;
};

export interface ApplicationConfiguration {
  server: ServerConfig;
  oms_client: OmsClientConfig;
  skill_provider: SkillProviderConfig;
  watsonx: WatsonxConfig;
}
