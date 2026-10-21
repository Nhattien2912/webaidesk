import { authorize } from '../../server/cms/auth.ts'
import type { CmsEnv } from '../../server/cms/types.ts'

interface Context { request:Request;env:CmsEnv;next():Promise<Response> }
const denied=(code:string,status:number)=>new Response(JSON.stringify({error:{code,message:code,requestId:crypto.randomUUID()}}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})
export async function onRequest(context:Context){const {request,env}=context;if(env.CMS_ADMIN_ENABLED!=='true'||!['staging','production'].includes(env.ENVIRONMENT??''))return denied('admin_disabled',404);const auth=await authorize(request,env);if(!auth.ok)return denied(auth.code,auth.status);return context.next()}
