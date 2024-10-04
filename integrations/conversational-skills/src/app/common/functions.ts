import { LanguageManager, ResponseType, SlotValue } from '../../conv-sdk';
import { get } from 'lodash';
import { resolve } from 'path';
import { Constants } from './constants';

const EMAIL_REGEX = /^[\w!#$%&'*+/=?`{|}~^-]+(?:\.[\w!#$%&'*+/=?`{|}~^-]+)*@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}$/i;
const PHONE_NO_REGEX = /^\+?[1-9]\d{1,14}$/;
const langManager: LanguageManager = new LanguageManager(resolve(getAssetsDirectory(), './i18n'));

export type LinkOrRefreshTabConfig = {
  text: string;
  route: string;
  params: Record<string, string>;
  dataBinding: string;
};

export function isVoid(val) {
  if (typeof val === 'string') {
    return val.trim() === '';
  }
  return val === undefined || val === null;
}

export function getArray(val): Array<any> {
  if (val === undefined || val === null) {
    return [];
  }
  return Array.isArray(val) ? val : [val];
}

export function areAllParametersSet(obj: Record<string, SlotValue | any>) {
  return (
    Object.keys(obj).length > 0 &&
    Object.keys(obj).every((k) => (obj[k] instanceof SlotValue ? !isVoid(obj[k].normalized) : !isVoid(obj[k])))
  );
}

export function createLinkResponse(config: LinkOrRefreshTabConfig) {
  return {
    response_type: ResponseType.CUSTOM,
    user_defined: {
      convSkill: true,
      type: 'link',
      config,
    },
  };
}

export function createRefreshTabResponse(config: LinkOrRefreshTabConfig) {
  return {
    user_defined: {
      type: 'refreshTab',
      convSkill: true,
      config,
    },
    response_type: ResponseType.CUSTOM,
  };
}

export function isModificationAllowed(order: any, modType: string | string[]) {
  const modTypes = getModificationType(order, modType);
  return modTypes.length > 0 && modTypes.every((m) => m.ModificationAllowed === 'Y');
}

export function getModificationType(order: any, modType: string | string[]) {
  const modTypesArray = getArray(modType);
  return getArray(get(order, 'Modifications.Modification')).filter((m) => modTypesArray.includes(m.ModificationType));
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

export function isPhoneNumber(phoneNumber) {
  return PHONE_NO_REGEX.test(phoneNumber);
}

export function getDistDirectory() {
  return resolve(process.env[Constants.ENV_DIST_DIRECTORY] || process.cwd());
}

export function getAssetsDirectory() {
  return resolve(getDistDirectory(), 'src/assets');
}

export async function getStrings(scenario: string, lang: string) {
  return langManager.getStrings(scenario, lang);
}
