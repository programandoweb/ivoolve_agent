import { Injectable, Logger, OnModuleInit, OnModuleDestroy, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { DatabaseService } from '../database/database.service';
import { SicClientService } from '../tools/sic-client.service';

export interface HermesEvidence { sourceType:string; url:string; title:string; fetchedAt:string; result:string; extracted:Record<string,unknown>; summary:string; confidence:number }
interface Row extends RowDataPacket { id:string;tenant_id:string;task_id:string;research_id:string;prospect_id:string;payload_json:string;status:string;attempts:number; }
interface TaskRow extends RowDataPacket { tenant_id:string;research_id:string;prospect_id:string; }

@Injectable()
export class HermesEvidenceOutboxService implements OnModuleInit, OnModuleDestroy {
 private readonly logger=new Logger(HermesEvidenceOutboxService.name);
 private timer?:ReturnType<typeof setInterval>;
 private draining=false;
 constructor(private readonly db:DatabaseService,private readonly sic:SicClientService){}
 onModuleInit(){this.timer=setInterval(()=>void this.drain().catch(e=>this.logger.warn('Hermes sync: '+String(e))),30000);this.timer.unref?.();}
 onModuleDestroy(){if(this.timer)clearInterval(this.timer);}
 async register(task:{taskId:string;tenantId:string;researchId:string;prospectId:string}):Promise<void>{
  if(!this.db.enabled)throw new ServiceUnavailableException('MariaDB es obligatoria para Hermes.');
  await this.db.execute(`INSERT INTO hermes_browser_tasks (task_id,tenant_id,research_id,prospect_id,status,created_at)
    VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE task_id=task_id`,
    [task.taskId,task.tenantId,task.researchId,task.prospectId,'dispatched',new Date()]);
 }
 async receive(body:{tenantId:string;taskId:string;researchId:string;prospectId:string;evidence:HermesEvidence[]}):Promise<{stored:number;synced:number;pending:number}>{
  if(!this.db.enabled)throw new ServiceUnavailableException('MariaDB no disponible; conservar lote en Chrome.');
  const [task]=await this.db.query<TaskRow[]>('SELECT tenant_id,research_id,prospect_id FROM hermes_browser_tasks WHERE task_id=? LIMIT 1',[body.taskId]);
  if(!task||task.tenant_id!==body.tenantId||task.research_id!==body.researchId||task.prospect_id!==body.prospectId)throw new BadRequestException('Tarea Hermes no autorizada por SIC/Agent.');
  if(!Array.isArray(body.evidence)||body.evidence.length>16)throw new BadRequestException('Cantidad de evidencias inválida.');
  for(const evidence of body.evidence){
   if(!evidence || typeof evidence.url!=='string' || typeof evidence.sourceType!=='string'
    ||typeof evidence.result!=='string'||evidence.result.length>40000
    ||typeof evidence.summary!=='string'||evidence.summary.length>1500)
      throw new BadRequestException('Evidencia incompleta o sobredimensionada.');
   let parsed:URL;
   try { parsed=new URL(evidence.url); } catch { throw new BadRequestException('URL de evidencia inválida.'); }
   const host=parsed.hostname.toLowerCase();
   const domainAllowed=(root:string)=>host===root || host.endsWith('.'+root);
   const search=domainAllowed('google.com')||domainAllowed('google.com.co');
   const allowed=(evidence.sourceType==='google_search_browser'||evidence.sourceType==='google_images_browser')
     ? search && parsed.pathname==='/search'
     : evidence.sourceType==='colombia_government_browser'
       ? domainAllowed('gov.co')
       : evidence.sourceType==='commerce_registry_browser'
         ? domainAllowed('rues.org.co')||domainAllowed('camarapereira.org.co')
         : evidence.sourceType==='public_social_profile_browser'
           ? domainAllowed('instagram.com')||domainAllowed('facebook.com')||domainAllowed('linkedin.com') : false;
   if(parsed.protocol!=='https:'||!allowed)throw new BadRequestException('URL y tipo de fuente no coinciden.');
  }
  for(const evidence of body.evidence){
   const hash=createHash('sha256').update(evidence.url+'\n'+evidence.result).digest('hex');
   await this.db.execute(`INSERT INTO hermes_sic_outbox
    (id,tenant_id,task_id,research_id,prospect_id,fingerprint,payload_json,status,attempts,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id`,
    [randomUUID(),task.tenant_id,body.taskId,body.researchId,body.prospectId,hash,JSON.stringify(evidence),'pending',0,new Date(),new Date()]);
  }
  await this.db.execute("UPDATE hermes_browser_tasks SET status='stored' WHERE task_id=?",[body.taskId]);
  // ACK de Agent debe enviarse ANTES del intento HTTP hacia SIC.
  const rows=await this.db.query<Array<RowDataPacket&{status:string;count:number}>>(
   'SELECT status,COUNT(*) AS count FROM hermes_sic_outbox WHERE task_id=? GROUP BY status',[body.taskId]);
  const count=(s:string)=>Number(rows.find(r=>r.status===s)?.count||0);
  return {stored:rows.reduce((s,r)=>s+Number(r.count),0),synced:count('synced'),pending:count('pending')+count('processing')+count('failed')};
 }
 async statusForTask(taskId:string):Promise<{stored:number;synced:number;pending:number}>{
  const rows=await this.db.query<Array<RowDataPacket&{status:string;total:number}>>(
   'SELECT status,COUNT(*) AS total FROM hermes_sic_outbox WHERE task_id=? GROUP BY status',[taskId]);
  const count=(status:string)=>Number(rows.find(row=>row.status===status)?.total||0);
  return {stored:rows.reduce((n,row)=>n+Number(row.total),0),
    synced:count('synced'),pending:count('pending')+count('processing')+count('failed')};
 }
 async hasPending(researchId:string,tenantId:string){const [r]=await this.db.query<Array<RowDataPacket&{total:number}>>(
   "SELECT COUNT(*) AS total FROM hermes_sic_outbox WHERE research_id=? AND tenant_id=? AND status<>'synced'",[researchId,tenantId]);
  const [active]=await this.db.query<Array<RowDataPacket&{total:number}>>(
   "SELECT COUNT(*) AS total FROM hermes_browser_tasks WHERE research_id=? AND tenant_id=? AND status='dispatched'",[researchId,tenantId]);
  return Number(r?.total||0)+Number(active?.total||0)>0;}
 async list(tenantId:string){
  return this.db.query<Row[]>(`SELECT id,task_id,research_id,prospect_id,payload_json,status,attempts,last_error,created_at,synced_at
  FROM hermes_sic_outbox WHERE tenant_id=? ORDER BY created_at DESC LIMIT 100`,[tenantId]).then(rows=>rows.map(row=>{
    const evidence=JSON.parse(row.payload_json) as HermesEvidence;
    const raw=evidence.extracted?.images;
    const images=Array.isArray(raw)?raw.slice(0,10):[];
    return {id:row.id,task_id:row.task_id,research_id:row.research_id,
      prospect_id:row.prospect_id,status:row.status,attempts:row.attempts,
      last_error:(row as Row&{last_error?:string}).last_error,created_at:(row as Row&{created_at?:Date}).created_at,
      synced_at:(row as Row&{synced_at?:Date}).synced_at,
      sourceType:evidence.sourceType,sourceUrl:evidence.url,title:evidence.title,
      capturedAt:evidence.fetchedAt,obtainedVia:evidence.extracted?.obtainedVia||'chrome_visible_dom',
      verificationStatus:evidence.extracted?.verificationStatus||'unverified',
      images:images.map(img=>({
        thumbnailUrl:(img as Record<string,unknown>)?.thumbnailUrl,
        landingPageUrl:(img as Record<string,unknown>)?.landingPageUrl,
        sourcePageUrl:(img as Record<string,unknown>)?.sourcePageUrl,
        alt:(img as Record<string,unknown>)?.alt,
        usageRights:'not_verified',
      }))
    };
  }));
 }
 async retry(id:string,tenantId:string){
  const changed=await this.db.execute("UPDATE hermes_sic_outbox SET status='pending',next_attempt_at=NULL WHERE id=? AND tenant_id=? AND status IN ('pending','failed')",[id,tenantId]);
  if(changed.affectedRows===1)await this.sendOne(id);
  return {ok:true};
 }
 async retryAll(tenantId:string){
  await this.db.execute("UPDATE hermes_sic_outbox SET status='pending',next_attempt_at=NULL WHERE tenant_id=? AND status IN ('pending','failed')",[tenantId]);
  await this.drain();
  return {ok:true};
 }
 async drain(){
  if(this.draining||!this.db.enabled)return;
  this.draining=true;
  try{
   const rows=await this.db.query<Row[]>(`SELECT * FROM hermes_sic_outbox
    WHERE (status IN ('pending','failed') AND (next_attempt_at IS NULL OR next_attempt_at<=?))
      OR (status='processing' AND locked_at<?)
    ORDER BY created_at LIMIT 20`,[new Date(),new Date(Date.now()-180000)]);
   for(const row of rows)if(!await this.sendOne(row.id))break;
  }finally{this.draining=false;}
 }
 private async sendOne(id:string):Promise<boolean>{
  const now=new Date();
  const claimed=await this.db.execute(`UPDATE hermes_sic_outbox SET status='processing',attempts=attempts+1,locked_at=?,updated_at=?
    WHERE id=? AND ((status IN ('pending','failed') AND (next_attempt_at IS NULL OR next_attempt_at<=?))
    OR (status='processing' AND locked_at<?))`,[now,now,id,now,new Date(Date.now()-180000)]);
  if(claimed.affectedRows!==1)return true;
  const [row]=await this.db.query<Row[]>('SELECT * FROM hermes_sic_outbox WHERE id=?',[id]);
  if(!row)return false;
  try{
   const evidence=JSON.parse(row.payload_json) as HermesEvidence;
   await this.sic.addResearchEvidence(row.research_id,{
    url:evidence.url,sourceType:evidence.sourceType,fetchedAt:evidence.fetchedAt,
    result:evidence.result,extracted:evidence.extracted,summary:evidence.summary,confidence:evidence.confidence,
   });
   await this.db.execute("UPDATE hermes_sic_outbox SET status='synced',synced_at=?,locked_at=NULL,last_error=NULL,next_attempt_at=NULL,updated_at=? WHERE id=?",[new Date(),new Date(),id]);
   // A task is marked synced only after SIC ACKs every stored evidence.
   const [remaining]=await this.db.query<Array<RowDataPacket&{total:number}>>(
    "SELECT COUNT(*) AS total FROM hermes_sic_outbox WHERE task_id=? AND status<>'synced'",[row.task_id]);
   if(Number(remaining?.total||0)===0){
    await this.db.execute("UPDATE hermes_browser_tasks SET status='synced' WHERE task_id=? AND status='stored'",[row.task_id]);
   }
   return true;
  }catch(error){
   const message=(error instanceof Error?error.message:String(error)).slice(0,1200);
   const delay=Math.min(60000*Math.pow(2,Math.min(row.attempts,6)),21600000);
   await this.db.execute("UPDATE hermes_sic_outbox SET status='failed',last_error=?,next_attempt_at=?,locked_at=NULL,updated_at=? WHERE id=?",[message,new Date(Date.now()+delay),new Date(),id]);
   this.logger.warn('Hermes evidence pending SIC: '+id+' '+message);
   return false;
  }
 }
}
