import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

import { AgentRuntimeService } from './agent-runtime.service';

interface AgentMessagePayload {
  sessionId: string;
  message: string;
}

/**
 * Este Gateway es el "hilo" persistente entre el navegador y NestJS.
 *
 * A diferencia de REST, el cliente abre la conexión una vez y luego envía
 * múltiples eventos sobre el mismo socket.
 */
@WebSocketGateway({
  namespace: '/agents',
  cors: {
    // Para esta fase didáctica aceptamos el origen configurado por el navegador.
    // En producción se endurecerá con lista explícita de orígenes.
    origin: true,
  },
  transports: ['websocket'],
})
export class AgentsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AgentsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly runtime: AgentRuntimeService) {}

  handleConnection(client: Socket): void {
    // Cada pestaña del navegador obtiene su propio socket.id.
    this.logger.log(`Socket conectado: ${client.id}`);

    client.emit('agent:connected', {
      socketId: client.id,
      namespace: '/agents',
    });
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket desconectado: ${client.id}`);
  }

  @SubscribeMessage('agent:message')
  async handleAgentMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AgentMessagePayload,
  ): Promise<void> {
    const sessionId = payload?.sessionId?.trim();
    const message = payload?.message?.trim();

    if (!sessionId || !message) {
      client.emit('agent:error', {
        message: 'sessionId y message son obligatorios.',
      });
      return;
    }

    // Avisamos al mismo cliente que Jorge empezó a procesar.
    // Más adelante este evento podrá incluir pasos, herramientas y subagentes.
    client.emit('agent:processing', {
      sessionId,
      agent: 'jorge',
    });

    try {
      // La lógica de negocio del agente no cambia.
      // Solo estamos cambiando el transporte: REST -> Socket.IO.
      const result = await this.runtime.chat(sessionId, message);

      // La respuesta viaja de regreso por el mismo hilo socket.
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
