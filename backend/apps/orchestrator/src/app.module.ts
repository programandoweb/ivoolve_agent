import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AgentsModule } from './agents/agents.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LlmModule } from './llm/llm.module';
import { ProvidersModule } from './providers/providers.module';
import { AgentQueueModule } from './queue/agent-queue.module';
import { RuntimeModule } from './runtime/runtime.module';
import { RedisModule } from './state/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuditModule,
    AuthModule,
    RedisModule,
    LlmModule,
    ProvidersModule,
    AgentsModule,
    RuntimeModule,
    AgentQueueModule,
    HealthModule,
  ],
})
export class AppModule {}
