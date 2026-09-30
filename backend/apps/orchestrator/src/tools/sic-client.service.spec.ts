import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { SicClientService } from './sic-client.service';

const service = (env: Record<string, string>) =>
  new SicClientService({ get: (key: string) => env[key] } as unknown as ConfigService);

describe('SicClientService destino comercial', () => {
  it('traduce rutas SIC a la API interna del CRM del ERP', () => {
    expect(SicClientService.toCrmPath('internal/agent/argos/prospects')).toBe('internal/v1/crm/prospects');
    expect(SicClientService.toCrmPath('internal/agent/campaign-runs/r1/running')).toBe('internal/v1/crm/campaign-runs/r1/running');
    expect(SicClientService.toCrmPath('internal/agent/campaign-runs/r1/prospects')).toBe('internal/v1/crm/campaign-runs/r1/prospects');
    expect(SicClientService.toCrmPath('internal/orchestration/research/x/evidence')).toBe('internal/v1/crm/research-runs/x/evidences');
    expect(SicClientService.toCrmPath('internal/orchestration/research/x/complete')).toBe('internal/v1/crm/research-runs/x/complete');
    expect(SicClientService.toCrmPath('internal/orchestration/research/x/fail')).toBe('internal/v1/crm/research-runs/x/fail');
  });

  it('usa credencial Bearer del tenant en modo ERP y nunca envía tenant_id', () => {
    const target = (service({ IVOOLVE_CRM_BASE_URL: 'https://erp.test/', IVOOLVE_CRM_AGENT_TOKEN: 'crm_abc' }) as any).target('internal/agent/argos/prospects');
    expect(target.url).toBe('https://erp.test/api/internal/v1/crm/prospects');
    expect(target.headers).toEqual({ Authorization: 'Bearer crm_abc' });
  });

  it('conserva el contrato transitorio de SIC cuando no hay credencial CRM', () => {
    const target = (service({ IVOOLVE_SIC_BASE_URL: 'https://sic.test', IVOOLVE_SIC_INTERNAL_TOKEN: 't' }) as any).target('internal/agent/argos/prospects');
    expect(target.url).toBe('https://sic.test/api/internal/agent/argos/prospects');
    expect(target.headers).toEqual({ 'X-Internal-Token': 't' });
  });

  it('falla de forma explícita si no hay destino configurado', () => {
    expect(() => (service({}) as any).target('x')).toThrow(ServiceUnavailableException);
  });
});
