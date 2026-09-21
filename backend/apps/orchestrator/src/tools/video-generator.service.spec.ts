import { ConfigService } from '@nestjs/config';

import { VideoGeneratorService } from './video-generator.service';

describe('VideoGeneratorService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('envía un job al worker Python con token privado', async () => {
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          VIDEO_GENERATOR_BASE_URL: 'http://10.8.0.2:8650',
          VIDEO_GENERATOR_TOKEN: 'secret',
          VIDEO_GENERATOR_TIMEOUT_MS: '15000',
        };
        return values[key];
      }),
    };

    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ id: 'job-1', status: 'queued' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    const service = new VideoGeneratorService(
      config as unknown as ConfigService,
    );

    const result = await service.generate({
      prompt: 'Ivoolve ERP commercial',
      durationSeconds: 5,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://10.8.0.2:8650/v1/videos/jobs',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Ivoolve-Video-Token': 'secret',
        }),
      }),
    );
    expect(result).toEqual({ id: 'job-1', status: 'queued' });
  });

  it('falla claramente sin configuración', async () => {
    const config = { get: jest.fn(() => undefined) };
    const service = new VideoGeneratorService(
      config as unknown as ConfigService,
    );

    await expect(service.capabilities()).rejects.toThrow(
      'VIDEO_GENERATOR_BASE_URL',
    );
  });
});
