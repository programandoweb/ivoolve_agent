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

  // El chat de Argos no tiene campaignRun; usa un endpoint interno específico
  // con la misma deduplicación y auditoría de SIC.
  async importArgosProspects(prospects: Record<string, unknown>[]): Promise<{
    savedCount: number;
    prospects: Array<{ id: string; name?: string }>;
  }> {
    return this.post('internal/agent/argos/prospects', { prospects }) as Promise<{
      savedCount: number;
      prospects: Array<{ id: string; name?: string }>;
    }>;
  }

  async upsertProspect(executionId: string, prospect: Record<string, unknown>): Promise<unknown> {
    return this.post('internal/agent/campaign-runs/' + executionId + '/prospects', prospect);
  }

  async trace(executionId: string, event: Record<string, unknown>): Promise<unknown> {
    return this.post('internal/agent/campaign-runs/' + executionId + '/events', event);
  }

  async addResearchEvidence(researchId: string, evidence: Record<string, unknown>): Promise<unknown> {
    return this.post('internal/orchestration/research/' + researchId + '/evidence', evidence);
  }

  async completeResearch(researchId: string, profile: Record<string, unknown>): Promise<unknown> {
    return this.post('internal/orchestration/research/' + researchId + '/complete', profile);
  }

  async failResearch(researchId: string, error: string): Promise<unknown> {
    return this.post('internal/orchestration/research/' + researchId + '/fail', { error });
  }

  /**
   * Destino de la persistencia comercial. Modo ERP-CRM (IVOOLVE_CRM_BASE_URL + IVOOLVE_CRM_AGENT_TOKEN): la credencial fija el
   * tenant en Laravel; el agente nunca envía tenant_id. Sin esas variables se conserva el contrato transitorio de IVOOLVE SIC.
   */
  private target(path: string): { url: string; headers: Record<string, string> } {
    const crmBase = this.config.get<string>('IVOOLVE_CRM_BASE_URL')?.trim();
    const crmToken = this.config.get<string>('IVOOLVE_CRM_AGENT_TOKEN')?.trim();
    if (crmBase && crmToken) {
      return {
        url: crmBase.replace(/\/+$/, '') + '/api/' + SicClientService.toCrmPath(path),
        headers: { Authorization: 'Bearer ' + crmToken },
      };
    }
    const baseUrl = this.config.get<string>('IVOOLVE_SIC_BASE_URL')?.trim();
    const token = this.config.get<string>('IVOOLVE_SIC_INTERNAL_TOKEN')?.trim();
    if (!baseUrl || !token) {
      throw new ServiceUnavailableException(
        'Configura IVOOLVE_CRM_BASE_URL/IVOOLVE_CRM_AGENT_TOKEN (ERP) o IVOOLVE_SIC_BASE_URL/IVOOLVE_SIC_INTERNAL_TOKEN (SIC transitorio).',
      );
    }
    return { url: baseUrl.replace(/\/+$/, '') + '/api/' + path, headers: { 'X-Internal-Token': token } };
  }

  /** Traduce las rutas históricas de SIC a la API interna del CRM del ERP (/api/internal/v1/crm/...). */
  static toCrmPath(path: string): string {
    if (path === 'internal/agent/argos/prospects') return 'internal/v1/crm/prospects';
    const [scope, area, resource, id, action] = path.split('/');
    if (scope === 'internal' && area === 'agent' && resource === 'campaign-runs' && id && action) {
      return 'internal/v1/crm/campaign-runs/' + id + '/' + action;
    }
    if (scope === 'internal' && area === 'orchestration' && resource === 'research' && id && action) {
      return 'internal/v1/crm/research-runs/' + id + '/' + (action === 'evidence' ? 'evidences' : action);
    }
    return path;
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const timeout = Number(this.config.get<string>('IVOOLVE_SIC_TIMEOUT_MS') ?? 15000);
    const { url, headers } = this.target(path);
    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException('Persistencia comercial respondió ' + response.status + ': ' + (await response.text()).slice(0, 300));
    }
    return response.json();
  }
}
