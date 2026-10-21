import { parseYouTubeId, slugify } from '../../src/lib/studio.ts'
import type { CmsContent, CmsEnv, ContentKind, ContentStatus } from './types.ts'
import { PAGE_IDS, validateDoc } from '../../src/content/pageContent.ts'

const forbiddenUrlChar=(value:string)=>Array.from(value).some(character=>{const code=character.codePointAt(0)??0;return code<=31||(code>=127&&code<=159)||(code>=0x200b&&code<=0x200f)||(code>=0x2028&&code<=0x202f)||code===0x2060||code===0xfeff})
const hosts=(value:string|undefined)=>new Set((value??'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean))
const safeExternal = (value: unknown, allowedHosts?:Set<string>) => {
  if (value === '' || value == null) return true
  if (typeof value !== 'string' || value.length > 2048 || value!==value.trim() || forbiddenUrlChar(value)) return false
  try { const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&url.href===value&&(allowedHosts==null||allowedHosts.has(url.hostname.toLowerCase())) } catch { return false }
}

const text = (value: unknown, max: number) => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const optionalText = (value: unknown, max: number) => value == null || (typeof value === 'string' && value.length <= max)
export const VALID_STATUSES: ContentStatus[] = ['draft','published','archived']
export const VALID_KINDS: ContentKind[] = ['video','article','app']

export function sanitizeMarkdown(value: string): string {
  return value.split(String.fromCharCode(0)).join('').normalize('NFC')
}

const TOP_LEVEL_KEYS=new Set(['slug','title','summary','bodyMarkdown','category','tags','seoTitle','metaDescription','featured','status','data','version'])
const DATA_KEYS:Record<ContentKind,Set<string>>={article:new Set(['coverMediaId','section','order','version','platform','relatedVideoSlugs','page']),video:new Set(['youtubeId','youtubeUrl','thumbnailUrl','displayOrder']),app:new Set(['tagline','developmentStatus','platforms','features','websiteUrl','downloadUrl','githubUrl','documentationUrl','currentVersion','changelog','logoMediaId','coverMediaId','gallery'])}
const mediaId=(value:unknown)=>value==null||value===''||(typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
const VERSION=/^[0-9A-Za-z][0-9A-Za-z.+-]{0,39}$/
const CHANGELOG_KEYS=new Set(['version','date','notes'])
const validDate=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`))&&new Date(`${value}T00:00:00Z`).toISOString().startsWith(value)
const validChangelog=(value:unknown)=>Array.isArray(value)&&value.length<=50&&value.every(entry=>entry!=null&&typeof entry==='object'&&!Array.isArray(entry)&&Object.keys(entry).every(key=>CHANGELOG_KEYS.has(key))&&typeof (entry as Record<string,unknown>).version==='string'&&VERSION.test((entry as Record<string,string>).version)&&validDate((entry as Record<string,unknown>).date)&&typeof (entry as Record<string,unknown>).notes==='string'&&(entry as Record<string,string>).notes.length>0&&(entry as Record<string,string>).notes.length<=2000)
const stringList=(value:unknown,maxItems:number,maxLength:number)=>Array.isArray(value)&&value.length<=maxItems&&value.every(v=>typeof v==='string'&&v.length>0&&v.length<=maxLength)
export type ArticleSection='blog'|'guide'|'page'
const GUIDE_ONLY_KEYS=['order','version','platform','relatedVideoSlugs']
const SLUG_RE=/^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const isGuide=(item:Pick<CmsContent,'data'>)=>(item.data as {section?:unknown}).section==='guide'
export const sectionOf=(item:Pick<CmsContent,'data'>):ArticleSection=>{const section=(item.data as {section?:unknown}).section;return section==='guide'||section==='page'?section:'blog'}
export function validateContent(input: unknown, kind: ContentKind, current?: CmsContent, env:Pick<CmsEnv,'CMS_ALLOWED_IMAGE_HOSTS'|'CMS_ALLOWED_DOWNLOAD_HOSTS'>={}, section:ArticleSection='blog'): { ok: true; value: Partial<CmsContent> } | { ok: false; fields: Record<string,string> } {
  const body = input && typeof input === 'object' ? input as Record<string,unknown> : {}
  const fields: Record<string,string> = {}
  for(const key of Object.keys(body))if(!TOP_LEVEL_KEYS.has(key))fields[key]='unknown_field'
  const title=body.title??current?.title
  if (!text(title, 180)) fields.title = 'required_max_180'
  const slug = typeof body.slug === 'string' ? slugify(body.slug) : current?.slug??slugify(String(title ?? ''))
  if (!slug || slug.length > 180) fields.slug = 'invalid_slug'
  if (!optionalText(body.summary, 600)) fields.summary = 'max_600'
  if (!optionalText(body.bodyMarkdown, 200_000)) fields.bodyMarkdown = 'max_200000'
  if (body.status != null && !VALID_STATUSES.includes(body.status as ContentStatus)) fields.status = 'invalid_status'
  if(body.data!=null&&(typeof body.data!=='object'||Array.isArray(body.data)))fields.data='object_required'
  const suppliedData = body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data as Record<string,unknown> : {}
  for(const key of Object.keys(suppliedData))if(!DATA_KEYS[kind].has(key))fields[`data.${key}`]='unknown_field'
  const data = {...(current?.data??{}),...suppliedData}
  if(kind==='article'&&!mediaId(data.coverMediaId))fields['data.coverMediaId']='uuid_required'
  if(kind==='article'){
    if(section==='page'){
      if(data.section!=null&&data.section!=='page')fields['data.section']='section_immutable'
      data.section='page'
      for(const key of GUIDE_ONLY_KEYS)if(key in data)fields['data.'+key]='guide_only'
      if(!(PAGE_IDS as readonly string[]).includes(slug))fields.slug='page_slug_must_be_a_registered_page'
      const pageData=data.page
      if(pageData!=null){
        if(typeof pageData!=='object'||Array.isArray(pageData))fields['data.page']='object_required'
        else for(const [which,doc] of Object.entries(pageData as Record<string,unknown>)){
          if(which!=='draft'&&which!=='published'){fields['data.page.'+which]='unknown_field';continue}
          if(doc===null)continue
          const checked=validateDoc(slug,doc)
          if(!checked.ok)for(const [key,problem] of Object.entries(checked.problems))fields['data.page.'+which+'.'+key]=problem
        }
      }
    }else if(section==='guide'){
      if(data.section!=null&&data.section!=='guide')fields['data.section']='section_immutable'
      data.section='guide'
      if(data.order!=null&&data.order!==''&&(!Number.isInteger(data.order)||Number(data.order)<0||Number(data.order)>9999))fields['data.order']='integer_0_9999'
      if(data.version!=null&&data.version!==''&&!(typeof data.version==='string'&&VERSION.test(data.version)))fields['data.version']='invalid_version'
      if(data.platform!=null&&(typeof data.platform!=='string'||data.platform.length>80))fields['data.platform']='max_80'
      if(data.relatedVideoSlugs!=null&&!(Array.isArray(data.relatedVideoSlugs)&&data.relatedVideoSlugs.length<=6&&data.relatedVideoSlugs.every(s=>typeof s==='string'&&s.length<=180&&SLUG_RE.test(s))))fields['data.relatedVideoSlugs']='video_slug_list_max_6'
    }else{
      if((current&&sectionOf(current)!=='blog')||data.section!=null)fields['data.section']='section_not_allowed'
      for(const key of [...GUIDE_ONLY_KEYS,'page'])if(key in data)fields['data.'+key]='guide_only'
    }
  }
  if(kind==='video'){
    if(!parseYouTubeId(String(data.youtubeUrl??data.youtubeId??'')))fields['data.youtubeUrl']='invalid_youtube_url'
    if(!safeExternal(data.thumbnailUrl,hosts(env.CMS_ALLOWED_IMAGE_HOSTS)))fields['data.thumbnailUrl']='trusted_https_url_required'
    if(data.displayOrder!=null&&(!Number.isInteger(data.displayOrder)||Number(data.displayOrder)<0||Number(data.displayOrder)>10000))fields['data.displayOrder']='integer_0_10000'
  }
  if(kind==='app'){
    for(const key of ['websiteUrl','githubUrl','documentationUrl'])if(!safeExternal(data[key]))fields[`data.${key}`]='canonical_https_url_required'
    if(!safeExternal(data.downloadUrl,hosts(env.CMS_ALLOWED_DOWNLOAD_HOSTS)))fields['data.downloadUrl']='trusted_https_url_required'
    for(const key of ['platforms','features'])if(data[key]!=null&&!stringList(data[key],32,120))fields[`data.${key}`]='string_array_required'
    for(const key of ['logoMediaId','coverMediaId'])if(!mediaId(data[key]))fields[`data.${key}`]='uuid_required'
    if(data.gallery!=null){if(!Array.isArray(data.gallery)||data.gallery.length>24)fields['data.gallery']='array_required';else for(const [index,item] of data.gallery.entries())if(!(typeof item==='string'&&mediaId(item))&&!safeExternal(item,hosts(env.CMS_ALLOWED_IMAGE_HOSTS)))fields[`data.gallery.${index}`]='media_uuid_or_trusted_https_url_required'}
    if(data.currentVersion!=null&&data.currentVersion!==''&&!(typeof data.currentVersion==='string'&&VERSION.test(data.currentVersion)))fields['data.currentVersion']='invalid_version'
    if(data.changelog!=null&&!validChangelog(data.changelog))fields['data.changelog']='changelog_entries_invalid'
    for(const key of ['tagline','developmentStatus'])if(data[key]!=null&&typeof data[key]!=='string')fields[`data.${key}`]='string_required'
  }
  if (Object.keys(fields).length) return { ok:false, fields }
  const tags = Array.isArray(body.tags) ? body.tags.filter((tag): tag is string => typeof tag === 'string').slice(0,20).map((tag)=>tag.slice(0,40)) : []
  if (kind === 'video') data.youtubeId = parseYouTubeId(String(data.youtubeUrl ?? data.youtubeId))
  delete data.youtubeUrl
  return { ok:true, value:{ slug, title:String(title).trim(), summary:String(body.summary ?? current?.summary ?? ''), bodyMarkdown:sanitizeMarkdown(String(body.bodyMarkdown ?? current?.bodyMarkdown ?? '')), category:String(body.category ?? current?.category ?? '').slice(0,80), tags:body.tags==null?(current?.tags??[]):tags, seoTitle:String(body.seoTitle ?? current?.seoTitle ?? '').slice(0,180), metaDescription:String(body.metaDescription ?? current?.metaDescription ?? '').slice(0,320), featured:body.featured==null?(current?.featured??false):body.featured === true, status:(body.status as ContentStatus | undefined) ?? current?.status ?? 'draft', data } }
}

export function referencedMediaIds(data:Record<string,unknown>):string[]{return['coverMediaId','logoMediaId'].flatMap(key=>typeof data[key]==='string'&&data[key]?[data[key] as string]:[]).concat(Array.isArray(data.gallery)?data.gallery.filter((v):v is string=>typeof v==='string'&&mediaId(v)&&!v.startsWith('http')):[])}

export function hasSafeImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes.length>=4&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes.at(-2)===0xff&&bytes.at(-1)===0xd9
  if (mime === 'image/png') return bytes.length>=24&&bytes.slice(0,8).every((v,i)=>v === [137,80,78,71,13,10,26,10][i])&&new TextDecoder().decode(bytes.slice(-8,-4))==='IEND'&&bytes.slice(-4).every((v,i)=>v===[174,66,96,130][i])
  if (mime === 'image/webp') return bytes.length>=30&&new TextDecoder().decode(bytes.slice(0,4)) === 'RIFF' && new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(4,true)+8===bytes.length&&new TextDecoder().decode(bytes.slice(8,12)) === 'WEBP'
  return false
}

export function imageDimensions(bytes:Uint8Array,mime:string):{width:number;height:number}|null{const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(mime==='image/png')return{width:view.getUint32(16),height:view.getUint32(20)};if(mime==='image/webp'){const type=new TextDecoder().decode(bytes.slice(12,16));if(type==='VP8X')return{width:1+bytes[24]!+(bytes[25]!<<8)+(bytes[26]!<<16),height:1+bytes[27]!+(bytes[28]!<<8)+(bytes[29]!<<16)};return null}if(mime==='image/jpeg'){let offset=2;while(offset+9<bytes.length){if(bytes[offset]!==0xff)return null;const marker=bytes[offset+1]!;if(marker===0xd9||marker===0xda)break;const length=view.getUint16(offset+2);if(length<2||offset+2+length>bytes.length)return null;if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return{height:view.getUint16(offset+5),width:view.getUint16(offset+7)};offset+=2+length}}return null}
