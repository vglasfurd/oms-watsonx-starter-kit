import { BadRequestException, Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { AppConfigService } from '../core/app-config.service';
import { ListSkillsResponse } from '../../api-model/listSkillsResponse';

@Controller({
  path: '/providers/:providerId/conversational_skills',
})
export class ListSkillsController {
  private readonly logger: Logger = new Logger('ListSkillController');

  @Get()
  getConversationalSkills(
    @Param('providerId') providerId: string,
    @Query('assistant_id') asstId: string,
    @Query('environment_id') envId: string,
  ): ListSkillsResponse {
    this.logger.log(`List conversational skills provider Id: ${providerId}, assistant Id: ${asstId}, env Id:${envId}`);
    const { skill_provider } = AppConfigService.INSTANCE.getApplicationConfiguration();
    if (providerId === skill_provider.provider_id) {
      const ts = new Date().toISOString();
      const response: ListSkillsResponse = {
        conversational_skills: skill_provider.conversational_skills.map((s) => ({
          created: ts,
          modified: ts,
          description: s.description,
          id: s.id,
          name: s.name,
          ...(s.metadata ? { metadata: s.metadata } : {}),
        })),
      };
      this.logger.log(`List conversational skills response ${JSON.stringify(response)}`);
      return response;
    } else {
      throw new BadRequestException(`Invalid provider ${providerId}`);
    }
  }
}
