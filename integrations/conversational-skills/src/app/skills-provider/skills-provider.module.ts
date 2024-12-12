import { Module } from '@nestjs/common';
import { SKILLS_SERVICE_LIST } from './skills-service-list';
import { SkillsApiModule } from '../skills-api/skills-api.module';
import { CoreModule } from '../core';
import { OmsModule } from '../oms';

@Module({
  imports: [SkillsApiModule.forFeature(SKILLS_SERVICE_LIST, [CoreModule, OmsModule])],
})
export class SkillsProviderModule {}
