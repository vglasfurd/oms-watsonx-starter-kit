import { SkillResponse } from '../../conv-sdk';
import { SkillCallbackInput } from './skill-callback-input.interface';

/**
 * Implement this interface if the skill chooses not to use both onSlotStateChange and onLLMPassThru callbacks when
 * processing the orchestrate request.
 */
export interface Otherwise {
  /**
   * This method populates the skill response based on the orchestrate request.
   *
   * @param input The input to the skill
   */
  otherwise(input: SkillCallbackInput): Promise<SkillResponse>;
}
