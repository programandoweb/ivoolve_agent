import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { LlmModule } from '../llm/llm.module';
import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRuntimeService } from './agent-runtime.service';

@Module({
  imports: [AuthModule, LlmModule],
  controllers: [AgentsController],
  providers: [
    AgentRegistryService,
    AgentRuntimeService,
    AgentsGateway,
  ],
  exports: [AgentRegistryService, AgentRuntimeService],
})
export class AgentsModule {}
