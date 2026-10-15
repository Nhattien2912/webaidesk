// Cloudflare Pages Function: GET/HEAD /api/download/<fileName>
// Binding (Pages project → Settings → Bindings): R2 bucket `RELEASES` → aidesk-releases (private).
// Optional env: ALLOW_UNSIGNED_DOWNLOAD (default off; unsigned builds stay blocked).
// Only files of published + approved records in server/releases.json can be served.

import { handleDownload, type DownloadEnv } from '../../../server/downloadHandler.ts'

export const onRequest = (context: { request: Request; env: DownloadEnv; params: { name?: string | string[] } }): Promise<Response> =>
  handleDownload(context.request, context.env, context.params.name)
