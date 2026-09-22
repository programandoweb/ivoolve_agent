import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AgentRegistryService } from '../agents/agent-registry.service';
import { AgentRuntimeService } from '../agents/agent-runtime.service';
import { ExecutionTraceService } from '../database/execution-trace.service';
import { LlmService } from '../llm/llm.service';
import { ProvidersService } from '../providers/providers.service';
import { NormalizedProviderMessage } from '../providers/provider-message.types';
import { RedisService } from '../state/redis.service';

@Injectable()
export class ProviderRoutingService {
  private readonly logger = new Logger(ProviderRoutingService.name);

  constructor(
    private readonly providers: ProvidersService,
    private readonly agents: AgentRegistryService,
    private readonly runtime: AgentRuntimeService,
    private readonly llm: LlmService,
    private readonly redis: RedisService,
    private readonly traces: ExecutionTraceService,
  ) {}

  async handle(message: NormalizedProviderMessage): Promise<void> {
    const claimKey =
      `ivoolve:provider-message:${message.providerId}:${message.messageId}`;
    const claimed = await this.redis.claim(claimKey, 86_400);

    if (!claimed) return;

    const executionId = randomUUID();
    let tenantId: string | undefined;
    let traceStarted = false;

    try {
      const provider = await this.providers.get(message.providerId);
      tenantId = provider.tenantId;
      const agentId = await this.selectAgent(provider.agentIds, message.text);

      await this.traces.start({
        id: executionId,
        tenantId,
        providerId: message.providerId,
        conversationId: message.conversationId,
        externalMessageId: message.messageId,
        agentId: agentId ?? undefined,
        source: 'provider',
        input: {
          sender: message.sender,
          conversationId: message.conversationId,
          messageId: message.messageId,
          text: message.text,
        },
        metadata: {
          providerType: provider.type,
          providerName: provider.name,
        },
      });
      traceStarted = true;

      if (!agentId) {
        await this.traces.event(
          executionId,
          {
            level: 'warning',
            stage: 'routing.ignored',
            message: 'El provider no tiene agentes válidos asignados.',
            data: {
              providerId: message.providerId,
              configuredAgentIds: provider.agentIds,
            },
          },
          tenantId,
        );
        await this.traces.finish(executionId, 'ignored', {
          stage: 'ignored',
          error: 'Provider sin agentes asignados.',
          tenantId,
        });
        return;
      }

      await this.traces.event(
        executionId,
        {
          stage: 'routing.selected',
          message: 'Se seleccionó el agente para procesar el mensaje.',
          data: {
            agentId,
            providerId: message.providerId,
          },
        },
        tenantId,
      );

      const sessionId =
        `tenant:${tenantId}:provider:${message.providerId}:contact:${message.conversationId}`;
      const result = await this.runtime.chatAsAgent(
        sessionId,
        message.text,
        agentId,
        {
          source: 'provider',
          tenantId,
          executionId,
        },
      );

      await this.traces.event(
        executionId,
        {
          stage: 'provider.send.request',
          message: 'El runtime enviará la respuesta por el provider.',
          data: {
            providerId: message.providerId,
            recipient: message.sender,
            answer: result.answer,
          },
        },
        tenantId,
      );

      const sendResult = await this.providers.sendText(
        message.providerId,
        agentId,
        message.sender,
        result.answer,
        tenantId,
      );

      await this.traces.event(
        executionId,
        {
          stage: 'provider.send.completed',
          message: 'El provider confirmó el envío de la respuesta.',
          data: sendResult,
        },
        tenantId,
      );

      await this.traces.finish(executionId, 'completed', {
        stage: 'completed',
        output: result,
        tenantId,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      if (traceStarted) {
        await this.traces.finish(executionId, 'failed', {
          stage: 'failed',
          error: detail,
          tenantId,
        });
      }

      await this.redis.delete(claimKey);

      this.logger.error(
        `Falló routing del mensaje ${message.messageId}: ${detail}`,
      );

      throw error;
    }
  }

  private async selectAgent(
    allowedAgentIds: string[],
    message: string,
  ): Promise<string | null> {
    const valid = allowedAgentIds.filter((id) => this.agents.get(id));

    if (valid.length === 0) return null;
    if (valid.length === 1) return valid[0];

    const candidates = valid
      .map((id) => {
        const agent = this.agents.get(id);
        return [
          `id=${id}`,
          `rol=${agent?.metadata?.role ?? 'sin rol'}`,
          `objetivo=${agent?.metadata?.primaryGoal ?? 'sin objetivo'}`,
        ].join(' | ');
      })
      .join('\n');

    const answer = await this.llm.complete([
      {
        role: 'system',
        content: [
          'Actúa como Jorge, router supervisor de agentes.',
          'Selecciona exactamente un id de la lista permitida.',
          'No inventes ids. Responde únicamente el id, sin explicación.',
          '',
          candidates,
        ].join('\n'),
      },
      { role: 'user', content: message },
    ]);

    const selected = answer.trim().toLowerCase();
    return valid.includes(selected) ? selected : valid[0];
  }
}
