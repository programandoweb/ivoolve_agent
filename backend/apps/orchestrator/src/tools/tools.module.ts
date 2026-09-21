import { Module } from '@nestjs/common';

import { ProvidersModule } from '../providers/providers.module';
import { ToolRegistryService } from './tool-registry.service';

@Module({
  imports: [ProvidersModule],
  providers: [ToolRegistryService],
  exports: [ToolRegistryService],
})
export class ToolsModule {}
