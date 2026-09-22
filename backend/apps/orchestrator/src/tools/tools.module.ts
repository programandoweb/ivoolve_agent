import { Module } from '@nestjs/common';

import { ApprovalsModule } from '../approvals/approvals.module';
import { ProvidersModule } from '../providers/providers.module';
import { GoogleProspectingService } from './google-prospecting.service';
import { ToolRegistryService } from './tool-registry.service';
import { SicClientService } from './sic-client.service';
import { VideoGeneratorService } from './video-generator.service';

@Module({
  imports: [ProvidersModule, ApprovalsModule],
  providers: [
    GoogleProspectingService,
    VideoGeneratorService,
    SicClientService,
    ToolRegistryService,
  ],
  exports: [ToolRegistryService, SicClientService],
})
export class ToolsModule {}
