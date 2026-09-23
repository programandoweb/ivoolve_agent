type State={connected?:boolean;running?:boolean;phase?:string;serverUrl?:string;pairingCode?:string;pairingExpiresAt?:string;prospect?:string;count?:number;sources?:string[];error?:string};
const el=(id:string)=>document.getElementById(id)!;
function paint(s:State){
 el('connection').textContent=s.connected?'Conectado y autenticado':s.error||'Desconectado';
 el('pairing').hidden=!s.pairingCode||Boolean(s.connected);
 el('pairingCode').textContent=s.pairingCode||'';
 el('expiration').textContent=s.pairingExpiresAt?'Vence: '+new Date(s.pairingExpiresAt).toLocaleTimeString('es-CO'):'';
 el('phase').textContent=s.phase||'Sin tarea';
 el('prospect').textContent=s.prospect||'Esperando prospecto de SIC';
 el('count').textContent=String(s.count||0);
 const input=el('server') as HTMLInputElement;
 if(document.activeElement!==input)input.value=s.serverUrl||'';
 el('sources').replaceChildren(...(s.sources||[]).map(url=>{const li=document.createElement('li');li.textContent=url;return li;}));
}
function request(type:string){return new Promise<State>(resolve=>chrome.runtime.sendMessage({type},(s:State)=>resolve(chrome.runtime.lastError?{error:chrome.runtime.lastError.message}:s||{})));}
void request('HERMES_STATE').then(paint);
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.hermesState)paint(changes.hermesState.newValue as State);});
el('save').addEventListener('click',async()=>{
 const url=(el('server') as HTMLInputElement).value.trim().replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(url)&&url!=='http://localhost:5020'){el('message').textContent='Introduce HTTPS o localhost:5020.';return;}
 await chrome.storage.local.set({hermesServerUrl:url});
 paint(await request('HERMES_RECONNECT'));
 el('message').textContent='Configuración guardada.';
});
el('cancel').addEventListener('click',()=>{void request('HERMES_CANCEL');});
