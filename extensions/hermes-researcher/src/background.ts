import { io, type Socket } from 'socket.io-client';
type Evidence = { sourceType: string; url: string; title: string; fetchedAt: string; result: string; extracted: Record<string, unknown>; summary: string; confidence: number };
type Task = { taskId: string; researchId: string; prospectId: string; prospectName: string; queries: string[]; maxPages: number };
type Pending = { taskId: string; researchId: string; prospectId: string; evidence: Evidence[] };
type State = { connected: boolean; running: boolean; phase: string; serverUrl: string; pairingCode?: string; pairingExpiresAt?: string; prospect?: string; count: number; sources: string[]; error?: string };
const state: State = { connected:false, running:false, phase:'Iniciando', serverUrl:'https://socket.orchestrator.programandoweb.net', count:0, sources:[] };
let socket: Socket | undefined;
let running=false, cancelled=false;
const pause=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
async function publish(patch:Partial<State>){ Object.assign(state,patch);await chrome.storage.local.set({hermesState:{...state}}); }
async function pending():Promise<Pending|undefined> {return (await chrome.storage.local.get('hermesPending')).hermesPending as Pending|undefined;}
async function deliver(){ const item=await pending();if(item && socket?.connected)socket.emit('hermes:result',{...item,status:'success'}); }
async function collect(task:Task):Promise<Evidence[]>{
 if(!/^[0-9a-f-]{36}$/i.test(task.taskId)||!task.researchId||!task.prospectId||!Array.isArray(task.queries))throw Error('INVALID_TASK');
 const queries=task.queries.filter(q=>typeof q==='string'&&q.length>=2&&q.length<=160).slice(0,Math.min(task.maxPages||12,12));
// Only explicitly allowlisted public sites are followed from search results.
const directHosts = (host: string) => host.endsWith('.gov.co') || [
  'rues.org.co','camarapereira.org.co',
].some(domain => host === domain || host.endsWith('.' + domain));
const toDirect = (links: Array<{url:string}>) => links.map(link => {
  try { return new URL(link.url); } catch { return undefined; }
}).find(link => link?.protocol === 'https:' && directHosts(link.hostname))?.href;

 if(!queries.length)throw Error('NO_QUERIES');
 const observations:Evidence[]=[];
 const tab=await chrome.tabs.create({url:'about:blank',active:true});
 if(!tab.id)throw Error('TAB_NOT_CREATED');
 try{
  for(const query of queries){
   if(cancelled)throw Error('CANCELLED');
   const isImages=query.startsWith('IMAGE:');
   const textQuery=isImages?query.slice(6).trim():query;
   const url='https://www.google.com/search?q='+encodeURIComponent(textQuery)+(isImages?'&tbm=isch':'');
   await chrome.tabs.update(tab.id,{url,active:true});
   await pause(3500);
   let observation:{url:string;title:string;text:string;links:{title:string;url:string}[];
    images?:Array<{alt:string;thumbnailUrl:string;landingPageUrl?:string;sourcePageUrl:string;obtainedVia:string}>;
    capturedAt:string;obtainedVia:string;access:string};
   try { observation=await chrome.tabs.sendMessage(tab.id,{type:'HERMES_OBSERVE'}); }
   catch{await publish({phase:'Fuente no accesible: '+url});continue;}
   if(!observation?.url?.startsWith('https://www.google.com/search') || observation.access!=='public_visible'){
    await publish({phase:'Fuente no disponible o bloqueada: '+textQuery});continue;
   }
   const images=(observation.images||[]).slice(0,10);
   observations.push({sourceType:isImages?'google_images_browser':'google_search_browser',url:observation.url,title:observation.title,
    fetchedAt:observation.capturedAt,
    result:JSON.stringify({text:observation.text.slice(0,7000),links:observation.links.slice(0,15),images,query:textQuery}),
    extracted:{query:textQuery,images,links:observation.links.slice(0,15),obtainedVia:observation.obtainedVia,
      sourcePageUrl:observation.url,verificationStatus:'search_index_unverified',imageUsageRights:'not_verified'},
    summary:observation.text.slice(0,650),confidence:0.4});
   // Official registry or public profile: capture its OWN rendered DOM, not
   // only Google's snippet. If access is restricted, do not fabricate evidence.
   if(!isImages){
    const direct=toDirect(observation.links);
    if(direct){
     try{
      await chrome.tabs.update(tab.id,{url:direct,active:true});await pause(3000);
      const actual=await chrome.tabs.sendMessage(tab.id,{type:'HERMES_OBSERVE'}) as typeof observation;
      if(actual?.url?.startsWith(new URL(direct).origin) && actual.access==='public_visible'){
       observations.push({sourceType:new URL(direct).hostname.endsWith('.gov.co')?'colombia_government_browser':
        /rues\.org\.co|camarapereira\.org\.co/.test(new URL(direct).hostname)?'commerce_registry_browser':'public_social_profile_browser',
        url:actual.url,title:actual.title,fetchedAt:actual.capturedAt,
        result:JSON.stringify({text:actual.text.slice(0,9500),links:actual.links.slice(0,15)}),
        extracted:{obtainedVia:actual.obtainedVia,discoveredVia:observation.url,sourcePageUrl:actual.url,
          verificationStatus:'direct_public_page_observed_identity_unconfirmed'},
        summary:actual.text.slice(0,650),confidence:0.6});
      }else await publish({phase:'Página inaccesible: '+direct});
     }catch{await publish({phase:'Página restringida o no accesible: '+direct});}
    }
   }
   await publish({phase:'Fuente observada: '+textQuery,count:observations.length,sources:observations.map(e=>e.url)});
   await pause(1500);
  }
  return observations;
 }finally{await chrome.tabs.remove(tab.id).catch(()=>undefined);}
}
async function connect(){
 const cfg=await chrome.storage.local.get(['hermesServerUrl','hermesDeviceToken']);
 const url=String(cfg.hermesServerUrl||state.serverUrl).replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(url)&&!/^http:\/\/localhost:5020$/.test(url)){await publish({error:'URL inválida'});return;}
 socket?.disconnect();
 socket=io(url+'/hermes-browser',{transports:['websocket'],reconnection:true,reconnectionDelay:2000,reconnectionDelayMax:30000,timeout:12000,auth:{deviceToken:cfg.hermesDeviceToken||undefined}});
 await publish({serverUrl:url,connected:false,pairingCode:undefined,phase:'Conectando',error:undefined});
 socket.on('hermes:pair:code',({code,expiresAt}:{code:string;expiresAt:string})=>{void publish({pairingCode:code,pairingExpiresAt:expiresAt,phase:'Esperando autorización del administrador'});});
 socket.on('hermes:paired',async ({token}:{token:string})=>{if(!/^[a-f0-9]{64}$/.test(token))return;await chrome.storage.local.set({hermesDeviceToken:token});void connect();});
 socket.on('hermes:ready',()=>{void publish({connected:true,pairingCode:undefined,pairingExpiresAt:undefined,phase:'Conectado; esperando tareas'});void deliver();});
 socket.on('connect_error',(error:Error)=>{void publish({connected:false,error:error.message,phase:'Error de conexión'});});
 socket.on('disconnect',()=>{void publish({connected:false,phase:'Sin conexión'});});
 socket.on('hermes:error',({message}:{message?:string})=>{void publish({connected:false,error:message||'Acceso denegado'});});
 // El navegador descarta su copia solamente cuando Agent confirma el INSERT durable.
 socket.on('hermes:stored',async ({taskId}:{taskId:string})=>{
  const item=await pending();if(item?.taskId===taskId){await chrome.storage.local.remove('hermesPending');await publish({phase:'Confirmado por Agent; SIC puede seguir pendiente'});}
 });
 socket.on('hermes:cancel',()=>{cancelled=true;});
 socket.on('hermes:task',async(task:Task)=>{
  if(running||await pending()) {socket?.emit('hermes:busy',{taskId:task?.taskId});void deliver();return;}
  if(!task||typeof task.taskId!=='string'||typeof task.prospectName!=='string')return;
  running=true;cancelled=false;
  await publish({running:true,count:0,sources:[],prospect:task.prospectName,phase:'Investigando'});
  try{
    const evidence=await collect(task);
    // Conservación local ANTES de enviar por Socket.IO, tolerante a reconexión.
    const item:Pending={taskId:task.taskId,researchId:task.researchId,prospectId:task.prospectId,evidence};
    await chrome.storage.local.set({hermesPending:item});
    await publish({phase:'Recopilación conservada localmente; esperando ACK de Agent'});
    void deliver();
  }catch(e){socket?.emit('hermes:result',{taskId:task.taskId,status:'error',error:String(e).slice(0,300)});await publish({error:String(e),phase:'Investigación interrumpida'});}
  finally{running=false;await publish({running:false});}
 });
}
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{
 if(message?.type==='HERMES_STATE'){reply({...state});return;}
 if(message?.type==='HERMES_RECONNECT'){void connect().then(()=>reply({...state}));return true;}
 if(message?.type==='HERMES_CANCEL'){cancelled=true;reply({ok:true});return;}
});
setInterval(()=>{if(socket?.connected){socket.emit('hermes:status');void deliver();}},20000);
void chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true});
chrome.runtime.onInstalled.addListener(()=>void chrome.sidePanel.setPanelBehavior({openPanelOnActionClick:true}));
void connect();
