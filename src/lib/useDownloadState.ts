import { DIRECT_DOWNLOAD, type DownloadView } from './directDownload'

/** The primary button links straight to the public R2 file (see directDownload.ts). */
export function useDownloadState(): DownloadView {
  return { kind: 'direct', release: DIRECT_DOWNLOAD }
}
