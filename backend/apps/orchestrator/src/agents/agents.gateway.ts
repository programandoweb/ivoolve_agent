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
import { AgentBuilderService } from './agent-builder.service';
import { AgentRuntimeService } from './agent-runtime.service';

interface AgentMessagePayload {
  sessionId: string;
  message: string;
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
      this.logger.log(`Socket autenticado: ${client.id} (${user.username})`);
      client.emit('agent:connected', {
        socketId: client.id,
        namespace: '/agents',
        user,
      });
    } catch {
      client.emit('agent:error', { message: 'Sesión inválida o expirada.' });
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

    if (!client.data.user) {
      client.emit(`${eventPrefix}:error`, {
        message: 'Autenticación requerida.',
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

    client.emit(`${eventPrefix}:processing`, {
      sessionId,
      agent: 'jorge',
    });

    try {
      const result =
        mode === 'builder'
          ? await this.builder.chat(sessionId, message)
          : await this.runtime.chat(sessionId, message);

      client.emit(`${eventPrefix}:response`, result);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Error desconocido';

      this.logger.error(
        `Error procesando sesión ${sessionId}: ${detail}`,
      );

      client.emit(`${eventPrefix}:error`, {
        sessionId,
        message: detail,
      });
    }
  }
}
