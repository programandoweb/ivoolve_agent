import { Module } from '@nestjs/common';
import { AgentQueueModule } from '../../queue/agent-queue.module';
import { IvoolveSicIntegrationController } from './ivoolvesic-integration.controller';
import { IvoolveSicIntegrationService } from './ivoolvesic-integration.service';

@Module({
  imports: [AgentQueueModule],
  controllers: [IvoolveSicIntegrationController],
  providers: [IvoolveSicIntegrationService],
})
export class IvoolveSicIntegrationModule {}
