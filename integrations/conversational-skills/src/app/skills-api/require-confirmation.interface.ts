import { SkillResponse } from '../../conv-sdk';
import { SkillCallbackInput } from './skill-callback-input.interface';

/**
 * The interface to implement when a skill requires user to confirm or cancel all the parameters before performing an action
 */
export interface RequireConfirmation {
  /**
   * This method is called when the user confirms all the parameters accumulated by the skill and gives a go ahead to let the skill
   * perform the task it is supposed to do.
   *
   * @param input The input to the skill
   */
  onConfirm(input: SkillCallbackInput): Promise<SkillResponse>;

  /**
   * This method is called when the user cancels after reviewing the parameters gathered by the skill.
   * The skill can choose to mark itself as completed or cancelled.
   * The skill can also choose to clear slots and try to gather the information again.
   *
   * @param input The input to the skill
   */
  onCancel(input: SkillCallbackInput): Promise<SkillResponse>;
}
