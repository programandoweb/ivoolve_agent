type State = { connected?: boolean; collected?: number; running?: boolean; error?: string; serverUrl?: string; phase?: string; pairingCode?: string; pairingExpiresAt?: string };
const byId=(id:string)=>document.getElementById(id)!;
const button=byId('save') as HTMLButtonElement;
const input=byId('server') as HTMLInputElement;
let lastValue='';
function paint(s:State){
  byId('connection').textContent=s.connected?'Conectado y escuchando':(s.error||'Desconectado');
  byId('dot').classList.toggle('on',Boolean(s.connected));
  byId('collected').textContent=String(s.collected??0);
  byId('taskState').textContent=s.running?'ACTIVO':'IDLE';
  const badge=byId('connectionBadge');badge.textContent=s.connected?'CONECTADO':'SIN CONEXIÓN';
  badge.classList.toggle('on',Boolean(s.connected));
  if(document.activeElement!==input){input.value=s.serverUrl||'';lastValue=input.value;}
  const pairing = byId('pairing');
  pairing.hidden = !s.pairingCode || Boolean(s.connected);
  byId('pairingCode').textContent = s.pairingCode || '';
  byId('pairingExpiration').textContent = s.pairingExpiresAt ? 'Válido hasta ' + new Date(s.pairingExpiresAt).toLocaleTimeString('es-CO') : '';
  byId('diagnosis').textContent=(s.phase?'Fase: '+s.phase+'. ':'')+(s.error?'Detalle: '+s.error+'. ':'')+'Destino: '+(s.serverUrl||'sin configurar');
}
const request=(message:Record<string,unknown>)=>new Promise<State>(resolve=>{
  chrome.runtime.sendMessage(message, (value:State)=>{
    resolve(chrome.runtime.lastError?{error:chrome.runtime.lastError.message}:value||{});
  });
});
async function refresh(){paint(await request({type:'ARGOS_STATE'}));}
void refresh();
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local'&&changes.argosState)paint(changes.argosState.newValue as State);
});
button.addEventListener('click', async ()=>{
  let url=input.value.trim().replace(/\/$/,'').replace(/\/(?:argos-browser|socket\.io)\/?$/,'');
  if(!/^https:\/\/[a-z\d.-]+(?::\d+)?$/i.test(url)&&!/^http:\/\/(localhost|127\.0\.0\.1)(?::\d+)?$/i.test(url)){
    byId('message').textContent='Introduce una URL HTTPS o localhost en desarrollo.';return;
  }
  button.disabled=true;
  byId('message').textContent='Guardando y solicitando conexión…';
  await chrome.storage.local.set({serverUrl:url});
  const state=await request({type:'ARGOS_RECONNECT'});
  paint(state);
  byId('message').textContent=state.error?'Conexión pendiente: revisa el diagnóstico.':'URL guardada; intentando conectar…';
  button.disabled=false;
});
