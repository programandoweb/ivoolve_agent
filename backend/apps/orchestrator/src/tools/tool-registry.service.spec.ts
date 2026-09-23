import { ApprovalsService } from '../approvals/approvals.service';
import { ArgosBrowserService } from '../browser/argos-browser.service';
import { ProvidersService } from '../providers/providers.service';
import { GoogleProspectingService } from './google-prospecting.service';
import { ToolRegistryService } from './tool-registry.service';
import { VideoGeneratorService } from './video-generator.service';
import { SicClientService } from './sic-client.service';
import { ArgosSicOutboxService } from './argos-sic-outbox.service';

describe('ToolRegistryService', () => {
  const providers = {
    list: jest.fn(),
    sendText: jest.fn(),
  };
  const approvals = {
    requiresApproval: jest.fn(),
    request: jest.fn(),
  };

  const googleProspecting = {
    searchPlaces: jest.fn(),
    searchWeb: jest.fn(),
  };
  const videoGenerator = {
    capabilities: jest.fn(),
    generate: jest.fn(),
    status: jest.fn(),
  };
  const argosBrowser = { search: jest.fn() };
  const argosOutbox = { enqueue: jest.fn() };
  const sic = {
    upsertProspect: jest.fn(),
    importArgosProspects: jest.fn(),
  };

  let service: ToolRegistryService;

  beforeEach(() => {
    jest.clearAllMocks();
    approvals.requiresApproval.mockReturnValue(false);
    argosOutbox.enqueue.mockResolvedValue({ batchId: 'batch-1', collectedCount: 1, syncedCount: 1, pendingCount: 0, failedCount: 0, status: 'synced' });

    service = new ToolRegistryService(
      providers as unknown as ProvidersService,
      approvals as unknown as ApprovalsService,
      googleProspecting as unknown as GoogleProspectingService,
      videoGenerator as unknown as VideoGeneratorService,
      sic as unknown as SicClientService,
      argosBrowser as unknown as ArgosBrowserService,
      argosOutbox as unknown as ArgosSicOutboxService,
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
  it('crea un job de video con defaults seguros', async () => {
    videoGenerator.generate.mockResolvedValue({
      id: 'job-video-1',
      status: 'queued',
    });

    const result = await service.execute(
      {
        tool: 'video.generate',
        arguments: {
          prompt: 'Cinematic B2B commercial for Ivoolve ERP',
        },
      },
      {
        agentId: 'marketing',
        source: 'interactive',
        actorRole: 'operator',
        tenantId: 'tenant-a',
      },
    );

    expect(videoGenerator.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: 'Cinematic B2B commercial for Ivoolve ERP',
        durationSeconds: 5,
        width: 832,
        height: 480,
        fps: 16,
      }),
    );
    expect(result).toEqual({ id: 'job-video-1', status: 'queued' });
  });

  it('consulta el estado de un job de video', async () => {
    videoGenerator.status.mockResolvedValue({
      id: 'job-video-1',
      status: 'completed',
    });

    await service.execute(
      {
        tool: 'video.status',
        arguments: { jobId: 'job-video-1' },
      },
      {
        agentId: 'marketing',
        source: 'interactive',
        actorRole: 'operator',
        tenantId: 'tenant-a',
      },
    );

    expect(videoGenerator.status).toHaveBeenCalledWith('job-video-1');
  });

  it('bloquea generación de video para viewer', async () => {
    await expect(
      service.execute(
        {
          tool: 'video.generate',
          arguments: { prompt: 'Video corporativo de cinco segundos' },
        },
        {
          agentId: 'marketing',
          source: 'interactive',
          actorRole: 'viewer',
          tenantId: 'tenant-a',
        },
      ),
    ).rejects.toThrow('viewer');

    expect(videoGenerator.generate).not.toHaveBeenCalled();
  });
  it('persiste fichas de Chrome antes de sincronizar SIC en la campaña real', async () => {
    argosBrowser.search.mockResolvedValue([{
      name: 'Taller Uno', mapsUrl: 'https://www.google.com/maps/place/Taller+Uno',
      address: 'Pereira, Risaralda', phone: '+573001112233',
      sourceType: 'google_maps_browser', capturedAt: '2026-09-23T00:00:00.000Z',
    }]);
    const result = await service.execute({
      tool: 'prospecting.browser_maps_search',
      arguments: { query: 'automotrices en Pereira', maxResults: 100 },
    }, {
      agentId: 'argos-prospector', source: 'integration',
      executionId: 'run-actual', campaignId: 'campaign-1',
      campaignContext: { city: 'Pereira', department: 'Risaralda' },
    }) as Record<string, unknown>;

    expect(argosBrowser.search).toHaveBeenCalledWith('automotrices en Pereira', 100);
    expect(argosOutbox.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      query: 'automotrices en Pereira', executionId: 'run-actual',
      campaignId: 'campaign-1',
      prospects: [expect.objectContaining({
        name: 'Taller Uno', city: 'Pereira', sourceType: 'google_maps',
      })],
    }));
    expect(sic.upsertProspect).not.toHaveBeenCalled(); // outbox owns the send/ACK
    expect(result.persistence).toEqual(expect.objectContaining({ syncedCount: 1 }));
  });

  it('no pierde los datos Chrome cuando SIC no responde desde el chat', async () => {
    argosBrowser.search.mockResolvedValue([{
      name: 'Fábrica Textil', mapsUrl: 'https://www.google.com/maps/place/Fabrica+Textil',
      sourceType: 'google_maps_browser', capturedAt: '2026-09-23T00:00:00.000Z',
    }]);
    argosOutbox.enqueue.mockResolvedValueOnce({
      batchId: 'persisted-1', collectedCount: 1, syncedCount: 0,
      pendingCount: 0, failedCount: 1, status: 'pending_sync',
    });
    const result = await service.execute({
      tool: 'prospecting.browser_maps_search',
      arguments: { query: 'confección Pereira', city: 'Pereira', maxResults: 10 },
    }, {
      agentId: 'argos-prospector', source: 'interactive', actorId: 'jorge',
    }) as { persistence: { failedCount: number; syncedCount: number } };

    expect(argosOutbox.enqueue).toHaveBeenCalledWith(expect.objectContaining({
      prospects: [expect.objectContaining({ name: 'Fábrica Textil', city: 'Pereira' })],
    }));
    expect(result.persistence.failedCount).toBe(1);
    expect(result.persistence.syncedCount).toBe(0);
  });

  it('no permite a otros agentes controlar la extensión Argos', async () => {
    await expect(service.execute({
      tool: 'prospecting.browser_maps_search', arguments: { query: 'automotrices Pereira' },
    }, { agentId: 'hermes-researcher', source: 'interactive' })).rejects.toThrow('Solo Argos');
    expect(argosBrowser.search).not.toHaveBeenCalled();
  });

  it('serializa y persiste automáticamente resultados de Maps cuando la ejecución viene de SIC', async () => {
    googleProspecting.searchPlaces.mockResolvedValue([
      {
        source: 'google_maps',
        confidence: 'high',
        placeId: 'place-1',
        name: 'Empresa Uno',
        formattedAddress: 'Pereira, Risaralda',
        internationalPhoneNumber: '+573001112233',
        websiteUri: 'https://empresa.example',
        googleMapsUri: 'https://maps.google.com/?cid=1',
        rating: 4.8,
        userRatingCount: 21,
        businessStatus: 'OPERATIONAL',
        primaryType: 'software_company',
      },
    ]);
    sic.upsertProspect.mockResolvedValue({
      id: 'prospect-1',
      name: 'Empresa Uno',
    });

    const result = await service.execute(
      {
        tool: 'prospecting.google_maps_search',
        arguments: { query: 'software en Pereira', maxResults: 10 },
      },
      {
        agentId: 'argos-prospector',
        source: 'integration',
        executionId: 'run-1',
        campaignId: 'campaign-1',
        campaignContext: {
          city: 'Pereira',
          department: 'Risaralda',
          country: 'CO',
        },
      },
    ) as Record<string, unknown>;

    expect(sic.upsertProspect).toHaveBeenCalledWith(
      'run-1',
      expect.objectContaining({
        name: 'Empresa Uno',
        placeId: 'place-1',
        city: 'Pereira',
        department: 'Risaralda',
        country: 'CO',
        sourceType: 'google_maps',
        rating: 4.8,
        userRatingCount: 21,
      }),
    );
    expect(result.persistence).toEqual(
      expect.objectContaining({
        mode: 'automatic',
        executionId: 'run-1',
        savedCount: 1,
      }),
    );
  });

  it('no persiste automáticamente búsquedas interactivas del chat', async () => {
    googleProspecting.searchPlaces.mockResolvedValue([
      {
        source: 'google_maps',
        confidence: 'high',
        placeId: 'place-2',
        name: 'Empresa Dos',
      },
    ]);

    const result = await service.execute(
      {
        tool: 'prospecting.google_maps_search',
        arguments: { query: 'software en Pereira' },
      },
      {
        agentId: 'argos-prospector',
        source: 'interactive',
      },
    ) as Record<string, unknown>;

    expect(sic.upsertProspect).not.toHaveBeenCalled();
    expect(result).not.toHaveProperty('persistence');
  });

  it('inyecta el executionId real de SIC y rechaza ids inventados', async () => {
    sic.upsertProspect.mockResolvedValue({ id: 'prospect-3', name: 'Empresa Tres' });

    await expect(
      service.execute(
        {
          tool: 'sic.prospects.upsert',
          arguments: {
            executionId: 'run-inventado',
            prospects: [{ name: 'Empresa Tres' }],
          },
        },
        {
          agentId: 'argos-prospector',
          source: 'integration',
          executionId: 'run-real',
          campaignId: 'campaign-1',
        },
      ),
    ).rejects.toThrow('no coincide');

    expect(sic.upsertProspect).not.toHaveBeenCalled();
  });

});
