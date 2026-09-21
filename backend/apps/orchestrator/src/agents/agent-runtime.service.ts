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
    const existing = await this.redis.getSession(sessionId);
    const activeAgent = existing?.activeAgent ?? 'jorge';

    return this.chatAsAgent(sessionId, userMessage, activeAgent);
  }

  async chatAsAgent(
    sessionId: string,
    userMessage: string,
    agentId: string,
  ) {
    const agent = this.registry.get(agentId);

    if (!agent) {
      throw new NotFoundException(
        `El agente "${agentId}" no está registrado.`,
      );
    }

    const existing = await this.redis.getSession(sessionId);
    const session: AgentSession =
      existing ??
      ({
        sessionId,
        activeAgent: agent.id,
        messages: [],
        updatedAt: new Date().toISOString(),
      } satisfies AgentSession);

    // Cuando el router selecciona explícitamente un agente, esa identidad queda
    // fijada para el turno y para la siguiente recuperación de la sesión.
    session.activeAgent = agent.id;

    session.messages.push({
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    const systemPrompt = [
      agent.prompt,
      '\n## Memoria base versionada\n',
      agent.memory,
      '\n## Herramientas declaradas\n',
      agent.tools,
      '\n## Agentes actualmente registrados\n',
      this.registry.list().map((item) => `- ${item.id}`).join('\n'),
    ].join('\n');

    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.slice(-20).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    const answer = await this.llm.complete(messages);

    session.messages.push({
      role: 'assistant',
      content: answer,
      createdAt: new Date().toISOString(),
    });

    session.updatedAt = new Date().toISOString();
    await this.redis.saveSession(session);

    return {
      sessionId,
      agent: agent.id,
      answer,
      messageCount: session.messages.length,
    };
  }
}
