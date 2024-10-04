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
import { MessageInput } from '../../api-model/messageInput';
import { MessageContext } from '../../api-model/messageContext';
import { SessionHistory } from '../../api-model/sessionHistory';
import { Constants } from '../common/constants';
import { get, merge, remove } from 'lodash';
import { getArray, isVoid } from '../common/functions';
import { SkillOpts } from '../../decorators';

export enum VarOutputLocation {
  'session' = 'session',
  'context' = 'context',
  'not_found' = 'not_found',
}

export interface SkillCallbackInput {
  input: MessageInput;
  context: MessageContext;
  skillState: SkillState;
  skillResponse: SkillResponse;
}

export interface LLMPassThruCallbackInput extends SkillCallbackInput {
  conversation_memory: SessionHistory;
}

export abstract class AbstractSkillProviderService {
  private _languageBundle: any;

  private slotChangeHandlers: Record<string, (incoming: Slot, inFlight: Slot) => Promise<void>> = {};

  private skillInput: SkillCallbackInput | LLMPassThruCallbackInput;

  private _additionalSkillInput: Record<string, any> = {};

  public skillId: string;

  protected slotsInFlight: SlotsInFlight;

  protected skill: Skill;

  protected onConfirm?(input: SkillCallbackInput): Promise<SkillResponse>;

  protected onCancel?(input: SkillCallbackInput): Promise<SkillResponse>;

  protected onLLMPassThru?(input: LLMPassThruCallbackInput): Promise<SkillResponse>;

  protected otherwise?(input: SkillCallbackInput): Promise<SkillResponse>;

  set languageBundle(l) {
    this._languageBundle = l;
  }

  get languageBundle() {
    return this._languageBundle;
  }

  set additionalSkillInput(input: any) {
    merge(this._additionalSkillInput, input);
  }

  get additionalSkillInput() {
    return this._additionalSkillInput;
  }

  async initialize(request: any, skillOpts: SkillOpts): Promise<AbstractSkillProviderService> {
    // create slots in flight
    this.slotsInFlight = new SlotsInFlight({
      slots: skillOpts.slots.map(this.createSlot.bind(this)),
      confirmation: skillOpts.confirmation,
    });

    skillOpts.slots.forEach((s) =>
      this.registerSlotChangeHandler(s.name, (this[s.handler] || this.defaultSlotChangeHandler).bind(this)),
    );

    this.skill = this.createSkill();
    return this;
  }

  protected createSkill(): Skill {
    let slotChangeHandler = this.onSlotStateChange.bind(this);
    if (this.onLLMPassThru || this.otherwise) {
      slotChangeHandler = undefined;
    }
    const skill: Skill = new Skill({
      onSlotStateChange: slotChangeHandler ?? undefined,
      onCancel: this.onCancel ? this.onCancel.bind(this) : undefined,
      onConfirm: this.onConfirm ? this.onConfirm.bind(this) : undefined,
      onLLMPassThru: this.onLLMPassThru ? this.onLLMPassThru.bind(this) : undefined,
      otherwise: this.otherwise ? this.otherwise.bind(this) : undefined,
      strings: this.languageBundle,
      slotsInFlight: this.slotsInFlight,
    });
    return skill;
  }

  protected registerSlotChangeHandler(slotName: string, handler: (incoming: Slot, inFlight: Slot) => Promise<void>) {
    this.slotChangeHandlers[slotName] = handler;
  }

  protected async onSlotStateChange(input: SkillCallbackInput): Promise<SkillResponse> {
    await this.initializeSlotsInFlight();
    await this._processSlotChanges(input);
    await this.postOnSlotStateChange();
    return input.skillResponse;
  }

  protected async postOnSlotStateChange() {}

  protected async initializeSlotsInFlight() {}

  protected defaultSlotChangeHandler(_: Slot, __: Slot) {
    console.log(_, __);
  }

  async orchestrate(req: { input; context; slots; state; confirmation_event }): Promise<any> {
    return this.skill.orchestrate({
      input: req.input,
      context: req.context,
      slots: req.slots,
      state: req.state,
      confirmation_event: req.confirmation_event,
    });
  }

  protected getMessageContext(): MessageContext {
    return this.skillInput.context;
  }

  protected getSkillState(): SkillState {
    return this.skillInput.skillState;
  }

  protected getSkillResponse(): SkillResponse {
    return this.skillInput.skillResponse;
  }

  protected getOMSIntegrationsContext() {
    return get(this.getMessageContext(), 'integrations.chat.OMS', Constants.DEFAULT_OMS_INTEGRATIONS_CONTEXT);
  }

  protected getFromSessionOrContext(propertyName: string): { value: any; loc: VarOutputLocation } {
    const value = { value: this.getSkillState().getSessionVariable(propertyName), loc: VarOutputLocation.session };
    if (isVoid(value.value)) {
      value.value = get(this.getOMSIntegrationsContext(), propertyName);
      value.loc = VarOutputLocation.context;
    }
    if (isVoid(value.value)) {
      value.loc = VarOutputLocation.not_found;
    }
    return value;
  }

  protected getStringLiteralArray(arrayPath: string, values?: any) {
    return getArray(get(this.languageBundle, arrayPath, '')).map((l) => fillTemplate(l, values));
  }

  protected getStringLiteral(literalPath: string, values?: any) {
    return fillTemplate(get(this.languageBundle, literalPath, literalPath), values);
  }

  protected getErrorForSlot(name: string, errorCode: string, values?: any) {
    return this.getStringLiteral(`${name}.errors.${errorCode}`, values);
  }

  protected setSlotPrompt(name: string, prompt?: string, values?: any) {
    const slot: Slot = this.getSkillResponseSlot(name);
    slot.setPrompt = this.getStringLiteral(`${name}.${prompt ?? 'prompt'}`, values);
  }

  protected getSkillResponseSlot(name: string): Slot {
    return this.getSkillResponse().getSlot(name);
  }

  protected getSkillStateSlot(name: string): Slot {
    return this.getSkillState().getSlot(name);
  }

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

  protected removeSlot(name: string | string[]) {
    const names = getArray(name);
    remove(this.getSkillResponse().slotsInFlight.slots, (s: Slot) => names.includes(s.name));
  }

  protected setSlotStringValue(slot: Slot | string, value: string | undefined) {
    const s = (slot = slot instanceof Slot ? slot : this.getSkillResponseSlot(slot));
    s.value = value ? new SlotValue(value, value) : undefined;
  }

  protected getCurrentSlotValue(slotName: string) {
    const slot = this.getSkillState().getSlot(slotName);
    return slot && slot.isFilled ? slot.value.normalized : undefined;
  }

  protected getNormalizedSlotValues(slotNames: string[]): Record<string, any> {
    const currentSlots = {};
    slotNames.forEach((s) => (currentSlots[s] = this.getSkillState().getSlot(s)?.value?.normalized));
    return currentSlots;
  }

  protected setSessionVariable(name: string, value: any) {
    this.getSkillResponse().setSessionVariable(name, value);
  }

  protected getSessionVariable(varName: string): any {
    return this.getSkillState().getSessionVariable(varName);
  }

  protected getLocalVariable(varName: string): any {
    return this.getSkillState().getLocalVariable(varName);
  }

  protected setLocalVariable(varName: string, value: any) {
    this.getSkillResponse().setLocalVariable(varName, value);
  }

  protected markSkillComplete(clearSlots = true) {
    this.getSkillResponse().markSkillComplete();
    clearSlots ? this.getSkillResponse().clearSlotsInFlight() : '';
  }

  protected markSkillCancelled(clearSlots = true) {
    this.getSkillResponse().markSkillCancelled();
    clearSlots ? this.getSkillResponse().clearSlotsInFlight() : '';
  }

  protected isSkillCompleteOrCancelled(): boolean {
    const type = this.getSkillResponse().resolver?.type;
    return type === ResolverType.COMPLETE || type === ResolverType.CANCEL;
  }

  protected setSkillInput(input: SkillCallbackInput | LLMPassThruCallbackInput) {
    this.skillInput = input;
  }

  protected getSkillInput(): SkillCallbackInput | LLMPassThruCallbackInput {
    return this.skillInput;
  }

  protected addTextResponse(str: string) {
    this.getSkillResponse().addTextResponse(str);
  }

  protected addResponseItem(res: any) {
    this.getSkillResponse().addResponseItem(res);
  }

  protected addSlotToResponse(slot: Slot) {
    this.getSkillResponse().slotsInFlight.slots.push(slot);
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
