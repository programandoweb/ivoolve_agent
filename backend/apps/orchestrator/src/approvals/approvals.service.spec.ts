import { ConfigService } from '@nestjs/config';

import { AuditService } from '../audit/audit.service';
import { DatabaseService } from '../database/database.service';
import { ProvidersService } from '../providers/providers.service';
import { ApprovalsService } from './approvals.service';

describe('ApprovalsService', () => {
  const config = {
    get: jest.fn(),
  };
  const database = {
    enabled: true,
    execute: jest.fn(),
    query: jest.fn(),
  };
  const providers = {
    sendText: jest.fn(),
  };
  const audit = {
    record: jest.fn(),
  };

  let service: ApprovalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'APPROVAL_REQUIRED_TOOLS') {
        return 'provider.send_message';
      }
      return fallback;
    });
    database.execute.mockResolvedValue({ affectedRows: 1 });
    audit.record.mockResolvedValue(undefined);

    service = new ApprovalsService(
      config as unknown as ConfigService,
      database as unknown as DatabaseService,
      providers as unknown as ProvidersService,
      audit as unknown as AuditService,
    );
  });

  it('crea una aprobación pendiente sin ejecutar el provider', async () => {
    const approval = await service.request({
      tenantId: 'tenant-a',
      agentId: 'sales',
      actionName: 'provider.send_message',
      payload: {
        providerId: 'p1',
        recipient: '573001112233',
        text: 'Hola',
      },
      requestedBy: 'user:u1',
    });

    expect(approval.status).toBe('pending');
    expect(providers.sendText).not.toHaveBeenCalled();
    expect(database.execute).toHaveBeenCalledTimes(1);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'approval.requested',
        entityId: approval.id,
      }),
    );
  });

  it('ejecuta el envío solo después de aprobar', async () => {
    database.query.mockResolvedValue([
      {
        id: 'approval-1',
        tenant_id: 'tenant-a',
        agent_id: 'sales',
        action_name: 'provider.send_message',
        payload_json: JSON.stringify({
          providerId: 'p1',
          recipient: '573001112233',
          text: 'Hola',
        }),
        status: 'pending',
        requested_by: 'agent:sales',
        decided_by: null,
        decision_note: null,
        created_at: new Date('2026-09-20T12:00:00Z'),
        decided_at: null,
      },
    ]);
    providers.sendText.mockResolvedValue({ messageId: 'out-1' });

    const result = await service.approve(
      'approval-1',
      'tenant-a',
      'admin',
      'Aprobado',
    );

    expect(providers.sendText).toHaveBeenCalledWith(
      'p1',
      'sales',
      '573001112233',
      'Hola',
      'tenant-a',
    );
    expect(result.approval.status).toBe('approved');
    expect(database.execute).toHaveBeenCalledTimes(2);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'approval.approved',
        entityId: 'approval-1',
      }),
    );
  });
});
