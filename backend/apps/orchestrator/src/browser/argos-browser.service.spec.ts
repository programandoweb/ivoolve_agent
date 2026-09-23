import type { Socket } from 'socket.io';
import { ArgosBrowserService } from './argos-browser.service';

describe('ArgosBrowserService', () => {
  let service: ArgosBrowserService;
  let worker: Socket & { connected: boolean };
  const outgoing: Array<{ name: string; data: any }> = [];

  beforeEach(() => {
    jest.useFakeTimers();
    outgoing.length = 0;
    service = new ArgosBrowserService();
    worker = {
      id: 'worker-test',
      connected: true,
      emit: (name: string, data: unknown) => {
        outgoing.push({ name, data });
        return true;
      },
    } as unknown as Socket & { connected: boolean };
    expect(service.connect(worker)).toBe(true);
  });

  afterEach(() => { service.disconnect(worker); jest.useRealTimers(); });

  it('despacha MAPS_SEARCH y acepta solo la respuesta de su tarea', async () => {
    const promise = service.search('automotrices Pereira', 100);
    expect(outgoing[0].name).toBe('argos:task');
    expect(outgoing[0].data.scrollDelayMs).toBe(5000);
    expect(outgoing[0].data.maxResults).toBe(100);
    service.complete(worker, {
      taskId: 'otra-tarea', status: 'success', places: [],
    });
    expect(service.queueDepth).toBe(1);
    service.complete(worker, {
      taskId: outgoing[0].data.taskId, status: 'success',
      places: [{
        name: 'Taller Real',
        mapsUrl: 'https://www.google.com/maps/place/Taller+Real',
        sourceType: 'google_maps_browser', capturedAt: '2026-09-23',
      }],
    });
    await expect(promise).resolves.toEqual([
      expect.objectContaining({ name: 'Taller Real', sourceType: 'google_maps_browser' }),
    ]);
    expect(service.queueDepth).toBe(0);
  });

  it('rechaza fichas sin enlace de Google Maps verificable', async () => {
    const promise = service.search('automotrices Pereira', 1);
    service.complete(worker, {
      taskId: outgoing[0].data.taskId, status: 'success',
      places: [{ name: 'Falso', mapsUrl: 'https://example.com/profile' }],
    });
    await expect(promise).resolves.toEqual([]);
  });

  it('no acepta un segundo navegador simultáneo', () => {
    expect(service.connect({ id: 'other', connected: true } as Socket)).toBe(false);
  });
});
