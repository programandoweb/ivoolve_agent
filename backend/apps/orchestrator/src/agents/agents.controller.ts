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
      agents: definitions.map((agent) => agent.id),
      details: definitions.map((agent) => ({
        id: agent.id,
        name: agent.metadata?.name ?? agent.id,
        role: agent.metadata?.role,
        primaryGoal: agent.metadata?.primaryGoal,
        skills: agent.metadata?.skills ?? [],
        executionMode: agent.metadata?.executionMode,
        source: agent.source,
        fallback: agent.id === 'jorge',
      })),
      fallback: 'jorge',
      transport: 'socket.io',
      namespace: '/agents',
    };
  }
}
