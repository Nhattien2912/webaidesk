// Cloudflare Pages Function: POST /api/waitlist
// Bindings (configure in the Pages project, never commit values):
//   DB                    D1 database with migrations/0001_waitlist.sql applied
//   IP_HASH_SALT          optional secret used to hash client IPs for rate limiting
//   TURNSTILE_SECRET_KEY  optional; when set, Turnstile verification is required
//   ALLOWED_ORIGINS       optional comma-separated origins (default: same origin)

import { handleWaitlist, type WaitlistEnv } from '../../server/waitlistHandler.ts'

export const onRequest = (context: { request: Request; env: WaitlistEnv }): Promise<Response> =>
  handleWaitlist(context.request, context.env)
