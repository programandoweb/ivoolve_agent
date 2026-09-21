import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthModule } from '../auth/auth.module';
import { ProvidersModule } from '../providers/providers.module';
import { RuntimeModule } from '../runtime/runtime.module';
import {
  AGENT_JOBS_QUEUE,
  AgentJobsService,
} from './agent-jobs.service';
import { AgentJobsController } from './agent-jobs.controller';
import { ProviderMessageQueueBridge } from './provider-message.bridge';
import { ProviderMessageProcessor } from './provider-message.processor';

@Module({
  imports: [
    AuthModule,
    ProvidersModule,
    RuntimeModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(
          config.get<string>('REDIS_URL', 'redis://localhost:6379'),
        );

        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            ...(redisUrl.password ? { password: redisUrl.password } : {}),
            ...(redisUrl.username ? { username: redisUrl.username } : {}),
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: AGENT_JOBS_QUEUE,
    }),
  ],
  controllers: [AgentJobsController],
  providers: [
    AgentJobsService,
    ProviderMessageQueueBridge,
    ProviderMessageProcessor,
  ],
  exports: [BullModule, AgentJobsService],
})
export class AgentQueueModule {}
