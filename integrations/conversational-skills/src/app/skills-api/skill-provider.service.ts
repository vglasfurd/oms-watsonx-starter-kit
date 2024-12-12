import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../core/app-config.service';
import { getArray } from '../common/functions';
import { initializeContext } from './context-id.utils';
import { ModuleRef } from '@nestjs/core';
import { SkillCallbackInput } from './skill-callback-input.interface';
import { SkillResponse, Slot, SlotsInFlight } from 'src/conv-sdk';
import { get } from 'lodash';
import { AbstractSkillProviderService } from './abstract-skill-provider.service';

/**
 * This service helps instantiate and orchestrate skill provider services.
 */
@Injectable()
export class SkillsProviderService {
  private readonly logger: Logger = new Logger('SkillsProviderService');

  constructor(private readonly moduleRef: ModuleRef) {}

  /**
   * @param providerId The skill provider ID
   * @param skillId The unique conversational skill service ID
   * @param request The request object. This is the incoming request body for the orchestrate REST API
   * @returns An instance of the {@link AbstractSkillProviderService} service implementation for the skillId provided
   * @throws BadRequestException thrown if the providerId is invalid.
   */
  public findSkillProvider(providerId: string, skillId: string, request: any): Promise<AbstractSkillProviderService> {
    const { skill_provider } = AppConfigService.INSTANCE.getApplicationConfiguration();
    if (skill_provider.provider_id === providerId) {
      return this.getSkillProvider(skillId, request);
    }
    throw new BadRequestException(`Invalid provider ID ${providerId}`);
  }

  /**
   * Orchestrates the execution of a skill.
   * @param skillId The ID of the skill to be executed.
   * @param input The input parameters for the skill.
   * @param lateralSkillInput Additional input for skills invoked by the current skill.
   * @returns A promise that resolves to the skill response.
   */
  public orchestrate(skillId: string, input: SkillCallbackInput, lateralSkillInput?: any): Promise<SkillResponse> {
    const newInput = {
      input: input.input,
      context: input.context,
      slots: input.skillState.slots.map((s) => (s instanceof Slot ? s.toJson() : s)),
      state: input.skillState.state,
      confirmation_event: input.skillState.confirmation_event,
    };
    return this.getSkillProvider(skillId, newInput)
      .then((skill) => {
        skill.additionalSkillInput = lateralSkillInput ?? {};
        return skill.orchestrate(newInput);
      })
      .then((s) => this.copySkillResponse(s, input));
  }

  private getSkillProvider(skillId: string, request: any): Promise<AbstractSkillProviderService> {
    const { skill_provider } = AppConfigService.INSTANCE.getApplicationConfiguration();
    const skill = getArray(skill_provider.conversational_skills).find((s) => s.id === skillId);
    if (skill) {
      const contextId = initializeContext(request);
      this.moduleRef.registerRequestByContextId(request, contextId);
      return this.moduleRef.resolve(skillId, contextId);
    }
    throw new BadRequestException(`Invalid skill ID ${skillId}`);
  }

  private copySkillResponse(skillResponseJson, input: SkillCallbackInput) {
    const localVars = get(skillResponseJson, 'state.local_variables', {});
    Object.entries(localVars).forEach(([k, v]) => input.skillResponse.setLocalVariable(k, v));

    const sessionVars = get(skillResponseJson, 'state.session_variables', {});
    Object.entries(sessionVars).forEach(([k, v]) => input.skillResponse.setSessionVariable(k, v));

    input.skillResponse.resolver = skillResponseJson.resolver;

    const output = getArray(skillResponseJson.output.generic);
    output.filter((r) => r.response_type !== 'slots').forEach((r) => input.skillResponse.addResponseItem(r));

    const slotsInFlight = input.skillResponse.slotsInFlight || new SlotsInFlight({ slots: [] });
    const outgoingSlotsResponse = output.find((r) => r.response_type === 'slots') || {};
    getArray(outgoingSlotsResponse.slots).forEach((s) => slotsInFlight.slots.push(Slot.fromJson(s)));
    slotsInFlight.confirmation = outgoingSlotsResponse.confirmation;
    input.skillResponse.slotsInFlight = slotsInFlight;

    return input.skillResponse;
  }
}
