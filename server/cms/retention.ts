import type { CmsEnv } from './types.ts'
import { validateContent } from './validation.ts'

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})
const fail=(code:string,status:number)=>json({error:{code,message:code,requestId:crypto.randomUUID()}},status)

export async function mediaCleanupDryRun(request:Request,env:CmsEnv,actor:string,now:number):Promise<Response>{
  if(!env.CMS_DB)return fail('cms_not_configured',503)
  let payload:Record<string,unknown>;try{payload=await request.json() as Record<string,unknown>}catch{return fail('invalid_json',400)}
  if(payload.dryRun!==true)return fail('dry_run_required',400)
  const configured=Number(env.CMS_MEDIA_RETENTION_DAYS??30);const retentionDays=Number.isInteger(configured)?Math.min(365,Math.max(7,configured)):30;const cutoff=now-retentionDays*86_400_000
  const candidates=(await env.CMS_DB.prepare('SELECT m.id,m.storage_key,m.bytes,m.created_at FROM cms_media m WHERE m.deleted_at IS NULL AND m.created_at<?1 AND NOT EXISTS(SELECT 1 FROM cms_content_media cm WHERE cm.media_id=m.id) ORDER BY m.created_at ASC LIMIT 500').bind(cutoff).all<Record<string,unknown>>()).results??[]
  const rateLimits=await env.CMS_DB.prepare('SELECT (SELECT COUNT(*) FROM cms_rate_limits WHERE window_start<?1) admin_count,(SELECT COUNT(*) FROM cms_comment_rate_limits WHERE window_start<?1) comment_count').bind(now-86_400_000).first<Record<string,unknown>>()
  await env.CMS_DB.prepare("INSERT INTO cms_audit_events(id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) VALUES(?1,?2,'media.cleanup.dry_run','media-retention','dry-run','success',?3,?4)").bind(crypto.randomUUID(),actor,JSON.stringify({retentionDays,candidateCount:candidates.length,adminRateLimitRows:Number(rateLimits?.admin_count??0),commentRateLimitRows:Number(rateLimits?.comment_count??0)}),now).run()
  return json({data:{dryRun:true,retentionDays,cutoff,candidates,rateLimitRows:{admin:Number(rateLimits?.admin_count??0),comments:Number(rateLimits?.comment_count??0)},deleted:0}})
}

export async function legacyUrlAudit(env:CmsEnv):Promise<Response>{
  if(!env.CMS_DB)return fail('cms_not_configured',503)
  const rows=(await env.CMS_DB.prepare('SELECT id,kind,title,data_json FROM cms_contents WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 5000').all<Record<string,unknown>>()).results??[]
  const findings:unknown[]=[]
  for(const row of rows){let data:Record<string,unknown>;try{data=JSON.parse(String(row.data_json)) as Record<string,unknown>}catch{findings.push({id:String(row.id),kind:String(row.kind),fields:{data:'invalid_json'}});continue}const checked=validateContent({title:String(row.title),data},String(row.kind) as 'article'|'video'|'app',undefined,env);if(!checked.ok)findings.push({id:String(row.id),kind:String(row.kind),fields:checked.fields})}
  return json({data:{scanned:rows.length,findings,deleted:0,truncated:rows.length===5000}})
}
