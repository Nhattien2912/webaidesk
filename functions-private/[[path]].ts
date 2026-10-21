import { verifyAccess } from '../server/cms/auth.ts'
import type { CmsEnv } from '../server/cms/types.ts'

interface AssetBinding { fetch(request:Request):Promise<Response> }
interface Context { request:Request; env:CmsEnv&{ASSETS:AssetBinding} }
const denied=(code:string,status:number)=>new Response(JSON.stringify({error:{code,message:code,requestId:crypto.randomUUID()}}),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})

export async function onRequest({request,env}:Context):Promise<Response>{
  if(env.CMS_ADMIN_ENABLED!=='true'||!['staging','production'].includes(env.ENVIRONMENT??''))return denied('admin_disabled',404)
  const hostname=new URL(request.url).hostname.toLowerCase()
  const allowed=(env.PRIVATE_ADMIN_HOSTNAMES??'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean)
  if(!allowed.length||allowed.some(value=>value.includes('*'))||!allowed.includes(hostname))return denied('host_forbidden',403)
  const token=request.headers.get('cf-access-jwt-assertion')
  if(!token)return denied('authentication_required',401)
  try{await verifyAccess(token,env,hostname)}catch{return denied('access_invalid',401)}
  const url=new URL(request.url)
  // The Studio's page preview is a second HTML entry, embedded by the Studio itself (same origin, behind Access).
  const preview=/^\/admin\/preview\/(install|prompts|tutorials)\/?$/.test(url.pathname)
  if(preview){url.pathname='/preview';url.search=''}
  else if(!/\/[^/]+\.[a-z0-9]+$/i.test(url.pathname)){url.pathname='/';url.search=''}
  const response=await env.ASSETS.fetch(new Request(url,request))
  const headers=new Headers(response.headers)
  headers.set('cache-control','no-store')
  headers.set('x-content-type-options','nosniff')
  headers.set('x-frame-options',preview?'SAMEORIGIN':'DENY')
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers})
}
