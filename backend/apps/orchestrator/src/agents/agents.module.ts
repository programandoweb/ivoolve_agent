import { Module } from '@nestjs/common';

import { AgentsController } from './agents.controller';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRuntimeService } from './agent-runtime.service';

@Module({
  controllers: [AgentsController],
  providers: [AgentRegistryService, AgentRuntimeService],
  exports: [AgentRegistryService, AgentRuntimeService],
})
export class AgentsModule {}
