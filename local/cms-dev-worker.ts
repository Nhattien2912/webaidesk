import { handleAdminContent, handlePublicContent } from '../server/cms/handler.ts'
import { submitComment } from '../server/cms/comments.ts'
import type { CmsEnv, AccessIdentity } from '../server/cms/types.ts'

interface LocalEnv extends CmsEnv { ASSETS:{fetch(request:Request):Promise<Response>} }
const localIdentity:AccessIdentity={sub:'local-studio-owner',email:'local-owner@invalid.test',exp:4_102_444_800}
const localVerify=async()=>localIdentity

export default {
  async fetch(request:Request,env:LocalEnv):Promise<Response>{
    const url=new URL(request.url);const parts=url.pathname.split('/').filter(Boolean)
    if(url.pathname.startsWith('/api/admin/')){
      const headers=new Headers(request.headers);headers.set('cf-access-jwt-assertion','local-boundary-token')
      return handleAdminContent(new Request(request,{headers}),env,parts.slice(2),{verifyAccess:localVerify})
    }
    if(url.pathname.startsWith('/api/content/'))return handlePublicContent(request,env,parts.slice(2))
    if(url.pathname==='/api/comments')return submitComment(request,env,{verify:async()=>({kind:'ok',hostname:'local.invalid',action:'comment'})})
    if(/^\/admin\/preview\/(install|prompts|tutorials|faq|changelog)\/?$/.test(url.pathname)){const asset=await env.ASSETS.fetch(new Request(new URL('/preview',url),request));const headers=new Headers(asset.headers);headers.set('x-frame-options','SAMEORIGIN');return new Response(asset.body,{status:asset.status,headers})}
    return env.ASSETS.fetch(request)
  },
}
