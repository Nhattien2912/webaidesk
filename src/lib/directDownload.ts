// Direct download of the AI Desk 0.2 Beta RAR from the public R2 bucket (r2.dev).
// This deliberately bypasses the release-manifest gates (published/approved/signed) at the owner's
// request; the manifest pipeline (releaseManifest.ts, /api/releases/latest) is unchanged and unused
// while DIRECT_DOWNLOAD is set. Values verified against R2 on 2026-10-18 (size, ETag, SHA-256).

import type { DownloadState } from './releaseManifest'

export interface DirectRelease {
  versionLabel: string
  fileName: string
  sizeBytes: number
  sha256: string
  url: string
}

export const DIRECT_DOWNLOAD: DirectRelease = Object.freeze({
  versionLabel: '0.2 Beta',
  /** Object key in aidesk-releases. */
  fileName: 'BoCaiDatAIDesk 0.2Beta.rar',
  sizeBytes: 120_193_516,
  sha256: 'f482fc4510ae80dbabe09a9665f012b110fbb6cf0d1e18a4e4ccd8153f8681b1',
  url: 'https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev/BoCaiDatAIDesk%200.2Beta.rar',
})

/** Manifest-driven states plus the direct R2 download. */
export type DownloadView = DownloadState | { kind: 'direct'; release: DirectRelease }
