'use client';
import{useEffect,useState}from'react';
type Item={id:string;task_id:string;research_id:string;prospect_id:string;status:string;attempts:number;last_error?:string;created_at:string;synced_at?:string};
export function HermesSicOutbox(){
 const[items,setItems]=useState<Item[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState('');
 async function load(){try{const r=await fetch('/api/hermes-outbox',{cache:'no-store'});if(!r.ok)throw Error('Consulta de evidencias no disponible');setItems((await r.json()).items||[]);}catch(e){setError(String(e));}}
 useEffect(()=>{void load();const id=setInterval(()=>void load(),5000);return()=>clearInterval(id);},[]);
 async function retry(path:string){setBusy(path);try{const r=await fetch('/api/hermes-outbox/'+path,{method:'POST'});if(!r.ok)throw Error('Reintento rechazado');await load();}catch(e){setError(String(e));}finally{setBusy('');}}
 const synced=items.filter(i=>i.status==='synced').length, pending=items.filter(i=>i.status!=='synced').length;
 return <section className="rounded-3xl border bg-white p-5 shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Sincronización SIC · Hermes</h2><p className="text-sm text-zinc-500">Últimas {items.length} evidencias · {synced} confirmadas · {pending} pendientes/error</p></div>
   <button onClick={()=>void retry('retry-pending')} disabled={Boolean(busy)} className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-bold text-white">Reintentar pendientes</button>
  </div>
  {error&&<p role="alert" className="mt-3 text-rose-700">{error}</p>}
  <div className="mt-4 grid gap-2">{items.map(item=><article key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs">
    <div className="min-w-0"><p className="font-bold">{item.status.toUpperCase()} · Investigación {item.research_id}</p><p className="break-all text-zinc-500">Prospecto {item.prospect_id} · {item.id}</p>
     {item.last_error&&<p className="mt-1 break-words text-rose-700">{item.last_error}</p>}</div>
    {item.status!=='synced'&&<button disabled={Boolean(busy)} onClick={()=>void retry(item.id+'/retry')} className="rounded-lg border px-3 py-2 font-bold text-violet-800">Reintentar</button>}
   </article>)}</div>
  {!items.length&&<p className="mt-3 text-sm text-zinc-500">Sin evidencias registradas.</p>}
 </section>;
}
