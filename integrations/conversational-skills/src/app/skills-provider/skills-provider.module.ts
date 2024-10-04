import { Module } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { SKILLS_SERVICE_LIST } from './skills-service-list';
import { SkillsApiModule } from '../skills-api/skills-api.module';

@Module({
  imports: [CoreModule, SkillsApiModule.forFeature(SKILLS_SERVICE_LIST)],
})
export class SkillsProviderModule {}
