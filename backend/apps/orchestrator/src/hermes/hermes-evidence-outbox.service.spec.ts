import { HermesEvidenceOutboxService } from './hermes-evidence-outbox.service';
import { DatabaseService } from '../database/database.service';
import { SicClientService } from '../tools/sic-client.service';

describe('Hermes durable evidence boundary', () => {
  const task = { tenant_id: 'tenant-a', research_id: 'research-a', prospect_id: 'prospect-a' };
  const db = {
    enabled: true,
    query: jest.fn().mockResolvedValue([task]),
    execute: jest.fn(),
  };
  const sic = { addResearchEvidence: jest.fn() };
  let outbox: HermesEvidenceOutboxService;
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue([task]);
    outbox = new HermesEvidenceOutboxService(
      db as unknown as DatabaseService, sic as unknown as SicClientService,
    );
  });

  it('rejects a returned batch from a different tenant before any INSERT', async () => {
    await expect(outbox.receive({
      tenantId: 'tenant-b', taskId: 'task', researchId: 'research-a',
      prospectId: 'prospect-a', evidence: [],
    })).rejects.toThrow('Tarea Hermes no autorizada');
    expect(db.execute).not.toHaveBeenCalled();
    expect(sic.addResearchEvidence).not.toHaveBeenCalled();
  });

  it('rejects cross-research result association before persistence', async () => {
    await expect(outbox.receive({
      tenantId: 'tenant-a', taskId: 'task', researchId: 'research-other',
      prospectId: 'prospect-a', evidence: [],
    })).rejects.toThrow('Tarea Hermes no autorizada');
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('rejects unsupported evidence origins before inserting anything', async () => {
    await expect(outbox.receive({
      tenantId: 'tenant-a', taskId: 'task', researchId: 'research-a',
      prospectId: 'prospect-a', evidence: [{
        sourceType: 'colombia_government_browser', url: 'https://fake-government.example/registry',
        title: 'Untrusted source', fetchedAt: new Date().toISOString(),
        result: '{}', extracted: {}, summary: 'unverified', confidence: 0.2,
      }],
    })).rejects.toThrow('URL y tipo de fuente no coinciden');
    expect(db.execute).not.toHaveBeenCalled();
  });
});
