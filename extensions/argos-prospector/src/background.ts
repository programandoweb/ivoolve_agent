import { io, type Socket } from 'socket.io-client';

type Place = { name: string; mapsUrl: string; address?: string; phone?: string; website?: string; category?: string; rating?: number; userRatingCount?: number; placeId?: string };
type Task = { taskId: string; type: 'MAPS_SEARCH'; query: string; maxResults: number; scrollDelayMs: number };
type State = { connected: boolean; collected: number; running: boolean; error?: string; serverUrl: string };
let socket: Socket | undefined;
let running = false;
let cancelled = false;
const state: State = { connected: false, collected: 0, running: false, serverUrl: 'https://socket.orchestrator.programandoweb.net' };
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function publish(patch: Partial<State>) {
  Object.assign(state, patch);
  void chrome.storage.local.set({ argosState: { ...state } });
}
async function send(tabId: number, type: string, data: Record<string, unknown> = {}) {
  return chrome.tabs.sendMessage(tabId, { type, ...data });
}
async function search(task: Task): Promise<Place[]> {
  if (!/^.{2,200}$/.test(task.query) || !Number.isInteger(task.maxResults) || task.maxResults < 1 || task.maxResults > 100)
    throw Error('INVALID_TASK');
  const page = 'https://www.google.com/maps/search/' + encodeURIComponent(task.query);
  const tab = await chrome.tabs.create({ url: page, active: true });
  if (!tab.id) throw Error('TAB_NOT_CREATED');
  const tabId = tab.id;
  try {
    // Google Maps carga dinámicamente. La extensión nunca inyecta scripts para
    // vulnerar restricciones: solo solicita al content script lecturas públicas.
    await pause(4500);
    let items: Array<{ name: string; href: string }> = [];
    let noGrowth = 0;
    const maxScrolls = Math.min(40, Math.max(6, Math.ceil(task.maxResults / 3)));
    for (let i = 0; i < maxScrolls; i++) {
      if (cancelled) throw Error('CANCELLED');
      let feed: { items: typeof items; hasFeed: boolean };
      try { feed = await send(tabId, 'ARGOS_FEED'); }
      catch { await pause(2500); continue; }
      const byUrl = new Map([...items, ...feed.items].map(item => [item.href, item]));
      const next = [...byUrl.values()];
      noGrowth = next.length === items.length ? noGrowth + 1 : 0;
      items = next;
      publish({ collected: items.length });
      if (items.length >= task.maxResults || noGrowth >= 4) break;
      if (!feed.hasFeed) {
        if (i >= 3) throw Error('GOOGLE_MAPS_FEED_UNAVAILABLE_OR_BLOCKED');
      } else await send(tabId, 'ARGOS_SCROLL');
      await pause(5000); // Requisito explícito: 5 segundos entre scrolls.
    }
    const collected: Place[] = [];
    const unique = new Set<string>();
    for (const item of items.slice(0, task.maxResults)) {
      if (cancelled) throw Error('CANCELLED');
      try {
        await chrome.tabs.update(tabId, { url: item.href });
        await pause(2500);
        const detail = await send(tabId, 'ARGOS_DETAILS', { name: item.name }) as Place;
        const place: Place = { ...detail, name: detail.name || item.name, mapsUrl: detail.mapsUrl || item.href };
        const key = place.placeId || place.mapsUrl || place.name.toLowerCase();
        if (!unique.has(key) && place.name.length > 1) { unique.add(key); collected.push(place); }
      } catch {
        // Si Maps tarda en renderizar el detalle, preservamos el enlace visible.
        if (!unique.has(item.href)) {
          unique.add(item.href);
          collected.push({ name: item.name, mapsUrl: item.href });
        }
      }
      publish({ collected: collected.length });
    }
    return collected;
  } finally {
    await chrome.tabs.remove(tabId).catch(() => undefined);
  }
}
async function connect() {
  const cfg = await chrome.storage.local.get('serverUrl');
  const serverUrl = String(cfg.serverUrl || state.serverUrl).replace(/\/$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(serverUrl) && serverUrl !== 'http://localhost:5020') {
    publish({ connected: false, error: 'Dirección del socket inválida.' }); return;
  }
  socket?.disconnect();
  socket = io(serverUrl + '/argos-browser', {
    transports: ['websocket'], reconnection: true, reconnectionDelay: 2000,
    reconnectionDelayMax: 30000, timeout: 12000,
  });
  publish({ serverUrl, connected: false, error: undefined });
  socket.on('connect', () => publish({ connected: false, error: 'Registrando navegador…' }));
  socket.on('argos:ready', () => publish({ connected: true, error: undefined }));
  socket.on('argos:error', ({ message }: { message?: string }) =>
    publish({ connected: false, error: message || 'Conexión rechazada' }));
  socket.on('disconnect', () => publish({ connected: false, error: 'Socket desconectado' }));
  socket.on('connect_error', () => publish({ connected: false, error: 'Sin acceso al socket' }));
  socket.on('argos:cancel', () => { cancelled = true; });
  socket.on('argos:task', async (task: Task) => {
    if (running) return; // El servidor posee la cola; una pestaña por worker.
    if (task?.type !== 'MAPS_SEARCH' || !/^[\da-f-]{36}$/i.test(task.taskId)) return;
    running = true; cancelled = false;
    publish({ running: true, collected: 0, error: undefined });
    try {
      const places = await search(task);
      socket?.emit('argos:result', { taskId: task.taskId, status: 'success', places });
    } catch (error) {
      socket?.emit('argos:result', { taskId: task.taskId, status: 'error', error: String(error) });
    } finally {
      running = false;
      publish({ running: false });
    }
  });
}
// MV3 Chrome 116+: un WebSocket activo y su tráfico evitan que el service worker
// se suspenda durante una tarea. Keepalive cada 20 segundos.
setInterval(() => { if (socket?.connected) socket.emit('argos:status'); }, 20000);
chrome.runtime.onMessage.addListener((message, _, sendResponse) => {
  if (message?.type === 'ARGOS_STATE') { sendResponse({ ...state }); return; }
  if (message?.type === 'ARGOS_RECONNECT') {
    void connect().then(() => sendResponse({ ...state }));
    return true;
  }
});
void connect();
