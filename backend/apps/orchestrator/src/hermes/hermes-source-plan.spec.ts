import { hermesSourcePlan } from './hermes-source-plan';

describe('Hermes research sources', () => {
  it('prioritizes government and registries ahead of socials and images', () => {
    const steps = hermesSourcePlan({
      name: 'Eventos Ejemplo SAS', city: 'Pereira',
      activity: 'organizacion de eventos',
    });
    expect(steps).toHaveLength(8);
    expect(steps[0]).toContain('site:gov.co');
    expect(steps[1]).toContain('site:rues.org.co');
    expect(steps[2]).toContain('cámara de comercio');
    expect(steps[3]).toContain('sitio web oficial');
    expect(steps[4]).toContain('facebook.com');
    expect(steps[5]).toContain('instagram.com');
    expect(steps[6]).toContain('linkedin.com');
    expect(steps[7]).toMatch(/^IMAGE:/);
  });
  it('does not silently invent a name when SIC identity is missing', () => {
    expect(() => hermesSourcePlan({ name: ' ' })).toThrow();
  });
});
