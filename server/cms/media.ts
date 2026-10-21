import type { CmsEnv } from './types.ts'
import { hasSafeImageSignature, imageDimensions } from './validation.ts'

export const MAX_MEDIA_BYTES=5*1024*1024
const allowed=new Set(['image/jpeg','image/png','image/webp'])
const extension:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}

export async function uploadMedia(request:Request,env:CmsEnv,actor:string,now=Date.now()):Promise<Response>{
  if(!env.CMS_DB||!env.CMS_MEDIA)return error('cms_not_configured',503)
  let altText='';try{altText=decodeURIComponent(request.headers.get('x-alt-text')??'')}catch{return error('invalid_alt_text',400)}
  if(altText.length>500)return error('invalid_alt_text',400)
  const declared=request.headers.get('content-type')?.split(';')[0].trim()??''; const length=Number(request.headers.get('content-length')??0)
  if(!allowed.has(declared))return error('unsupported_media_type',415)
  if(length>MAX_MEDIA_BYTES)return error('media_too_large',413)
  const buffer=await request.arrayBuffer(); if(buffer.byteLength===0||buffer.byteLength>MAX_MEDIA_BYTES)return error('media_too_large',413)
  if(!hasSafeImageSignature(new Uint8Array(buffer),declared))return error('mime_signature_mismatch',400)
  const measured=imageDimensions(new Uint8Array(buffer),declared);if(!measured)return error('invalid_image_structure',400)
  const width=measured.width; const height=measured.height
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>12000||height>12000)return error('invalid_dimensions',400)
  const digest=await crypto.subtle.digest('SHA-256',buffer); const sha=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
  const id=crypto.randomUUID(); const key=`content/${new Date(now).toISOString().slice(0,7)}/${crypto.randomUUID()}.${extension[declared]}`
  await env.CMS_MEDIA.put(key,buffer,{httpMetadata:{contentType:declared,cacheControl:'public, max-age=31536000, immutable'},customMetadata:{mediaId:id},sha256:digest})
  try{await env.CMS_DB.prepare('INSERT INTO cms_media (id,storage_key,mime,bytes,width,height,alt_text,sha256,created_at,updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?9)').bind(id,key,declared,buffer.byteLength,width,height,altText,sha,now).run()}catch{await env.CMS_MEDIA.delete(key);return error('database_error',500)}
  try{await env.CMS_DB.prepare("INSERT INTO cms_audit_events (id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) VALUES (?1,?2,'upload','media',?3,'success',?4,?5)").bind(crypto.randomUUID(),actor,id,JSON.stringify({mime:declared,bytes:buffer.byteLength}),now).run()}catch{await env.CMS_DB.prepare('UPDATE cms_media SET deleted_at=?1 WHERE id=?2').bind(now,id).run();await env.CMS_MEDIA.delete(key);return error('database_error',500)}
  return json({data:{id,mime:declared,bytes:buffer.byteLength,width,height,altText,createdAt:now,url:`/api/admin/media/${id}`}},201)
}

export async function serveMedia(key:string,env:CmsEnv):Promise<Response>{if(!env.CMS_MEDIA)return error('not_found',404);const object=await env.CMS_MEDIA.get(key);if(!object)return error('not_found',404);const headers=new Headers();object.writeHttpMetadata(headers);headers.set('etag',object.httpEtag);headers.set('cache-control','private, no-store');headers.set('x-content-type-options','nosniff');headers.set('content-security-policy',"default-src 'none'; sandbox");return new Response(object.body,{headers})}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}})
const error=(code:string,status:number)=>json({error:{code,message:code,requestId:crypto.randomUUID()}},status)
