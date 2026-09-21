import { Module } from '@nestjs/common';

import { ApprovalsModule } from '../approvals/approvals.module';
import { ProvidersModule } from '../providers/providers.module';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  imports: [ProvidersModule, ApprovalsModule],
  providers: [ToolRegistryService],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
