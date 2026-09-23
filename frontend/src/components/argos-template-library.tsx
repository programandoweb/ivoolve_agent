'use client';

import { useCallback, useEffect, useState } from 'react';
import { BookOpen, ChevronRight, RefreshCw, Sparkles } from 'lucide-react';

type Template = {
  id: string; title: string; description: string; sector: string;
  defaultCity: string; defaultDepartment: string; defaultQuantity: number; builtin: boolean;
};
const offlineTemplates: Template[] = [
  ['textil', 'Confección textil', 'confección textil y fábricas de ropa', 'Pereira'],
  ['calzado', 'Fábricas de zapatos', 'fabricantes de calzado y fábricas de zapatos', 'Pereira'],
  ['estetica', 'Centros estéticos y manicuristas', 'centros estéticos y manicuristas', 'Dosquebradas'],
  ['automotriz', 'Empresas automotrices', 'empresas del sector automotriz', 'Pereira'],
  ['boutiques', 'Boutiques femeninas', 'boutiques y tiendas de ropa femenina', 'Pereira'],
  ['turismo', 'Agencias de turismo', 'agencias de viajes y operadores turísticos', 'Pereira'],
  ['restaurantes', 'Restaurantes', 'restaurantes y negocios gastronómicos', 'Dosquebradas'],
  ['constructoras', 'Constructoras y ferreterías', 'constructoras, ferreterías y materiales de construcción', 'Pereira'],
  ['muebles', 'Fabricantes de muebles', 'fabricantes de muebles y carpinterías', 'Dosquebradas'],
  ['distribuidoras', 'Distribuidoras mayoristas', 'distribuidoras mayoristas y comercializadoras', 'Pereira'],
].map(([key, title, sector, city]) => ({
  id: 'builtin-' + key, title, description: 'Búsqueda B2B con Google Maps',
  sector, defaultCity: city, defaultDepartment: 'Risaralda', defaultQuantity: 10, builtin: true,
}));

function draft(template: Template): string {
  return `Busca ${template.defaultQuantity} ${template.sector} en ${template.defaultCity}, ${template.defaultDepartment}, utilizando exclusivamente la extensión Chrome. Recopila sus nombres, teléfonos, direcciones, sitios web y enlaces de Google Maps cuando estén disponibles. Guarda primero los datos en la memoria persistente de Argos y sincronízalos automáticamente con SIC. Indícame cuántas empresas encontraste, cuántas confirmó SIC como guardadas y cuántas quedan pendientes de sincronización. Si SIC falla, conserva lo recopilado para reintentarlo sin repetir la búsqueda.`;
}

export function ArgosTemplateLibrary() {
  const [templates, setTemplates] = useState<Template[]>(offlineTemplates);
  const [selected, setSelected] = useState<string | null>(null);
  const [backendError, setBackendError] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/argos-templates', { cache: 'no-store' });
      if (!response.ok) throw Error('Plantillas remotas no disponibles');
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw Error('Respuesta de biblioteca inesperada');
      const verified = data.filter((value): value is Template =>
        typeof value === 'object' && value !== null &&
        typeof (value as Template).id === 'string' &&
        typeof (value as Template).title === 'string' &&
        typeof (value as Template).sector === 'string' &&
        typeof (value as Template).defaultCity === 'string' &&
        typeof (value as Template).defaultDepartment === 'string' &&
        typeof (value as Template).defaultQuantity === 'number'
      );
      setTemplates(verified.length ? verified : offlineTemplates);
      setBackendError(false);
    } catch {
      setTemplates(offlineTemplates);
      setBackendError(true);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  function choose(template: Template) {
    // Only fill the existing textarea. Do not emit an agent task or send a
    // WebSocket message; the human reviews/edits and explicitly presses Enter.
    window.dispatchEvent(new CustomEvent('argos:template:draft', {
      detail: { text: draft(template) },
    }));
    setSelected(template.id);
  }

  return <aside className="flex min-h-0 flex-col rounded-[24px] border border-zinc-200 bg-white shadow-sm lg:max-h-[670px]">
    <div className="shrink-0 rounded-t-[24px] border-b border-violet-100 bg-gradient-to-r from-violet-50 to-white px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white"><BookOpen className="h-5 w-5" /></span>
          <div><h2 className="text-base font-black text-zinc-950">Biblioteca de plantillas</h2>
            <p className="text-xs text-zinc-500">10 guías listas para personalizar</p></div>
        </div>
        <button type="button" onClick={() => void refresh()} aria-label="Actualizar plantillas" title="Actualizar biblioteca"
          className="rounded-lg border border-violet-100 bg-white p-2 text-violet-600 hover:bg-violet-50"><RefreshCw className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-100 bg-white/80 px-3 py-2 text-[11px] leading-5 text-violet-700">
        <Sparkles className="h-4 w-4 shrink-0" />
        Selecciona una plantilla, cambia cantidad o ciudad en el chat y pulsa Enter cuando estés listo.
      </div>
      {backendError && <p className="mt-2 text-[11px] text-amber-700">Mostrando las 10 plantillas incluidas. La biblioteca remota no respondió.</p>}
    </div>
    <div className="grid min-h-0 gap-2 overflow-y-auto p-3 sm:grid-cols-2 lg:grid-cols-1">
      {templates.map((t, index) => <button
        key={t.id} type="button" onClick={() => choose(t)}
        aria-label={'Cargar plantilla: ' + t.title}
        className={'group flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition hover:border-violet-300 hover:bg-violet-50 ' +
          (selected === t.id ? 'border-violet-400 bg-violet-50 shadow-sm' : 'border-zinc-100 bg-zinc-50/60')}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-violet-700 shadow-sm">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-zinc-900">{t.title}</span>
          <span className="mt-1 block text-[11px] leading-4 text-zinc-500">{t.defaultCity}, {t.defaultDepartment} · {t.defaultQuantity} empresas</span></span>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-zinc-400 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
      </button>)}
    </div>
    <p className="shrink-0 border-t border-zinc-100 p-3 text-center text-[11px] text-zinc-500">
      Un clic prepara el texto; nunca inicia la búsqueda automáticamente.
    </p>
  </aside>;
}
