# AI Desk Studio V2.4 — Private Admin Integration

Date: 2026-10-19  
Branch: `feature/website-v3-premium-light`  
Baseline commit: `6ef0c74f44ff54ce14128cd02b9bc6365752f975`  
Deployment performed: **No**

## Outcome

V2.4 creates independent public and private frontend/Functions artifacts. The public React graph no longer imports Studio code and the public router treats `/admin` as Not Found. The private frontend has its own Vite entry and noindex headers. Public and private Pages Functions are built from disjoint source trees.

The private origin performs defense-in-depth Access validation. It verifies the `Cf-Access-Jwt-Assertion` signature with the configured Cloudflare Access issuer, RS256, allowlisted identity, and an audience selected only from an exact request-hostname mapping. Wildcard hostname entries fail closed. The private HTML/assets catch-all also validates host and JWT before calling the Pages `ASSETS` binding; Admin APIs retain rate limiting, Origin and CSRF validation.

Cloudflare's official guidance confirms that Pages Functions use file-based routing and that an origin behind Access must still validate the JWT, including issuer and application AUD. See [Pages Functions routing](https://developers.cloudflare.com/pages/functions/routing/) and [Access JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/).

## Artifact boundary

| Target | Frontend | Functions | Admin implementation |
|---|---|---|---|
| Public | `dist-public` | `functions-public` | Excluded |
| Private | `dist-private` | `functions-private` | Included and JWT-gated |
| Local test harness | `dist-cms-local`, `local/cms-dev-worker.ts` | Local only | Synthetic identity; scanner forbids it in deploy artifacts |

The V2.4 scanner rejects source maps, local/test markers, and any Admin/JWT marker in public artifacts. It scans the compiled assets and compiled Functions bundles rather than relying only on source layout.

## Security disposition

- **FIXED** — Public browser bundle no longer statically imports Studio or its CSS.
- **FIXED** — Public `/admin` resolves to Not Found.
- **FIXED** — Public/private frontend builds and Pages Functions bundles are independent.
- **FIXED** — Private HTML/assets and Admin APIs independently require a valid Access JWT.
- **FIXED** — Exact hostname-to-AUD mapping; wildcard hostname mappings fail closed.
- **FIXED** — Local synthetic identity remains confined to the local harness and is absent from deploy artifacts.
- **FIXED** — Source maps are disabled and rejected by artifact scanning.
- **PARTIAL** — Deployable config templates identify verified project/team/owner facts but intentionally omit D1/R2 identifiers, secrets, and real AUD values.
- **OPEN** — Seven npm audit findings remain in the Tailwind 3 development/build chain. `npm audit --omit=dev` reports zero production findings. The available aggregate fix is a Tailwind 4 major upgrade and was not applied without a dedicated migration.
- **OPEN** — Private D1/R2 bindings, CSRF secret, exact Access AUD values, and preview hostname mappings must be configured before enabling Admin.
- **NOT VERIFIED** — Cloudflare remote binding state, remote migration state, deployed Access challenge, valid production/preview JWTs, and post-deploy behavior. No remote operation was performed.

## Verification evidence

TypeScript and Oxlint passed. All 189 unit/integration tests passed, including exact-host audience negatives and source-tree separation. The focused CMS suite passed 48/48. Both frontend builds and both Functions bundles completed. The V2.4 scanner passed.

Browser E2E used a newly created temporary persistence directory under the OS temp directory, applied migrations there, created a draft through the Studio UI, observed the server-success message, reloaded, and observed the same record. Existing owner `.wrangler`/CMS state was neither selected nor deleted.

Public smoke at `/admin` rendered the public Not Found UI. The compiled private Functions bundle returned 404 while the Admin gate was disabled, then 401 without JWT after enabling the gate with an exact Host header.

## Release handoff

The artifact directory contains build bundles, migration/binding inventories, test evidence, deploy/rollback instructions, post-deploy checks, and a final SHA-256 manifest. `CMS_ADMIN_ENABLED` remains false in `wrangler.private.jsonc`. An independent Claude audit is the next action; deployment is intentionally out of scope.
