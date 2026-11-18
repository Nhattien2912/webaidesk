// Which release catalog a request may see. Production stays exactly as before (RELEASE_TARGET unset on the production
// project); the staging catalog is only served when the Pages project says RELEASE_TARGET=staging AND the request host is
// an allowlisted staging host. Every other combination is refused (fail closed: a mis-configured project or a request to
// the wrong host gets 503 target_mismatch instead of the other environment's releases).
export type ReleaseTargetName = 'production' | 'staging'

/** Exact hosts + their Pages preview subdomains (<hash>.<host>). */
export const PRODUCTION_HOSTS: readonly string[] = Object.freeze(['webaidesk.pages.dev'])
export const STAGING_HOSTS: readonly string[] = Object.freeze(['webaidesk-staging.pages.dev'])

const onHost = (hostname: string, hosts: readonly string[]): boolean => {
  const h = hostname.toLowerCase()
  return hosts.some((x) => h === x || h.endsWith(`.${x}`))
}

export type TargetDecision = { ok: true; target: ReleaseTargetName } | { ok: false; reason: string }

export function selectReleaseTarget(envTarget: string | undefined, hostname: string): TargetDecision {
  const t = String(envTarget ?? '').trim().toLowerCase()
  const staging = onHost(hostname, STAGING_HOSTS)
  if (t === '' || t === 'production') {
    if (staging) return { ok: false, reason: 'staging host without RELEASE_TARGET=staging' }
    return { ok: true, target: 'production' }
  }
  if (t === 'staging') {
    if (!staging) return { ok: false, reason: `RELEASE_TARGET=staging on a non-staging host (${hostname})` }
    return { ok: true, target: 'staging' }
  }
  return { ok: false, reason: `unknown RELEASE_TARGET "${t.slice(0, 20)}"` }
}
