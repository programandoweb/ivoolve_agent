import { Injectable, NotFoundException } from '@nestjs/common';

import { ExecutionTraceService } from '../database/execution-trace.service';
import { LlmService } from '../llm/llm.service';
import { LlmMessage } from '../llm/llm.types';
import { AgentSession, RedisService } from '../state/redis.service';
import { ToolRegistryService } from '../tools/tool-registry.service';
import {
  RuntimeInvocationContext,
  RuntimeTraceEvent,
} from './agent.types';
import { AgentRegistryService } from './agent-registry.service';
import { AgentConversationStoreService } from './agent-conversation-store.service';

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
    private readonly traces: ExecutionTraceService,
    private readonly conversations: AgentConversationStoreService,
  ) {}

  async chat(
    sessionId: string,
    userMessage: string,
    context: RuntimeInvocationContext = { source: 'interactive' },
  ) {
    const existing = await this.redis.getSession(sessionId);
    const activeAgent = existing?.activeAgent ?? 'jorge';

    return this.chatAsAgent(
      sessionId,
      userMessage,
      activeAgent,
      context,
    );
  }

  async chatAsAgent(
    sessionId: string,
    userMessage: string,
    agentId: string,
    context: RuntimeInvocationContext = { source: 'interactive' },
  ) {
    await this.trace(context, {
      stage: 'agent.request',
      message: 'El runtime recibió una petición para el agente.',
      data: {
        sessionId,
        agentId,
        source: context.source,
        userMessage,
      },
    });

    const agent = this.registry.get(agentId);

    if (!agent) {
      await this.trace(context, {
        level: 'error',
        stage: 'agent.not_found',
        message: 'El agente solicitado no está registrado.',
        data: { agentId },
      });
      throw new NotFoundException(
        `El agente "${agentId}" no está registrado.`,
      );
    }

    await this.trace(context, {
      stage: 'agent.loaded',
      message: 'Definición del agente cargada.',
      data: {
        agentId: agent.id,
        source: agent.source,
        metadata: agent.metadata,
      },
    });

    await this.conversations.ensureSession({
      sessionId,
      tenantId: context.tenantId,
      agentId: agent.id,
      actorId: context.actorId,
    });

    const cached = await this.redis.getSession(sessionId);
    const durable = await this.conversations.loadSession({
      sessionId,
      tenantId: context.tenantId,
      agentId: agent.id,
    });

    // Redis acelera la conversación activa; MariaDB conserva la sesión de forma
    // durable. Si venimos de una sesión antigua que solo estaba en Redis,
    // migramos los mensajes faltantes a la persistencia durable.
    if (cached && durable && cached.messages.length > durable.messages.length) {
      for (const message of cached.messages.slice(durable.messages.length)) {
        await this.conversations.appendMessage(sessionId, message);
      }
    }

    const existing = cached ?? durable;
    const session: AgentSession =
      existing ??
      ({
        sessionId,
        activeAgent: agent.id,
        messages: [],
        updatedAt: new Date().toISOString(),
      } satisfies AgentSession);

    session.activeAgent = agent.id;

    const userEntry = {
      role: 'user' as const,
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    session.messages.push(userEntry);
    await this.conversations.appendMessage(sessionId, userEntry);

    await this.trace(context, {
      stage: 'session.loaded',
      message: 'Sesión del agente preparada.',
      data: {
        sessionId,
        previousMessageCount: existing?.messages.length ?? 0,
        currentMessageCount: session.messages.length,
      },
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
      '\n## Skills especializados del agente\n',
      agent.skills || 'Sin skills adicionales versionados.',
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

    let answer = await this.completeWithTrace(
      messages,
      context,
      'llm.initial',
    );

    const maxToolIterations = context.source === 'integration' ? 20 : 3;
    for (let iteration = 0; iteration < maxToolIterations; iteration += 1) {
      const call = this.tools.parse(answer);
      if (!call) {
        await this.trace(context, {
          stage: 'agent.response',
          message: 'El modelo devolvió una respuesta final sin tool pendiente.',
          data: { iteration, answer },
        });
        break;
      }

      await this.trace(context, {
        stage: 'tool.request',
        message: `El agente solicitó ejecutar la tool "${call.tool}".`,
        data: {
          iteration,
          tool: call.tool,
          arguments: call.arguments,
        },
      });

      let result: unknown;
      const toolStartedAt = Date.now();
      try {
        result = await this.tools.execute(call, {
          agentId: agent.id,
          source: context.source,
          actorRole: context.actorRole,
          actorId: context.actorId,
          tenantId: context.tenantId,
          executionId: context.executionId,
          correlationId: context.correlationId,
          campaignId: context.campaignId,
          campaignContext: context.campaignContext,
        });
      } catch (error) {
        await this.trace(context, {
          level: 'error',
          stage: 'tool.failed',
          message: `La tool "${call.tool}" falló.`,
          data: {
            iteration,
            tool: call.tool,
            arguments: call.arguments,
            durationMs: Date.now() - toolStartedAt,
            error: this.errorMessage(error),
          },
        });
        throw error;
      }

      await this.trace(context, {
        stage: 'tool.completed',
        message: `La tool "${call.tool}" terminó correctamente.`,
        data: {
          iteration,
          tool: call.tool,
          arguments: call.arguments,
          result,
          durationMs: Date.now() - toolStartedAt,
        },
      });

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

      answer = await this.completeWithTrace(
        messages,
        context,
        `llm.after_tool.${iteration + 1}`,
      );
    }

    if (agent.id === 'jorge') {
      const delegation = this.parseDelegation(answer);

      if (
        delegation &&
        delegation.delegate !== 'jorge' &&
        this.registry.get(delegation.delegate)
      ) {
        await this.trace(context, {
          stage: 'agent.delegation',
          message: 'La petición fue delegada a otro agente.',
          data: delegation,
        });
        const delegated = await this.chatAsAgent(
          `${sessionId}:delegate:${delegation.delegate}`,
          delegation.message?.trim() || userMessage,
          delegation.delegate,
          {
            ...context,
            source: 'delegation',
          },
        );
        answer = delegated.answer;
      }
    }

    const assistantEntry = {
      role: 'assistant' as const,
      content: answer,
      createdAt: new Date().toISOString(),
    };
    session.messages.push(assistantEntry);
    await this.conversations.appendMessage(sessionId, assistantEntry);

    session.updatedAt = new Date().toISOString();
    await this.redis.saveSession(session);

    await this.trace(context, {
      stage: 'session.saved',
      message: 'La sesión fue persistida en Redis.',
      data: {
        sessionId,
        agentId: agent.id,
        messageCount: session.messages.length,
        answer,
      },
    });

    return {
      sessionId,
      agent: agent.id,
      answer,
      messageCount: session.messages.length,
    };
  }

  async getConversation(
    sessionId: string,
    agentId: string,
    tenantId?: string,
  ): Promise<AgentSession | null> {
    const cached = await this.redis.getSession(sessionId);
    if (cached) return cached;

    const durable = await this.conversations.loadSession({
      sessionId,
      tenantId,
      agentId,
    });
    if (!durable) return null;

    await this.redis.saveSession(durable);
    return durable;
  }

  private async completeWithTrace(
    messages: LlmMessage[],
    context: RuntimeInvocationContext,
    stage: string,
  ): Promise<string> {
    const startedAt = Date.now();
    await this.trace(context, {
      stage: `${stage}.request`,
      message: 'Solicitud enviada al proveedor LLM.',
      data: {
        messageCount: messages.length,
        messages,
      },
    });

    try {
      const answer = await this.llm.complete(messages);
      await this.trace(context, {
        stage: `${stage}.response`,
        message: 'Respuesta recibida del proveedor LLM.',
        data: {
          durationMs: Date.now() - startedAt,
          answer,
        },
      });
      return answer;
    } catch (error) {
      await this.trace(context, {
        level: 'error',
        stage: `${stage}.failed`,
        message: 'Falló la solicitud al proveedor LLM.',
        data: {
          durationMs: Date.now() - startedAt,
          error: this.errorMessage(error),
        },
      });
      throw error;
    }
  }

  private async trace(
    context: RuntimeInvocationContext,
    event: RuntimeTraceEvent,
  ): Promise<void> {
    if (context.executionId) {
      await this.traces.event(
        context.executionId,
        event,
        context.tenantId,
      );
    }

    if (context.traceReporter) {
      await context.traceReporter({
        ...event,
        createdAt: event.createdAt ?? new Date().toISOString(),
      }).catch(() => undefined);
    }
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
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
