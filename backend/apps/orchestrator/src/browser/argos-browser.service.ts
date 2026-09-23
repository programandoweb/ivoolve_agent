import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Socket } from 'socket.io';

export interface BrowserPlace {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  placeId?: string;
  category?: string;
  rating?: number;
  userRatingCount?: number;
  sourceType: 'google_maps_browser';
  capturedAt: string;
}

type Task = {
  taskId: string;
  query: string;
  maxResults: number;
  resolve: (places: BrowserPlace[]) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
};

@Injectable()
export class ArgosBrowserService {
  private readonly logger = new Logger(ArgosBrowserService.name);
  private worker?: Socket;
  private active?: Task;
  private readonly waiting: Task[] = [];

  get available(): boolean { return Boolean(this.worker?.connected); }
  get queueDepth(): number { return this.waiting.length + Number(Boolean(this.active)); }

  connect(socket: Socket): boolean {
    // Sin credenciales de usuario: el gateway solo acepta orígenes de extensión
    // cuando un operador ha habilitado explícitamente el modo directo.
    if (this.worker?.connected) return false;
    this.worker = socket;
    this.logger.log('Argos Chrome conectado: ' + socket.id);
    this.dispatch();
    return true;
  }

  disconnect(socket: Socket): void {
    if (this.worker?.id !== socket.id) return;
    this.worker = undefined;
    if (this.active) {
      const current = this.active;
      this.active = undefined;
      current.reject(new Error('ARGOS_BROWSER_DISCONNECTED'));
      clearTimeout(current.timer);
    }
  }

  async search(query: string, maxResults: number): Promise<BrowserPlace[]> {
    if (!this.available) throw new ServiceUnavailableException(
      'Argos Chrome no está conectado. Abre Chrome con la extensión Argos activa.',
    );
    if (!query || query.length > 200) throw new Error('Consulta inválida (1-200 caracteres)');
    const limit = Math.min(Math.max(Math.trunc(maxResults), 1), 100);
    return new Promise<BrowserPlace[]>((resolve, reject) => {
      const task: Task = {
        taskId: randomUUID(), query, maxResults: limit, resolve, reject,
        timer: setTimeout(() => {
          if (this.active?.taskId === task.taskId) {
            this.active = undefined;
            this.worker?.emit('argos:cancel', { taskId: task.taskId });
          } else {
            const index = this.waiting.findIndex(item => item.taskId === task.taskId);
            if (index >= 0) this.waiting.splice(index, 1);
          }
          reject(new Error('ARGOS_BROWSER_TIMEOUT'));
          this.dispatch();
        }, 600000),
      };
      this.waiting.push(task);
      this.dispatch();
    });
  }

  complete(socket: Socket, payload: unknown): void {
    if (this.worker?.id !== socket.id || !this.active) return;
    const result = payload as { taskId?: string; status?: string; places?: unknown; error?: string };
    if (result?.taskId !== this.active.taskId) return;
    const task = this.active;
    this.active = undefined;
    clearTimeout(task.timer);
    if (result.status === 'success' && Array.isArray(result.places)) {
      const safe: BrowserPlace[] = result.places.slice(0, task.maxResults).filter((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const value = item as Record<string, unknown>;
        return typeof value.name === 'string' && value.name.length > 1 &&
          typeof value.name !== 'undefined' &&
          (typeof value.mapsUrl === 'string' && /^https:\/\/(www\.)?google\.[^/]+\/maps\//.test(value.mapsUrl));
      }).map((item: BrowserPlace) => ({
        name: item.name.slice(0, 220), address: item.address?.slice(0, 350),
        phone: item.phone?.slice(0, 80), website: item.website?.slice(0, 450),
        mapsUrl: item.mapsUrl?.slice(0, 800), placeId: item.placeId?.slice(0, 200),
        category: item.category?.slice(0, 150),
        rating: typeof item.rating === 'number' ? item.rating : undefined,
        userRatingCount: typeof item.userRatingCount === 'number' ? item.userRatingCount : undefined,
        sourceType: 'google_maps_browser', capturedAt: new Date().toISOString(),
      }));
      task.resolve(safe);
    } else task.reject(new Error(String(result?.error ?? 'ARGOS_BROWSER_TASK_FAILED').slice(0, 300)));
    this.dispatch();
  }

  private dispatch(): void {
    if (!this.worker?.connected || this.active) return;
    const next = this.waiting.shift();
    if (!next) return;
    this.active = next;
    this.worker.emit('argos:task', {
      taskId: next.taskId, type: 'MAPS_SEARCH',
      query: next.query, maxResults: next.maxResults, scrollDelayMs: 5000,
    });
  }
}
