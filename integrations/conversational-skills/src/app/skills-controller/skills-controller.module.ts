import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { ListSkillsController } from './list-skills.controller';
import { OrchestrateConversationController } from './orchestrate-conversation.controller';
import { SkillsApiModule } from '../skills-api/skills-api.module';
import { GetSkillController } from './get-skill.controller';

@Module({
  imports: [CoreModule, SkillsApiModule],
  controllers: [ListSkillsController, OrchestrateConversationController, GetSkillController],
})
export class SkillsControllerModule {}
