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
import { AgentRuntimeService } from './agent-runtime.service';

interface AgentMessagePayload {
  sessionId: string;
  message: string;
}

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

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
    private readonly auth: AuthService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    // La cookie HttpOnly creada por Next.js también viaja al handshake WebSocket.
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
        `Socket autenticado: ${client.id} (${user.username})`,
      );

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
    if (!client.data.user) {
      client.emit('agent:error', { message: 'Autenticación requerida.' });
      return;
    }

    const sessionId = payload?.sessionId?.trim();
    const message = payload?.message?.trim();

    if (!sessionId || !message) {
      client.emit('agent:error', {
        message: 'sessionId y message son obligatorios.',
      });
      return;
    }

    client.emit('agent:processing', {
      sessionId,
      agent: 'jorge',
    });

    try {
      const result = await this.runtime.chat(sessionId, message);
      client.emit('agent:response', result);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Error desconocido';

      this.logger.error(
        `Error procesando sesión ${sessionId}: ${detail}`,
      );

      client.emit('agent:error', {
        sessionId,
        message: detail,
      });
    }
  }
}
