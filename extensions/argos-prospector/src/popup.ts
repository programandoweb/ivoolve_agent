type State = { connected?: boolean; collected?: number; running?: boolean; error?: string; serverUrl?: string };
const byId = (id: string) => document.getElementById(id)!;
function paint(state: State) {
  byId('connection').textContent = state.connected ? 'Conectado · esperando tareas' : (state.error || 'Sin conexión');
  byId('dot').classList.toggle('on', Boolean(state.connected));
  byId('collected').textContent = String(state.collected ?? 0);
  byId('taskState').textContent = state.running ? 'BUSY' : 'IDLE';
  const input = byId('server') as HTMLInputElement;
  if (document.activeElement !== input) input.value = state.serverUrl || '';
}
chrome.runtime.sendMessage({ type: 'ARGOS_STATE' }, paint);
chrome.storage.onChanged.addListener(() => chrome.runtime.sendMessage({ type: 'ARGOS_STATE' }, paint));
byId('save').addEventListener('click', async () => {
  const serverUrl = (byId('server') as HTMLInputElement).value.trim().replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(serverUrl) && !/^http:\/\/localhost:5020$/i.test(serverUrl)) {
    byId('message').textContent = 'Usa HTTPS; en desarrollo se admite http://localhost:5020.';
    return;
  }
  await chrome.storage.local.set({ serverUrl });
  chrome.runtime.sendMessage({ type: 'ARGOS_RECONNECT' }, paint);
  byId('message').textContent = 'Configuración guardada.';
});
