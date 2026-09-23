import { DatabaseService } from '../database/database.service';
import { SicClientService } from './sic-client.service';
import { ArgosSicOutboxService } from './argos-sic-outbox.service';

// Simulates MariaDB rows across backend instance restarts.
describe('ArgosSicOutboxService', () => {
  let rows: Array<Record<string, any>>;
  const query = jest.fn();
  const execute = jest.fn();
  const sic = {
    importArgosProspects: jest.fn(),
    upsertProspect: jest.fn(),
  };
  const db = { enabled: true, query, execute };
  let service: ArgosSicOutboxService;

  beforeEach(() => {
    jest.clearAllMocks();
    rows = [];
    query.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('GROUP BY status')) {
        const counts = rows.filter(r => r.batch_id === params[0] && r.tenant_id === params[1])
          .reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {} as Record<string, number>);
        return Object.entries(counts).map(([status, total]) => ({ status, total }));
      }
      if (sql.includes('COUNT(*) AS remaining')) return [{
        remaining: rows.filter(r => r.tenant_id === params[0] && r.status !== 'synced').length,
      }];
      if (sql.includes('WHERE id=?') || sql.includes('WHERE id = ?')) {
        return rows.filter(r => r.id === params[0] && (!sql.includes('tenant_id=?') || r.tenant_id === params[1]));
      }
      if (sql.includes('WHERE batch_id=?')) return rows.filter(r => r.batch_id === params[0] && r.status === 'pending');
      if (sql.includes('FROM argos_sic_outbox') && sql.includes('ORDER BY')) {
        return rows.filter(r => !sql.includes('tenant_id=?') || r.tenant_id === params[0]);
      }
      return [];
    });
    execute.mockImplementation(async (sql: string, params: any[]) => {
      if (sql.includes('INSERT INTO argos_sic_outbox')) {
        for (let i = 0; i < params.length; i += 14) rows.push({
          id: params[i], tenant_id: params[i + 1], batch_id: params[i + 3],
          mode: params[i + 5], execution_id: params[i + 6],
          campaign_id: params[i + 7], prospect_name: params[i + 9],
          payload_json: params[i + 10], status: 'pending', attempts: 0,
          created_at: new Date(), updated_at: new Date(),
        });
        return { affectedRows: 1 };
      }
      if (sql.includes("SET status='processing'")) {
        const row = rows.find(r => r.id === params[2]);
        if (!row || !['pending','failed'].includes(row.status)) return { affectedRows: 0 };
        row.status = 'processing'; row.attempts++;
        return { affectedRows: 1 };
      }
      if (sql.includes("SET status='synced'")) {
        const row = rows.find(r => r.id === params[3]);
        row.status = 'synced'; row.sic_prospect_id = params[0];
        return { affectedRows: 1 };
      }
      if (sql.includes("SET status='failed'")) {
        const row = rows.find(r => r.id === params[3]);
        row.status = 'failed'; row.last_error = params[0];
        return { affectedRows: 1 };
      }
      if (sql.includes("SET status='pending'")) {
        const row = rows.find(r => r.id === (params.length === 5 ? params[1] : params[2]));
        if (row) row.status = 'pending';
        return { affectedRows: 1 };
      }
      return { affectedRows: 1 };
    });
    service = new ArgosSicOutboxService(
      db as unknown as DatabaseService,
      sic as unknown as SicClientService,
    );
  });

  it('graba todo ANTES del primer request y retiene el payload original ante SIC 500', async () => {
    sic.importArgosProspects.mockImplementation(async () => {
      expect(rows).toHaveLength(2);
      throw new Error('SIC 500');
    });
    const result = await service.enqueue({
      query: 'textiles Pereira',
      prospects: [
        { name: 'Fábrica A', mapsUrl: 'https://www.google.com/maps/place/A', phone: '+57300111' },
        { name: 'Fábrica B', mapsUrl: 'https://www.google.com/maps/place/B', phone: '+57300222' },
      ],
    });
    expect(result).toEqual(expect.objectContaining({
      collectedCount: 2, syncedCount: 0, failedCount: 1, pendingCount: 1,
      status: 'pending_sync',
    }));
    expect(rows).toHaveLength(2);
    expect(JSON.parse(rows[0].payload_json).phone).toBe('+57300111');
    expect(rows[0].status).toBe('failed');
    expect(rows[1].status).toBe('pending');
  });

  it('reintenta después de reiniciar el servicio, sin solicitar a Chrome otra búsqueda', async () => {
    sic.importArgosProspects.mockRejectedValueOnce(new Error('offline'));
    const first = await service.enqueue({
      query: 'calzado Pereira',
      prospects: [{ name: 'Zapatería A', mapsUrl: 'https://www.google.com/maps/place/A' }],
    });
    expect(first.failedCount).toBe(1);
    sic.importArgosProspects.mockResolvedValue({
      savedCount: 1, prospects: [{ id: 'sic-1', name: 'Zapatería A' }],
    });
    const restarted = new ArgosSicOutboxService(
      db as unknown as DatabaseService,
      sic as unknown as SicClientService,
    );
    const result = await restarted.retry(rows[0].id, 'default');
    expect(result.syncedCount).toBe(1);
    expect(rows[0].sic_prospect_id).toBe('sic-1');
    expect(sic.importArgosProspects).toHaveBeenCalledTimes(2);
  });

  it('no envía resultados a SIC cuando MariaDB no está disponible', async () => {
    db.enabled = false;
    try {
      await expect(service.enqueue({
        query: 'textiles Pereira',
        prospects: [{ name: 'Fábrica', mapsUrl: 'https://www.google.com/maps/place/Fabrica' }],
      })).rejects.toThrow('MariaDB');
      expect(sic.importArgosProspects).not.toHaveBeenCalled();
    } finally {
      db.enabled = true;
    }
  });
});
