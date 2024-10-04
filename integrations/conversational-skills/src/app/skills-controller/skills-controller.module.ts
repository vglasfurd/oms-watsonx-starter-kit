import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { ListSkillsController } from './list-skills.controller';
import { OrchestrateConversationController } from './orchestrate-conversation.controller';
import { SkillsApiModule } from '../skills-api/skills-api.module';

@Module({
  imports: [CoreModule, SkillsApiModule],
  controllers: [ListSkillsController, OrchestrateConversationController],
})
export class SkillsControllerModule {}
