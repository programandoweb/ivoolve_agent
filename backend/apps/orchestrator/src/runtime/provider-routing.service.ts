import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { AgentRegistryService } from '../agents/agent-registry.service';
import { AgentRuntimeService } from '../agents/agent-runtime.service';
import { LlmService } from '../llm/llm.service';
import { ProvidersService } from '../providers/providers.service';
import { NormalizedProviderMessage } from '../providers/provider-message.types';
import { RedisService } from '../state/redis.service';
import { ExecutionLogStore } from './execution-log.store';
import { RuntimeExecutionRecord } from './execution-log.types';

@Injectable()
export class ProviderRoutingService {
  private readonly logger = new Logger(ProviderRoutingService.name);

  constructor(
    private readonly providers: ProvidersService,
    private readonly agents: AgentRegistryService,
    private readonly runtime: AgentRuntimeService,
    private readonly llm: LlmService,
    private readonly redis: RedisService,
    private readonly executions: ExecutionLogStore,
  ) {}

  async handle(message: NormalizedProviderMessage): Promise<void> {
    const claimed = await this.redis.claim(
      `ivoolve:provider-message:${message.providerId}:${message.messageId}`,
      86_400,
    );

    if (!claimed) return;

    const started = Date.now();
    const record: RuntimeExecutionRecord = {
      id: randomUUID(),
      providerId: message.providerId,
      conversationId: message.conversationId,
      externalMessageId: message.messageId,
      status: 'received',
      inputPreview: message.text.slice(0, 500),
      startedAt: new Date(started).toISOString(),
    };

    try {
      const provider = await this.providers.get(message.providerId);
      const agentId = await this.selectAgent(provider.agentIds, message.text);

      if (!agentId) {
        await this.executions.append({
          ...record,
          status: 'ignored',
          error: 'Provider sin agentes asignados.',
          finishedAt: new Date().toISOString(),
          durationMs: Date.now() - started,
        });
        return;
      }

      const processing: RuntimeExecutionRecord = {
        ...record,
        agentId,
        status: 'processing',
      };

      const sessionId =
        `provider:${message.providerId}:contact:${message.conversationId}`;
      const result = await this.runtime.chatAsAgent(
        sessionId,
        message.text,
        agentId,
      );

      await this.providers.sendText(
        message.providerId,
        agentId,
        message.sender,
        result.answer,
      );

      await this.executions.append({
        ...processing,
        status: 'completed',
        outputPreview: result.answer.slice(0, 500),
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);

      await this.executions.append({
        ...record,
        status: 'failed',
        error: detail.slice(0, 1000),
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - started,
      });

      this.logger.error(
        `Falló routing del mensaje ${message.messageId}: ${detail}`,
      );

      // Se relanza para que BullMQ aplique retry/backoff.
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
