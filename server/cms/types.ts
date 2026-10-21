export type ContentKind = 'video' | 'article' | 'app'
export type ContentStatus = 'draft' | 'published' | 'archived'

export interface CmsContent {
  id: string
  kind: ContentKind
  slug: string
  title: string
  summary: string
  bodyMarkdown: string
  category: string
  tags: string[]
  seoTitle: string
  metaDescription: string
  featured: boolean
  status: ContentStatus
  data: Record<string, unknown>
  version: number
  createdAt: number
  updatedAt: number
  publishedAt: number | null
  archivedAt: number | null
}

export interface D1ResultLike<T = Record<string, unknown>> { results?: T[]; meta?: { changes?: number } }
export interface D1StatementLike {
  bind(...values: unknown[]): D1StatementLike
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<D1ResultLike<T>>
  run(): Promise<D1ResultLike>
}
export interface D1Like { prepare(query: string): D1StatementLike; batch(statements: D1StatementLike[]): Promise<D1ResultLike[]> }
export interface R2ObjectLike { body: ReadableStream; httpEtag: string; writeHttpMetadata(headers: Headers): void }
export interface R2BucketLike {
  put(key: string, body: ArrayBuffer, options?: { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string,string>; sha256?: ArrayBuffer }): Promise<unknown>
  get(key: string): Promise<R2ObjectLike | null>
  delete(key: string): Promise<void>
}

export interface CmsEnv {
  CMS_DB?: D1Like
  CMS_MEDIA?: R2BucketLike
  ACCESS_TEAM_DOMAIN?: string
  ACCESS_AUD?: string
  ACCESS_AUDIENCE_MAP?: string
  ACCESS_ALLOWED_IDENTITIES?: string
  CMS_ALLOWED_ORIGINS?: string
  CMS_CSRF_SECRET?: string
  ENVIRONMENT?: string
  CMS_ADMIN_ENABLED?: string
  PRIVATE_ADMIN_HOSTNAMES?: string
  CMS_ALLOWED_IMAGE_HOSTS?: string
  CMS_ALLOWED_DOWNLOAD_HOSTS?: string
  CMS_MEDIA_RETENTION_DAYS?: string
  COMMENTS_TURNSTILE_SECRET_KEY?: string
  COMMENTS_TURNSTILE_ALLOWED_HOSTNAMES?: string
  COMMENTS_TURNSTILE_ACTION?: string
  COMMENTS_IP_HASH_SECRET?: string
}

export interface AccessIdentity { sub: string; email: string; exp: number }
