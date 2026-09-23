'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, MonitorSmartphone, RefreshCw, ShieldCheck } from 'lucide-react';

type Pending = { code: string; expiresAt: string };
type Device = { id: string; deviceName: string; approvedAt: string };
export function ArgosBrowserPairing() {
  const [pending, setPending] = useState<Pending[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function refresh() {
    try {
      const [p, d] = await Promise.all([fetch('/api/argos-browser/pending'), fetch('/api/argos-browser/devices')]);
      if (!p.ok || !d.ok) throw Error(p.status === 403 ? 'Necesitas iniciar sesión como administrador.' : 'No fue posible consultar los navegadores.');
      setPending((await p.json()).items || []);
      setDevices((await d.json()).items || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Error desconocido'); }
  }
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 4000);
    return () => clearInterval(interval);
  }, []);
  async function approve(code: string) {
    setBusy(code); setError(''); setNotice('');
    try {
      const response = await fetch('/api/argos-browser/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
      const data = await response.json();
      if (!response.ok) throw Error(data.message || 'No se pudo aprobar este navegador');
      setNotice('Navegador autorizado. Se conectará automáticamente.');
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : 'Error de autorización'); }
    finally { setBusy(''); }
  }
  return <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-white to-violet-50 p-5 shadow-sm">
    <div className="flex items-start gap-3"><div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><MonitorSmartphone className="h-6 w-6" /></div>
      <div className="flex-1"><h2 className="text-lg font-black text-zinc-950">Conectar Argos Chrome</h2>
        <p className="mt-1 text-sm text-zinc-600">Abre la extensión de Chrome. Aquí aparecerá su código de seis dígitos: haz clic en Autorizar y listo. Sin copiar tokens ni registrar IP.</p>
      </div><button aria-label="Actualizar navegadores" onClick={() => void refresh()} className="rounded-xl border bg-white p-2 text-violet-700 hover:bg-violet-100"><RefreshCw className="h-4 w-4" /></button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">{notice}</p>}
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      <div className="rounded-2xl border border-violet-100 bg-white p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-800"><ShieldCheck className="h-4 w-4 text-violet-600" /> Pendientes de autorización</h3>
        {pending.length === 0 && <p className="text-xs text-zinc-500">Cuando abras Argos en Chrome, verás aquí su solicitud.</p>}
        {pending.map(item => <div key={item.code} className="mb-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-2xl font-black tracking-[.15em] text-violet-900">{item.code}</p><p className="mt-1 text-xs text-zinc-500">Vence: {new Date(item.expiresAt).toLocaleTimeString('es-CO')}</p></div>
            <button disabled={busy === item.code} onClick={() => void approve(item.code)} className="rounded-xl bg-violet-600 px-4 py-2 text-xs font-black text-white hover:bg-violet-700 disabled:opacity-50">{busy === item.code ? 'Autorizando…' : 'Autorizar'}</button>
          </div>
        </div>)}
      </div>
      <div className="rounded-2xl border border-violet-100 bg-white p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-800"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Navegadores autorizados</h3>
        {devices.length === 0 && <p className="text-xs text-zinc-500">Aún no hay navegadores autorizados.</p>}
        {devices.map(item => <div key={item.id} className="mb-2 rounded-lg border border-zinc-100 p-3 text-xs text-zinc-700"><strong>{item.deviceName}</strong><span className="ml-2 text-zinc-400">{new Date(item.approvedAt).toLocaleString('es-CO')}</span></div>)}
      </div>
    </div>
  </section>;
}
