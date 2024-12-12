import { SetMetadata } from '@nestjs/common';
import { LanguageManager } from '../conv-sdk';
import { resolve } from 'path';
import { getAssetsDirectory } from '../app/common/functions';

export interface SkillOpts extends Record<string, any> {
  skillId: string;
  slots: Array<{ name: string; type?: string; hidden?: boolean; [k: string]: any }>;
  confirmation?: string;
  orchestration?: 'onSlotStateChange' | 'onLLMPassThru' | 'otherwise';
}

export const SKILL_ID_KEY = 'skillId';
export const SKILL_OPTIONS_KEY = 'skillOpts';
export const SKILL_SLOT_HANDLERS = 'slotHandlers';

export const langManager: LanguageManager = new LanguageManager(resolve(getAssetsDirectory(), './i18n'));

export function Skill(skillOpts: SkillOpts): ClassDecorator {
  // eslint-disable-next-line @typescript-eslint/ban-types
  return (target: Function & Record<string, any>) => {
    // set the skillId property on the class
    target.skillId = skillOpts.skillId;
    target._skillOpts = skillOpts;

    // consolidate the skill options and merge with parent skills
    const consolidatedSkillOpts: SkillOpts = {
      skillId: skillOpts.skillId,
      confirmation: skillOpts.confirmation,
      slots: [],
      orchestration: skillOpts.orchestration || 'onSlotStateChange',
      skillIds: [],
    };
    const hierarchy = processHierarchy(target);
    hierarchy.forEach((p) => {
      p._skillOpts.slots.forEach((slot) => consolidatedSkillOpts.slots.push(slot));
      consolidatedSkillOpts.skillIds.push(p.skillId);
      consolidatedSkillOpts.confirmation = p._skillOpts.confirmation || consolidatedSkillOpts.confirmation;
    });

    // set the metadata for the skillId and skillOptions
    SetMetadata(SKILL_ID_KEY, target.skillId)(target);
    SetMetadata(SKILL_OPTIONS_KEY, consolidatedSkillOpts)(target);

    const consolidatedSlotChangedHandlers = {};
    hierarchy.forEach((p) => {
      const handlers = Reflect.getMetadata(`${p.name}.slotChangeHandlers`, p) || {};
      Object.entries(handlers).forEach(([k, v]) => (consolidatedSlotChangedHandlers[k] = v));
    });
    SetMetadata(SKILL_SLOT_HANDLERS, consolidatedSlotChangedHandlers)(target);

    // decorate the orchestration method to set the skill input
    const originalOrchestration = target.prototype[consolidatedSkillOpts.orchestration];
    if (originalOrchestration) {
      target.prototype[consolidatedSkillOpts.orchestration] = async function (...args: any[]) {
        this.setSkillInput(args[0]);
        return await originalOrchestration.apply(this, args);
      };
    }

    if (consolidatedSkillOpts.confirmation === 'required') {
      const onConfirm = target.prototype.onConfirm;
      if (onConfirm) {
        target.prototype.onConfirm = async function (...args: any[]) {
          this.setSkillInput(args[0]);
          return await onConfirm.apply(this, args);
        };
      }

      const onCancel = target.prototype.onCancel;
      if (onCancel) {
        target.prototype.onCancel = async function (...args: any[]) {
          this.setSkillInput(args[0]);
          return await onCancel.apply(this, args);
        };
      }
    }
  };

  function processHierarchy(current) {
    const hierarchy = [];
    while (current) {
      hierarchy.unshift(current);
      const parent = Object.getPrototypeOf(current);
      if (parent && parent.skillId && parent._skillOpts) {
        current = parent;
      } else {
        current = undefined;
      }
    }
    return hierarchy;
  }
}

export function OnSlotChange(name: string): MethodDecorator {
  return function decorator(target: any, propertyKey: string) {
    const constructor = target.constructor;
    const handlers = Reflect.getMetadata(`${constructor.name}.slotChangeHandlers`, constructor) || {};
    handlers[name] = propertyKey;

    SetMetadata(`${constructor.name}.slotChangeHandlers`, handlers)(constructor);
  };
}
