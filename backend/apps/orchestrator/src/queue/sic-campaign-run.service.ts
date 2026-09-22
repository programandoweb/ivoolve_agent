import { Injectable } from '@nestjs/common';
import { AgentRuntimeService } from '../agents/agent-runtime.service';
import { SicClientService } from '../tools/sic-client.service';
import { SicCampaignRunPayload } from './sic-campaign-run.types';

@Injectable()
export class SicCampaignRunService {
  constructor(
    private readonly runtime: AgentRuntimeService,
    private readonly sic: SicClientService,
  ) {}

  async handle(run: SicCampaignRunPayload): Promise<void> {
    await this.sic.markRunning(run.execution_id);
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
      '3. Cada lote de prospectos encontrado debe persistirse inmediatamente con sic.prospects.upsert.',
      '4. Incluye executionId=' + run.execution_id + ' al usar sic.prospects.upsert.',
      '5. Conserva placeId/sourceExternalId, mapsUrl, teléfono, web, dirección y categoría cuando existan.',
      '6. Respeta el objetivo y las consultas del contexto.',
      '7. Al terminar responde con un resumen breve de la ejecución.',
    ].join('\n');

    const result = await this.runtime.chatAsAgent(
      'sic:' + run.execution_id,
      prompt,
      run.agent_id,
      { source: 'integration' },
    );

    await this.sic.complete(run.execution_id, {
      agentId: run.agent_id,
      campaignId: run.campaign_id,
      correlationId: run.correlation_id,
      summary: result.answer,
    });
  }
}
