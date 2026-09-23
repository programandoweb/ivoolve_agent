import { authenticatedBackendFetch } from '@/lib/backend';
export async function GET(){
 const response=await authenticatedBackendFetch('/hermes/outbox');
 return new Response(await response.text(),{status:response.status,headers:{'Content-Type':'application/json'}});
}
