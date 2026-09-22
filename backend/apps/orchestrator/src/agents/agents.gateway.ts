import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { ExecutionTraceService } from '../database/execution-trace.service';
import { AgentBuilderService } from './agent-builder.service';
import { AgentRuntimeService } from './agent-runtime.service';

interface AgentMessagePayload {
  sessionId: string;
  message: string;
  agentId?: string;
}

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return undefined;

  const prefix = `${name}=`;
  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));

  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

@WebSocketGateway({
  namespace: '/agents',
  cors: {
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:5021',
    credentials: true,
  },
  transports: ['websocket'],
})
export class AgentsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AgentsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly runtime: AgentRuntimeService,
    private readonly builder: AgentBuilderService,
    private readonly auth: AuthService,
    private readonly traces: ExecutionTraceService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = getCookieValue(
      client.handshake.headers.cookie,
      'ivoolve_session',
    );

    if (!token) {
      client.emit('agent:error', { message: 'Autenticación requerida.' });
      client.disconnect(true);
      return;
    }

    try {
      const user = await this.auth.verifyToken(token);
      client.data.user = user;
      this.logger.log(
        `Socket autenticado: ${client.id} (${user.username}/${user.tenantId})`,
      );
      client.emit('agent:connected', {
        socketId: client.id,
        namespace: '/agents',
        user,
      });
    } catch {
      client.emit('agent:error', {
        message: 'Sesión inválida o expirada.',
      });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket desconectado: ${client.id}`);
  }

  @SubscribeMessage('agent:message')
  async handleAgentMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AgentMessagePayload,
  ): Promise<void> {
    await this.processMessage(client, payload, 'chat');
  }

  @SubscribeMessage('agent:history:request')
  async handleAgentHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId?: string; agentId?: string },
  ): Promise<void> {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user) {
      client.emit('agent:history', {
        sessionId: payload?.sessionId,
        messages: [],
        error: 'Autenticación requerida.',
      });
      return;
    }

    const sessionId = payload?.sessionId?.trim();
    const agentId = payload?.agentId?.trim().toLowerCase() || 'jorge';
    if (!sessionId) {
      client.emit('agent:history', {
        sessionId,
        messages: [],
        error: 'sessionId es obligatorio.',
      });
      return;
    }

    const runtimeSessionId = `tenant:${user.tenantId}:${sessionId}`;
    const session = await this.runtime.getConversation(
      runtimeSessionId,
      agentId,
      user.tenantId,
    );

    client.emit('agent:history', {
      sessionId,
      agentId,
      messages: session?.messages ?? [],
    });
  }


  @SubscribeMessage('agent-builder:message')
  async handleAgentBuilderMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AgentMessagePayload,
  ): Promise<void> {
    await this.processMessage(client, payload, 'builder');
  }

  private async processMessage(
    client: Socket,
    payload: AgentMessagePayload,
    mode: 'chat' | 'builder',
  ): Promise<void> {
    const eventPrefix = mode === 'builder' ? 'agent-builder' : 'agent';
    const user = client.data.user as AuthenticatedUser | undefined;

    if (!user) {
      client.emit(`${eventPrefix}:error`, {
        message: 'Autenticación requerida.',
      });
      return;
    }

    if (mode === 'builder' && user.role !== 'admin') {
      client.emit(`${eventPrefix}:error`, {
        message:
          'Solo un administrador puede crear capacidades globales de agentes.',
      });
      return;
    }

    const sessionId = payload?.sessionId?.trim();
    const message = payload?.message?.trim();

    if (!sessionId || !message) {
      client.emit(`${eventPrefix}:error`, {
        message: 'sessionId y message son obligatorios.',
      });
      return;
    }

    // La sesión visible al navegador puede mantenerse corta/aleatoria,
    // mientras Redis queda aislado por tenant.
    const runtimeSessionId = `tenant:${user.tenantId}:${sessionId}`;

    const requestedAgent = payload?.agentId?.trim().toLowerCase();
    const effectiveAgent =
      mode === 'chat'
        ? this.resolveEffectiveAgent(requestedAgent, message)
        : requestedAgent;

    const executionId = this.traces.newId(mode === 'builder' ? 'builder' : 'chat');
    await this.traces.start({
      id: executionId,
      tenantId: user.tenantId,
      agentId: effectiveAgent || (mode === 'builder' ? 'agent-builder' : 'jorge'),
      source: mode === 'builder' ? 'interactive_builder' : 'interactive',
      input: {
        sessionId,
        message,
        requestedAgent,
        effectiveAgent,
        mode,
      },
      metadata: {
        socketId: client.id,
        actorId: user.id,
      },
    });

    if (
      mode === 'chat' &&
      effectiveAgent &&
      effectiveAgent !== (requestedAgent || 'jorge')
    ) {
      await this.traces.event(
        executionId,
        {
          stage: 'agent.routed',
          message: 'La petición fue enrutada automáticamente al agente especialista.',
          data: {
            requestedAgent: requestedAgent || 'jorge',
            effectiveAgent,
            reason: 'commercial_prospecting_intent',
          },
        },
        user.tenantId,
      );
    }

    client.emit(`${eventPrefix}:processing`, {
      sessionId,
      agent: effectiveAgent || 'jorge',
      executionId,
    });

    try {
      const result =
        mode === 'builder'
          ? await this.builder.chat(runtimeSessionId, message)
          : effectiveAgent
            ? await this.runtime.chatAsAgent(runtimeSessionId, message, effectiveAgent, {
                source: 'interactive',
                actorId: user.id,
                actorRole: user.role,
                tenantId: user.tenantId,
                executionId,
              })
            : await this.runtime.chat(runtimeSessionId, message, {
                source: 'interactive',
                actorId: user.id,
                actorRole: user.role,
                tenantId: user.tenantId,
                executionId,
              });

      await this.traces.finish(executionId, 'completed', {
        output: result,
        tenantId: user.tenantId,
        stage: 'completed',
      });

      client.emit(`${eventPrefix}:response`, {
        ...result,
        sessionId,
        executionId,
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Error desconocido';

      await this.traces.finish(executionId, 'failed', {
        error: detail,
        tenantId: user.tenantId,
        stage: 'failed',
      });

      this.logger.error(
        `Error procesando sesión ${runtimeSessionId}: ${detail}`,
      );

      client.emit(`${eventPrefix}:error`, {
        sessionId,
        executionId,
        message: detail,
      });
    }
  }

  private resolveEffectiveAgent(
    requestedAgent: string | undefined,
    message: string,
  ): string | undefined {
    const entryAgent = requestedAgent || 'jorge';
    if (entryAgent !== 'jorge') return requestedAgent;

    const normalized = message
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    const discoveryIntent =
      /\b(busca|buscar|buscame|encuentra|encontrar|encuentrame|localiza|localizar|prospecta|prospectar|consigue|conseguir|investiga|investigar)\b/.test(
        normalized,
      );
    const businessTarget =
      /\b(empresa|empresas|negocio|negocios|prospecto|prospectos|cliente|clientes|proveedor|proveedores|boutique|boutiques|compania|companias)\b/.test(
        normalized,
      );

    if (discoveryIntent && businessTarget) {
      return 'argos-prospector';
    }

    return requestedAgent;
  }
}
