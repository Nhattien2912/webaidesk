import { useEffect, useState } from 'react'
import { siteConfig } from '../config/site'
import { loadDownloadState, type DownloadState } from './releaseManifest'

export function useDownloadState(): DownloadState {
  const [state, setState] = useState<DownloadState>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    loadDownloadState(siteConfig.release.manifestUrl, {
      allowedHosts: siteConfig.release.allowedHosts,
      allowUnsigned: siteConfig.release.allowUnsigned,
    }).then((next) => {
      if (!cancelled) setState(next)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return state
}
