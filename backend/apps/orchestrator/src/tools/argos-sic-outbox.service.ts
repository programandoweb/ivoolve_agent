import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';

import { DatabaseService } from '../database/database.service';
import { SicClientService } from './sic-client.service';

type Prospect = Record<string, unknown>;
type Mode = 'chat' | 'campaign';
type Status = 'pending' | 'processing' | 'failed' | 'synced';

interface OutboxRow extends RowDataPacket {
  id: string;
  tenant_id: string;
  batch_id: string;
  mode: Mode;
  execution_id: string | null;
  campaign_id: string | null;
  prospect_name: string;
  payload_json: string;
  status: Status;
  attempts: number;
  last_error: string | null;
  sic_prospect_id: string | null;
  created_at: Date;
  updated_at: Date;
  synced_at: Date | null;
}

export interface ArgosOutboxSummary {
  batchId: string;
  collectedCount: number;
  syncedCount: number;
  pendingCount: number;
  failedCount: number;
  status: 'synced' | 'pending_sync' | 'partially_synced';
  message: string;
}

/** Persistent transactional outbox, not agent conversational memory.
 * Chrome's verified results are committed to MariaDB BEFORE the first HTTP
 * request to SIC. A sync failure must never turn a successful scrape into
 * a request to rescrape or silently discard data.
 */
@Injectable()
export class ArgosSicOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ArgosSicOutboxService.name);
  private timer?: ReturnType<typeof setInterval>;
  private draining = false;

  constructor(
    private readonly database: DatabaseService,
    private readonly sic: SicClientService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.drain(20).catch(error =>
        this.logger.error('Reintento outbox Argos: ' + this.message(error)));
    }, 30_000);
    this.timer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(input: {
    prospects: Prospect[];
    query: string;
    tenantId?: string;
    executionId?: string;
    campaignId?: string;
  }): Promise<ArgosOutboxSummary> {
    if (!this.database.enabled) {
      throw new ServiceUnavailableException(
        'No hay MariaDB para preservar los datos de Chrome. No se intentará sincronizar ni se declararán guardados.',
      );
    }
    const tenantId = input.tenantId || 'default';
    const mode: Mode = input.executionId && input.campaignId ? 'campaign' : 'chat';
    const batchId = randomUUID();
    const now = new Date();

    // Batch INSERT es una sola operación SQL: evita guardar solamente una
    // fracción por fallo de DB durante la recolección.
    if (input.prospects.length) {
      const values: unknown[] = [];
      const placeholders: string[] = [];
      for (const prospect of input.prospects) {
        const fingerprint = createHash('sha256').update(String(
          prospect.placeId || prospect.mapsUrl || prospect.name,
        )).digest('hex');
        placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)');
        values.push(
          randomUUID(), tenantId, 'argos-prospector', batchId, fingerprint,
          mode, input.executionId || null, input.campaignId || null,
          input.query.slice(0, 250), String(prospect.name || '').slice(0, 220),
          JSON.stringify(prospect), 'pending', now, now,
        );
      }
      await this.database.execute(
        `INSERT INTO argos_sic_outbox
          (id, tenant_id, agent_id, batch_id, fingerprint, mode, execution_id,
           campaign_id, query_text, prospect_name, payload_json, status,
           attempts, created_at, updated_at)
         VALUES ${placeholders.join(',')}
         ON DUPLICATE KEY UPDATE id=id`,
        values as Array<string | number | Date | null>,
      );
    }

    // El resultado de la búsqueda YA está persistido antes de llamar a SIC.
    // Sin conexión, solo el primero fallará; no se reintenta 100 veces a ciegas.
    await this.syncBatch(batchId, 10);
    return this.summary(batchId, tenantId, input.prospects.length);
  }

  async summary(batchId: string, tenantId: string, collectedOverride?: number): Promise<ArgosOutboxSummary> {
    const rows = await this.database.query<Array<RowDataPacket & { status: Status; total: number }>>(
      'SELECT status, COUNT(*) AS total FROM argos_sic_outbox WHERE batch_id = ? AND tenant_id = ? GROUP BY status',
      [batchId, tenantId],
    );
    const counts = Object.fromEntries(rows.map(r => [r.status, Number(r.total)]));
    const syncedCount = counts.synced || 0;
    const pendingCount = (counts.pending || 0) + (counts.processing || 0);
    const failedCount = counts.failed || 0;
    const collectedCount = collectedOverride ?? syncedCount + pendingCount + failedCount;
    const status = syncedCount === collectedCount ? 'synced'
      : syncedCount > 0 ? 'partially_synced' : 'pending_sync';
    return {
      batchId, collectedCount, syncedCount, pendingCount, failedCount, status,
      message: status === 'synced'
        ? 'SIC confirmó todos los prospectos del lote.'
        : 'Los prospectos siguen guardados en el outbox de Argos. Puedes reintentar sin repetir la búsqueda.',
    };
  }

  async list(tenantId: string, limit = 100): Promise<Array<Record<string, unknown>>> {
    const rows = await this.database.query<OutboxRow[]>(
      `SELECT id, tenant_id, batch_id, mode, execution_id, campaign_id,
              prospect_name, status, attempts, last_error, sic_prospect_id,
              created_at, updated_at, synced_at
       FROM argos_sic_outbox WHERE tenant_id = ?
       ORDER BY CASE WHEN status IN ('failed','pending') THEN 0 ELSE 1 END,
                created_at DESC LIMIT ?`,
      [tenantId, Math.min(Math.max(limit, 1), 200)],
    );
    return rows.map(row => ({
      id: row.id, batchId: row.batch_id, mode: row.mode,
      executionId: row.execution_id, campaignId: row.campaign_id,
      name: row.prospect_name, status: row.status, attempts: row.attempts,
      lastError: row.last_error, sicProspectId: row.sic_prospect_id,
      collectedAt: row.created_at, updatedAt: row.updated_at, syncedAt: row.synced_at,
    }));
  }

  async retry(id: string, tenantId: string): Promise<ArgosOutboxSummary> {
    const [row] = await this.database.query<OutboxRow[]>(
      'SELECT * FROM argos_sic_outbox WHERE id=? AND tenant_id=? LIMIT 1',
      [id, tenantId],
    );
    if (!row) throw new Error('Elemento del outbox no encontrado.');
    // No modificar un envío ya confirmado ni uno ocupado por otro worker.
    if (row.status === 'failed' || row.status === 'pending') {
      await this.database.execute(
        'UPDATE argos_sic_outbox SET status=?, next_attempt_at=NULL, updated_at=? WHERE id=? AND tenant_id=? AND status IN (?,?)',
        ['pending', new Date(), id, tenantId, 'failed', 'pending'],
      );
      await this.sendOne(id);
    }
    return this.summary(row.batch_id, tenantId);
  }

  async retryPending(tenantId: string): Promise<{ retried: number; remaining: number }> {
    const rows = await this.database.query<OutboxRow[]>(
      `SELECT * FROM argos_sic_outbox
       WHERE tenant_id=? AND status IN ('failed','pending')
       ORDER BY created_at ASC LIMIT 100`,
      [tenantId],
    );
    // Liberar backoff y dejar los demás intactos si la red falla.
    for (const row of rows) {
      await this.database.execute(
        "UPDATE argos_sic_outbox SET status='pending', next_attempt_at=NULL, updated_at=? WHERE id=? AND tenant_id=? AND status IN ('failed','pending')",
        [new Date(), row.id, tenantId],
      );
    }
    let retried = 0;
    for (const row of rows) {
      if (!await this.sendOne(row.id)) break;
      retried++;
    }
    const counts = await this.database.query<Array<RowDataPacket & { remaining: number }>>(
      "SELECT COUNT(*) AS remaining FROM argos_sic_outbox WHERE tenant_id=? AND status <> 'synced'",
      [tenantId],
    );
    return { retried, remaining: Number(counts[0]?.remaining || 0) };
  }

  async syncBatch(batchId: string, limit: number): Promise<void> {
    const rows = await this.database.query<OutboxRow[]>(
      "SELECT * FROM argos_sic_outbox WHERE batch_id=? AND status='pending' ORDER BY created_at LIMIT ?",
      [batchId, limit],
    );
    for (const row of rows) if (!await this.sendOne(row.id)) break;
  }

  async drain(limit = 20): Promise<void> {
    if (this.draining || !this.database.enabled) return;
    this.draining = true;
    try {
      const due = await this.database.query<OutboxRow[]>(
        `SELECT * FROM argos_sic_outbox
         WHERE (status IN ('pending','failed') AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
            OR (status='processing' AND locked_at < ?)
         ORDER BY created_at ASC LIMIT ?`,
        [new Date(), new Date(Date.now() - 180_000), limit],
      );
      for (const row of due) if (!await this.sendOne(row.id)) break;
    } finally {
      this.draining = false;
    }
  }

  /** Atomically claim, send, ACK. The row and original JSON are never deleted. */
  private async sendOne(id: string): Promise<boolean> {
    const now = new Date();
    const claimed = await this.database.execute(
      `UPDATE argos_sic_outbox SET status='processing', locked_at=?, attempts=attempts+1,
          updated_at=?
       WHERE id=? AND ((status IN ('pending','failed') AND
         (next_attempt_at IS NULL OR next_attempt_at<=?))
         OR (status='processing' AND locked_at<?))`,
      [now, now, id, now, new Date(Date.now() - 180_000)],
    );
    if (claimed.affectedRows !== 1) return true; // another worker claimed it
    const [row] = await this.database.query<OutboxRow[]>(
      'SELECT * FROM argos_sic_outbox WHERE id=? LIMIT 1', [id],
    );
    if (!row) throw new Error('Outbox row missing after claim');
    try {
      const payload = JSON.parse(row.payload_json) as Prospect;
      let sicId: string | null = null;
      if (row.mode === 'campaign') {
        if (!row.execution_id) throw new Error('Campaña sin executionId de SIC');
        const response = await this.sic.upsertProspect(row.execution_id, payload) as { id?: string };
        sicId = response.id || null;
      } else {
        const response = await this.sic.importArgosProspects([payload]);
        sicId = response.prospects?.[0]?.id || null;
        if (response.savedCount !== 1 || !sicId) throw new Error('SIC no confirmó el prospecto');
      }
      await this.database.execute(
        `UPDATE argos_sic_outbox
         SET status='synced', sic_prospect_id=?, synced_at=?, last_error=NULL,
             next_attempt_at=NULL, locked_at=NULL, updated_at=? WHERE id=?`,
        [sicId, new Date(), new Date(), id],
      );
      return true;
    } catch (error) {
      const message = this.message(error).slice(0, 1800);
      const wait = Math.min(60_000 * Math.pow(2, Math.min(row.attempts, 6)), 21_600_000);
      await this.database.execute(
        `UPDATE argos_sic_outbox
         SET status='failed', last_error=?, next_attempt_at=?, locked_at=NULL,
             updated_at=? WHERE id=?`,
        [message, new Date(Date.now() + wait), new Date(), id],
      );
      this.logger.warn('Argos: prospecto ' + id + ' pendiente de SIC: ' + message);
      return false;
    }
  }

  private message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
