import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AgentsModule } from './agents/agents.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { LlmModule } from './llm/llm.module';
import { ProvidersModule } from './providers/providers.module';
import { AgentQueueModule } from './queue/agent-queue.module';
import { RedisModule } from './state/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    RedisModule,
    LlmModule,
    AgentsModule,
    ProvidersModule,
    AgentQueueModule,
    HealthModule,
  ],
})
export class AppModule {}
