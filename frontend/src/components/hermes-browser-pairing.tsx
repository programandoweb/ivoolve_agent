'use client';
import {useEffect,useState} from 'react';
type Pending={code:string;expiresAt:string};
type Device={id:string;deviceName:string;approvedAt:string};
export function HermesBrowserPairing(){
 const[pending,setPending]=useState<Pending[]>([]),[devices,setDevices]=useState<Device[]>([]),[error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState('');
 async function refresh(){
  try{
   const [p,d]=await Promise.all([fetch('/api/hermes-browser/pending'),fetch('/api/hermes-browser/devices')]);
   if(!p.ok||!d.ok)throw Error('Se requiere rol administrador y conexión al backend.');
   setPending((await p.json()).items||[]);setDevices((await d.json()).items||[]);
  }catch(e){setError(String(e));}
 }
 useEffect(()=>{void refresh();const id=setInterval(()=>void refresh(),4000);return()=>clearInterval(id);},[]);
 async function approve(code:string){setBusy(code);setError('');
  try{const res=await fetch('/api/hermes-browser/approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});if(!res.ok)throw Error((await res.json()).message||'No autorizado');setNotice('Chrome Hermes autorizado.');await refresh();}
  catch(e){setError(String(e));}finally{setBusy('');}
 }
 return <section className="rounded-3xl border bg-white p-5 shadow-sm">
  <h2 className="text-xl font-black text-violet-800">Conectar Chrome · Hermes</h2>
  <p className="mt-2 text-sm text-zinc-600">Abre la extensión Hermes. Aprobar desde aquí emite una credencial exclusiva a ese dispositivo; no compartas tokens con Argos.</p>
  {error&&<p role="alert" className="mt-3 text-rose-700">{error}</p>}
  {notice&&<p role="status" className="mt-3 text-emerald-700">{notice}</p>}
  <div className="mt-4 grid gap-4 md:grid-cols-2">
   <div className="rounded-xl border p-4"><h3 className="mb-3 font-bold">Pendientes de autorización</h3>
    {!pending.length&&<p className="text-sm text-zinc-500">No hay conexiones nuevas.</p>}
    {pending.map(p=><div key={p.code} className="mb-3 rounded-xl bg-violet-50 p-3">
     <strong className="font-mono text-3xl tracking-widest">{p.code}</strong>
     <p className="text-xs">Vence: {new Date(p.expiresAt).toLocaleTimeString('es-CO')}</p>
     <button disabled={busy===p.code} onClick={()=>void approve(p.code)} className="mt-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-bold text-white">Autorizar</button>
    </div>)}
   </div>
   <div className="rounded-xl border p-4"><h3 className="mb-3 font-bold">Dispositivos autorizados</h3>
    {devices.map(d=><p key={d.id} className="mb-2 text-sm">{d.deviceName} · {new Date(d.approvedAt).toLocaleDateString('es-CO')}</p>)}
    {!devices.length&&<p className="text-sm text-zinc-500">Sin dispositivos.</p>}
   </div>
  </div>
 </section>;
}
