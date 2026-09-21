import { Module } from '@nestjs/common';

import { AgentsModule } from '../agents/agents.module';
import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { ProvidersModule } from '../providers/providers.module';
import { RedisModule } from '../state/redis.module';
import { ExecutionLogStore } from './execution-log.store';
import { ProviderRoutingService } from './provider-routing.service';
import { RuntimeController } from './runtime.controller';

@Module({
  imports: [
    AuthModule,
    AgentsModule,
    ProvidersModule,
    LlmModule,
    RedisModule,
  ],
  controllers: [RuntimeController],
  providers: [ExecutionLogStore, ProviderRoutingService],
  exports: [ExecutionLogStore, ProviderRoutingService],
})
export class RuntimeModule {}
