'use client';
import {useEffect,useState} from 'react';
type Pending={code:string;expiresAt:string};
type Device={id:string;deviceName:string;approvedAt:string};
export function HermesBrowserPairing(){
 const[pending,setPending]=useState<Pending[]>([]),[devices,setDevices]=useState<Device[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(''),[code,setCode]=useState('');
 async function refresh(){
  try{
   const [p,d]=await Promise.all([fetch('/api/hermes-browser/pending'),fetch('/api/hermes-browser/devices')]);
   if(!p.ok||!d.ok)throw Error('Se requiere rol administrador y conexión al backend.');
   setPending((await p.json()).items||[]);setDevices((await d.json()).items||[]);
  }catch(e){setError(String(e));}
 }
 useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),4000);return()=>clearInterval(id);},[]);
 async function approve(code:string){setBusy(code);setError('');
  try{const res=await fetch('/api/hermes-browser/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});if(!res.ok)throw Error((await res.json()).message||'No autorizado');setNotice('Chrome Hermes autorizado.');setCode('');await refresh();}
  catch(e){setError(String(e));}finally{setBusy('');}
 }
 return <section className="rounded-3xl border bg-white p-5 shadow-sm">
  <h2 className="text-xl font-black text-violet-800">Conectar Chrome · Hermes</h2>
  <p className="mt-2 text-sm text-zinc-600">Abre la extensión Hermes, introduce aquí su código temporal de seis dígitos y autorízala. La autorización queda asociada a tu tenant, sin compartir tokens con Argos.</p>
  {error&&<p role="alert" className="mt-3 text-rose-700">{error}</p>}
  {notice&&<p role="status" className="mt-3 text-emerald-700">{notice}</p>}
  <div className="mt-4 grid gap-4 md:grid-cols-2">
   <div className="rounded-xl border p-4"><h3 className="mb-3 font-bold">Emparejar dispositivo</h3>
    <label htmlFor="hermes-code" className="text-xs text-zinc-600">Código mostrado exclusivamente en Chrome Hermes</label>
    <input id="hermes-code" value={code} maxLength={6} inputMode="numeric" autoComplete="off"
      onChange={e=>setCode(e.target.value.replace(/\\D/g,'').slice(0,6))}
      placeholder="000000" className="mt-2 w-full rounded-xl border p-3 font-mono text-2xl tracking-widest"/>
    <button disabled={busy===code||code.length!==6} onClick={()=>void approve(code)}
      className="mt-3 rounded-xl bg-violet-700 px-4 py-2 font-bold text-white disabled:opacity-40">Autorizar Chrome Hermes</button>
    <p className="mt-3 text-xs text-zinc-500">El código caduca en cinco minutos; no se muestran aquí códigos de otros tenants.</p>
   </div>
   <div className="rounded-xl border p-4"><h3 className="mb-3 font-bold">Dispositivos autorizados</h3>
    {devices.map(d=><p key={d.id} className="mb-2 text-sm">{d.deviceName} · {new Date(d.approvedAt).toLocaleDateString('es-CO')}</p>)}
    {!devices.length&&<p className="text-sm text-zinc-500">Sin dispositivos.</p>}
   </div>
  </div>
 </section>;
}
