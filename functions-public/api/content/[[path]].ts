import { handlePublicContent } from '../../../server/cms/publicContent.ts'
import type { CmsEnv } from '../../../server/cms/types.ts'

interface Context { request:Request; env:CmsEnv; params:{path?:string|string[]} }
/** Read-only published content for the public website. No admin, Access or write code is imported here. */
export const onRequest=({request,env,params}:Context)=>handlePublicContent(request,env,Array.isArray(params.path)?params.path:params.path?[params.path]:[])
