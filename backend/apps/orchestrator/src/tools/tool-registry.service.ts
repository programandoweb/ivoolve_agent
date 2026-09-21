import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ApprovalsService } from '../approvals/approvals.service';
import { ProvidersService } from '../providers/providers.service';
import { GoogleProspectingService } from './google-prospecting.service';
import {
  RuntimeToolDefinition,
  ToolCallEnvelope,
  ToolExecutionContext,
} from './tool.types';

@Injectable()
export class ToolRegistryService {
  constructor(
    private readonly providers: ProvidersService,
    private readonly approvals: ApprovalsService,
    private readonly googleProspecting: GoogleProspectingService,
  ) {}

  definitions(): RuntimeToolDefinition[] {
    return [
      {
        name: 'provider.list',
        description:
          'Lista los providers que el agente actual tiene autorizados, incluyendo id, nombre, tipo y estado.',
        arguments: {},
      },
      {
        name: 'provider.send_message',
        description:
          'Solicita el envío de un mensaje de texto por un provider autorizado. Puede requerir aprobación humana.',
        arguments: {
          providerId: 'ID del provider autorizado',
          recipient: 'Destinatario o JID',
          text: 'Texto a enviar',
        },
      },
      {
        name: 'prospecting.google_maps_search',
        description:
          'Busca empresas reales en Google Maps/Places. Debe ser la fuente primaria para descubrir prospectos.',
        arguments: {
          query:
            'Consulta natural incluyendo actividad y ubicación, por ejemplo: empresas de confección en Pereira Risaralda',
          maxResults: 'Cantidad opcional de resultados entre 1 y 20',
        },
      },
      {
        name: 'prospecting.google_search',
        description:
          'Busca información pública en Google Search para enriquecer un prospecto ya identificado.',
        arguments: {
          query: 'Consulta específica de enriquecimiento',
          maxResults: 'Cantidad opcional de resultados entre 1 y 10',
        },
      },
      {
        name: 'prospecting.score_lead',
        description:
          'Calcula un score reproducible de 0 a 100 usando datos verificables del prospecto y señales operativas.',
        arguments: {
          hasPhone: 'true si Google devolvió teléfono',
          hasWebsite: 'true si Google devolvió sitio web',
          ratingCount: 'Cantidad de reseñas de Google',
          hasOperationalSignals:
            'true si existen señales verificables de procesos que Ivoolve ERP puede resolver',
          hasDecisionSignal:
            'true si se identificó responsable, solicitud de demo, precio, propuesta o reunión',
          isOpenBusiness: 'true si Google indica que el negocio está operativo',
        },
      },
    ];
  }

  prompt(): string {
    return this.definitions()
      .map((tool) => {
        const args = Object.entries(tool.arguments)
          .map(([name, description]) => `${name}: ${description}`)
          .join('; ');

        return `- ${tool.name}: ${tool.description}${
          args ? ` Argumentos: ${args}` : ''
        }`;
      })
      .join('\n');
  }

  parse(candidate: string): ToolCallEnvelope | null {
    const trimmed = candidate.trim();
    if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

    try {
      const parsed = JSON.parse(trimmed) as ToolCallEnvelope;
      if (!parsed || typeof parsed.tool !== 'string') return null;
      return parsed;
    } catch {
      return null;
    }
  }

  async execute(
    call: ToolCallEnvelope,
    context: ToolExecutionContext,
  ): Promise<unknown> {
    switch (call.tool) {
      case 'provider.list': {
        const providers = await this.providers.list(context.tenantId);
        return providers
          .filter((provider) => provider.agentIds.includes(context.agentId))
          .map((provider) => ({
            id: provider.id,
            name: provider.name,
            type: provider.type,
            status: provider.status,
            phoneNumber: provider.phoneNumber,
          }));
      }

      case 'provider.send_message': {
        if (context.actorRole === 'viewer') {
          throw new ForbiddenException(
            'El rol viewer no puede ejecutar tools de escritura.',
          );
        }

        const providerId = this.requiredString(call, 'providerId');
        const recipient = this.requiredString(call, 'recipient');
        const text = this.requiredString(call, 'text');

        if (this.approvals.requiresApproval(call.tool)) {
          const approval = await this.approvals.request({
            tenantId: context.tenantId,
            agentId: context.agentId,
            actionName: call.tool,
            payload: {
              providerId,
              recipient,
              text,
            },
            requestedBy: context.actorId
              ? `user:${context.actorId}`
              : `agent:${context.agentId}`,
          });

          return {
            status: 'approval_required',
            approvalId: approval.id,
            action: approval.actionName,
            message:
              'La acción quedó pendiente de aprobación humana y aún no fue ejecutada.',
          };
        }

        return this.providers.sendText(
          providerId,
          context.agentId,
          recipient,
          text,
          context.tenantId,
        );
      }

      case 'prospecting.google_maps_search': {
        const query = this.requiredString(call, 'query');
        const maxResults = this.optionalNumber(call, 'maxResults', 10);
        const results = await this.googleProspecting.searchPlaces(
          query,
          maxResults,
        );

        return {
          query,
          source: 'google_maps',
          resultCount: results.length,
          results,
        };
      }

      case 'prospecting.google_search': {
        const query = this.requiredString(call, 'query');
        const maxResults = this.optionalNumber(call, 'maxResults', 10);
        const results = await this.googleProspecting.searchWeb(
          query,
          maxResults,
        );

        return {
          query,
          source: 'google_search',
          resultCount: results.length,
          results,
        };
      }

      case 'prospecting.score_lead': {
        const hasPhone = this.optionalBoolean(call, 'hasPhone');
        const hasWebsite = this.optionalBoolean(call, 'hasWebsite');
        const ratingCount = this.optionalNumber(call, 'ratingCount', 0);
        const hasOperationalSignals = this.optionalBoolean(
          call,
          'hasOperationalSignals',
        );
        const hasDecisionSignal = this.optionalBoolean(
          call,
          'hasDecisionSignal',
        );
        const isOpenBusiness = this.optionalBoolean(call, 'isOpenBusiness');

        let score = 0;
        const reasons: string[] = [];

        if (isOpenBusiness) {
          score += 15;
          reasons.push('negocio operativo +15');
        }
        if (hasPhone) {
          score += 15;
          reasons.push('teléfono verificable +15');
        }
        if (hasWebsite) {
          score += 10;
          reasons.push('sitio web verificable +10');
        }
        if (ratingCount >= 10) {
          score += 10;
          reasons.push('presencia/reputación validada +10');
        }
        if (ratingCount >= 50) {
          score += 5;
          reasons.push('volumen alto de reseñas +5');
        }
        if (hasOperationalSignals) {
          score += 30;
          reasons.push('señales de necesidad ERP +30');
        }
        if (hasDecisionSignal) {
          score += 15;
          reasons.push('señal comercial/decisor +15');
        }

        score = Math.min(score, 100);

        return {
          score,
          grade:
            score >= 75 ? 'hot' : score >= 50 ? 'warm' : score >= 30 ? 'cold' : 'research',
          reasons,
          handoffRecommended: hasDecisionSignal || score >= 75,
        };
      }

      default:
        throw new NotFoundException(
          `Tool "${call.tool}" no registrada en el runtime.`,
        );
    }
  }

  private requiredString(call: ToolCallEnvelope, key: string): string {
    const value = call.arguments?.[key];
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(
        `La tool "${call.tool}" requiere el argumento "${key}".`,
      );
    }
    return value.trim();
  }

  private optionalNumber(
    call: ToolCallEnvelope,
    key: string,
    fallback: number,
  ): number {
    const value = call.arguments?.[key];

    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }

    return fallback;
  }

  private optionalBoolean(call: ToolCallEnvelope, key: string): boolean {
    const value = call.arguments?.[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'si', 'sí'].includes(
        value.trim().toLowerCase(),
      );
    }
    return false;
  }
}
