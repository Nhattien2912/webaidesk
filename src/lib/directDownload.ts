// Website-only download metadata verified against the public R2 endpoint.
// This deliberately bypasses the release-manifest gates (published/approved/signed) at the owner's
// request; the manifest pipeline (releaseManifest.ts, /api/releases/latest) is unchanged and unused
// while DIRECT_DOWNLOAD is set. This file does not feed the desktop auto-updater.

import type { DownloadState } from './releaseManifest'

export interface DirectExtension {
  fileName: string
  url: string
  sizeBytes: number
  sha256: string
}

export interface DirectRelease {
  /** Exact release version (shown in the facts list). */
  versionLabel: string
  /** Human label for buttons/headings, e.g. "0.5.0 Beta". Falls back to `${versionLabel} Beta`. */
  displayLabel?: string
  /** EXE = NSIS installer, RAR = archive. Drives every format label on the site. */
  format: 'EXE' | 'RAR'
  fileName: string
  sizeBytes: number
  sha256: string
  url: string
  /** Release notes stored in R2 next to the installer. Optional: no notes link is rendered when absent. */
  notesUrl?: string
  /** Archive only: the installer inside it, so users can verify it after extracting. */
  innerInstaller?: { fileName: string; sha256: string }
  /** Separate GPT Bridge extension zip (Load unpacked), shown as a secondary download next to the installer. */
  extension?: DirectExtension
  available: boolean
  verifiedAt: string
}

/** What a complete RAR package contains (only rendered when format === 'RAR'; no RAR is published now). */
export const RAR_CONTENTS = 'Bộ cài AI Desk, GPT Bridge Extension và Prompt-Kit'

const R2_PUBLIC = 'https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev'
const R2_RELEASE_DIR = `${R2_PUBLIC}/releases/beta/0.5.0-beta.2`

export const DIRECT_DOWNLOAD: DirectRelease = Object.freeze({
  versionLabel: '0.5.0-beta.2',
  displayLabel: '0.5.0 Beta',
  format: 'EXE',
  /** NSIS installer object in aidesk-releases. Unsigned internal beta; sha256/size verified against R2. */
  fileName: 'AI-Desk-Setup-0.5.0-beta.2.exe',
  sizeBytes: 131_487_210,
  sha256: 'e11978581f255f3ac96485b12d6fa1609e6d4a8aa5ccf53593682cb4e29c673f',
  url: `${R2_RELEASE_DIR}/AI-Desk-Setup-0.5.0-beta.2.exe`,
  // No RELEASE_NOTES.md was published for 0.5.0-beta.2 → notesUrl intentionally absent.
  extension: Object.freeze({
    /** Contains the folder AI-Desk-Extension/ (Load unpacked in brave://extensions with Developer mode). */
    fileName: 'AI-Desk-Extension-0.5.0-beta.2.zip',
    url: `${R2_RELEASE_DIR}/AI-Desk-Extension-0.5.0-beta.2.zip`,
    sizeBytes: 66_249,
    sha256: '4bddf96794e3465d8beaa5a74ef06518ac0f3c7e1aeec342d2a5e4dc1a802d93',
  }),
  available: true,
  verifiedAt: '2026-11-18T00:00:00.000Z',
})

/** Label used in buttons and headings ("0.5.0 Beta"). */
export function directDisplayLabel(release: Pick<DirectRelease, 'versionLabel' | 'displayLabel'>): string {
  return release.displayLabel ?? `${release.versionLabel} Beta`
}

/** Manifest-driven states plus the direct R2 download. */
export type DownloadView = DownloadState | { kind: 'direct'; release: DirectRelease }
