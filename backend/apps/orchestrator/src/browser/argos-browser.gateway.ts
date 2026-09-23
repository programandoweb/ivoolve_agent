import { Logger } from '@nestjs/common';
import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { ArgosBrowserService } from './argos-browser.service';

@WebSocketGateway({ namespace: '/argos-browser', transports: ['websocket'], cors: { origin: true }, maxHttpBufferSize: 400000 })
export class ArgosBrowserGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ArgosBrowserGateway.name);
  constructor(private readonly browser: ArgosBrowserService) {}

  handleConnection(socket: Socket): void {
    const enabled = process.env.ARGOS_BROWSER_DIRECT_ENABLED === 'true';
    const origin = String(socket.handshake.headers.origin ?? '');
    const allowed = String(process.env.ARGOS_BROWSER_ALLOWED_EXTENSION_IDS ?? '')
      .split(',').map(id => id.trim()).filter(Boolean);
    const extensionId = /^chrome-extension:\/\/([a-p]{32})$/.exec(origin)?.[1];
    // Los orígenes de navegador NO equivalen a autenticación criptográfica:
    // usar únicamente detrás de un ingress privado. No se aceptan comandos
    // entrantes arbitrarios ni solicitudes a páginas diferentes de Maps.
    if (!enabled || !extensionId || (allowed.length > 0 && !allowed.includes(extensionId)) ||
        !this.browser.connect(socket)) {
      this.logger.warn('Argos Chrome rechazado (' + (enabled ? 'origen/ocupado' : 'deshabilitado') + ')');
      socket.emit('argos:error', { message: 'Conexión rechazada o modo directo deshabilitado.' });
      socket.disconnect(true);
      return;
    }
    socket.emit('argos:ready', { agent: 'argos-prospector', queueDepth: this.browser.queueDepth });
  }

  handleDisconnect(socket: Socket): void { this.browser.disconnect(socket); }

  @SubscribeMessage('argos:result')
  result(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown): void {
    this.browser.complete(socket, body);
  }

  @SubscribeMessage('argos:status')
  status(@ConnectedSocket() socket: Socket): void {
    socket.emit('argos:status', { connected: this.browser.available, queueDepth: this.browser.queueDepth });
  }
}
