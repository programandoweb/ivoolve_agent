// Captura únicamente información renderizada en una página pública de Google.
const clean = (value: string | null | undefined) => (value || '').replace(/\s+/g, ' ').trim();
chrome.runtime.onMessage.addListener((message, _sender, reply) => {
  if (message?.type !== 'HERMES_OBSERVE') return;
  const text = clean(document.body?.innerText).slice(0, 14000);
  const links = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .filter(a => /^https?:\/\//.test(a.href) && clean(a.innerText).length > 2)
    .slice(0, 35)
    .map(a => ({ title: clean(a.innerText).slice(0, 180), url: a.href }));
  reply({ title: clean(document.title).slice(0, 250), url: location.href, text, links, capturedAt: new Date().toISOString() });
});
