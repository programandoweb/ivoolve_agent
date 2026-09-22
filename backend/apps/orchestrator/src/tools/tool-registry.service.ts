import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ApprovalsService } from '../approvals/approvals.service';
import { ProvidersService } from '../providers/providers.service';
import { GoogleProspectingService } from './google-prospecting.service';
import { VideoGeneratorService } from './video-generator.service';
import { SicClientService } from './sic-client.service';
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
    private readonly videoGenerator: VideoGeneratorService,
    private readonly sic: SicClientService,
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
        name: 'video.capabilities',
        description:
          'Consulta las capacidades actuales del worker local de generación de video Intel XPU.',
        arguments: {},
      },
      {
        name: 'video.generate',
        description:
          'Crea un job asíncrono de video local. Devuelve jobId para consultar después con video.status. Máximo 5 segundos.',
        arguments: {
          prompt: 'Prompt visual detallado para el video',
          negativePrompt: 'Prompt negativo opcional',
          durationSeconds: 'Duración entre 1 y 5 segundos',
          width: 'Ancho; por defecto 832',
          height: 'Alto; por defecto 480',
          fps: 'FPS; por defecto 16',
          seed: 'Semilla opcional reproducible',
        },
      },
      {
        name: 'video.status',
        description:
          'Consulta el estado de un job de generación de video y devuelve la URL del MP4 cuando termina.',
        arguments: {
          jobId: 'ID devuelto por video.generate',
        },
      },
      {
        name: 'sic.prospects.upsert',
        description:
          'Persiste en Ivoolve SIC un lote de prospectos encontrado durante una campaña externa. SIC deduplica y conserva la fuente de verdad.',
        arguments: {
          prospects: 'Array de prospectos. Cada item debe incluir name y datos verificables disponibles. El executionId real lo inyecta el runtime cuando la ejecución proviene de SIC.',
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

        const serializedProspects = results.map((result) =>
          this.serializeGooglePlace(result, query, context),
        );

        // Cuando la prospección nació en SIC, la persistencia es determinística:
        // no dependemos de que el LLM recuerde emitir otra tool call ni permitimos
        // que invente el executionId. Cada resultado verificable se guarda en SIC
        // inmediatamente después de Google Places.
        let persistence:
          | { mode: 'automatic'; executionId: string; savedCount: number; prospects: unknown[] }
          | undefined;

        if (context.executionId && context.campaignId) {
          const saved: unknown[] = [];
          for (const prospect of serializedProspects) {
            saved.push(
              await this.sic.upsertProspect(context.executionId, prospect),
            );
          }
          persistence = {
            mode: 'automatic',
            executionId: context.executionId,
            savedCount: saved.length,
            prospects: saved,
          };
        }

        return {
          query,
          source: 'google_maps',
          resultCount: results.length,
          results,
          serializedProspects,
          ...(persistence ? { persistence } : {}),
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

      case 'video.capabilities': {
        return this.videoGenerator.capabilities();
      }

      case 'video.generate': {
        if (context.actorRole === 'viewer') {
          throw new ForbiddenException(
            'El rol viewer no puede iniciar generación de video.',
          );
        }

        return this.videoGenerator.generate({
          prompt: this.requiredString(call, 'prompt'),
          negativePrompt: this.optionalString(call, 'negativePrompt'),
          durationSeconds: this.optionalNumber(call, 'durationSeconds', 5),
          width: this.optionalNumber(call, 'width', 832),
          height: this.optionalNumber(call, 'height', 480),
          fps: this.optionalNumber(call, 'fps', 16),
          seed: this.optionalNullableNumber(call, 'seed'),
        });
      }

      case 'video.status': {
        const jobId = this.requiredString(call, 'jobId');
        return this.videoGenerator.status(jobId);
      }

      case 'sic.prospects.upsert': {
        const requestedExecutionId = this.optionalString(call, 'executionId');
        const executionId = context.executionId ?? requestedExecutionId;

        if (!executionId || !context.campaignId) {
          throw new BadRequestException(
            'La tool "sic.prospects.upsert" solo puede persistir prospectos dentro de una ejecución real iniciada por SIC.',
          );
        }

        if (
          requestedExecutionId &&
          context.executionId &&
          requestedExecutionId !== context.executionId
        ) {
          throw new BadRequestException(
            'El executionId solicitado no coincide con la ejecución SIC activa.',
          );
        }

        const prospects = call.arguments?.prospects;
        if (!Array.isArray(prospects) || prospects.length < 1 || prospects.length > 50) {
          throw new BadRequestException(
            'La tool "sic.prospects.upsert" requiere entre 1 y 50 prospectos.',
          );
        }
        const saved: unknown[] = [];
        for (const item of prospects) {
          if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new BadRequestException('Cada prospecto debe ser un objeto.');
          }
          const source = item as Record<string, unknown>;
          if (typeof source.name !== 'string' || !source.name.trim()) {
            throw new BadRequestException('Cada prospecto requiere name.');
          }
          saved.push(
            await this.sic.upsertProspect(executionId, {
              ...source,
              address: source.address ?? source.formattedAddress,
              phone:
                source.phone ??
                source.internationalPhoneNumber ??
                source.nationalPhoneNumber,
              website: source.website ?? source.websiteUri,
              mapsUrl: source.mapsUrl ?? source.googleMapsUri,
              category: source.category ?? source.primaryType,
              sourceExternalId: source.sourceExternalId ?? source.placeId,
              sourceUrl:
                source.sourceUrl ?? source.googleMapsUri ?? source.mapsUrl,
              sourceType:
                typeof source.sourceType === 'string'
                  ? source.sourceType
                  : 'google_maps',
            }),
          );
        }
        return { savedCount: saved.length, prospects: saved };
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

  private serializeGooglePlace(
    source: {
      placeId: string;
      name: string;
      formattedAddress?: string;
      nationalPhoneNumber?: string;
      internationalPhoneNumber?: string;
      websiteUri?: string;
      googleMapsUri?: string;
      rating?: number;
      userRatingCount?: number;
      businessStatus?: string;
      primaryType?: string;
      confidence?: string;
    },
    query: string,
    context: ToolExecutionContext,
  ): Record<string, unknown> {
    const campaign = context.campaignContext ?? {};
    const country =
      typeof campaign.country === 'string' && campaign.country.trim()
        ? campaign.country.trim().toUpperCase()
        : 'CO';

    return {
      name: source.name,
      placeId: source.placeId,
      sourceExternalId: source.placeId,
      address: source.formattedAddress,
      phone:
        source.internationalPhoneNumber ?? source.nationalPhoneNumber,
      website: source.websiteUri,
      mapsUrl: source.googleMapsUri,
      sourceUrl: source.googleMapsUri,
      category: source.primaryType,
      city:
        typeof campaign.city === 'string' ? campaign.city : undefined,
      department:
        typeof campaign.department === 'string'
          ? campaign.department
          : undefined,
      country,
      sourceType: 'google_maps',
      confidence: source.confidence ?? 'high',
      rating: source.rating,
      userRatingCount: source.userRatingCount,
      businessStatus: source.businessStatus,
      searchQuery: query,
    };
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

  private optionalString(
    call: ToolCallEnvelope,
    key: string,
  ): string | undefined {
    const value = call.arguments?.[key];
    return typeof value === 'string' && value.trim()
      ? value.trim()
      : undefined;
  }

  private optionalNullableNumber(
    call: ToolCallEnvelope,
    key: string,
  ): number | undefined {
    const value = call.arguments?.[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
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
