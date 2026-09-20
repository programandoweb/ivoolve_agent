import { Body, Controller, Get, Post } from '@nestjs/common';

import { AgentRegistryService } from './agent-registry.service';
import { AgentRuntimeService } from './agent-runtime.service';
import { ChatDto } from './dto/chat.dto';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly runtime: AgentRuntimeService,
  ) {}

  @Get()
  list() {
    // Exponemos solo IDs: no necesitamos enviar prompts completos al navegador.
    return {
      agents: this.registry.list().map((agent) => agent.id),
      fallback: 'jorge',
    };
  }

  @Post('chat')
  chat(@Body() dto: ChatDto) {
    // El controlador no sabe cómo funciona un agente.
    // Solo entrega la petición al runtime.
    return this.runtime.chat(dto.sessionId, dto.message);
  }
}
