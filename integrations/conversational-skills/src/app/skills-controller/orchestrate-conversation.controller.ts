import { Body, Controller, HttpCode, Logger, Param, Post } from '@nestjs/common';
import { SkillsProviderService } from '../skills-api/skill-provider.service';
import { get } from 'lodash';

@Controller({
  path: '/providers/:providerId/conversational_skills/:skillId/orchestrate',
})
export class OrchestrateConversationController {
  private readonly logger: Logger = new Logger('OrchestrateConversationController');

  private readonly STRINGIFY_FIELDS_TO_STUB = [
    'jwt_details',
    'jwt',
    'OMS',
    'local_variables',
    'session_variables',
    'action_variables',
    'skill_variables',
  ];

  constructor(private skillsProviderSvc: SkillsProviderService) {}

  @Post()
  @HttpCode(200)
  orchestrate(
    @Param('providerId') providerId: string,
    @Param('skillId') skillId: string,
    @Body() request: any,
  ): Promise<any> {
    this.logger.log(
      `Orchestrating conversation request: ${providerId}, ${skillId} ${this.getSessionId(request)} ${JSON.stringify(request, this.stringify.bind(this))}}`,
    );
    return this.skillsProviderSvc
      .findSkillProvider(providerId, skillId, request)
      .then((s) => s.orchestrate(request))
      .then((v) => {
        this.logger.log(`Orchestrating conversation response: ${JSON.stringify(v, this.stringify.bind(this))}`);
        return v;
      });
  }

  private getSessionId(request: any) {
    return get(request, 'context.global.session_id');
  }

  private stringify(this: any, key: string, value: any) {
    if (!this.STRINGIFY_FIELDS_TO_STUB.includes(key)) {
      return value;
    }
  }
}
