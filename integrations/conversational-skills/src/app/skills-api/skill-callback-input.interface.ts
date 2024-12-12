import { MessageInput } from '../../api-model/messageInput';
import { MessageContext } from '../../api-model/messageContext';
import { SkillState, SkillResponse } from '../../conv-sdk';

/**
 * Interface which represents the input provided to a skill's callback method.
 */
export interface SkillCallbackInput {
  /**
   * The message input in the incoming orchestrate request
   */
  input: MessageInput;

  /**
   * The context provided in the incoming orchestrate request.
   */
  context: MessageContext;

  /**
   * The slots and the state provided in the incoming orchestrate request.
   */
  skillState: SkillState;

  /**
   * The response object which is used to construct the orchestrate API response.
   */
  skillResponse: SkillResponse;
}
