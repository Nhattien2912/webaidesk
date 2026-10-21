import test from 'node:test'
import assert from 'node:assert/strict'
import { authorize, csrfToken, type VerifyAccess } from '../server/cms/auth.ts'
import { handleAdminContent, handlePublicContent } from '../server/cms/handler.ts'
import { uploadMedia, MAX_MEDIA_BYTES } from '../server/cms/media.ts'
import { D1CmsRepository } from '../server/cms/repository.ts'
import { hasSafeImageSignature, sanitizeMarkdown, validateContent } from '../server/cms/validation.ts'
import type { AccessIdentity, CmsEnv, D1Like, D1ResultLike, D1StatementLike } from '../server/cms/types.ts'
import fs from 'node:fs'

const identity:AccessIdentity={sub:'owner-id',email:'owner@example.com',exp:2_000_000_000}
const allow:VerifyAccess=async()=>identity
const configured:CmsEnv={CMS_ADMIN_ENABLED:'true',ACCESS_TEAM_DOMAIN:'team.cloudflareaccess.com',ACCESS_AUD:'aud',ACCESS_ALLOWED_IDENTITIES:'owner@example.com',CMS_ALLOWED_ORIGINS:'https://staging.example.com',CMS_CSRF_SECRET:'x'.repeat(32),CMS_ALLOWED_IMAGE_HOSTS:'i.ytimg.com,good.example',CMS_ALLOWED_DOWNLOAD_HOSTS:'good.example',ENVIRONMENT:'staging'}

class Statement implements D1StatementLike{
  values:unknown[]=[]
  readonly sql:string; private readonly rows:Record<string,unknown>[]; private readonly changes:number
  constructor(sql:string,rows:Record<string,unknown>[]=[],changes=1){this.sql=sql;this.rows=rows;this.changes=changes}
  bind(...values:unknown[]){this.values=values;return this}
  async first<T>(){return (this.rows[0] as T|undefined)??null}
  async all<T>(){return{results:this.rows as T[]}}
  async run(){return{meta:{changes:this.changes}}}
}
class Db implements D1Like{
  statements:Statement[]=[]
  private readonly rows:Record<string,unknown>[]; private readonly changes:number
  constructor(rows:Record<string,unknown>[]=[],changes=1){this.rows=rows;this.changes=changes}
  prepare(sql:string){const rows=sql.startsWith('SELECT attempts FROM cms_rate_limits')?[{attempts:1}]:sql.startsWith('SELECT')?this.rows:[];const stmt=new Statement(sql,rows,this.changes);this.statements.push(stmt);return stmt}
  async batch(statements:D1StatementLike[]):Promise<D1ResultLike[]>{return statements.map(()=>({meta:{changes:this.changes}}))}
}
const mutation=async(env:CmsEnv=configured)=>new Request('https://staging.example.com/api/admin/articles',{method:'POST',headers:{origin:'https://staging.example.com','sec-fetch-site':'same-origin','cf-access-jwt-assertion':'token','x-csrf-token':await csrfToken(identity,env),'content-type':'application/json'},body:JSON.stringify({title:'Safe title'})})

test('admin API rejects missing token and missing Access configuration fail closed',async()=>{
  assert.equal((await authorize(new Request('https://x/api/admin'),configured,allow)).ok,false)
  const response=await handleAdminContent(new Request('https://x/api/admin/articles'),{CMS_ADMIN_ENABLED:'true',ENVIRONMENT:'staging'},['articles'],{verifyAccess:allow})
  assert.equal(response.status,503)
})

for(const [name,status,message] of [['invalid token',401,'jwt invalid'],['expired token',401,'JWTExpired'],['wrong audience',401,'unexpected aud'],['unapproved identity',403,'access_forbidden']] as const){
  test(`admin API rejects ${name}`,async()=>{const verify:VerifyAccess=async()=>{throw new Error(message)};const response=await handleAdminContent(new Request('https://x/api/admin/articles',{headers:{'cf-access-jwt-assertion':'bad'}}),configured,['articles'],{verifyAccess:verify});assert.equal(response.status,status)})
}

test('direct mutation cannot bypass Origin or CSRF checks',async()=>{
  const noOrigin=new Request('https://staging.example.com/api/admin/articles',{method:'POST',headers:{'cf-access-jwt-assertion':'token'}})
  assert.equal((await handleAdminContent(noOrigin,configured,['articles'],{verifyAccess:allow})).status,403)
  const wrongCsrf=new Request('https://staging.example.com/api/admin/articles',{method:'POST',headers:{origin:'https://staging.example.com','sec-fetch-site':'same-origin','cf-access-jwt-assertion':'token','x-csrf-token':'wrong'}})
  assert.equal((await handleAdminContent(wrongCsrf,configured,['articles'],{verifyAccess:allow})).status,403)
})

test('public API query hard-filters published and cannot retrieve draft by slug',async()=>{
  const db=new Db([]);const list=await handlePublicContent(new Request('https://x/api/content/articles'),{CMS_DB:db},['articles']);assert.equal(list.status,200);assert.match(db.statements[0]!.sql,/status = 'published'/)
  const slug=await handlePublicContent(new Request('https://x/api/content/articles/secret'),{CMS_DB:new Db([])},['articles','secret']);assert.equal(slug.status,404)
})

test('Markdown source is normalized and dangerous external URLs are rejected',()=>{
  const output=sanitizeMarkdown('safe\u0000 source');assert.equal(output,'safe source')
  const checked=validateContent({title:'App',data:{websiteUrl:'javascript:alert(1)'}},'app');assert.equal(checked.ok,false)
})

test('media validation rejects spoofed MIME and oversized bodies before R2',async()=>{
  assert.equal(hasSafeImageSignature(new Uint8Array([60,115,118,103,62]),'image/png'),false)
  let puts=0;const env:CmsEnv={...configured,CMS_DB:new Db(),CMS_MEDIA:{put:async()=>{puts++},get:async()=>null,delete:async()=>{}}}
  const spoof=await uploadMedia(new Request('https://x',{method:'POST',headers:{'content-type':'image/png','x-image-width':'1','x-image-height':'1'},body:new Uint8Array([60,115,118,103,62])}),env,identity.email);assert.equal(spoof.status,400);assert.equal(puts,0)
  const huge=await uploadMedia(new Request('https://x',{method:'POST',headers:{'content-type':'image/png','content-length':String(MAX_MEDIA_BYTES+1)}}),env,identity.email);assert.equal(huge.status,413);assert.equal(puts,0)
})

test('Admin media inventory is JWT-gated and returns only safe metadata URLs',async()=>{
  const db=new Db([{id:'media-1',mime:'image/webp',bytes:128,width:20,height:10,alt_text:'Cover',created_at:123}])
  const env:CmsEnv={...configured,CMS_DB:db}
  const denied=await handleAdminContent(new Request('https://staging.example.com/api/admin/media'),env,['media'],{verifyAccess:allow})
  assert.equal(denied.status,401)
  const allowed=await handleAdminContent(new Request('https://staging.example.com/api/admin/media',{headers:{'cf-access-jwt-assertion':'token'}}),env,['media'],{verifyAccess:allow})
  assert.equal(allowed.status,200)
  const body=await allowed.json() as {data:Array<Record<string,unknown>>}
  assert.deepEqual(body.data[0],{id:'media-1',mime:'image/webp',bytes:128,width:20,height:10,altText:'Cover',createdAt:123,url:'/api/admin/media/media-1'})
  assert.equal('storage_key' in body.data[0]!,false)
})

test('CMS code cannot write to release bucket binding',()=>{
  const files=['server/cms/media.ts','server/cms/handler.ts','functions/api/admin/[[path]].ts'];for(const file of files)assert.doesNotMatch(fs.readFileSync(file,'utf8'),/RELEASES|aidesk-releases/)
})

test('optimistic version conflict returns conflict without update batch',async()=>{
  const row={id:'a',kind:'article',slug:'a',title:'A',summary:'',body_markdown:'',category:'',tags_json:'[]',seo_title:'',meta_description:'',featured:0,status:'draft',data_json:'{}',version:3,created_at:1,updated_at:1,published_at:null,archived_at:null}
  const repo=new D1CmsRepository(new Db([row]));assert.equal(await repo.update('a','article',2,{title:'old'},identity.email,2),'conflict')
})

test('publish mutation writes content, revision and audit in one D1 batch',async()=>{
  const db=new Db([]);const env={...configured,CMS_DB:db};const request=await mutation(env);const response=await handleAdminContent(request,env,['articles'],{verifyAccess:allow,now:()=>123});assert.equal(response.status,201);assert.ok(db.statements.some(s=>s.sql.includes('cms_content_revisions')));assert.ok(db.statements.some(s=>s.sql.includes('cms_audit_events')))
})

test('migration contains soft delete, unique slug, revision and audit structures',()=>{
  const sql=fs.readFileSync('migrations/0002_studio_cms.sql','utf8');for(const expected of ['deleted_at','ux_cms_contents_kind_slug_active','cms_content_revisions','cms_audit_events'])assert.match(sql,new RegExp(expected))
})

test('STUDIO-17 validates nested content fields and configured hosts',()=>{const env={CMS_ALLOWED_IMAGE_HOSTS:'i.ytimg.com,media.example.com',CMS_ALLOWED_DOWNLOAD_HOSTS:'downloads.example.com'};assert.equal(validateContent({title:'App',data:{downloadUrl:'https://downloads.example.com/app.exe',gallery:['https://media.example.com/a.png'],platforms:['Windows'],features:['Local-first']}},'app',undefined,env).ok,true);for(const data of [{downloadUrl:'https://evil.example/app.exe'},{gallery:[{src:'javascript:alert(1)'}]},{gallery:['javascript:alert(1)']},{platforms:{nested:['Windows']}},{logoMediaId:'../../../release.exe'}])assert.equal(validateContent({title:'App',data},'app',undefined,env).ok,false);assert.equal(validateContent({title:'Video',data:{youtubeId:'dQw4w9WgXcQ',thumbnailUrl:'https://i.ytimg.com/vi/x.jpg',displayOrder:1}},'video',undefined,env).ok,true);assert.equal(validateContent({title:'Video',data:{youtubeId:'dQw4w9WgXcQ',thumbnailUrl:' javascript:https://evil.example'}},'video',undefined,env).ok,false)})

test('STUDIO-05 rejects image/polyglot bytes with trailing payload',()=>{const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,13,73,72,68,82,0,0,0,1,0,0,0,1,0,0,0,0,73,69,78,68,174,66,96,130]);assert.equal(hasSafeImageSignature(png,'image/png'),true);assert.equal(hasSafeImageSignature(new Uint8Array([...png,...new TextEncoder().encode('<script>alert(1)</script>')]),'image/png'),false)})
