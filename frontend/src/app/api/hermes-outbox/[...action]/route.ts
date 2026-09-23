import { authenticatedBackendFetch } from '@/lib/backend';
type Params={params:Promise<{action:string[]}>};
async function proxy(req:Request,{params}:Params){
 const {action}=await params;
 if(!action.length||action.some(s=>!/^[-a-z0-9]+$/i.test(s)))return Response.json({message:'Ruta inválida'},{status:400});
 const response=await authenticatedBackendFetch('/hermes/outbox/'+action.join('/'),{method:req.method});
 return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json'}});
}
export const GET=proxy;export const POST=proxy;
