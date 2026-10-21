import React from 'react'
import { PageLayout } from './PageLayout'
import { usePageContent } from '../lib/usePageContent'
import type { PageDoc } from '../content/pageContent'

export const ChangelogPage: React.FC<{ content?: PageDoc | null; mediaBase?: string }> = ({ content, mediaBase }) => {
  const c = usePageContent('changelog', content, mediaBase)
  const entries = c.items('entries.items')
  return (
    <PageLayout title={c.t('hero.title')} intro={c.t('hero.intro')}>
      <ol className="space-y-10">
        {entries.map((entry) => (
          <li key={entry.id} className="border-l-2 border-line pl-6">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-ink">{entry.version}</h2>
              <span className="badge bg-white/[0.05] text-muted ring-1 ring-line">
                {entry.scope === 'desktop' ? 'Ứng dụng' : 'Website'}
              </span>
            </div>
            <p className="mt-1 text-sm text-subtle">
              <time dateTime={entry.date}>{new Date(entry.date).toLocaleDateString('vi-VN')}</time> · {entry.status}
            </p>
            <ul className="mt-4 list-disc space-y-1.5 pl-5">
              {entry.changes
                .split('\n')
                .map((change) => change.trim())
                .filter(Boolean)
                .map((change, index) => (
                  <li key={`${index}-${change}`}>{change}</li>
                ))}
            </ul>
          </li>
        ))}
      </ol>
    </PageLayout>
  )
}
