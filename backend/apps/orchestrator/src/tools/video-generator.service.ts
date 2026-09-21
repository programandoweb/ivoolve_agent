import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface VideoGenerateInput {
  prompt: string;
  negativePrompt?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  fps?: number;
  seed?: number;
  inferenceSteps?: number;
  guidanceScale?: number;
}

@Injectable()
export class VideoGeneratorService {
  constructor(private readonly config: ConfigService) {}

  async capabilities(): Promise<unknown> {
    return this.request('/v1/capabilities', { method: 'GET' });
  }

  async generate(input: VideoGenerateInput): Promise<unknown> {
    return this.request('/v1/videos/jobs', {
      method: 'POST',
      body: JSON.stringify({
        prompt: input.prompt,
        negative_prompt: input.negativePrompt,
        duration_seconds: input.durationSeconds ?? 5,
        width: input.width ?? 832,
        height: input.height ?? 480,
        fps: input.fps ?? 16,
        seed: input.seed,
        inference_steps: input.inferenceSteps,
        guidance_scale: input.guidanceScale,
      }),
    });
  }

  async status(jobId: string): Promise<unknown> {
    return this.request(`/v1/videos/jobs/${encodeURIComponent(jobId)}`, {
      method: 'GET',
    });
  }

  private async request(
    path: string,
    init: RequestInit,
  ): Promise<unknown> {
    const baseUrl = this.config
      .get<string>('VIDEO_GENERATOR_BASE_URL')
      ?.trim()
      .replace(/\/$/, '');
    const token = this.config.get<string>('VIDEO_GENERATOR_TOKEN')?.trim();
    const timeoutMs = Number(
      this.config.get<string>('VIDEO_GENERATOR_TIMEOUT_MS') ?? 15000,
    );

    if (!baseUrl || !token) {
      throw new ServiceUnavailableException(
        'VIDEO_GENERATOR_BASE_URL y VIDEO_GENERATOR_TOKEN deben estar configurados.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          'X-Ivoolve-Video-Token': token,
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new ServiceUnavailableException(
          `Video Generator respondió ${response.status}: ${detail.slice(0, 500)}`,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      const detail = error instanceof Error ? error.message : String(error);
      throw new ServiceUnavailableException(
        `No fue posible contactar Ivoolve Video Generator: ${detail}`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}
