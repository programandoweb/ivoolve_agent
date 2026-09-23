'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowUpRight, CheckCircle2, Clock3, Database, RefreshCw, RotateCcw } from 'lucide-react';

type Item = {
  id: string;
  batchId: string;
  name: string;
  mode: 'chat' | 'campaign';
  status: 'pending' | 'processing' | 'failed' | 'synced';
  attempts: number;
  lastError: string | null;
  sicProspectId: string | null;
  collectedAt: string;
  syncedAt: string | null;
};
type Response = { items: Item[]; pending: number; failed: number; synced: number; total: number };
const labels: Record<string, string> = {
  pending: 'Pendiente', processing: 'Sincronizando', failed: 'Error · pendiente de reintento', synced: 'Confirmado por SIC',
};

export function ArgosSicOutbox() {
  const [data, setData] = useState<Response>({ items: [], pending: 0, failed: 0, synced: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch('/api/argos-outbox', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw Error(payload.message || 'Error al consultar los resultados');
      setData(payload);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(true), 10_000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function retry(path: string, key: string) {
    setBusy(key); setNotice(''); setError('');
    try {
      const response = await fetch('/api/argos-outbox/' + path, { method: 'POST' });
      const result = await response.json();
      if (!response.ok) throw Error(result.message || 'Error al reintentar');
      setNotice('Reintento solicitado. Si SIC continúa fallando, conservaremos los registros pendientes.');
      await refresh(true);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(''); }
  }

  return <section className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3"><div className="rounded-2xl bg-violet-100 p-3 text-violet-700"><Database className="h-6 w-6" /></div>
        <div><h2 className="text-xl font-black text-zinc-950">Memoria de sincronización con SIC</h2>
          <p className="mt-1 max-w-xl text-sm text-zinc-500">Argos guarda las empresas recopiladas en MariaDB antes de enviarlas. Los errores no obligan a repetir la búsqueda. El sistema reintenta automáticamente.</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => void refresh()} className="rounded-xl border border-zinc-200 p-2 text-zinc-600 hover:bg-zinc-50" title="Actualizar"><RefreshCw className={'h-4 w-4 ' + (loading ? 'animate-spin' : '')}/></button>
        <button disabled={Boolean(busy) || data.pending + data.failed === 0} onClick={() => void retry('retry-pending', 'all')}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
          <RotateCcw className={'h-4 w-4 ' + (busy === 'all' ? 'animate-spin' : '')}/> Reintentar pendientes
        </button>
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { title: 'Registros recientes', value: data.total, icon: Database },
        { title: 'En espera', value: data.pending, icon: Clock3 },
        { title: 'Con error', value: data.failed, icon: AlertCircle },
        { title: 'En SIC', value: data.synced, icon: CheckCircle2 },
      ].map(({ title, value, icon: Icon }) => <div key={title} className="rounded-2xl border bg-zinc-50 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-500"><Icon className="h-4 w-4 text-violet-600"/>{title}</div>
        <strong className="mt-2 block text-2xl font-black text-zinc-950">{value}</strong>
      </div>)}
    </div>
    <div className="overflow-x-auto rounded-2xl border border-zinc-100">
      <table className="w-full min-w-[750px] text-left text-sm">
        <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500"><tr>
          <th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Origen</th><th className="px-4 py-3">Estado</th>
          <th className="px-4 py-3">Intentos</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3">Acción</th>
        </tr></thead>
        <tbody className="divide-y divide-zinc-100">
          {data.items.map(item => <tr key={item.id} className="align-top">
            <td className="px-4 py-3"><div className="font-semibold text-zinc-950">{item.name}</div>
              <div className="mt-1 font-mono text-[10px] text-zinc-400">Lote: {item.batchId.slice(0, 8)}</div>
              {item.lastError && <details className="mt-2 max-w-sm text-xs text-rose-700"><summary className="cursor-pointer">Ver error</summary>
                <p className="mt-1 whitespace-pre-wrap break-all rounded-lg bg-rose-50 p-2">{item.lastError}</p></details>}
            </td>
            <td className="px-4 py-3 text-zinc-600">{item.mode === 'campaign' ? 'Campaña SIC' : 'Chat Argos'}</td>
            <td className="px-4 py-3"><span className={'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ' +
              (item.status === 'synced' ? 'bg-emerald-50 text-emerald-800' : item.status === 'failed' ? 'bg-rose-50 text-rose-800' : 'bg-amber-50 text-amber-800')}>
              {labels[item.status]}</span></td>
            <td className="px-4 py-3 text-zinc-500">{item.attempts}</td>
            <td className="px-4 py-3 text-xs text-zinc-500">{new Date(item.collectedAt).toLocaleString('es-CO')}</td>
            <td className="px-4 py-3">{item.status === 'synced' && item.sicProspectId
              ? <a className="inline-flex gap-1 font-bold text-emerald-700 hover:underline" href="https://sic.programandoweb.net/dashboard/prospects" target="_blank" rel="noopener noreferrer">Ver SIC <ArrowUpRight className="h-4 w-4"/></a>
              : item.status !== 'processing' && item.status !== 'synced'
              ? <button disabled={Boolean(busy)} onClick={() => void retry(item.id + '/retry', item.id)} className="rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50">Reintentar</button>
              : null}</td>
          </tr>)}
          {!data.items.length && <tr><td className="p-8 text-center text-sm text-zinc-500" colSpan={6}>{loading ? 'Consultando memoria de Argos…' : 'No hay recolecciones recientes.'}</td></tr>}
        </tbody>
      </table>
    </div>
    <p className="text-xs text-zinc-400">Se muestran hasta 100 registros recientes. Los confirmados permanecen registrados para auditoría y no se vuelven a enviar.</p>
  </section>;
}
