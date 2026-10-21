import { handleAdminContent } from '../../../server/cms/handler.ts'
import type { CmsEnv } from '../../../server/cms/types.ts'

interface Context { request:Request; env:CmsEnv; params:{path?:string|string[]} }
export const onRequest=({request,env,params}:Context)=>handleAdminContent(request,env,Array.isArray(params.path)?params.path:params.path?[params.path]:[])
