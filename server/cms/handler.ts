import { authorize, csrfToken, type VerifyAccess } from './auth.ts'
import { serveMedia, uploadMedia } from './media.ts'
import { D1CmsRepository } from './repository.ts'
import type { CmsContent, CmsEnv, ContentKind, ContentStatus } from './types.ts'
import { VALID_KINDS, VALID_STATUSES, validateContent, sectionOf } from './validation.ts'
import { handleAdminComments } from './comments.ts'
import { canTransition } from '../../src/lib/studio.ts'
import { referencedMediaIds } from './validation.ts'
import { legacyUrlAudit, mediaCleanupDryRun } from './retention.ts'
import { handleTrash } from './trash.ts'

export interface CmsDeps { verifyAccess?:VerifyAccess; now?:()=>number }
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; frame-ancestors 'none'",'referrer-policy':'no-referrer'}
const json=(body:unknown,status=200,extra?:HeadersInit)=>new Response(JSON.stringify(body),{status,headers:{...headers,...extra}})
const fail=(code:string,status:number,fieldErrors?:Record<string,string>)=>json({error:{code,message:code,fieldErrors,requestId:crypto.randomUUID()}},status)
const kindFrom=(value:string|undefined):ContentKind|null=>{const singular=value==='videos'?'video':value==='articles'?'article':value==='apps'?'app':value;return VALID_KINDS.includes(singular as ContentKind)?singular as ContentKind:null}
const MAX_JSON_BYTES=256*1024
const isSlugConflict=(error:unknown)=>error instanceof Error&&/UNIQUE constraint failed: cms_contents\.kind, cms_contents\.slug|ux_cms_contents_kind_slug_active/i.test(error.message)
const mediaReferencesValid=async(repo:D1CmsRepository,value:{data?:Record<string,unknown>})=>repo.mediaExists(referencedMediaIds(value.data??{}))

async function bodyJson(request:Request):Promise<unknown>{const length=Number(request.headers.get('content-length')??0);if(length>MAX_JSON_BYTES)throw new Error('payload_too_large');const text=await request.text();if(new TextEncoder().encode(text).byteLength>MAX_JSON_BYTES)throw new Error('payload_too_large');return JSON.parse(text)}
function cors(request:Request,env:CmsEnv):HeadersInit{const origin=request.headers.get('origin');const allowed=(env.CMS_ALLOWED_ORIGINS??'').split(',').map(v=>v.trim());return origin&&allowed.includes(origin)?{'access-control-allow-origin':origin,'vary':'origin'}:{}}

export { handlePublicContent } from './publicContent.ts'

export async function handleAdminContent(request:Request,env:CmsEnv,path:string[],deps:CmsDeps={}):Promise<Response>{
  if(env.CMS_ADMIN_ENABLED!=='true'||!['staging','production'].includes(env.ENVIRONMENT??''))return fail('admin_disabled',404)
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...cors(request,env),'access-control-allow-methods':'GET,POST,PATCH,DELETE,OPTIONS','access-control-allow-headers':'content-type,x-csrf-token'}})
  const auth=await authorize(request,env,deps.verifyAccess);if(!auth.ok)return fail(auth.code,auth.status)
  if(path[0]==='session'&&request.method==='GET'){try{return json({data:{email:auth.identity.email,csrfToken:await csrfToken(auth.identity,env),environment:env.ENVIRONMENT??'unknown'}})}catch{return fail('csrf_not_configured',503)}}
  if(path[0]==='comments')return handleAdminComments(request,env,path,auth.identity,deps.now?.()??Date.now())
  if(path[0]==='security'&&path[1]==='url-audit'&&request.method==='GET')return legacyUrlAudit(env)
  if(path[0]==='media'&&path[1]==='cleanup'&&request.method==='POST')return mediaCleanupDryRun(request,env,auth.identity.email,deps.now?.()??Date.now())
  if(path[0]==='media'&&!path[1]&&request.method==='POST')return uploadMedia(request,env,auth.identity.email,deps.now?.()??Date.now())
  if(path[0]==='media'&&!path[1]&&request.method==='GET'){
    if(!env.CMS_DB)return fail('cms_not_configured',503)
    const result=await env.CMS_DB.prepare('SELECT id,mime,bytes,width,height,alt_text,created_at FROM cms_media WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 100').all<{id:string;mime:string;bytes:number;width:number;height:number;alt_text:string;created_at:number}>()
    return json({data:(result.results??[]).map(item=>({id:item.id,mime:item.mime,bytes:item.bytes,width:item.width,height:item.height,altText:item.alt_text,createdAt:item.created_at,url:`/api/admin/media/${item.id}`}))})
  }
  if(path[0]==='media'&&path[1]&&request.method==='GET'){
    if(!env.CMS_DB)return fail('cms_not_configured',503)
    const row=await env.CMS_DB.prepare('SELECT storage_key FROM cms_media WHERE id=?1 AND deleted_at IS NULL').bind(path[1]).first<{storage_key:string}>()
    return row?serveMedia(row.storage_key,env):fail('not_found',404)
  }
  if(!env.CMS_DB)return fail('cms_not_configured',503)
  if(path[0]==='trash'||(path[2]==='trash'&&request.method==='POST'))return handleTrash(request,env,path,auth.identity,deps.now?.()??Date.now())
  const repo=new D1CmsRepository(env.CMS_DB);const sectionName=path[0]==='guides'?'guide':path[0]==='pages'?'page':'blog';const sectioned=sectionName!=='blog';const kind=sectioned?'article':kindFrom(path[0]);if(!kind)return fail('not_found',404)
  const inSection=(item:CmsContent|null)=>!!item&&(kind!=='article'||sectionOf(item)===sectionName);const section=sectionName
  const forceSection=(body:unknown)=>sectioned&&body&&typeof body==='object'&&!Array.isArray(body)?{...(body as Record<string,unknown>),data:{...((body as {data?:Record<string,unknown>}).data&&typeof (body as {data?:unknown}).data==='object'?(body as {data:Record<string,unknown>}).data:{}),section:sectionName}}:body
  const id=path[1]
  if(path[2]==='revisions'&&id&&request.method==='GET'){const item=await repo.byId(id,kind);return item&&inSection(item)?json({data:await repo.revisions(id,kind)}):fail('not_found',404)}
  if(!id&&request.method==='GET'){const url=new URL(request.url);const status=url.searchParams.get('status');const result=await repo.list({kind,section:kind==='article'?section:undefined,status:VALID_STATUSES.includes(status as ContentStatus)?status as ContentStatus:undefined,query:(url.searchParams.get('q')??'').slice(0,100),limit:Math.min(100,Math.max(1,Number(url.searchParams.get('limit')??30)||30)),cursor:Number(url.searchParams.get('cursor')??0)||undefined});return json({data:result.items,meta:{nextCursor:result.nextCursor}})}
  if(!id&&request.method==='POST'){try{const checked=validateContent(forceSection(await bodyJson(request)),kind,undefined,env,section);if(!checked.ok)return fail('validation_failed',400,checked.fields);if(!await mediaReferencesValid(repo,checked.value))return fail('media_not_found',400);const item=await repo.create(kind,checked.value,auth.identity.email,deps.now?.()??Date.now());return json({data:item},201)}catch(error){if(error instanceof SyntaxError)return fail('invalid_json',400);if(error instanceof Error&&error.message==='payload_too_large')return fail('payload_too_large',413);if(isSlugConflict(error))return fail('slug_conflict',409);console.error(JSON.stringify({event:'cms_create_failed',requestId:crypto.randomUUID()}));return fail('database_error',500)}}
  if(id&&request.method==='GET'){const item=await repo.byId(id,kind);return item&&inSection(item)?json({data:item}):fail('not_found',404)}
  if(id&&(request.method==='PATCH'||request.method==='DELETE')){try{const body=await bodyJson(request) as Record<string,unknown>;const version=Number(body.version);if(!Number.isInteger(version)||version<1)return fail('version_required',400);const current=await repo.byId(id,kind);if(!current||!inSection(current))return fail('not_found',404);if(current.version!==version)return fail('version_conflict',409);let result;if(request.method==='DELETE')result=await repo.archive(id,kind,version,auth.identity.email,deps.now?.()??Date.now());else{const checked=validateContent(forceSection(body),kind,current,env,section);if(!checked.ok)return fail('validation_failed',400,checked.fields);if(!await mediaReferencesValid(repo,checked.value))return fail('media_not_found',400);if(checked.value.status&&!canTransition(current.status,checked.value.status))return fail('invalid_status_transition',409);result=await repo.update(id,kind,version,checked.value,auth.identity.email,deps.now?.()??Date.now())}return result==='missing'?fail('not_found',404):result==='conflict'?fail('version_conflict',409):json({data:result})}catch(error){if(error instanceof SyntaxError)return fail('invalid_json',400);if(error instanceof Error&&error.message==='payload_too_large')return fail('payload_too_large',413);if(isSlugConflict(error))return fail('slug_conflict',409);console.error(JSON.stringify({event:'cms_mutation_failed',requestId:crypto.randomUUID()}));return fail('database_error',500)}}
  return fail('method_not_allowed',405)
}
