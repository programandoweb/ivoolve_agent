import { Module } from '@nestjs/common';

import { AgentsController } from './agents.controller';
import { AgentsGateway } from './agents.gateway';
import { AgentRegistryService } from './agent-registry.service';
import { AgentRuntimeService } from './agent-runtime.service';

@Module({
  controllers: [AgentsController],
  providers: [
    AgentRegistryService,
    AgentRuntimeService,
    // El Gateway mantiene el canal Socket.IO abierto con los clientes.
    AgentsGateway,
  ],
  exports: [AgentRegistryService, AgentRuntimeService],
})
export class AgentsModule {}
