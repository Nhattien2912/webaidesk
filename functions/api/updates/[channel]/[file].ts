// Cloudflare Pages Function: GET/HEAD /api/updates/<channel>/<file>
// electron-updater generic feed (latest.yml + NSIS installer + blockmap) from the private R2 bucket
// bound as RELEASES. Only published + approved + signed records in server/releaseData.ts are served.

import { handleUpdate } from '../../../../server/updateHandler.ts'
import type { DownloadEnv } from '../../../../server/downloadHandler.ts'

export const onRequest = (context: {
  request: Request
  env: DownloadEnv
  params: { channel?: string | string[]; file?: string | string[] }
}): Promise<Response> => handleUpdate(context.request, context.env, context.params.channel, context.params.file)
