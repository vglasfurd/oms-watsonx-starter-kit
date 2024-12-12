import { FactoryProvider, Inject, Injectable, Provider, Scope, Type } from '@nestjs/common';
import { SKILL_ID_KEY, SKILL_OPTIONS_KEY, SKILL_SLOT_HANDLERS, SkillOpts } from '../../decorators';
import { ModuleRef, Reflector, REQUEST } from '@nestjs/core';
import { AbstractSkillProviderService } from './abstract-skill-provider.service';
import { getContextId } from './context-id.utils';
import { get, merge } from 'lodash';
import { getStrings } from '../common/functions';

/**
 * This service is the provider factory for NestJs to instantiate instances of {@link AbstractSkillProviderService}
 * The service reads the metadata provided `@Skill` annotation to properly initialize the skill service
 * using the incoming request for the orchestrate API.
 */
@Injectable({ scope: Scope.REQUEST })
export class SkillServiceFactory {
  constructor(
    private moduleRef: ModuleRef,
    private reflector: Reflector,
    @Inject(REQUEST) private req: any,
  ) {}

  /**
   * This method initializes a request context and then instantiates
   * the skill type so that all it's dependencies have access to the request
   * object.
   * @param skillType The type of the skill to instantiate
   * @returns An instance of the skill
   */
  createSkill(skillType: Type<AbstractSkillProviderService>) {
    const contextId = getContextId(this.req);
    return this.moduleRef
      .resolve(skillType, contextId)
      .then((skillService) => this.initializeSkill(skillService, skillType));
  }

  private async initializeSkill(
    skillService: AbstractSkillProviderService,
    skillType: Type<AbstractSkillProviderService>,
  ) {
    const skillOpts: SkillOpts = this.reflector.get(SKILL_OPTIONS_KEY, skillType);
    const handlers = this.reflector.get(SKILL_SLOT_HANDLERS, skillType);
    skillOpts.slots.forEach((s) => (s.handler = handlers[s.name]));

    skillService.skillId = skillOpts.skillId;
    // get locale from context and setup the language bundle
    const locale = new Intl.Locale(get(this.req, 'context.global.language', 'en'));
    skillService.languageBundle = merge(
      {},
      ...(await Promise.all(skillOpts.skillIds.map((s) => getStrings(s, locale.language)))),
    );
    return skillService.initialize(this.req, skillOpts);
  }
}

/**
 * This method creates the providers array for registering into a module. Each provider maps the
 * skillId with the type that implements the skill.
 * @param skillsList The list of types which extend the {@link AbstractSkillProviderService} interface
 * @returns An array of providers to register in a module.
 */
export function createProviders(skillsList: Array<Type>): Array<Provider | FactoryProvider> {
  const providers = [
    ...skillsList.map((s) => ({
      provide: Reflect.getMetadata(SKILL_ID_KEY, s),
      scope: Scope.REQUEST,
      inject: [SkillServiceFactory],
      useFactory: (ssf: SkillServiceFactory) => ssf.createSkill(s),
    })),
    ...skillsList.map((s) => ({
      provide: s,
      scope: Scope.REQUEST,
      useClass: s,
    })),
  ];
  return providers;
}
