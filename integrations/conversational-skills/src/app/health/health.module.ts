import { Module } from '@nestjs/common';
import { AppHealthController } from './health.controller';
import { AppHealthService } from './health.service';
import { CoreModule } from '../core/core.module';

@Module({
  controllers: [AppHealthController],
  imports: [CoreModule],
  providers: [AppHealthService],
})
export class AppHealthModule {}
