import { LanguageManager, ResponseType, SlotValue } from '../../conv-sdk';
import { get } from 'lodash';
import { resolve } from 'path';
import { Constants } from './constants';

const EMAIL_REGEX = /^[\w!#$%&'*+/=?`{|}~^-]+(?:\.[\w!#$%&'*+/=?`{|}~^-]+)*@(?:[A-Z0-9-]+\.)+[A-Z]{2,6}$/i;
const PHONE_NO_REGEX = /^\+?[1-9]\d{1,14}$/;
const langManager: LanguageManager = new LanguageManager(resolve(getAssetsDirectory(), './i18n'));

/**
 * This type reprsents the metadata required in the user defined response to show a link or navigate to a tab in call-center.
 */
export type LinkOrRefreshTabConfig = {
  text: string;
  route: string;
  params: Record<string, string>;
  dataBinding?: string;
};

/**
 * This method checks if the value provided is undefined or null or an empty string
 * @param val The value to check
 * @returns true if the value is undefined or null or an empty string. False, otherwise.
 */
export function isVoid(val) {
  if (typeof val === 'string') {
    return val.trim() === '';
  }
  return val === undefined || val === null;
}

/**
 * This method guarantees that the value returned is an array.
 * @param val The value to convert into an array
 * @returns An empty array is the value is undefined or null. If the value is already an array, it is returned as is.
 */
export function getArray(val): Array<any> {
  if (val === undefined || val === null) {
    return [];
  }
  return Array.isArray(val) ? val : [val];
}

/**
 * This method ensures that all the slots provided has a normalized value.
 * @param obj A map of slot names and values
 * @returns True, if all the slots provided has a value. False, otherwise
 */
export function areAllParametersSet(obj: Record<string, SlotValue | any>) {
  return (
    Object.keys(obj).length > 0 &&
    Object.keys(obj).every((k) => (obj[k] instanceof SlotValue ? !isVoid(obj[k].normalized) : !isVoid(obj[k])))
  );
}

/**
 * This method creates a user defined response item that creates a link in the call-center UI.
 * @param config The metadata to be sent in the user defined response
 * @returns A user defined response item for the assistant.
 */
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

/**
 * This method creates a user defined response item that instructs the call-center UI to navigate to a specific tab.
 * @param config The metadata to be sent in the user defined response
 * @returns A user defined response item for the assistant.
 */
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

/**
 * This method checks if the provided modification types are allowed on the order.
 * The order object should contain the Modifications property within it. This method
 * will not make an API call to fetch modification types property.
 *
 * @param order The order object
 * @param modType The modification types to check
 * @returns True, if the modification types provided are allowed. False, otherwise
 */
export function isModificationAllowed(order: any, modType: string | string[]) {
  const modTypes = getModificationType(order, modType);
  return modTypes.length > 0 && modTypes.every((m) => m.ModificationAllowed === 'Y');
}

/**
 * This method returns the array of modification object present in the order.
 * @param order The order object
 * @param modType The modification types to check
 * @returns The array of Modification objects that match the modification types provided
 */
export function getModificationType(order: any, modType: string | string[]) {
  const modTypesArray = getArray(modType);
  return getArray(get(order, 'Modifications.Modification')).filter((m) => modTypesArray.includes(m.ModificationType));
}

/**
 * This method validates if the provided value is an email address.
 * @param email The string to check
 * @returns True if the value is an email address. False, otherwise.
 */
export function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

/**
 * This method validates if the provided value is an email address.
 * @param phoneNumber The string to check
 * @returns True, if the value is a phone number. False, otherwise.
 */
export function isPhoneNumber(phoneNumber) {
  return PHONE_NO_REGEX.test(phoneNumber);
}

export function getDistDirectory() {
  return resolve(process.env[Constants.ENV_DIST_DIRECTORY] || process.cwd());
}

export function getAssetsDirectory() {
  return resolve(getDistDirectory(), 'src/assets');
}

/**
 * Returns the language bundle for a scenario.
 * @param scenario The name of the scenario or skill
 * @param lang The language code
 * @returns The language bundle for the scenario and lang code provided
 */
export async function getStrings(scenario: string, lang: string) {
  return langManager.getStrings(scenario, lang);
}

/**
 * Returns if the string provided matches the pattern for an item ID.
 * @param itemInfo The item ID to check
 * @returns True, if the string provided matches an item ID pattern. False, otherwise
 */
export function isItemId(itemInfo: string) {
  return itemInfo.endsWith('_SKU');
}
