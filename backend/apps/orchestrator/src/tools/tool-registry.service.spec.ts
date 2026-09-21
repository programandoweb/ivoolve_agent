import { ApprovalsService } from '../approvals/approvals.service';
import { ProvidersService } from '../providers/providers.service';
import { ToolRegistryService } from './tool-registry.service';

describe('ToolRegistryService', () => {
  const providers = {
    list: jest.fn(),
    sendText: jest.fn(),
  };
  const approvals = {
    requiresApproval: jest.fn(),
    request: jest.fn(),
  };

  let service: ToolRegistryService;

  beforeEach(() => {
    jest.clearAllMocks();
    approvals.requiresApproval.mockReturnValue(false);

    service = new ToolRegistryService(
      providers as unknown as ProvidersService,
      approvals as unknown as ApprovalsService,
    );
  });

  it('parsea una llamada JSON válida', () => {
    expect(
      service.parse(
        '{"tool":"provider.send_message","arguments":{"providerId":"p1"}}',
      ),
    ).toEqual({
      tool: 'provider.send_message',
      arguments: { providerId: 'p1' },
    });
  });

  it('filtra providers por ACL del agente y tenant', async () => {
    providers.list.mockResolvedValue([
      {
        id: 'p1',
        tenantId: 'tenant-a',
        name: 'Ventas',
        type: 'whatsapp_baileys',
        status: 'connected',
        agentIds: ['sales'],
      },
      {
        id: 'p2',
        tenantId: 'tenant-a',
        name: 'Soporte',
        type: 'whatsapp_baileys',
        status: 'connected',
        agentIds: ['support'],
      },
    ]);

    const result = await service.execute(
      { tool: 'provider.list', arguments: {} },
      {
        agentId: 'sales',
        source: 'interactive',
        actorRole: 'operator',
        tenantId: 'tenant-a',
      },
    );

    expect(providers.list).toHaveBeenCalledWith('tenant-a');
    expect(result).toEqual([
      expect.objectContaining({ id: 'p1', name: 'Ventas' }),
    ]);
  });

  it('envía directamente cuando la tool no requiere aprobación', async () => {
    providers.sendText.mockResolvedValue({ messageId: 'out-1' });

    await service.execute(
      {
        tool: 'provider.send_message',
        arguments: {
          providerId: 'p1',
          recipient: '573001112233',
          text: 'Hola',
        },
      },
      {
        agentId: 'sales',
        source: 'interactive',
        actorRole: 'operator',
        tenantId: 'tenant-a',
      },
    );

    expect(providers.sendText).toHaveBeenCalledWith(
      'p1',
      'sales',
      '573001112233',
      'Hola',
      'tenant-a',
    );
  });

  it('crea aprobación y no envía cuando la tool es sensible', async () => {
    approvals.requiresApproval.mockReturnValue(true);
    approvals.request.mockResolvedValue({
      id: 'approval-1',
      actionName: 'provider.send_message',
    });

    const result = await service.execute(
      {
        tool: 'provider.send_message',
        arguments: {
          providerId: 'p1',
          recipient: '573001112233',
          text: 'Hola',
        },
      },
      {
        agentId: 'sales',
        source: 'interactive',
        actorId: 'user-1',
        actorRole: 'operator',
        tenantId: 'tenant-a',
      },
    );

    expect(approvals.request).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-a',
        agentId: 'sales',
        actionName: 'provider.send_message',
        requestedBy: 'user:user-1',
      }),
    );
    expect(providers.sendText).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        status: 'approval_required',
        approvalId: 'approval-1',
      }),
    );
  });

  it('bloquea tools de escritura para viewer', async () => {
    await expect(
      service.execute(
        {
          tool: 'provider.send_message',
          arguments: {
            providerId: 'p1',
            recipient: '573001112233',
            text: 'Hola',
          },
        },
        {
          agentId: 'sales',
          source: 'interactive',
          actorRole: 'viewer',
          tenantId: 'tenant-a',
        },
      ),
    ).rejects.toThrow('viewer');

    expect(providers.sendText).not.toHaveBeenCalled();
    expect(approvals.request).not.toHaveBeenCalled();
  });
});
