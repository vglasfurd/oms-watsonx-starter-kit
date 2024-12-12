import { existsSync, readFileSync } from 'fs';
import { Constants } from '../common/constants';
import { parse } from 'yaml';
import {
  ApiKeyAuth,
  ApplicationConfiguration,
  AuthMethodEnum,
  BasicAuth,
  BearerAuth,
  ServerConfig,
} from './app-configuration';
import { env, exit } from 'process';
import { getArray, getDistDirectory, isVoid } from '../common/functions';
import { Logger } from '@nestjs/common';
import { resolve } from 'path';
import { DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { isEmpty } from 'lodash';
import { ConversationalSkill } from '../../api-model/conversationalSkill';

/**
 * This service contains the application's configuration. It reads the application configuration yaml configured using
 * `ENV_APPLICATION_CONFIG_YAML_PATH` environment variable and is used to initialize the application.
 */
export class AppConfigService {
  private readonly logger = new Logger('AppConfigService');

  private readonly PROVIDER_ID_REGEX = new RegExp('[a-zA-Z0-9-_]+$');

  private readonly defaultServerConfig: ServerConfig = {
    domain: `http://localhost:${Constants.DEFAULT_LISTEN_PORT}`,
    port: Constants.DEFAULT_LISTEN_PORT,
    https: false,
    securityDisabled: true,
  };

  private applicationConfig: ApplicationConfiguration;
  private apiSpec: OpenAPIObject;

  public getApplicationConfiguration() {
    return this.applicationConfig;
  }

  public getOpenApiDocument(): OpenAPIObject {
    return this.apiSpec;
  }

  private constructor() {
    this._initApplicationConfig();
    this._initApiSpec();
  }

  private _initApiSpec() {
    this.apiSpec = parse(
      readFileSync(resolve(getDistDirectory(), './src/api-spec/openapi.yaml'), { encoding: 'utf-8' }),
    );
    this.apiSpec.servers = [{ url: this.applicationConfig.server.domain }];
    const { skill_provider } = this.applicationConfig;
    if (!isVoid(skill_provider.security)) {
      const authMethod = skill_provider.security.authentication_method;
      const specBuilder = new DocumentBuilder();
      switch (authMethod) {
        case AuthMethodEnum.basic:
          specBuilder.addBasicAuth(undefined, authMethod);
          break;
        case AuthMethodEnum.api_key:
          specBuilder.addApiKey(undefined, authMethod);
          break;
        case AuthMethodEnum.bearer:
          specBuilder.addBearerAuth(undefined, authMethod);
          break;
      }
      if (authMethod !== AuthMethodEnum.none) {
        const specWithSecurity = specBuilder.build();
        this.apiSpec.components.securitySchemes = specWithSecurity.components.securitySchemes;
        Object.entries(this.apiSpec.paths).forEach(([, pio]) => {
          if (pio.get) {
            pio.get.security = [{ [authMethod]: [] }];
          }
          if (pio.delete) {
            pio.delete.security = [{ [authMethod]: [] }];
          }
          if (pio.head) {
            pio.head.security = [{ [authMethod]: [] }];
          }
          if (pio.options) {
            pio.options.security = [{ [authMethod]: [] }];
          }
          if (pio.patch) {
            pio.patch.security = [{ [authMethod]: [] }];
          }
          if (pio.post) {
            pio.post.security = [{ [authMethod]: [] }];
          }
          if (pio.put) {
            pio.put.security = [{ [authMethod]: [] }];
          }
          if (pio.trace) {
            pio.trace.security = [{ [authMethod]: [] }];
          }
        });
      }
    }
  }

  private _initApplicationConfig() {
    let providerYamlPath = env[Constants.ENV_APPLICATION_CONFIG_YAML_PATH] || '';
    if (isVoid(providerYamlPath)) {
      this.logger.fatal(`${Constants.ENV_APPLICATION_CONFIG_YAML_PATH} is not set. Cannot start server`);
      exit(1);
    }

    providerYamlPath = resolve(providerYamlPath);
    if (!existsSync(providerYamlPath)) {
      this.logger.fatal('The provider config yaml does not exist', providerYamlPath);
      exit(1);
    }
    try {
      this.applicationConfig = parse(readFileSync(providerYamlPath, { encoding: 'utf-8' }), this._reviver.bind(this));
      this._validateAppConfig();
      this.logger.log('Initialized skill provider configuration');
    } catch (err) {
      this.logger.fatal('Failed to read provider config yaml', err);
      exit(1);
    }
  }

  private _validateAppConfig() {
    this._validateOmsConfig();
    this._validateServerConfig();
    this._validateProviderConfig();
  }

  private _validateProviderConfig() {
    const providerConfig = this.applicationConfig.skill_provider;
    if (isVoid(providerConfig)) {
      throw Error('skill_provider cannot be empty in application configuration');
    }
    if (isVoid(providerConfig.provider_id) || !this.PROVIDER_ID_REGEX.test(providerConfig.provider_id)) {
      throw Error('skill_provider.provider_id is null or contains special characters');
    }
    const skills: Array<ConversationalSkill & Record<string, any>> = getArray(providerConfig.conversational_skills);
    if (skills.length === 0) {
      throw Error('skill_provider.conversational_skills cannot be an empty array');
    } else {
      const invalidSkills = skills.filter((s) => isEmpty(s.id) || isEmpty(s.name)).map((s) => s.id);
      if (invalidSkills.length > 0) {
        throw Error(`skill_provider.conversational_skills is invalid ${invalidSkills.join(',')}`);
      }
    }

    const security = providerConfig.security;
    if (isVoid(security)) {
      this.logger.log('Security not configured for the skill. Defaulting to none');
      providerConfig.security = { authentication_method: AuthMethodEnum.none };
    } else {
      switch (providerConfig.security.authentication_method) {
        case AuthMethodEnum.api_key:
          const api_key: ApiKeyAuth = providerConfig.security.api_key as ApiKeyAuth;
          if (
            isVoid(api_key) ||
            isVoid(api_key.name) ||
            isVoid(api_key.in) ||
            isVoid(api_key.value) ||
            !['header', 'query', 'cookie'].includes(api_key.in)
          ) {
            throw Error('api_key authentication not configured correctly');
          }
          break;
        case AuthMethodEnum.basic:
          const basic = providerConfig.security.basic as BasicAuth;
          if (isVoid(basic) || isVoid(basic.username) || isVoid(basic.password)) {
            throw Error('basic authentication not configured correctly');
          }
          break;
        case AuthMethodEnum.bearer:
          const token = providerConfig.security.bearer as BearerAuth;
          if (isVoid(token) || isVoid(token.token)) {
            throw Error('token authentication not configured correctly');
          }
          break;
      }
    }
  }

  private _validateServerConfig() {
    const serverConfig = this.applicationConfig.server;
    if (isVoid(serverConfig)) {
      this.applicationConfig.server = this.defaultServerConfig;
    } else {
      serverConfig.port = serverConfig.port || Constants.DEFAULT_LISTEN_PORT;
      serverConfig.domain = serverConfig.domain || this.defaultServerConfig.domain;
      if (serverConfig.httpsOptions !== undefined) {
        if (serverConfig.httpsOptions.cert && serverConfig.httpsOptions.key) {
          try {
            serverConfig.httpsOptions.cert = readFileSync(serverConfig.httpsOptions.cert);
            serverConfig.httpsOptions.key = readFileSync(serverConfig.httpsOptions.key);
          } catch (err) {
            throw Error('server.httpsOptions.cert and server.httpsOptions.key cannot be read');
          }
          serverConfig.https = true;
        } else {
          throw Error('server.httpsOptions.cert and server.httpsOptions.key should be specified');
        }
      }
      serverConfig.securityDisabled = env['SERVER_SECURITY_DISABLED'] === 'true';
    }
  }

  private _validateOmsConfig() {
    const omsClientConfig = this.applicationConfig.oms_client;
    if (isVoid(omsClientConfig)) {
      throw Error('oms_client configuration is missing');
    }
    try {
      new URL(omsClientConfig.endpoint);
      this.logger.log('Connecting to OMS instance %s', omsClientConfig.endpoint);
    } catch (err) {
      throw Error('oms_client.endpoint configuration is not a valid URL');
    }
  }

  private _reviver(key, value) {
    if (typeof value === 'string') {
      return env[value] || value;
    }
    return value;
  }

  public static INSTANCE = new AppConfigService();
}
