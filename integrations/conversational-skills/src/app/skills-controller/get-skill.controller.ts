import { BadRequestException, Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { AppConfigService } from '../core';
import { GetSkillResponse } from '../../api-model/getSkillResponse';
import { SkillsProviderService } from '../skills-api/skill-provider.service';
import { AbstractSkillProviderService } from '../skills-api/abstract-skill-provider.service';
import { Slot } from '../../conv-sdk';

@Controller({
  path: '/providers/:providerId/conversational_skills/:skillId',
})
export class GetSkillController {
  private readonly logger: Logger = new Logger('GetSkillController');

  constructor(private readonly skillProviderSvc: SkillsProviderService) {}

  @Get()
  public async getConversationalSkills(
    @Param('providerId') providerId: string,
    @Param('skillId') skillId: string,
    @Query('assistant_id') asstId: string,
    @Query('environment_id') envId: string,
  ): Promise<GetSkillResponse> {
    this.logger.log(`Get Conversational Skills: ${providerId}, assistant Id: ${asstId}, env Id:${envId} ${skillId}`);

    const { skill_provider } = AppConfigService.INSTANCE.getApplicationConfiguration();
    if (providerId === skill_provider.provider_id) {
      const ts = new Date().toISOString();
      const skill = skill_provider.conversational_skills.find((s) => s.id === skillId);
      if (skill) {
        const skillService: AbstractSkillProviderService = await this.skillProviderSvc.findSkillProvider(
          providerId,
          skillId,
          { state: {} },
        );
        const response: GetSkillResponse = {
          id: skill.id,
          name: skill.name,
          created: ts,
          modified: ts,
          description: skill.description,
          metadata: skill.metadata,
          input: {
            slots: skillService.slotsInFlight.slots.map((slot: Slot) => ({
              name: slot.name,
              description: slot.description,
              type: slot.type,
            })),
          },
        };
        return response;
      }
    }
    throw new BadRequestException(`Invalid provider ${providerId} and skill Id ${skillId}`);
  }
}
