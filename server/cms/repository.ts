import type { CmsContent, ContentKind, ContentStatus, D1Like } from './types.ts'

type Row = Record<string,unknown>
const parseJson = <T>(value: unknown, fallback: T): T => { try { return JSON.parse(String(value)) as T } catch { return fallback } }
export const mapRow = (row: Row): CmsContent => ({
  id:String(row.id), kind:row.kind as ContentKind, slug:String(row.slug), title:String(row.title), summary:String(row.summary), bodyMarkdown:String(row.body_markdown), category:String(row.category), tags:parseJson<string[]>(row.tags_json,[]), seoTitle:String(row.seo_title), metaDescription:String(row.meta_description), featured:Number(row.featured)===1, status:row.status as ContentStatus, data:parseJson<Record<string,unknown>>(row.data_json,{}), version:Number(row.version), createdAt:Number(row.created_at), updatedAt:Number(row.updated_at), publishedAt:row.published_at==null?null:Number(row.published_at), archivedAt:row.archived_at==null?null:Number(row.archived_at),
})

export interface ListQuery { kind:ContentKind; status?:ContentStatus; query?:string; limit:number; cursor?:number; publicOnly?:boolean; section?:'blog'|'guide'|'page' }

export class D1CmsRepository {
  private readonly db:D1Like
  constructor(db: D1Like) { this.db=db }
  async list(input: ListQuery): Promise<{items:CmsContent[];nextCursor:number|null}> {
    const clauses=['kind = ?1','deleted_at IS NULL']; const values:unknown[]=[input.kind]; let parameter=2
    if(input.section==='guide')clauses.push("json_extract(data_json,'$.section') = 'guide'")
    else if(input.section==='page')clauses.push("json_extract(data_json,'$.section') = 'page'")
    else if(input.section==='blog')clauses.push("COALESCE(json_extract(data_json,'$.section'),'blog') = 'blog'")
    if(input.publicOnly){clauses.push("status = 'published'")} else if(input.status){clauses.push(`status = ?${parameter++}`);values.push(input.status)}
    if(input.query){clauses.push(`(title LIKE ?${parameter} ESCAPE '\\' OR summary LIKE ?${parameter} ESCAPE '\\')`);values.push(`%${input.query.replace(/[\\%_]/g,'\\$&')}%`);parameter++}
    if(input.cursor){clauses.push(`updated_at < ?${parameter++}`);values.push(input.cursor)}
    values.push(input.limit+1)
    const result=await this.db.prepare(`SELECT * FROM cms_contents WHERE ${clauses.join(' AND ')} ORDER BY updated_at DESC LIMIT ?${parameter}`).bind(...values).all<Row>()
    const rows=result.results??[]; const hasMore=rows.length>input.limit; const items=rows.slice(0,input.limit).map(mapRow)
    return {items,nextCursor:hasMore?(items.at(-1)?.updatedAt??null):null}
  }
  async bySlug(kind:ContentKind,slug:string):Promise<CmsContent|null>{const row=await this.db.prepare("SELECT * FROM cms_contents WHERE kind=?1 AND slug=?2 AND status='published' AND deleted_at IS NULL").bind(kind,slug).first<Row>();return row?mapRow(row):null}
  async byId(id:string,kind:ContentKind):Promise<CmsContent|null>{const row=await this.db.prepare('SELECT * FROM cms_contents WHERE id=?1 AND kind=?2 AND deleted_at IS NULL').bind(id,kind).first<Row>();return row?mapRow(row):null}
  async mediaExists(ids:string[]):Promise<boolean>{for(const id of ids)if(!await this.db.prepare('SELECT id FROM cms_media WHERE id=?1 AND deleted_at IS NULL').bind(id).first())return false;return true}
  async create(kind:ContentKind,value:Partial<CmsContent>,actor:string,now:number):Promise<CmsContent>{
    const id=crypto.randomUUID(); const content: CmsContent={id,kind,slug:value.slug!,title:value.title!,summary:value.summary??'',bodyMarkdown:value.bodyMarkdown??'',category:value.category??'',tags:value.tags??[],seoTitle:value.seoTitle??'',metaDescription:value.metaDescription??'',featured:value.featured??false,status:value.status??'draft',data:value.data??{},version:1,createdAt:now,updatedAt:now,publishedAt:value.status==='published'?now:null,archivedAt:value.status==='archived'?now:null}
    await this.db.batch([
      this.db.prepare('INSERT INTO cms_contents (id,kind,slug,title,summary,body_markdown,category,tags_json,seo_title,meta_description,featured,status,data_json,version,created_at,updated_at,published_at,archived_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,1,?14,?14,?15,?16)').bind(id,kind,content.slug,content.title,content.summary,content.bodyMarkdown,content.category,JSON.stringify(content.tags),content.seoTitle,content.metaDescription,content.featured?1:0,content.status,JSON.stringify(content.data),now,content.publishedAt,content.archivedAt),
      this.db.prepare('INSERT INTO cms_content_revisions (id,content_id,version,snapshot_json,actor,created_at) VALUES (?1,?2,1,?3,?4,?5)').bind(crypto.randomUUID(),id,JSON.stringify(content),actor,now),
      this.db.prepare("INSERT INTO cms_audit_events (id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) VALUES (?1,?2,'create',?3,?4,'success','{}',?5)").bind(crypto.randomUUID(),actor,kind,id,now),
    ])
    return content
  }
  async update(id:string,kind:ContentKind,expectedVersion:number,value:Partial<CmsContent>,actor:string,now:number):Promise<'missing'|'conflict'|CmsContent>{
    const current=await this.byId(id,kind); if(!current)return'missing'; if(current.version!==expectedVersion)return'conflict'
    const next: CmsContent={...current,...value,id:current.id,kind:current.kind,version:current.version+1,updatedAt:now,publishedAt:value.status==='published'?(current.publishedAt??now):current.publishedAt,archivedAt:value.status==='archived'?now:null};const mutationId=crypto.randomUUID()
    const result=await this.db.batch([
      this.db.prepare('UPDATE cms_contents SET slug=?1,title=?2,summary=?3,body_markdown=?4,category=?5,tags_json=?6,seo_title=?7,meta_description=?8,featured=?9,status=?10,data_json=?11,version=version+1,updated_at=?12,published_at=?13,archived_at=?14,last_mutation_id=?15 WHERE id=?16 AND kind=?17 AND version=?18 AND deleted_at IS NULL').bind(next.slug,next.title,next.summary,next.bodyMarkdown,next.category,JSON.stringify(next.tags),next.seoTitle,next.metaDescription,next.featured?1:0,next.status,JSON.stringify(next.data),now,next.publishedAt,next.archivedAt,mutationId,id,kind,expectedVersion),
      this.db.prepare('INSERT INTO cms_content_revisions (id,content_id,version,snapshot_json,actor,created_at) SELECT ?1,?2,?3,?4,?5,?6 WHERE EXISTS (SELECT 1 FROM cms_contents WHERE id=?2 AND kind=?7 AND last_mutation_id=?8)').bind(crypto.randomUUID(),id,next.version,JSON.stringify(next),actor,now,kind,mutationId),
      this.db.prepare("INSERT INTO cms_audit_events (id,actor,operation,entity_type,entity_id,outcome,metadata_json,created_at) SELECT ?1,?2,'update',?3,?4,'success',?5,?6 WHERE EXISTS (SELECT 1 FROM cms_contents WHERE id=?4 AND kind=?3 AND last_mutation_id=?7)").bind(crypto.randomUUID(),actor,kind,id,JSON.stringify({fromVersion:expectedVersion,toVersion:next.version,status:next.status}),now,mutationId),
    ])
    if(Number(result[0]?.meta?.changes??0)!==1)return'conflict'
    return next
  }
  async archive(id:string,kind:ContentKind,version:number,actor:string,now:number){return this.update(id,kind,version,{status:'archived'},actor,now)}
  async revisions(id:string,kind:ContentKind){const result=await this.db.prepare('SELECT r.id,r.content_id,r.version,r.snapshot_json,r.actor,r.created_at FROM cms_content_revisions r JOIN cms_contents c ON c.id=r.content_id WHERE r.content_id=?1 AND c.kind=?2 ORDER BY r.version DESC LIMIT 100').bind(id,kind).all<Row>();return result.results??[]}
}
