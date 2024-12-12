import { SessionHistory } from '../../api-model/sessionHistory';
import { SkillResponse } from '../../conv-sdk';
import { SkillCallbackInput } from './skill-callback-input.interface';

/**
 * Interface which represents the input provided to the onLLMPassThru callback method.
 * It is an extension of the {@link SkillCallbackInput} interface
 */
export interface LLMPassThruCallbackInput extends SkillCallbackInput {
  /**
   * The conversation history from the session.
   */
  conversation_memory: SessionHistory;
}

/**
 * The skill callback interface to implement when a skill service wants handle orchestrate request using an LLM instead
 * of the default slot change processing.
 */
export interface OnLLMPassThru {
  /**
   * This method uses the input to populate the `skillResponse` using an LLM.
   *
   * @param input The callback input from the skill
   */
  onLLMPassThru(input: LLMPassThruCallbackInput): Promise<SkillResponse>;
}
