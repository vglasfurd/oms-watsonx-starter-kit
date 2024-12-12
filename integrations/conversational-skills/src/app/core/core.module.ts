import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WatsonXService } from './watsonx.service';
import { JwtHelperService } from './jwt-helper.service';

@Module({
  imports: [HttpModule],
  providers: [WatsonXService, JwtHelperService],
  exports: [JwtHelperService, WatsonXService, HttpModule],
})
export class CoreModule {}
