import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ApprovalsService } from '../approvals/approvals.service';
import { ProvidersService } from '../providers/providers.service';
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
