import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProvidersService } from '../providers/providers.service';
import {
  RuntimeToolDefinition,
  ToolCallEnvelope,
  ToolExecutionContext,
} from './tool.types';

@Injectable()
export class ToolRegistryService {
  constructor(private readonly providers: ProvidersService) {}

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
          'Envía un mensaje de texto por un provider autorizado para el agente actual.',
        arguments: {
          providerId: 'ID del provider autorizado',
          recipient: 'Destinatario o JID',
          text: 'Texto a enviar',
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
        const providers = await this.providers.list();
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
        // El rol del humano se conserva incluso si Jorge delega a otro agente.
        // Los turnos autónomos de providers no traen actorRole y no se bloquean.
        if (context.actorRole === 'viewer') {
          throw new ForbiddenException(
            'El rol viewer no puede ejecutar tools de escritura.',
          );
        }

        const providerId = this.requiredString(call, 'providerId');
        const recipient = this.requiredString(call, 'recipient');
        const text = this.requiredString(call, 'text');

        return this.providers.sendText(
          providerId,
          context.agentId,
          recipient,
          text,
        );
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
}
