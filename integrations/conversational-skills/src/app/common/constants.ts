import { SlotType } from '../../conv-sdk';

export interface PaginationParams {
  PageNumber: number | string;
  PageSize: number | string;
  PaginationStrategy: string;
  Refresh: string;
  PageSetToken?: string;
}

export class Constants {
  static readonly ENV_APPLICATION_CONFIG_YAML_PATH = 'APPLICATION_CONFIG_YAML_PATH';

  static readonly ENV_DIST_DIRECTORY = 'DIST_DIRECTORY';

  static readonly DEFAULT_LISTEN_PORT = 3000;

  static readonly SESSION_VARIABLE_ENTERPRISE_LIST = 'EnterpriseList';

  static readonly SESSION_VARIABLE_ENTERPRISE_CODE = 'EnterpriseCode';

  static readonly SESSION_VARIABLE_OMS_JWT = 'OMS_JWT';

  static readonly SESSION_VARIABLE_CURRENT_ORDER_NO = 'currentOrderNo';

  static readonly SESSION_VARIABLE_CURRENT_ORDER = 'currentOrder';

  static readonly SESSION_VARIABLE_SKILL_ERROR = 'skills-error';

  static readonly LOCAL_VARIABLE_SKILL_ERROR_COUNT = 'skill-error-count';

  static readonly LOOKUP_ORDER_SKILL_ID = 'lookup-order';

  static readonly DOCUMENT_TYPE_LIST_TEMPLATE = 'document-type-list';

  static readonly LOOKUP_FAILURE_LOCAL_VARIABLE = `${Constants.SESSION_VARIABLE_SKILL_ERROR}-${Constants.LOOKUP_ORDER_SKILL_ID}`;

  static readonly SLOT_DEFAULTS = {
    event: undefined,
    hidden: false,
    schema: undefined,
    selectorFor: undefined,
    value: undefined,
    type: SlotType.STRING,
  };

  static readonly DEFAULT_OMS_INTEGRATIONS_CONTEXT: Record<string, any> = {
    [Constants.SESSION_VARIABLE_OMS_JWT]: undefined,
    [Constants.SESSION_VARIABLE_ENTERPRISE_CODE]: '',
    [Constants.SESSION_VARIABLE_ENTERPRISE_LIST]: undefined,
    [Constants.SESSION_VARIABLE_CURRENT_ORDER_NO]: '',
    [Constants.SESSION_VARIABLE_CURRENT_ORDER]: undefined,
  };

  static readonly GET_PAGE_PAGINATION_DEFAULTS: PaginationParams = {
    PageNumber: 1,
    PageSize: 999,
    PaginationStrategy: 'GENERIC',
    Refresh: 'N',
  };
}
