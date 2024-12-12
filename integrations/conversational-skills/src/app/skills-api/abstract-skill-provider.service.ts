import {
  Skill,
  SlotsInFlight,
  SkillResponse,
  SkillState,
  fillTemplate,
  Slot,
  SlotType,
  SlotValue,
  ResolverType,
} from '../../conv-sdk/index';
import { SkillCallbackInput } from './skill-callback-input.interface';
import { LLMPassThruCallbackInput } from './on-llm-pass-thru.interface';
import { MessageContext } from '../../api-model/messageContext';
import { Constants } from '../common/constants';
import { get, merge, remove, set } from 'lodash';
import { getArray, isVoid } from '../common/functions';
import { SkillOpts } from '../../decorators';

export enum VarOutputLocation {
  'session' = 'session',
  'context' = 'context',
  'not_found' = 'not_found',
}

/**
 * This is the base class for a skill service. All skill service implementations must extend from this class.
 * It provides helper methods that assist a skill implementation in creating slots, handle slot changes in the input from the orchestrate API request
 * and construct the API response.
 *
 * This class processes slot changes using {@link onSlotStateChange} callback by default. Skill service implementation that choose to use a different callback
 * must implement one of the following interfaces depending on the callback.
 *
 * - {@link OnLLMPassThru} for the onLLMPassThru callback
 * - {@link RequireConfirmation} for skills that ask users for confirmation before completing the skill
 * - {@link Otherwise} for skills that use otherwise callback
 */
export abstract class AbstractSkillProviderService {
  private _languageBundle: any;

  private slotChangeHandlers: Record<string, (incoming: Slot, inFlight: Slot) => Promise<void>> = {};

  private skillInput: SkillCallbackInput | LLMPassThruCallbackInput;

  private _additionalSkillInput: Record<string, any> = {};

  /**
   * The unique ID of the skill
   */
  public skillId: string;

  /**
   * The {@link SlotsInFlight} object. This object describes the slots currently in flight i.e. the slots
   * the skill expects the assistant to fill.
   */
  public slotsInFlight: SlotsInFlight;

  /**
   * The {@link Skill} object. The skill object. This object uses the input from orchestrate API request
   * and the slotsInFlight to construct the skill's response after invoking the registered callbacks for
   * slot changes.
   */
  protected skill: Skill;

  /**
   * Sets the language bundle to use for the skill
   * @param l The language bundle
   */
  set languageBundle(l) {
    this._languageBundle = l;
  }

  /**
   * Returns the language bundle for the skill
   * @returns language bundle
   */
  get languageBundle() {
    return this._languageBundle;
  }

  /**
   * Sets the additional input associated with the skill.
   * This allows a skill to accept data when the skill is extended by another.
   * @param input
   */
  set additionalSkillInput(input: any) {
    merge(this._additionalSkillInput, input);
  }

  /**
   * Returns the additional input associated with the skill
   * @returns additional input for the skill
   */
  get additionalSkillInput() {
    return this._additionalSkillInput;
  }

  /**
   * This method initializes the skill. It is invoked by the `SkillProviderService` once the skill
   * is instantiated. It will use {@link SkillOpts} that's configured in the `@Skill` annotation of the
   * skill service to register slot change handlers and creates the {@link Skill} instance.
   *
   * @param request The orchestrate API request
   * @param skillOpts The options associated with the skill that is configured using the `@Skill` decorator
   * @returns Returns the current instance of the skill service
   */
  async initialize(request: any, skillOpts: SkillOpts): Promise<AbstractSkillProviderService> {
    // create slots in flight
    this.slotsInFlight = new SlotsInFlight({
      slots: skillOpts.slots.map(this.createSlot.bind(this)),
      confirmation: skillOpts.confirmation,
    });

    skillOpts.slots.forEach((s) =>
      this.registerSlotChangeHandler(s.name, (this[s.handler] || this.defaultSlotChangeHandler).bind(this)),
    );

    this.skill = this.createSkill(skillOpts);
    return this;
  }

  /**
   * This method creates a conversational skill SDK {@link Skill} instance.
   * It will register the orchestrate callback based on the {@link SkillOpts} provided
   * @returns An instance of {@link Skill}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected createSkill(_: SkillOpts): Skill {
    let slotChangeHandler = this.onSlotStateChange.bind(this);
    if (typeof this['onLLMPassThru'] === 'function' || typeof this['otherwise'] === 'function') {
      slotChangeHandler = undefined;
    }
    const skill: Skill = new Skill({
      strings: this.languageBundle,
      slotsInFlight: this.slotsInFlight,
      onSlotStateChange: slotChangeHandler ?? undefined,
      onCancel: this['onCancel']?.bind(this) ?? undefined,
      onConfirm: this['onConfirm']?.bind(this) ?? undefined,
      onLLMPassThru: this['onLLMPassThru']?.bind(this) ?? undefined,
      otherwise: this['otherwise']?.bind(this) ?? undefined,
    });
    return skill;
  }

  /**
   * Registers a function to handle changes to the slot specified.
   * @param slotName The name of the slot
   * @param handler The function that handles changes to the slot
   */
  protected registerSlotChangeHandler(slotName: string, handler: (incoming: Slot, inFlight: Slot) => Promise<void>) {
    this.slotChangeHandlers[slotName] = handler;
  }

  /**
   * This method is the default implementation of `onSlotStateChange` callback for a skill
   * The method does the following:
   *
   *  - Initializes the slots in flight by invoking {@link initializeSlotsInFlight}
   *  - Process incoming changes to the slots
   *  - Post process slot state changes by invoking {@link postOnSlotStateChange}
   *
   * @param input The callback input provided by the skill
   * @returns The {@link SkillResponse} instance
   */
  protected async onSlotStateChange(input: SkillCallbackInput): Promise<SkillResponse> {
    await this.initializeSlotsInFlight();
    if (!this.isSkillCompleteOrCancelled()) {
      await this._processSlotChanges(input);
    }
    if (!this.isSkillCompleteOrCancelled()) {
      await this.postOnSlotStateChange();
    }
    return input.skillResponse;
  }

  /**
   * This method is invoked after the slot changes have been processed by {@link onSlotStateChange} method.
   * Implementations can use this method to do common tasks that should be carried out after all the slots are processed.
   * Some examples are:
   * - Checking if all slots are filled and taking action based on the slot values
   * - In case a skill is extending from another, it can use this method to check if data is made available by the super class
   * and take appropriate action
   */
  protected async postOnSlotStateChange() {}

  /**
   * This method is invoked before processing the incoming slots. Implementations can use this method to pre-process slots that
   * are in flight to populate entities, customize their prompts etc.
   */
  protected async initializeSlotsInFlight() {}

  /**
   * THe default handler attached to process a slot that has no handler associated with it.
   * @param _ The incoming slot
   * @param __ The slot in flight
   */
  protected defaultSlotChangeHandler(_: Slot, __: Slot) {
    console.log(_, __);
  }

  /**
   * This method is the entry point to the skill's functionality. It is invoked
   * using the orchestrate API's request.
   * @param req The incoming orchestrate request
   * @returns The orchestrate API response
   */
  async orchestrate(req: { input; context; slots; state; confirmation_event }): Promise<any> {
    return this.skill.orchestrate({
      input: req.input,
      context: req.context,
      slots: req.slots,
      state: req.state,
      confirmation_event: req.confirmation_event,
    });
  }

  /**
   * Returns the message context object
   * @returns The message context from the orchestrate API input
   */
  protected getMessageContext(): MessageContext {
    return this.skillInput.context;
  }

  /**
   * Returns an instance of the skill state. The skill state contains
   * the incoming slots, confirmation event if any and state. The state contains
   * the local and session variables associated with the current chat session.
   * @returns The skill state which represents the incoming slots
   */
  protected getSkillState(): SkillState {
    return this.skillInput.skillState;
  }

  /**
   * Returns the skill response instance.
   * @returns The skill response instance
   */
  protected getSkillResponse(): SkillResponse {
    return this.skillInput.skillResponse;
  }

  /**
   * Return the OMS integration namespace in the message context. This space contains state
   * which the OMS UI shares with the assistant.
   * @returns The OMS integration namespace in the message context
   */
  protected getOMSIntegrationsContext() {
    return get(this.getMessageContext(), 'integrations.chat.OMS', Constants.DEFAULT_OMS_INTEGRATIONS_CONTEXT);
  }

  /**
   * Gets a property value from the chat's session or context.
   * @param propertyName The property to read from session or context
   * @returns An object that contains the value of the property and the location where it was found
   */
  protected getFromSessionOrContext(propertyName: string): { value: any; loc: VarOutputLocation } {
    const value = { value: this.getSkillState().getSessionVariable(propertyName), loc: VarOutputLocation.session };
    if (isVoid(value.value)) {
      value.value = get(this.getSkillInput().context.skills['actions skill'], `skill_variables.${propertyName}`);
    }
    if (isVoid(value.value)) {
      value.value = get(this.getOMSIntegrationsContext(), propertyName);
      value.loc = VarOutputLocation.context;
    }
    if (isVoid(value.value)) {
      value.loc = VarOutputLocation.not_found;
    }
    return value;
  }

  /**
   * Returns an interpolated array of string based on the property path.
   * @param arrayPath The json property path for the array of literals
   * @param values The values used to interpolate the string literals
   * @returns An array of interpolated strings
   */
  protected getStringLiteralArray(arrayPath: string, values?: any) {
    return getArray(get(this.languageBundle, arrayPath, '')).map((l) => fillTemplate(l, values));
  }

  /**
   * Returns the string literal.
   * @param literalPath The json property path for string literal
   * @param values The values used to interpolate the literal
   * @returns The interpolated string
   */
  protected getStringLiteral(literalPath: string, values?: any) {
    return fillTemplate(get(this.languageBundle, literalPath, literalPath), values);
  }

  /**
   * Return an error string for the slot. The error literal is looked up using the json path
   * `$name.errors.$errorCode` within the language bundle associated with the skill.
   *
   * @param name The name of the slot
   * @param errorCode The error code for which the error literal will be fetched
   * @param values The values used to interpolate the error literal
   * @returns The interpolated error string
   */
  protected getErrorForSlot(name: string, errorCode: string, values?: any) {
    return this.getStringLiteral(`${name}.errors.${errorCode}`, values);
  }

  /**
   * This method sets a slot's prompt based on the values specified.
   * The prompt to use is looked up in the language bundle using the json path
   * `$name.${prompt || 'prompt'}`
   * @param name The name of the slot
   * @param prompt The prompt to use in case the slot has multiple prompts
   * @param values The values to interpolate the prompt literal
   */
  protected setSlotPrompt(name: string, prompt?: string, values?: any) {
    const slot: Slot = this.getSkillResponseSlot(name);
    slot.setPrompt = this.getStringLiteral(`${name}.${prompt ?? 'prompt'}`, values);
  }

  /**
   * Returns a slot from the skill response.
   * @param name The name of the slot to find
   * @returns The slot object from the skill response
   */
  protected getSkillResponseSlot(name: string): Slot {
    return this.getSkillResponse().getSlot(name);
  }

  /**
   * Returns a slot from the incoming slots.
   * @param name The name of the slot
   * @returns The slot object from the incoming slots
   */
  protected getSkillStateSlot(name: string): Slot {
    return this.getSkillState().getSlot(name);
  }

  /**
   * Convenience method to dynamically create a slot
   * @param data The data associated with the slot
   * @param values The values to use to interpolate string literals
   * @returns An instance of the slot
   */
  protected createSlot(
    data: { name: string; type?: SlotType; hidden?: boolean; prompt?: string; errorTemplate?: string },
    values?: any,
  ): Slot {
    return new Slot({
      ...Constants.SLOT_DEFAULTS,
      ...data,
      description: this.getStringLiteral(`${data.name}.description`, values),
      prompt: this.getStringLiteral(data.prompt ?? `${data.name}.prompt`, values),
      errorTemplate: this.getStringLiteral(data.errorTemplate ?? `${data.name}.errorTemplate`, values),
    });
  }

  /**
   * Removes a slot from the skill response.
   * @param name The name or names of the slot
   */
  protected removeSlot(name: string | string[]) {
    const names = getArray(name);
    remove(this.getSkillResponse().slotsInFlight.slots, (s: Slot) => names.includes(s.name));
  }

  /**
   * Sets a string value on a slot that's part of the skill response.
   * @param slot The name or instance of a slot
   * @param value The value to set on the slot
   */
  protected setSlotStringValue(slot: Slot | string, value: string | undefined) {
    const s = (slot = slot instanceof Slot ? slot : this.getSkillResponseSlot(slot));
    s.value = value ? new SlotValue(value, value) : undefined;
  }

  /**
   * Returns the normalized value of an incoming slot.
   * @param slotName The name of the slot
   * @returns The normalized value of the slot
   */
  protected getCurrentSlotValue(slotName: string) {
    const slot = this.getSkillState().getSlot(slotName);
    return slot && slot.isFilled ? slot.value.normalized : undefined;
  }

  /**
   * Returns the normalized values for slots from the {@link SkillResponse}.
   * @param slotNames The names of the slots to fetch normalized values for.
   * @returns The normalized values of the slots specified
   */
  protected getNormalizedSlotValues(slotNames: string[]): Record<string, any> {
    const currentSlots = {};
    slotNames.forEach((s) => (currentSlots[s] = this.getSkillResponseSlot(s)?.value?.normalized));
    return currentSlots;
  }

  /**
   * Sets a session variable in the skill's response
   * @param name The name of the variable
   * @param value The value of the variable
   */
  protected setSessionVariable(name: string, value: any) {
    this.getSkillResponse().setSessionVariable(name, value);
  }

  /**
   * Returns the value of a session variable
   * @param varName The name of the variable
   * @returns The value of the session variable
   */
  protected getSessionVariable(varName: string): any {
    return this.getSkillState().getSessionVariable(varName);
  }

  /**
   * Returns the value of the local variable
   * @param varName The name of the variable
   * @returns The value of the local variable
   */
  protected getLocalVariable(varName: string): any {
    return this.getSkillState().getLocalVariable(varName);
  }

  /**
   * Sets a local variable in the skill's response
   * @param varName The name of the variable
   * @param value The value of the variable
   */
  protected setLocalVariable(varName: string, value: any) {
    this.getSkillResponse().setLocalVariable(varName, value);
  }

  /**
   * This marks a skill as complete
   * @param skillResponse Additional metadata to return as the skill's response. This is used when mixing no-code and skill based actions.
   */
  protected markSkillComplete(skillResponse?: any) {
    this.getSkillResponse().markSkillComplete({
      ...skillResponse,
      skillId: this.skillId,
      slotState: this.slotsInFlight.slots.map((s) => ({
        name: s.name,
        type: s.type,
        value: s.value?.normalized ?? this.getSkillState().getSlotValue(s.name),
      })),
    });
  }

  /**
   * This marks a skill as cancelled
   * @param clearSlots Flag to indicate whether to clear the slots in flight or not. Default is true
   */
  protected markSkillCancelled(clearSlots = true) {
    this.getSkillResponse().markSkillCancelled();
    clearSlots ? this.getSkillResponse().clearSlotsInFlight() : '';
  }

  /**
   * Indicates if the skill is marked complete or cancelled.
   * @returns True, if the skill is complete or cancelled. False otherwise
   */
  protected isSkillCompleteOrCancelled(): boolean {
    const type = this.getSkillResponse().resolver?.type;
    return type === ResolverType.COMPLETE || type === ResolverType.CANCEL;
  }

  /**
   * Sets the callback's input
   * @param input The input to the skill
   */
  protected setSkillInput(input: SkillCallbackInput | LLMPassThruCallbackInput) {
    this.skillInput = input;
  }

  /**
   * Returns the skill callback's input.
   * @returns The skill callback's input
   */
  protected getSkillInput(): SkillCallbackInput | LLMPassThruCallbackInput {
    return this.skillInput;
  }

  /**
   * Adds a string response to the skill's response.
   * @param str The string to add as the assistant's response
   */
  protected addTextResponse(str: string) {
    this.getSkillResponse().addTextResponse(str);
  }

  /**
   * Adds an object response to the skill's response.
   * @param res The object response to add as the assistant's response
   */
  protected addResponseItem(res: any) {
    this.getSkillResponse().addResponseItem(res);
  }

  /**
   * Adds a dynamically created slot to the skill response.
   * @param slot The slot to add to the skill response
   */
  protected addSlotToResponse(slot: Slot) {
    this.getSkillResponse().slotsInFlight.slots.push(slot);
  }

  /**
   * This method returns the order that's currently being processed.
   * @returns The current order from the context or session
   */
  protected getCurrentOrderFromContext() {
    return this.getFromSessionOrContext(Constants.SESSION_VARIABLE_CURRENT_ORDER).value;
  }

  /**
   * Deletes a local variable
   * @param variable The variable to delete
   */
  protected deleteLocalVariable(variable: string) {
    this.getSkillResponse().deleteLocalVariable(variable);
  }

  /**
   * This method deletes a session variable by setting the value to null.
   * @param variable The variable to delete
   */
  protected deleteSessionVariable(variable: string) {
    this.getSkillResponse().setSessionVariable(variable, null);
  }

  /**
   * Sets the current order in context as a conversational skill session variable.
   * @param order The current order to set in the context
   */
  protected setCurrentOrderInContext(order: any) {
    this.setSessionVariable(Constants.SESSION_VARIABLE_CURRENT_ORDER, order);
  }

  /**
   * This method deletes the current order in context. A skill should invoke this
   * method if it wishes to clear the current order from context.
   */
  protected deleteCurrentOrderFromContext() {
    this.setCurrentOrderInContext(null);
    set(
      this.getSkillInput().context.skills['actions skill'],
      `skill_variables.${Constants.SESSION_VARIABLE_CURRENT_ORDER}`,
      undefined,
    );
  }

  private async _processSlotChanges(input: SkillCallbackInput) {
    const { skillResponse, skillState } = input;
    const slots = getArray(skillState.slots);
    if (slots.length > 0) {
      // skill state  is incoming slots from the orchestration request
      for (const slot of slots) {
        // Add value to slotsInFlight
        const slotInFlight: Slot = skillResponse.getSlot(slot.name);
        if (slotInFlight) {
          slotInFlight.value = slot.value;
          if (!this.isSkillCompleteOrCancelled() && slot.hasChanged) {
            const handler = this.slotChangeHandlers[slot.name];
            await handler(slot, slotInFlight);
          }
        }
      }
    }
  }
}
