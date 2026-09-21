import { Module } from '@nestjs/common';

import { AgentsModule } from '../../agents/agents.module';
import { AuthModule } from '../../auth/auth.module';
import {
  IvoolveOpsIntegrationController,
  IvoolveOpsSsoController,
} from './ivoolveops-integration.controller';
import { IvoolveOpsIntegrationService } from './ivoolveops-integration.service';

@Module({
  imports: [AgentsModule, AuthModule],
  controllers: [IvoolveOpsIntegrationController, IvoolveOpsSsoController],
  providers: [IvoolveOpsIntegrationService],
  exports: [IvoolveOpsIntegrationService],
})
export class IvoolveOpsIntegrationModule {}
