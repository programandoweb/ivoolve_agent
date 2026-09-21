import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { RedisService } from '../state/redis.service';
import { ProviderStoreService } from './provider-store.service';
import { ProvidersService } from './providers.service';

describe('ProvidersService distributed ownership', () => {
  const store = {
    get: jest.fn(),
    list: jest.fn(),
    hasCredentials: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };
  const redis = {
    acquireLease: jest.fn(),
    releaseLease: jest.fn(),
  };

  let service: ProvidersService;

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockImplementation((key: string, fallback?: string) => {
      if (key === 'RUNTIME_INSTANCE_ID') return 'test-instance';
      if (key === 'PROVIDER_LEASE_TTL_SECONDS') return '45';
      return fallback;
    });

    service = new ProvidersService(
      store as unknown as ProviderStoreService,
      config as unknown as ConfigService,
      redis as unknown as RedisService,
    );
  });

  it('rechaza conectar un provider cuyo lease pertenece a otra instancia', async () => {
    store.get.mockResolvedValue({
      id: 'provider-1',
      tenantId: 'tenant-a',
      name: 'Ventas',
      type: 'whatsapp_baileys',
      status: 'disconnected',
      agentIds: ['sales'],
      autoConnect: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    redis.acquireLease.mockResolvedValue(false);

    await expect(
      service.connect('provider-1', 'tenant-a'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(redis.acquireLease).toHaveBeenCalledWith(
      'ivoolve:provider-owner:provider-1',
      'test-instance',
      45,
    );
  });
});
