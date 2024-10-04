import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { AppHealthModule } from './health/health.module';
import { SkillsControllerModule } from './skills-controller/skills-controller.module';
import { SkillsProviderModule } from './skills-provider/skills-provider.module';
import { SkillsApiModule } from './skills-api/skills-api.module';

@Module({
  imports: [CoreModule, AppHealthModule, SkillsApiModule, SkillsControllerModule, SkillsProviderModule],
  providers: [],
})
export class AppModule {}
