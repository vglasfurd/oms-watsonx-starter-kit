import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { CoreModule } from '../core/core.module';
import { SkillsProviderService } from './skill-provider.service';
import { createProviders, SkillServiceFactory } from './skill-service.factory';

@Module({
  providers: [SkillsProviderService, SkillServiceFactory],
  exports: [SkillsProviderService],
})
@Global()
export class SkillsApiModule {
  static forFeature(skillsList: Array<Type>): DynamicModule {
    const providers = createProviders(skillsList);
    return {
      module: SkillsApiModule,
      imports: [CoreModule],
      providers,
      exports: providers,
    };
  }
}
