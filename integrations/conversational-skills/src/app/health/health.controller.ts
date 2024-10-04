import { Controller, Get } from '@nestjs/common';
import { AppHealthService } from './health.service';

@Controller('health')
export class AppHealthController {
  constructor(private readonly appHealthService: AppHealthService) {}

  @Get('ready')
  isReady() {
    return this.appHealthService.isReady();
  }

  @Get('alive')
  isAlive() {
    return this.appHealthService.isAlive();
  }
}
