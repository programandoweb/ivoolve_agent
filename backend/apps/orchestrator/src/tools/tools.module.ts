import { Module } from '@nestjs/common';
import { HermesBrowserModule } from '../hermes/hermes-browser.module';
import { ArgosBrowserModule } from '../browser/argos-browser.module';

import { ApprovalsModule } from '../approvals/approvals.module';
import { ProvidersModule } from '../providers/providers.module';
import { ArgosSicOutboxController } from './argos-sic-outbox.controller';
import { AuthModule } from '../auth/auth.module';
import { ArgosSicOutboxService } from './argos-sic-outbox.service';
import { GoogleProspectingService } from './google-prospecting.service';
import { ToolRegistryService } from './tool-registry.service';
import { SicClientService } from './sic-client.service';
import { VideoGeneratorService } from './video-generator.service';

@Module({
  imports: [ProvidersModule, ApprovalsModule, ArgosBrowserModule, HermesBrowserModule, AuthModule],
  controllers: [ArgosSicOutboxController],
  providers: [
    GoogleProspectingService,
    VideoGeneratorService,
    SicClientService,
    ArgosSicOutboxService,
    ToolRegistryService,
  ],
  exports: [ToolRegistryService, SicClientService, ArgosSicOutboxService],
})
export class ToolsModule {}
