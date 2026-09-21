import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { AgentBuilderService } from './agent-builder.service';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { ManagedAgentStoreService } from './managed-agent-store.service';

@Module({
  imports: [AuthModule, LlmModule],
  controllers: [AgentsController],
  providers: [
    ManagedAgentStoreService,
    AgentRegistryService,
    AgentRuntimeService,
    AgentBuilderService,
    AgentsGateway,
  ],
  exports: [AgentRegistryService, AgentRuntimeService, AgentBuilderService],
})
export class AgentsModule {}
