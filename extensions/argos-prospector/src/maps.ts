// Único contenido inyectado: Google Maps. Lee exclusivamente fichas públicas
// visibles en la interfaz normal del usuario. No elude CAPTCHA ni restricciones.
type Item = { name: string; mapsUrl: string; address?: string; phone?: string; website?: string; category?: string; rating?: number; userRatingCount?: number; placeId?: string };
const clean = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function feed(): HTMLElement | null {
  return document.querySelector<HTMLElement>('div[role="feed"]');
}
function cards(): HTMLElement[] {
  const f = feed(); if (!f) return [];
  const articles = [...f.querySelectorAll<HTMLElement>('div[role="article"]')];
  return articles.length ? articles : [...f.querySelectorAll<HTMLElement>('a[href*="/maps/place/"]')];
}
function snapshot(): Array<{ name: string; href: string }> {
  const results = new Map<string, { name: string; href: string }>();
  for (const card of cards()) {
    const anchor = card.matches('a[href*="/maps/place/"]') ?
      card as HTMLAnchorElement : card.querySelector<HTMLAnchorElement>('a[href*="/maps/place/"]');
    const name = clean(anchor?.getAttribute('aria-label') || card.querySelector('[aria-label]')?.getAttribute('aria-label') || card.querySelector('.fontHeadlineSmall')?.textContent);
    const href = anchor?.href || '';
    if (name && href && /^https:\/\/(www\.)?google\./.test(href)) results.set(href, { name, href });
  }
  return [...results.values()];
}
function labeledValue(label: string): string | undefined {
  const items = [...document.querySelectorAll<HTMLElement>('button[aria-label],a[aria-label]')];
  const hit = items.find(e => clean(e.getAttribute('aria-label')).toLowerCase().startsWith(label.toLowerCase()));
  if (!hit) return undefined;
  return clean(hit.getAttribute('aria-label')?.replace(new RegExp('^' + label + '\\s*:?\\s*','i'), ''));
}
function currentDetails(fallbackName: string): Item {
  const name = clean(document.querySelector<HTMLElement>('h1')?.textContent) || fallbackName;
  const locationUrl = location.href;
  const address = labeledValue('Dirección') || labeledValue('Address');
  const phone = labeledValue('Teléfono') || labeledValue('Phone');
  const websiteLink = document.querySelector<HTMLAnchorElement>('a[data-item-id="authority"]')?.href ||
    [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find(a => (a.getAttribute('aria-label') || '').match(/^(sitio web|website)/i))?.href;
  const website = websiteLink && !websiteLink.startsWith('https://www.google.') ? websiteLink : undefined;
  const category = clean(document.querySelector<HTMLElement>('button[jsaction*="category"]')?.textContent);
  const ratingText = clean(document.querySelector<HTMLElement>('[role="main"] [aria-label*="estrella"],[role="main"] [aria-label*="star"]')?.getAttribute('aria-label'));
  const rating = ratingText.match(/\d+(?:[.,]\d+)?/)?.[0];
  const counts = document.body.innerText.match(/([\d.,]+)\s*(?:reseñas|opiniones|reviews)/i)?.[1];
  const placeId = locationUrl.match(/!1s(ChIJ[^!/?]+)/)?.[1];
  return {
    name, mapsUrl: locationUrl, ...(address ? { address } : {}),
    ...(phone ? { phone } : {}), ...(website ? { website } : {}),
    ...(category ? { category } : {}),
    ...(rating ? { rating: Number(rating.replace(',', '.')) } : {}),
    ...(counts ? { userRatingCount: Number(counts.replace(/[.,]/g, '')) } : {}),
    ...(placeId ? { placeId } : {}),
  };
}
chrome.runtime.onMessage.addListener((message, _, respond) => {
  if (message?.type === 'ARGOS_FEED') { respond({ items: snapshot(), hasFeed: Boolean(feed()) }); return; }
  if (message?.type === 'ARGOS_SCROLL') {
    const element = feed();
    if (element) element.scrollBy({ top: Math.max(500, element.clientHeight * 0.8), behavior: 'smooth' });
    respond({ ok: Boolean(element) }); return;
  }
  if (message?.type === 'ARGOS_DETAILS') { respond(currentDetails(String(message.name || ''))); return; }
});
