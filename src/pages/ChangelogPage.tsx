import React from 'react'
import { PageLayout } from './PageLayout'
import { changelog } from '../data/changelog'

export const ChangelogPage: React.FC = () => (
  <PageLayout title="Changelog" intro="Các thay đổi của ứng dụng AI Desk và website.">
    <ol className="space-y-10">
      {changelog.map((entry) => (
        <li key={`${entry.scope}-${entry.version}`} className="border-l-2 border-line pl-6">
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
            {entry.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  </PageLayout>
)
