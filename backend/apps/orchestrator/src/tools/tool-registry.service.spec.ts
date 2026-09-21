import { ProvidersService } from '../providers/providers.service';
import { ToolRegistryService } from './tool-registry.service';

describe('ToolRegistryService', () => {
  const providers = {
    list: jest.fn(),
    sendText: jest.fn(),
  };

  let service: ToolRegistryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ToolRegistryService(
      providers as unknown as ProvidersService,
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

  it('filtra providers por ACL del agente', async () => {
    providers.list.mockResolvedValue([
      {
        id: 'p1',
        name: 'Ventas',
        type: 'whatsapp_baileys',
        status: 'connected',
        agentIds: ['sales'],
      },
      {
        id: 'p2',
        name: 'Soporte',
        type: 'whatsapp_baileys',
        status: 'connected',
        agentIds: ['support'],
      },
    ]);

    const result = await service.execute(
      { tool: 'provider.list', arguments: {} },
      { agentId: 'sales' },
    );

    expect(result).toEqual([
      expect.objectContaining({ id: 'p1', name: 'Ventas' }),
    ]);
  });

  it('envía mensajes usando la identidad del agente actual', async () => {
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
      { agentId: 'sales' },
    );

    expect(providers.sendText).toHaveBeenCalledWith(
      'p1',
      'sales',
      '573001112233',
      'Hola',
    );
  });
});
