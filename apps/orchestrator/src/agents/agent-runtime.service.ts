import { Injectable, NotFoundException } from '@nestjs/common';

import { LlmService } from '../llm/llm.service';
import { LlmMessage } from '../llm/llm.types';
import { AgentSession, RedisService } from '../state/redis.service';
import { AgentRegistryService } from './agent-registry.service';

@Injectable()
export class AgentRuntimeService {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly redis: RedisService,
    private readonly llm: LlmService,
  ) {}

  async chat(sessionId: string, userMessage: string) {
    // 1. Recuperamos la sesión anterior. Si no existe, comienza una conversación nueva.
    const existing = await this.redis.getSession(sessionId);

    const session: AgentSession =
      existing ??
      ({
        sessionId,
        // Jorge es siempre el primer agente y fallback.
        activeAgent: 'jorge',
        messages: [],
        updatedAt: new Date().toISOString(),
      } satisfies AgentSession);

    // 2. En esta primera fase ejecutamos el agente activo.
    // Más adelante Jorge podrá cambiar activeAgent para delegar a otro agente.
    const agent = this.registry.get(session.activeAgent);

    if (!agent) {
      throw new NotFoundException(
        `El agente "${session.activeAgent}" no está registrado.`,
      );
    }

    // 3. Guardamos la entrada del usuario en memoria operativa.
    session.messages.push({
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    // 4. Construimos el prompt. Agent.md define identidad; Memory.md aporta memoria base.
    const systemPrompt = [
      agent.prompt,
      '\n## Memoria base versionada\n',
      agent.memory,
      '\n## Herramientas declaradas\n',
      agent.tools,
      '\n## Agentes actualmente registrados\n',
      this.registry.list().map((item) => `- ${item.id}`).join('\n'),
    ].join('\n');

    // 5. Convertimos el historial almacenado en Redis al formato que entiende el LLM.
    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.slice(-20).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    // 6. Aquí el LLM razona y genera la siguiente respuesta.
    const answer = await this.llm.complete(messages);

    // 7. Guardamos también la respuesta para la próxima petición.
    session.messages.push({
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    });

    session.updatedAt = new Date().toISOString();

    // 8. Redis persiste el nuevo estado después de terminar este ciclo.
    await this.redis.saveSession(session);

    return {
      sessionId,
      agent: agent.id,
      answer,
      messageCount: session.messages.length,
    };
  }
}
