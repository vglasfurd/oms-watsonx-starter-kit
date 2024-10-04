import { Module } from '@nestjs/common';
import { OmsApiClient } from './oms-api-client';
import { GetPageTemplatesService } from './getPage-templates.service';
import { HttpModule } from '@nestjs/axios';
import { OmsCommonService } from './oms-common.service';
import { JwtHelperService } from './jwt-helper.service';

@Module({
  imports: [HttpModule],
  providers: [OmsApiClient, GetPageTemplatesService, OmsCommonService, JwtHelperService],
  exports: [OmsApiClient, GetPageTemplatesService, OmsCommonService, JwtHelperService, HttpModule],
})
export class CoreModule {}
