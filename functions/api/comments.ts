import { submitComment } from '../../server/cms/comments.ts'
import type { CmsEnv } from '../../server/cms/types.ts'
interface Context { request:Request; env:CmsEnv }
export const onRequest=({request,env}:Context)=>submitComment(request,env)
