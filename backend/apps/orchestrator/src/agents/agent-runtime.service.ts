import { Injectable, NotFoundException } from '@nestjs/common';

import { LlmService } from '../llm/llm.service';
import { LlmMessage } from '../llm/llm.types';
import { AgentSession, RedisService } from '../state/redis.service';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { AgentRegistryService } from './agent-registry.service';

interface DelegationEnvelope {
  delegate: string;
  message?: string;
}

@Injectable()
export class AgentRuntimeService {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly redis: RedisService,
    private readonly llm: LlmService,
    private readonly tools: ToolRegistryService,
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

    session.activeAgent = agent.id;

    session.messages.push({
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    });

    const registeredAgents = this.registry
      .list()
      .map((item) => {
        const role = item.metadata?.role ?? 'sin rol';
        const goal = item.metadata?.primaryGoal ?? 'sin objetivo';
        return `- ${item.id}: ${role}. ${goal}`;
      })
      .join('\n');

    const delegationInstructions =
      agent.id === 'jorge'
        ? [
            '\n## Delegación real\n',
            'Si otro agente registrado es claramente más adecuado para resolver la petición, puedes delegar.',
            'Para delegar responde ÚNICAMENTE JSON:',
            '{"delegate":"id-del-agente","message":"instrucción concreta para el subagente"}',
            'No delegues a jorge y no inventes ids.',
          ].join('\n')
        : '';

    const systemPrompt = [
      agent.prompt,
      '\n## Memoria base versionada\n',
      agent.memory,
      '\n## Herramientas declaradas por el agente\n',
      agent.tools,
      '\n## Tools ejecutables disponibles en el runtime\n',
      this.tools.prompt(),
      '',
      'Si necesitas ejecutar una tool, responde ÚNICAMENTE JSON con esta forma:',
      '{"tool":"nombre.tool","arguments":{"campo":"valor"}}',
      'El runtime ejecutará la tool y te devolverá el resultado para que continúes.',
      'Nunca afirmes que ejecutaste una acción si no recibiste el resultado de la tool.',
      '\n## Agentes actualmente registrados\n',
      registeredAgents,
      delegationInstructions,
    ].join('\n');

    const messages: LlmMessage[] = [
      { role: 'system', content: systemPrompt },
      ...session.messages.slice(-20).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ];

    let answer = await this.llm.complete(messages);

    // Bucle acotado para tools: evita ejecuciones infinitas por respuestas mal formadas.
    for (let iteration = 0; iteration < 3; iteration += 1) {
      const call = this.tools.parse(answer);
      if (!call) break;

      const result = await this.tools.execute(call, { agentId: agent.id });

      messages.push(
        { role: 'assistant', content: answer },
        {
          role: 'user',
          content: [
            `Resultado de la tool "${call.tool}":`,
            JSON.stringify(result),
            '',
            'Continúa la tarea. Si ya terminó, responde normalmente al usuario.',
          ].join('\n'),
        },
      );

      answer = await this.llm.complete(messages);
    }

    // Jorge puede entregar el turno a un subagente. Se usa una sesión hija para
    // no contaminar la conversación principal con memoria interna de delegación.
    if (agent.id === 'jorge') {
      const delegation = this.parseDelegation(answer);

      if (
        delegation &&
        delegation.delegate !== 'jorge' &&
        this.registry.get(delegation.delegate)
      ) {
        const delegated = await this.chatAsAgent(
          `${sessionId}:delegate:${delegation.delegate}`,
          delegation.message?.trim() || userMessage,
          delegation.delegate,
        );
        answer = delegated.answer;
      }
    }

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

  private parseDelegation(candidate: string): DelegationEnvelope | null {
    const trimmed = candidate.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

    try {
      const parsed = JSON.parse(trimmed) as DelegationEnvelope;
      if (!parsed || typeof parsed.delegate !== 'string') return null;

      return {
        delegate: parsed.delegate.trim().toLowerCase(),
        ...(typeof parsed.message === 'string'
          ? { message: parsed.message }
          : {}),
      };
    } catch {
      return null;
    }
  }
}
