import { Module } from '@nestjs/common';
import { ArgosBrowserGateway } from './argos-browser.gateway';
import { ArgosBrowserService } from './argos-browser.service';

@Module({
  providers: [ArgosBrowserService, ArgosBrowserGateway],
  exports: [ArgosBrowserService],
})
export class ArgosBrowserModule {}
