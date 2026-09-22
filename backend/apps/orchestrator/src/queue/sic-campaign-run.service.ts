import { Injectable } from '@nestjs/common';

import { ExecutionTraceService } from '../database/execution-trace.service';
import { AgentRuntimeService } from '../agents/agent-runtime.service';
import { SicClientService } from '../tools/sic-client.service';
import { SicCampaignRunPayload } from './sic-campaign-run.types';

@Injectable()
export class SicCampaignRunService {
  constructor(
    private readonly runtime: AgentRuntimeService,
    private readonly sic: SicClientService,
    private readonly traces: ExecutionTraceService,
  ) {}

  async handle(run: SicCampaignRunPayload): Promise<void> {
    const report = async (event: {
      level?: 'debug' | 'info' | 'warning' | 'error';
      stage: string;
      message: string;
      data?: unknown;
      createdAt?: string;
    }) => {
      await this.sic.trace(run.execution_id, event as Record<string, unknown>)
        .catch(() => undefined);
    };

    await this.traces.event(run.execution_id, {
      stage: 'worker.started',
      message: 'BullMQ inició la ejecución de la campaña SIC.',
      data: {
        agentId: run.agent_id,
        campaignId: run.campaign_id,
        correlationId: run.correlation_id,
        context: run.context,
      },
    });
    await report({
      stage: 'worker.started',
      message: 'El worker de Ivoolve Agent inició la ejecución.',
      data: { agentId: run.agent_id },
    });

    try {
      await this.sic.markRunning(run.execution_id);
      await this.traces.event(run.execution_id, {
        stage: 'sic.running',
        message: 'SIC confirmó el estado running.',
      });
      await report({
        stage: 'sic.running',
        message: 'SIC confirmó el inicio de la ejecución.',
      });

      const prompt = [
        'Ejecuta esta campaña de prospección enviada por Ivoolve SIC.',
        'Execution ID: ' + run.execution_id,
        'Campaign ID: ' + run.campaign_id,
        'Contexto JSON:',
        JSON.stringify(run.context),
        '',
        'Reglas obligatorias:',
        '1. Usa Google Maps como fuente primaria.',
        '2. No inventes datos.',
        '3. Los resultados de Google Maps se serializan y persisten automáticamente en SIC por el runtime.',
        '4. No inventes ni escribas executionId; el runtime usa siempre el executionId real de SIC.',
        '5. Usa sic.prospects.upsert solo si necesitas persistir un lote adicional/enriquecido; el runtime inyectará el executionId.',
        '6. Conserva placeId, teléfono, web, dirección, categoría y URL de Maps cuando existan.',
        '7. Respeta el objetivo y las consultas del contexto.',
        '8. Al terminar responde con un resumen breve de la ejecución.',
      ].join('\n');

      await this.traces.event(run.execution_id, {
        stage: 'agent.invocation',
        message: 'Se invocará el agente de prospección.',
        data: { prompt, agentId: run.agent_id },
      });
      await report({
        stage: 'agent.invocation',
        message: 'Se invocó el agente de prospección.',
        data: { agentId: run.agent_id, prompt },
      });

      const result = await this.runtime.chatAsAgent(
        'sic:' + run.execution_id,
        prompt,
        run.agent_id,
        {
          source: 'integration',
          executionId: run.execution_id,
          correlationId: run.correlation_id,
          campaignId: run.campaign_id,
          campaignContext: run.context,
          traceReporter: report,
        },
      );

      await this.traces.event(run.execution_id, {
        stage: 'sic.complete.request',
        message: 'El agente terminó; se notificará el resultado a SIC.',
        data: { answer: result.answer },
      });

      await this.sic.complete(run.execution_id, {
        agentId: run.agent_id,
        campaignId: run.campaign_id,
        correlationId: run.correlation_id,
        summary: result.answer,
      });

      await report({
        stage: 'completed',
        message: 'Ivoolve Agent completó la ejecución.',
        data: { summary: result.answer },
      });
      await this.traces.finish(run.execution_id, 'completed', {
        stage: 'completed',
        output: result,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown_agent_error';

      await this.traces.event(run.execution_id, {
        level: 'error',
        stage: 'execution.failed',
        message: 'La ejecución falló.',
        data: {
          error: reason,
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
      await report({
        level: 'error',
        stage: 'execution.failed',
        message: 'La ejecución del agente falló.',
        data: { error: reason },
      });

      await this.sic.fail(run.execution_id, reason).catch(() => undefined);
      await this.traces.finish(run.execution_id, 'failed', {
        stage: 'failed',
        error: reason,
      });

      // Importante: relanzar para que BullMQ conserve el fallo real del job.
      throw error;
    }
  }
}
