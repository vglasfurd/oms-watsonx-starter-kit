import { Logger } from '@nestjs/common';
import { ENTERPRISE_CODE_SLOT, LookupOrderSkillService, ORDER_NO_SLOT } from './lookup-order-skill.service';
import { Slot } from '../../conv-sdk';
import { get } from 'lodash';
import { Constants } from '../common/constants';
import { getArray } from '../common/functions';
import { WatsonXService } from '../core/watsonx.service';
import { OnSlotChange, Skill } from '../../decorators';
import { lastValueFrom } from 'rxjs';

const NOTES_RELATED_QUESTION_SLOT = 'NotesRelatedQuestion';

/**
 * This skill summarizes notes on an order. It is an extension of {@link LookupOrderSkillService}
 * The skill leverages Watsonx orchestrate with a predefined prompt to summarize the data
 * on the notes.
 *
 * The skill does not consider the order in context until it is told do so using `useCurrentOrderInContext` session variable.
 * The skill leverages the {@link LookupOrderSkillService} by extension to gather the order to summarize.
 */
@Skill({
  skillId: Constants.NOTES_SUMMARIZATION_SKILL_ID,
  slots: [{ name: NOTES_RELATED_QUESTION_SLOT }],
})
export class NotesSummarizationSkillService extends LookupOrderSkillService {
  protected readonly logger: Logger = new Logger('NotesSummarizationSkillService');

  private readonly LOCAL_VARIABLE_ORDER_NOTES = 'OrderNotes';

  constructor(private watsonxService: WatsonXService) {
    super();
    this.additionalSkillInput = { stopAtLookup: false };
  }

  protected async initializeSlotsInFlight(): Promise<void> {
    await super.initializeSlotsInFlight();
    const useCurrentOrderInContext = this.canUseCurrentOrderFromContext();
    if (!useCurrentOrderInContext) {
      this.deleteCurrentOrderFromContext();
    }
    if (this.getSkillInput().skillState.slots.length === 0) {
      const question = this.getSkillInput().input.text;
      this.setLocalVariable(NOTES_RELATED_QUESTION_SLOT, question);
      this.setSlotStringValue(NOTES_RELATED_QUESTION_SLOT, question);
    }
  }

  /**
   * This method checks if the current order exists in the session.
   *
   * @returns True, if the current order was processed
   * False, current order does not exist in the session
   */
  protected async postOnSlotStateChange(): Promise<void> {
    const isCurrentOrderProcessed = await this.processCurrentOrder();
    if (!isCurrentOrderProcessed) {
      await super.postOnSlotStateChange();
      await this.processCurrentOrder();
    }
  }

  private async processCurrentOrder() {
    const currentOrder = this.getCurrentOrderFromContext();
    if (currentOrder) {
      this.setLocalVariable(Constants.SESSION_VARIABLE_USE_CURRENT_ORDER_IN_CONTEXT, true);
      this.setSlotStringValue(ORDER_NO_SLOT, currentOrder.OrderNo);
      this.setSlotStringValue(ENTERPRISE_CODE_SLOT, currentOrder.EnterpriseCode);
      const notes = await this.getOrderNotes(currentOrder);
      if (notes.length === 0) {
        this.addTextResponse(this.getStringLiteral('actionResponses.noNotesToSummarize', currentOrder));
        this.markSkillComplete({ actionPerformed: false, noNotes: true });
      } else {
        this.setLocalVariable(this.LOCAL_VARIABLE_ORDER_NOTES, notes);
        await this.executeNotesRag(notes);
      }
      return true;
    }
    return false;
  }

  @OnSlotChange(NOTES_RELATED_QUESTION_SLOT)
  private async onNotesRelatedQuestionSlotChange(_: Slot, slot: Slot) {
    this.setLocalVariable(NOTES_RELATED_QUESTION_SLOT, slot.value.normalized);
  }

  private async executeNotesRag(notes: Array<any>) {
    const question = this.getLocalVariable(NOTES_RELATED_QUESTION_SLOT);
    if (question) {
      let skillResponseMetadata: any = {};
      try {
        const watsonResponse = await lastValueFrom(
          this.watsonxService.executeSkill('notes-summarization', {
            RESPONSE_MESSAGE: this.getStringLiteral('actionResponses.defaultWatsonXResponse'),
            ANSWER_LENGTH: 'concise',
            DOCUMENT: notes.map((n) => n.NoteText).join('\n'),
            QUERY: question,
          }),
        );
        this.addTextResponse(get(watsonResponse, 'generated_text'));
        skillResponseMetadata = { answer: get(watsonResponse, 'generated_text'), numNotes: notes.length };
      } catch (err) {
        this.logger.error(`An error occurred when contacting watson X ${err}`);
        const message = this.getStringLiteral('actionResponses.failedToAnswer');
        this.addTextResponse(message);
        skillResponseMetadata = { failed: true, message };
      } finally {
        this.markSkillComplete(skillResponseMetadata);
      }
    }
  }

  private async getOrderNotes(currentOrder: any) {
    let notes = this.getLocalVariable(this.LOCAL_VARIABLE_ORDER_NOTES);
    if (!notes) {
      const noOfNotes = parseInt(get(currentOrder, 'Notes.NumberOfNotes'));
      notes = getArray(get(currentOrder, 'Notes.Note'));
      if (isNaN(noOfNotes)) {
        // get notes for the current order
        const orderDetails = await this.apiService.getOrderDetails(
          { OrderHeaderKey: currentOrder.OrderHeaderKey },
          'notesSummarization',
        );
        notes = getArray(get(orderDetails.Order, 'Notes.Note'));
      }
    }
    return notes;
  }
}
