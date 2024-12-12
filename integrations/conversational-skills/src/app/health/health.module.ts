import { Module } from '@nestjs/common';
import { AppHealthController } from './health.controller';
import { AppHealthService } from './health.service';
import { CoreModule } from '../core/core.module';
import { OmsModule } from '../oms';

@Module({
  controllers: [AppHealthController],
  imports: [CoreModule, OmsModule],
  providers: [AppHealthService],
})
export class AppHealthModule {}
