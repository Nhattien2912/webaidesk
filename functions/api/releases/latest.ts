// Cloudflare Pages Function: GET/HEAD /api/releases/latest
// Website release manifest (AIDESK_RELEASE_MANIFEST v1) built from the current release in server/releaseData.ts (same release as the update feed).
// 404 {"ok":false,"error":"no_release"} until an approved release exists, so the site stays fail-closed.

import { handleLatestManifest, type DownloadEnv } from '../../../server/downloadHandler.ts'

export const onRequest = (context: { request: Request; env: DownloadEnv }): Promise<Response> =>
  handleLatestManifest(context.request, context.env)
