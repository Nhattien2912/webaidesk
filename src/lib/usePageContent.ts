import { useEffect, useMemo, useState } from 'react'
import { PAGES, allFields, effective, validateDoc, type Field, type PageDoc, type PageId, type Value } from '../content/pageContent'

/**
 * Where the content currently shown comes from:
 *  - `loading`           defaults shown while the CMS request is in flight (never an empty page)
 *  - `cms`               a published CMS document is merged over the defaults
 *  - `default`           nothing published (CMS answered 404): the code defaults are the content
 *  - `unavailable`       the CMS could not be read (network error / 5xx / not configured): the code defaults are shown
 *  - `preview`           a document supplied by the Studio preview
 */
export type ContentSource = 'loading' | 'cms' | 'default' | 'unavailable' | 'preview'

export interface PageContent {
  source: ContentSource
  /** single-line or multi-line text */
  t(key: string): string
  list(key: string): string[]
  items(key: string): Array<Record<string, string>>
  /** true when the editor hid this block */
  hidden(id: string): boolean
  /** URL of a media-library image (the public route; the Studio preview supplies its private route) */
  mediaUrl(id: string): string
  mediaBase: string | undefined
}

const cache = new Map<PageId, Promise<{ doc: PageDoc | null; source: 'cms' | 'default' | 'unavailable' }>>()

function load(pageId: PageId): Promise<{ doc: PageDoc | null; source: 'cms' | 'default' | 'unavailable' }> {
  let pending = cache.get(pageId)
  if (!pending) {
    pending = fetch(`/api/content/pages/${pageId}`, { headers: { accept: 'application/json' } })
      .then(async response => {
        if (response.status === 404) return { doc: null, source: 'default' as const }
        if (!response.ok) return { doc: null, source: 'unavailable' as const }
        const body = (await response.json()) as { data?: { content?: unknown } }
        const checked = validateDoc(pageId, body.data?.content)
        return checked.ok ? { doc: checked.doc, source: 'cms' as const } : { doc: null, source: 'unavailable' as const }
      })
      .catch(() => ({ doc: null, source: 'unavailable' as const }))
    cache.set(pageId, pending)
  }
  return pending
}

export function makePageContent(pageId: PageId, doc: PageDoc | null, source: ContentSource, mediaBase?: string): PageContent {
  const fields = new Map<string, Field>(allFields(PAGES[pageId]).map(field => [field.key, field]))
  const get = (key: string): Value => {
    const field = fields.get(key)
    if (!field) throw new Error(`Unknown content key: ${pageId}.${key}`)
    return effective<Value>(doc, field)
  }
  return {
    source,
    t: key => get(key) as string,
    list: key => get(key) as string[],
    items: key => get(key) as Array<Record<string, string>>,
    hidden: id => doc?.hidden.includes(id) ?? false,
    mediaUrl: id => `${mediaBase ?? '/api/content/media'}/${id}`,
    mediaBase,
  }
}

/** Defaults are always usable; a published CMS document, when present, overrides them. Pass `override` for the Studio preview. */
export function usePageContent(pageId: PageId, override?: PageDoc | null, mediaBase?: string): PageContent {
  const [state, setState] = useState<{ doc: PageDoc | null; source: ContentSource }>({ doc: null, source: 'loading' })
  useEffect(() => {
    if (override !== undefined) return
    let active = true
    void load(pageId).then(result => {
      if (active) setState(result)
    })
    return () => {
      active = false
    }
  }, [pageId, override])
  return useMemo(
    () => (override !== undefined ? makePageContent(pageId, override, 'preview', mediaBase) : makePageContent(pageId, state.doc, state.source)),
    [pageId, override, state, mediaBase],
  )
}
