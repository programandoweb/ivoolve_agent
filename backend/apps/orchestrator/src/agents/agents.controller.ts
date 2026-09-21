import { Controller, Get } from '@nestjs/common';

import { AgentRegistryService } from './agent-registry.service';

@Controller('agents')
export class AgentsController {
  constructor(private readonly registry: AgentRegistryService) {}

  @Get()
  list() {
    // REST queda únicamente para información auxiliar.
    // La conversación con los agentes ocurre por Socket.IO.
    return {
      agents: this.registry.list().map((agent) => agent.id),
      fallback: 'jorge',
      transport: 'socket.io',
      namespace: '/agents',
    };
  }
}
