import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SicClientService {
  constructor(private readonly config: ConfigService) {}

  async markRunning(executionId: string): Promise<unknown> {
    return this.post('internal/agent/campaign-runs/' + executionId + '/running', {});
  }

  async complete(executionId: string, result: Record<string, unknown>): Promise<unknown> {
    return this.post('internal/agent/campaign-runs/' + executionId + '/complete', result);
  }

  async fail(executionId: string, error: string): Promise<unknown> {
    return this.post('internal/agent/campaign-runs/' + executionId + '/fail', { error });
  }

  async upsertProspect(executionId: string, prospect: Record<string, unknown>): Promise<unknown> {
    return this.post('internal/agent/campaign-runs/' + executionId + '/prospects', prospect);
  }

  async trace(executionId: string, event: Record<string, unknown>): Promise<unknown> {
    return this.post('internal/agent/campaign-runs/' + executionId + '/events', event);
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const baseUrl = this.config.get<string>('IVOOLVE_SIC_BASE_URL')?.trim();
    const token = this.config.get<string>('IVOOLVE_SIC_INTERNAL_TOKEN')?.trim();
    const timeout = Number(this.config.get<string>('IVOOLVE_SIC_TIMEOUT_MS') ?? 15000);
    if (!baseUrl || !token) {
      throw new ServiceUnavailableException('IVOOLVE_SIC_BASE_URL/IVOOLVE_SIC_INTERNAL_TOKEN no están configurados.');
    }
    const response = await fetch(baseUrl.replace(/\/+$/, '') + '/api/' + path, {
      method: 'POST',
      headers: { Accept:'application/json','Content-Type':'application/json','X-Internal-Token':token },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('Ivoolve SIC respondió ' + response.status + ': ' + (await response.text()).slice(0,300));
    }
    return response.json();
  }
}
