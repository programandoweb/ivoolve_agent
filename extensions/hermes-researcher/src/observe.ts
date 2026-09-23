// Lectura pública exclusivamente desde el DOM renderizado. Sin evasión de login/CAPTCHA.
const clean = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();
const external = (raw: string) => {
  try {
    const url = new URL(raw, location.href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch { return undefined; }
};
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type !== 'HERMES_OBSERVE') return;
  const text = clean(document.body?.innerText).slice(0, 12000);
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .map(a => ({ title: clean(a.innerText || a.getAttribute('aria-label')).slice(0, 180), url: external(a.href) }))
    .filter((a): a is { title: string; url: string } => Boolean(a.url && a.title.length > 2))
    .slice(0, 35);
  // Las miniaturas observadas en Google Images son REFERENCIAS, no activos
  // descargados ni imágenes cuya autoría pertenezca necesariamente al prospecto.
  // sourcePageUrl registra dónde se observó cada miniatura, landingPageUrl
  // el destino publicitado por el buscador, sin afirmar que se visitó.
  const images = location.hostname.startsWith('www.google.') && new URLSearchParams(location.search).get('tbm') === 'isch'
    ? [...document.querySelectorAll<HTMLImageElement>('img')].map(img => {
      const anchor = img.closest<HTMLAnchorElement>('a[href]');
      const rawTarget = anchor?.href;
      let landingPageUrl: string | undefined;
      if (rawTarget) {
        const target = new URL(rawTarget, location.href);
        landingPageUrl = target.searchParams.get('imgrefurl') || (target.hostname.endsWith('google.com') ? undefined : external(rawTarget));
      }
      return {
        alt: clean(img.alt).slice(0, 250),
        thumbnailUrl: external(img.currentSrc || img.src),
        landingPageUrl: landingPageUrl ? external(landingPageUrl) : undefined,
        sourcePageUrl: location.href,
        obtainedVia: 'chrome_visible_dom_google_images' as const,
      };
    })
      .filter(img => img.thumbnailUrl && (img.alt || img.landingPageUrl))
      .slice(0, 15)
    : [];
  reply({
    title: clean(document.title).slice(0, 250),
    url: location.href, text, links, images,
    capturedAt: new Date().toISOString(),
    obtainedVia: 'chrome_visible_dom',
    access: text.length ? 'public_visible' : 'empty_or_blocked',
  });
});
