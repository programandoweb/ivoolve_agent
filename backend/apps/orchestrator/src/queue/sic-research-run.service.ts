import { Injectable } from '@nestjs/common';

import { AgentRuntimeService } from '../agents/agent-runtime.service';
import { ExecutionTraceService } from '../database/execution-trace.service';
import { SicClientService } from '../tools/sic-client.service';
import { SicResearchRunPayload } from './sic-research-run.types';

@Injectable()
export class SicResearchRunService {
  constructor(
    private readonly runtime: AgentRuntimeService,
    private readonly sic: SicClientService,
    private readonly traces: ExecutionTraceService,
  ) {}

  async handle(run: SicResearchRunPayload): Promise<void> {
    const normalizedSources = (run.sources ?? []).map((source) => {
      const raw = source.raw;
      if (typeof raw !== 'string' || !raw.trim()) return source;
      try {
        return { ...source, raw: JSON.parse(raw) as unknown };
      } catch {
        return source;
      }
    });

    await this.traces.event(run.researchId, {
      stage: 'worker.started',
      message: 'BullMQ inició la investigación del prospecto.',
      data: {
        prospectId: run.prospectId,
        agentId: run.agentId,
      },
    });

    const prompt = [
      'Investiga a fondo este prospecto existente en Ivoolve SIC.',
      'Research ID: ' + run.researchId,
      'Prospect ID: ' + run.prospectId,
      'Prospecto JSON:',
      JSON.stringify(run.prospect),
      'Fuentes existentes JSON:',
      JSON.stringify(normalizedSources),
      'Perfiles sociales conocidos JSON:',
      JSON.stringify(run.socialProfiles ?? []),
      '',
      'Reglas:',
      '1. Trabaja únicamente sobre este prospecto; no conviertas la tarea en una campaña de prospección.',
      '2. Usa research.browser_verify con la extensión Chrome Hermes como canal obligatorio por defecto. Usa prospectName, city y activity solo desde el contexto SIC.',
      '3. Google Search y Google Imágenes usados dentro de Chrome son navegación de la extensión, no Google API.',
      '4. NO uses prospecting.google_search, prospecting.google_maps_search ni prospecting.google_maps_reviews salvo autorización humana explícita AUTORIZO GOOGLE API en el mensaje actual. Este prompt interno no constituye autorización.',
      '5. profile.discovery contiene hechos de descubrimiento observados por Argos. Úsalos como contexto y enriquécelos con nuevas evidencias; no los reescribas ni los conviertas en inferencias.',
      '6. Las evidencias Chrome se preservan primero en el outbox MariaDB de Agent y luego se sincronizan con SIC. No declares persistencia SIC sin ACK.',
      '7. No inventes datos. Distingue hechos, inferencias y desconocidos.',
      '8. Cambia la consulta cuando los resultados dejen de aportar evidencia nueva.',
      '9. Investiga en loop hasta agotar consultas razonables o alcanzar el límite de tools.',
      '10. No llames sic.research.complete mientras existan tareas Chrome o evidencias pendientes de SIC.',
      '11. Al finalizar llama sic.research.complete con profile siguiendo EXACTAMENTE el schema indicado abajo. Además, tu respuesta final debe ser exclusivamente el mismo JSON, sin Markdown ni texto adicional.',
      '',
      'SCHEMA JSON OBLIGATORIO:',
      JSON.stringify({
        prospect: {
          legal_name: null,
          contact_name: null,
          document_type: null,
          document_number: null,
          email: null,
          phone: null,
          mobile: null,
          website: null,
          domain: null,
          maps_url: null,
          address: null,
          city: null,
          region: null,
          country_code: null,
          sector: null,
          description: null,
        },
        activity: 'unknown',
        corporate: {},
        digital_presence: { social_profiles: [] },
        commercial: { products_services: [], target_market: null, opportunities: [], pain_points: [] },
        compliance: {},
        unknowns: [],
        confidence: 0,
        sources: [],
      }),
    ].join('\n');

    try {
      const result = await this.runtime.chatAsAgent(
        'sic-research:' + run.researchId,
        prompt,
        run.agentId || 'hermes-researcher',
        {
          source: 'integration',
          executionId: run.researchId,
          researchId: run.researchId,
          prospectId: run.prospectId,
          campaignContext: {
            prospect: run.prospect,
            sources: normalizedSources,
            socialProfiles: run.socialProfiles,
          },
        },
      );

      // Fallback determinístico: si el modelo no llamó la tool final, cerramos el
      // run sin dejarlo colgado. ResearchService conserva el primer perfil rico
      // si Hermes ya completó la investigación.
      await this.sic.completeResearch(
        run.researchId,
        this.structuredProfile(result.answer),
      );

      await this.traces.finish(run.researchId, 'completed', {
        stage: 'completed',
        output: result,
        metadata: {
          prospectId: run.prospectId,
          researchId: run.researchId,
        },
      });
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'unknown_research_agent_error';
      await this.sic.failResearch(run.researchId, reason).catch(() => undefined);
      await this.traces.finish(run.researchId, 'failed', {
        stage: 'failed',
        error: reason,
        metadata: {
          prospectId: run.prospectId,
          researchId: run.researchId,
        },
      });
      throw error;
    }
  }

  private structuredProfile(answer: string): Record<string, unknown> {
    const trimmed = answer.trim();
    const candidate = trimmed
      .replace(/^\`\`\`(?:json)?\s*/i, '')
      .replace(/\s*\`\`\`$/, '')
      .trim();

    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const profile = parsed as Record<string, unknown>;
        if (typeof profile.tool !== 'string') {
          return profile;
        }
      }
    } catch {
      // La tool pudo haber completado el perfil; este fallback conserva la salida para auditoría.
    }

    return {
      activity: 'unknown',
      summary: answer,
      confidence: 0,
      unknowns: [],
      recommendedNextStep: 'Revisar evidencias persistidas por Hermes.',
    };
  }
}
