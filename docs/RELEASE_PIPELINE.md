# AI Desk Release & Update Pipeline V1 (Phase A — server side)

Status: code + offline tests only. Nothing is uploaded, bound or deployed. The desktop app does not
contain an updater yet (Phase B, see `DESKTOP_UPDATER_PHASE_B.md`), so **auto-update is not live**.

## One source of truth

`server/releaseData.ts` (validated by `server/releaseRecords.ts`) is the only release metadata. It is
changed by `scripts/release.mjs` and code review, and is bundled into the Pages Functions at build
time. Website and updater read the same records:

| Consumer | Route | Uses |
|---|---|---|
| Website download card | `GET /api/releases/latest` | current release of `stable` → manifest v1 (installer + optional portable) |
| Website download | `GET/HEAD /api/download/<file>.exe` | any published+approved file (installer or portable) |
| electron-updater | `GET/HEAD /api/updates/stable/latest.yml` | builder-generated `latest.yml` of the current release, verbatim |
| electron-updater | `GET/HEAD /api/updates/stable/<installer>.exe[.blockmap]` | installer / blockmap of any published release of the channel |

"Current release" = highest semver among records that are valid, `published`, `approved` and signed
(`currentRelease()`), so the website and the feed always offer the same version. Publishing or
withdrawing changes both in the same deploy (atomic).

## Record (server/releaseData.ts)

```jsonc
{
  "schemaVersion": 1,
  "releases": [{
    "version": "0.2.0",                 // semver, unique per channel
    "channel": "stable",
    "releasedAt": "2026-11-01T10:00:00.000Z", // latest.yml releaseDate
    "minOs": "Windows 10/11 64-bit",
    "signature": "signed", "signer": "CN=…",   // from Authenticode, never typed by hand
    "status": "staged | published | withdrawn",
    "approved": false,
    "artifacts": {
      "installer": { "fileName": "AI-Desk-Setup-0.2.0.exe", "r2Key": "releases/stable/0.2.0/AI-Desk-Setup-0.2.0.exe",
                     "sizeBytes": 0, "sha256": "<hex>", "sha512": "<base64, = latest.yml>",
                     "blockmap": { "fileName": "AI-Desk-Setup-0.2.0.exe.blockmap", "r2Key": "releases/stable/0.2.0/…blockmap", "sizeBytes": 0, "sha256": "<hex>" } },
      "updateMetadata": { "fileName": "latest.yml", "r2Key": "releases/stable/0.2.0/latest.yml", "sizeBytes": 0, "sha256": "<hex>" },
      "portable": { "fileName": "AI-Desk-Portable-0.2.0.exe", "r2Key": "releases/stable/0.2.0/…", "sizeBytes": 0, "sha256": "<hex>" }
    }
  }]
}
```

Rules enforced on every request (fail closed):

- Keys are immutable: `releases/<channel>/<version>/<fileName>`; a duplicate version, file name or key
  disables **all** records involved. `published` without `approved` is invalid.
- Update feed: signed only (the website's `ALLOW_UNSIGNED_DOWNLOAD` override never applies). Portable
  builds are never in the feed.
- Every R2 object must match the recorded size and SHA-256 (R2 custom metadata `sha256`, written by the
  script). `latest.yml` must also match its SHA-256 and name the record's version, installer file,
  SHA-512 and size, otherwise `503 integrity_mismatch`.
- Downloads stream from R2 (no buffering); `latest.yml` (≤ 64 KB) is read fully to verify it.
- `GET`, `HEAD`, single `Range` (206 / 416), `If-Range`, `If-None-Match` (304). Multi-range is answered
  with the full file; electron-updater then falls back from differential to full download.

## latest.yml (electron-builder 26.15.3, verified in `app-builder-lib/out/publish/updateInfoBuilder.js`)

```yaml
version: 0.2.0
files:
  - url: AI-Desk-Setup-0.2.0.exe
    sha512: <base64 SHA-512 of the installer>
    size: <bytes>
path: AI-Desk-Setup-0.2.0.exe
sha512: <same base64 SHA-512>
releaseDate: '2026-11-01T10:00:00.000Z'
```

It is only written when a `publish` provider is configured (current desktop config has none, so
`dist/` contains no `latest.yml`). The NSIS target also writes `<installer>.blockmap`. The portable
target has no update metadata and cannot self-update.

## Pipeline

```
build (signed) ─► inspect ─► stage (upload + verify, record=staged) ─► review ─► approve ─► publish ─► deploy
                                                                                        └─► withdraw (rollback) ─► deploy
```

1. **inspect** (`node scripts/release.mjs inspect --dir <builder output>`): reads `latest.yml`, checks the
   installer exists and its SHA-512/size equal `latest.yml`, the blockmap exists, Authenticode status,
   duplicate version. Prints the staged record. Nothing is changed.
2. **stage** (`… stage --dir <dir> --account-id <id> [--portable <exe>] --execute --write`): uploads
   installer, blockmap, portable, then `latest.yml` **last**, each with `--if-none-match '*'` (never
   overwrites) and `sha256` metadata, then `head-object` verifies size + metadata, then adds the record
   with `status: staged, approved: false`. Without `--execute` it only prints the plan.
3. **approve** (`… approve --version X --write`): staged + signed only.
4. **publish** (`… publish --version X --write`): approved + signed only. Prints the current release
   before/after. Deploy to make it live.
5. **withdraw / rollback** (`… withdraw --version X --write`): the previous published release becomes
   current for both website and feed after deploy. Installed apps never downgrade (electron-updater
   `allowDowngrade` stays false); they just stop being offered the withdrawn version.

`--write` only edits `server/releaseData.ts`; review the diff and deploy through the normal Pages
pipeline. Unsigned builds can be staged for internal testing but cannot be approved or published.

## Cache policy

| Route | Cache-Control | Why |
|---|---|---|
| `/api/releases/latest`, `latest.yml` | `no-cache` | rollback/withdraw must take effect at the next check |
| `.exe`, `.blockmap` | `no-cache` + strong `ETag` | keys are immutable, but revalidation keeps withdrawals effective; resume uses ETag |
| Errors | `no-store` | |

Pages Functions responses are not cached by the Cloudflare CDN unless code opts in (it does not).

## Limits to verify on staging

- Pages Functions requests count against the plan quota (Free: 100k/day); a full installer download is
  one request plus Range requests for resumes.
- Streaming a ~120 MB body from R2 through a Function is supported (no response-size limit when
  streaming), but must be measured on staging: duration, resume after disconnect, and electron-updater
  over a slow link.
