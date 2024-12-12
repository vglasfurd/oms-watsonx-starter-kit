import { DynamicModule, Global, Module, Type } from '@nestjs/common';
import { SkillsProviderService } from './skill-provider.service';
import { createProviders, SkillServiceFactory } from './skill-service.factory';

@Module({
  providers: [SkillsProviderService, SkillServiceFactory],
  exports: [SkillsProviderService],
})
@Global()
export class SkillsApiModule {
  static forFeature(skillsList: Array<Type>, imports: Array<any>): DynamicModule {
    const providers = createProviders(skillsList);
    return {
      module: SkillsApiModule,
      imports,
      providers,
      exports: providers,
    };
  }
}
