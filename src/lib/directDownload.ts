// Website-only download metadata verified against the public R2 endpoint.
// This deliberately bypasses the release-manifest gates (published/approved/signed) at the owner's
// request; the manifest pipeline (releaseManifest.ts, /api/releases/latest) is unchanged and unused
// while DIRECT_DOWNLOAD is set. This file does not feed the desktop auto-updater.

import type { DownloadState } from './releaseManifest'

export interface DirectRelease {
  versionLabel: string
  fileName: string
  sizeBytes: number
  sha256: string
  url: string
  available: boolean
  verifiedAt: string
}

export const DIRECT_DOWNLOAD: DirectRelease = Object.freeze({
  versionLabel: '0.3.0',
  /** Object key in aidesk-releases. */
  fileName: 'BoCaiDatAIDesk 0.3 Beta.rar',
  sizeBytes: 120_629_335,
  sha256: '666eb793899160acaf40d7961fc2fb4544836b22f24a4b95abbee790af4dac03',
  url: 'https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev/BoCaiDatAIDesk%200.3%20Beta.rar',
  available: true,
  verifiedAt: '2026-10-21T05:40:02.109Z',
})

/** Manifest-driven states plus the direct R2 download. */
export type DownloadView = DownloadState | { kind: 'direct'; release: DirectRelease }
