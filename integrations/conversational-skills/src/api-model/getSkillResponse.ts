import { ConversationalSkill } from './conversationalSkill';
import { ConversationalSkillInputSlot } from './conversationalSkillInputSlot';

export interface GetSkillResponse extends ConversationalSkill {
  input: {
    slots: ConversationalSkillInputSlot[];
  };
}
