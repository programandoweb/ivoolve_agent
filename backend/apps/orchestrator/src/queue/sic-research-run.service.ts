import { Injectable } from '@nestjs/common';

import { AgentRuntimeService } from '../agents/agent-runtime.service';
import { SicClientService } from '../tools/sic-client.service';
import { SicResearchRunPayload } from './sic-research-run.types';

@Injectable()
export class SicResearchRunService {
  constructor(
    private readonly runtime: AgentRuntimeService,
    private readonly sic: SicClientService,
  ) {}

  async handle(run: SicResearchRunPayload): Promise<void> {
    const prompt = [
      'Investiga a fondo este prospecto existente en Ivoolve SIC.',
      'Research ID: ' + run.researchId,
      'Prospect ID: ' + run.prospectId,
      'Prospecto JSON:',
      JSON.stringify(run.prospect),
      'Fuentes existentes JSON:',
      JSON.stringify(run.sources ?? []),
      'Perfiles sociales conocidos JSON:',
      JSON.stringify(run.socialProfiles ?? []),
      '',
      'Reglas:',
      '1. Trabaja únicamente sobre este prospecto; no conviertas la tarea en una campaña de prospección.',
      '2. Usa prospecting.google_search repetidamente con consultas distintas y específicas.',
      '3. El Google Programmable Search Engine configurado incluye fuentes como Instagram, Facebook, LinkedIn, DIAN y SECOP.',
      '4. Cada resultado de google_search se guarda automáticamente como evidencia en SIC.',
      '5. No inventes datos. Distingue hechos, inferencias y desconocidos.',
      '6. Cambia la consulta cuando los resultados dejen de aportar evidencia nueva.',
      '7. Investiga en loop hasta agotar consultas razonables o alcanzar el límite de tools.',
      '8. Finaliza obligatoriamente con sic.research.complete enviando un objeto profile estructurado.',
    ].join('\n');

    try {
      const result = await this.runtime.chatAsAgent(
        'sic-research:' + run.researchId,
        prompt,
        run.agentId || 'hermes-researcher',
        {
          source: 'integration',
          researchId: run.researchId,
          prospectId: run.prospectId,
          campaignContext: {
            prospect: run.prospect,
            sources: run.sources,
            socialProfiles: run.socialProfiles,
          },
        },
      );

      // Fallback determinístico: si el modelo no llamó la tool final, cerramos el
      // run sin dejarlo colgado. ResearchService conserva el primer perfil rico
      // si Hermes ya completó la investigación.
      await this.sic.completeResearch(run.researchId, {
        activity: 'unknown',
        summary: result.answer,
        confidence: 'pending_structured_confirmation',
        unknowns: [],
        recommendedNextStep: 'Revisar evidencias persistidas por Hermes.',
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'unknown_research_agent_error';
      await this.sic.failResearch(run.researchId, reason).catch(() => undefined);
      throw error;
    }
  }
}
