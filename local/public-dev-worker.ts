import { handlePublicContent } from '../server/cms/handler.ts'
import { submitComment } from '../server/cms/comments.ts'
import type { CmsEnv } from '../server/cms/types.ts'

// Local-only mirror of the public Pages Functions (content API + comments) over the dist-public assets.
interface LocalEnv extends CmsEnv { ASSETS:{fetch(request:Request):Promise<Response>} }

export default {
  async fetch(request:Request,env:LocalEnv):Promise<Response>{
    const url=new URL(request.url);const parts=url.pathname.split('/').filter(Boolean)
    if(url.pathname.startsWith('/api/content/'))return handlePublicContent(request,env,parts.slice(2))
    if(url.pathname==='/api/comments')return submitComment(request,env,{verify:async()=>({kind:'ok',hostname:'local.invalid',action:'comment'})})
    if(url.pathname.startsWith('/api/admin/')||url.pathname.startsWith('/admin'))return new Response('Not found',{status:404})
    return env.ASSETS.fetch(request)
  },
}
