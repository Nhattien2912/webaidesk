// Cloudflare Pages Function: POST /api/bug-report (public site only; "Gửi báo lỗi" from the AI Desk desktop app)
// Bindings (configure in the Pages project, never commit values):
//   CMS_DB        D1 database with migrations/0007_bug_reports.sql applied
//   BUG_REPORTS   PRIVATE R2 bucket for raw report bundles (never public, no r2.dev, no custom domain)
//   IP_HASH_SALT  secret used to hash client IPs for rate limiting
//   ALLOWED_ORIGINS optional comma-separated origins (requests without Origin are always allowed)

import { handleBugReport, type BugReportEnv } from '../../server/bugReportHandler.ts'

export const onRequest = (context: { request: Request; env: BugReportEnv }): Promise<Response> =>
  handleBugReport(context.request, context.env)
