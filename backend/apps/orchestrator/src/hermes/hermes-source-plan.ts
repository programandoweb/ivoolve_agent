/** Public-source research plan: official and registry information takes
 * precedence over commercial sites, social networks and indexed images.
 * Search results are discovery hints; they do NOT prove official registration
 * until the originating public record is visited and matched.
 */
export function hermesSourcePlan(input: {
  name: string; city?: string; activity?: string;
}): string[] {
  const name=input.name.replace(/[\r\n<>]/g,' ').trim().slice(0,100);
  if(name.length<2)throw new Error('A verified SIC prospect name is required');
  const city=(input.city||'').replace(/[\r\n<>]/g,' ').trim().slice(0,80);
  const activity=(input.activity||'').replace(/[\r\n<>]/g,' ').trim().slice(0,80);
  const identity='"'+name.replace(/"/g,'')+'"';
  const where=city?' '+city:'';
  // Official KYC/KYV evidence precedes marketing and social discoveries.
  // Search URLs are only discovery hints: the original record still needs
  // direct public verification and correct company identity matching.
  return [
    identity+where+' site:gov.co razón social NIT actividad',
    identity+' site:rues.org.co',
    identity+where+' cámara de comercio registro mercantil',
    identity+where+' site:supersociedades.gov.co estados financieros',
    identity+where+' site:ramajudicial.gov.co procesos',
    identity+where+' site:ofac.treasury.gov sanciones',
    identity+where+' sitio web oficial '+activity,
    identity+where+' site:facebook.com',
    identity+where+' site:instagram.com',
    identity+where+' site:linkedin.com/company',
    identity+where+' portafolio clientes servicios',
    'IMAGE:'+identity+where+' '+activity+' portafolio proyectos'
  ].map(query => query.slice(0,160));
}
