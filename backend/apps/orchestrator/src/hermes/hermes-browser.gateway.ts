import { Logger } from '@nestjs/common';
import { WebSocketGateway, ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage } from '@nestjs/websockets';
import type { Socket } from 'socket.io';
import { HermesPairingService } from './hermes-pairing.service';
import { HermesBrowserService } from './hermes-browser.service';
@WebSocketGateway({namespace:'/hermes-browser',transports:['websocket'],cors:{origin:true},maxHttpBufferSize:1000000})
export class HermesBrowserGateway implements OnGatewayConnection,OnGatewayDisconnect {
 private readonly logger=new Logger(HermesBrowserGateway.name);
 constructor(private readonly browser:HermesBrowserService,private readonly pairing:HermesPairingService){}
 async handleConnection(socket:Socket){
  const origin=String(socket.handshake.headers.origin||'');
  const allow=String(process.env.HERMES_BROWSER_ALLOWED_EXTENSION_IDS||'').split(',').map(s=>s.trim()).filter(Boolean);
  const extensionId=/^chrome-extension:\/\/([a-p]{32})$/.exec(origin)?.[1];
  if(!extensionId||(allow.length>0&&!allow.includes(extensionId))){
   socket.emit('hermes:error',{message:'Se requiere la extensión Hermes instalada en Chrome.'});socket.disconnect(true);return;
  }
  const tenantId=await this.pairing.resolveTenant(socket.handshake.auth?.deviceToken);
  if(tenantId){
   if(!this.browser.connect(socket,tenantId)){
    socket.emit('hermes:error',{message:'Ya existe un dispositivo Hermes conectado.'});socket.disconnect(true);return;
   }
   socket.data.hermesAuthorized=true;
   socket.data.hermesTenantId=tenantId;
   socket.emit('hermes:ready',{agent:'hermes-researcher',queueDepth:this.browser.queueDepth});
   return;
  }
  try{socket.emit('hermes:pair:code',this.pairing.start(socket));}
  catch(error){this.logger.warn('No fue posible iniciar emparejamiento Hermes');socket.emit('hermes:error',{message:'Emparejamiento no disponible'});socket.disconnect(true);}
 }
 handleDisconnect(socket:Socket){this.browser.disconnect(socket);this.pairing.disconnect(socket);}
 @SubscribeMessage('hermes:result')
 async result(@ConnectedSocket()socket:Socket,@MessageBody()body:unknown){
  if(socket.data.hermesAuthorized===true)await this.browser.complete(socket,body);
 }
 @SubscribeMessage('hermes:status')
 status(@ConnectedSocket()socket:Socket){if(socket.data.hermesAuthorized===true)socket.emit('hermes:status',{queueDepth:this.browser.queueDepth});}
}
