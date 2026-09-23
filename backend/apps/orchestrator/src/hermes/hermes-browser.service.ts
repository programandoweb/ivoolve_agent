import { Injectable, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Socket } from 'socket.io';
import { HermesEvidence, HermesEvidenceOutboxService } from './hermes-evidence-outbox.service';
type Task={tenantId:string;taskId:string;researchId:string;prospectId:string;prospectName:string;queries:string[];maxPages:number;resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>};
@Injectable()
export class HermesBrowserService{
 private worker?:Socket;
 private workerTenantId?:string;
 private active?:Task;
 private readonly queue:Task[]=[];
 constructor(private readonly outbox:HermesEvidenceOutboxService){}
 get available(){return Boolean(this.worker?.connected);}
 get queueDepth(){return this.queue.length+Number(Boolean(this.active));}
 connect(socket:Socket,tenantId:string){if(this.worker?.connected)return false;this.worker=socket;this.workerTenantId=tenantId;this.dispatch();return true;}
 disconnect(socket:Socket){
  if(this.worker?.id!==socket.id)return;
  this.worker=undefined;
  this.workerTenantId=undefined;
  if(this.active){const t=this.active;this.active=undefined;clearTimeout(t.timer);t.reject(Error('HERMES_BROWSER_DISCONNECTED')); }
 }
 async investigate(context:{researchId:string;prospectId:string;tenantId:string;prospectName:string},queries:string[]){
  if(!this.available||this.workerTenantId!==context.tenantId)throw new ServiceUnavailableException('Conecta una extensión Hermes autorizada para este tenant.');
  if(!context.researchId||!context.prospectId||!context.tenantId)throw new BadRequestException('Hermes requiere investigación y prospecto SIC auténticos.');
  const safe=queries.filter(q=>typeof q==='string'&&q.length>1&&q.length<=160).slice(0,8);
  if(!safe.length)throw new BadRequestException('Proporciona consultas de investigación específicas.');
  const taskId=randomUUID();
  await this.outbox.register({taskId,tenantId:context.tenantId,researchId:context.researchId,prospectId:context.prospectId});
  return new Promise((resolve,reject)=>{
   const task:Task={tenantId:context.tenantId,taskId,researchId:context.researchId,prospectId:context.prospectId,
    prospectName:context.prospectName.slice(0,180),queries:safe,maxPages:safe.length,resolve,reject,
    timer:setTimeout(()=>{
     if(this.active?.taskId===taskId){this.active=undefined;this.worker?.emit('hermes:cancel',{taskId});}
     else{const i=this.queue.findIndex(q=>q.taskId===taskId);if(i>=0)this.queue.splice(i,1);}
     reject(Error('HERMES_BROWSER_TIMEOUT'));this.dispatch();
    },240000)};
   this.queue.push(task);this.dispatch();
  });
 }
 async complete(socket:Socket,body:unknown){
  if(this.worker?.id!==socket.id||!this.workerTenantId||!body||typeof body!=='object')return;
  const data=body as {taskId?:string;researchId?:string;prospectId?:string;status?:string;evidence?:HermesEvidence[];error?:string};
  if(typeof data.taskId!=='string')return;
  // La tabla de tareas registrada antes del despacho permite aceptar reenvíos
  // después de reiniciar Agent, sin confiar en los IDs aportados por Chrome.
  if(data.status==='success'&&typeof data.researchId==='string'&&typeof data.prospectId==='string'&&Array.isArray(data.evidence)){
   try{
    const saved=await this.outbox.receive({tenantId:this.workerTenantId,taskId:data.taskId,researchId:data.researchId,prospectId:data.prospectId,evidence:data.evidence});
    socket.emit('hermes:stored',{taskId:data.taskId,...saved});
    if(this.active?.taskId===data.taskId){
     const t=this.active;this.active=undefined;clearTimeout(t.timer);
     t.resolve({taskId:data.taskId,researchId:data.researchId,prospectId:data.prospectId,evidenceCount:saved.stored,
      persistence:{storedInAgent:saved.stored,syncedInSic:saved.synced,pendingSic:saved.pending},
      evidence:data.evidence.map(e=>({url:e.url,title:e.title,summary:e.summary,sourceType:e.sourceType,capturedAt:e.fetchedAt,
       obtainedVia:e.extracted?.obtainedVia,verificationStatus:e.extracted?.verificationStatus,
       images:Array.isArray(e.extracted?.images)?e.extracted.images.slice(0,10):undefined}))});this.dispatch();
    }
    void this.outbox.drain().catch(()=>undefined);
   }catch(error){
    socket.emit('hermes:error',{message:'No se pudo guardar en Agent; la extensión conservará el lote.'});
    if(this.active?.taskId===data.taskId){const t=this.active;this.active=undefined;clearTimeout(t.timer);t.reject(error instanceof Error?error:Error(String(error)));this.dispatch();}
   }
  }else if(this.active?.taskId===data.taskId){
   const t=this.active;this.active=undefined;clearTimeout(t.timer);t.reject(Error(data.error||'HERMES_BROWSER_FAILED'));this.dispatch();
  }
 }
 private dispatch(){
  if(!this.worker?.connected||this.active)return;
  const index=this.queue.findIndex(t=>t.tenantId===this.workerTenantId);
  if(index<0)return;
  const [t]=this.queue.splice(index,1);
  this.active=t;
  this.worker.emit('hermes:task',{taskId:t.taskId,researchId:t.researchId,prospectId:t.prospectId,prospectName:t.prospectName,queries:t.queries,maxPages:t.maxPages});
 }
}
