import { authenticatedBackendFetch } from '@/lib/backend';
type Params={params:Promise<{action:string[]}>};
async function proxy(req:Request,{params}:Params){
 const {action}=await params;
 if(!action.length||!['pending','devices','approve'].includes(action[0])||action.some(s=>!/^[-a-z0-9]+$/i.test(s)))return Response.json({message:'Ruta inválida'}, {status:400});
 const path='/admin/hermes-browser/'+action.join('/');
 const body=req.method==='POST'?await req.text():undefined;
 const response=await authenticatedBackendFetch(path,{method:req.method,body});
 return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json'}});
}
export const GET=proxy;export const POST=proxy;export const DELETE=proxy;
