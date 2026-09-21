import { Controller, Get, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { AgentRegistryService } from './agent-registry.service';

@Controller('agents')
@UseGuards(AuthGuard)
export class AgentsController {
  constructor(private readonly registry: AgentRegistryService) {}

  @Get()
  list() {
    const definitions = this.registry.list();

    return {
      // Se conserva el contrato simple usado por el chat.
      agents: definitions.map((agent) => agent.id),
      // details alimenta el dashboard sin romper consumidores existentes.
      details: definitions.map((agent) => ({
        id: agent.id,
        fallback: agent.id === 'jorge',
      })),
      fallback: 'jorge',
      transport: 'socket.io',
      namespace: '/agents',
    };
  }
}
