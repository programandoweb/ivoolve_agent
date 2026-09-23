import { ArgosPairingService } from './argos-pairing.service';
import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { ArgosBrowserService } from './argos-browser.service';

@WebSocketGateway({ namespace: '/argos-browser', transports: ['websocket'], cors: { origin: true }, maxHttpBufferSize: 400000 })
export class ArgosBrowserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ArgosBrowserGateway.name);
  constructor(private readonly browser: ArgosBrowserService, private readonly pairing: ArgosPairingService) {}

  async handleConnection(socket: Socket): Promise<void> {
    const origin = String(socket.handshake.headers.origin ?? '');
    const allowed = String(process.env.ARGOS_BROWSER_ALLOWED_EXTENSION_IDS ?? '')
      .split(',').map(id => id.trim()).filter(Boolean);
    const extensionId = /^chrome-extension:\/\/([a-p]{32})$/.exec(origin)?.[1];
    if (!extensionId || (allowed.length && !allowed.includes(extensionId))) {
      socket.emit('argos:error', { message: 'Solo se admite Argos instalado en Chrome.' });
      socket.disconnect(true);
      return;
    }

    // Preferimos la credencial emitida al aprobar el navegador en el dashboard.
    // El modo directo legado solo se habilita detrás de una red privada.
    const hasToken = await this.pairing.valid(socket.handshake.auth?.deviceToken);
    const direct = process.env.ARGOS_BROWSER_DIRECT_ENABLED === 'true';
    if (hasToken || direct) {
      if (!this.browser.connect(socket)) {
        socket.emit('argos:error', { message: 'Ya hay otro navegador Argos ejecutándose.' });
        socket.disconnect(true);
        return;
      }
      socket.data.argosAuthorized = true;
      socket.emit('argos:ready', { agent: 'argos-prospector', queueDepth: this.browser.queueDepth });
      return;
    }

    try {
      const request = this.pairing.start(socket);
      socket.emit('argos:pair:code', request);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error creando emparejamiento';
      socket.emit('argos:error', { message });
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket): void { this.browser.disconnect(socket); this.pairing.disconnect(socket); }

  @SubscribeMessage('argos:result')
  result(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown): void {
    if (socket.data.argosAuthorized === true) this.browser.complete(socket, body);
  }

  @SubscribeMessage('argos:status')
  status(@ConnectedSocket() socket: Socket): void {
    socket.emit('argos:status', { connected: this.browser.available, queueDepth: this.browser.queueDepth });
  }
}
