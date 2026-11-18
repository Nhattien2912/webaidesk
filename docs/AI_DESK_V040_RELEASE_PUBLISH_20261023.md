# AI Desk 0.4.0 Beta — R2 publication and website sync

Date: 2026-10-23 (Asia/Bangkok) · Verdict: **PUBLISHED AND VERIFIED** (installer is unsigned beta; see risks)

## Installer verified before upload

`C:\Users\clubb\Desktop\AI-Desk-builds\v0.4.0\AI-Desk-Setup-0.4.0-x64.exe` — 120,664,656 bytes, SHA-256
`feb8cf17e3a3731f5b0c26ddf8a0ab3fd028c767867a8b750c68a3817416ac76`, MZ / NSIS, Authenticode NotSigned.
Build report: internal unsigned build; clean install / upgrade / uninstall NOT TESTED.

## R2 (bucket `aidesk-releases`, public `https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev`)

Layout follows the documented immutable scheme `releases/<channel>/<version>/<file>` (RELEASE_PIPELINE.md) with a
`beta` prefix, deliberately outside the signed-only `stable` updater namespace.

| Key | Size | ETag | Headers |
|---|---|---|---|
| `releases/beta/0.4.0/AI-Desk-Setup-0.4.0-x64.exe` | 120,664,656 | `cc48138ec5124789636293048f874619` (= local MD5) | `application/octet-stream`; `attachment; filename="AI-Desk-Setup-0.4.0-x64.exe"`; `public, max-age=31536000, immutable` |
| `releases/beta/0.4.0/SHA256SUMS.txt` | 177 | `87db6a74…` | `text/plain; charset=utf-8`; `no-cache` |
| `releases/beta/0.4.0/RELEASE_NOTES.md` | 4,410 | `b2798a72…` | `text/markdown; charset=utf-8`; `no-cache` |

Uploaded with `wrangler r2 object put --remote` (existing OAuth login). The key did not exist before. Public URL
verified twice (right after upload and after the website deploy): HTTP 200, exact headers above, full download
SHA-256 `feb8cf17…ac76`, byte-identical to the local file. RELEASE_NOTES.md is the build's notes with the channel line
changed to “Beta — manual download only, unsigned”. No R2 object was deleted or overwritten.

Pre-existing state found (not caused by this task): the bucket no longer contained `BoCaiDatAIDesk 0.3 Beta.rar`
(the live site's v0.3.0 link was already 404) nor the 0.2 RAR. It contained `BoCaiDatAIDesk 0.4 Beta.rar`
(120,687,013 B, SHA-256 `1d7e6984…3473`, uploaded 2026-10-23 08:46 UTC by the owner). Extracted read-only: it holds
the identical `AI-Desk-Setup-0.4.0-x64.exe` (SHA-256 `feb8cf17…`) plus `extension/` and `Prompt-Kit/`.

## Website changes (repo `C:\Users\clubb\Desktop\WedAiDesk`, branch `feature/website-v3-premium-light` @ `1702b2a`, uncommitted)

Before editing, production was confirmed to be exactly this HEAD (identical asset hashes). Checkpoint:
`C:\Users\clubb\Desktop\WedAiDesk-checkpoints\v040-release-20261023` (git bundle SHA-256 `4eb48257…6c95`).

- `src/lib/directDownload.ts` — 0.4.0 EXE: R2 URL, size, SHA-256, `format: 'EXE'`, notes/SHA256SUMS URLs.
- `src/pages/DownloadPage.tsx`, `src/components/DownloadSection.tsx`, `src/components/Hero.tsx` — format/size/labels from
  the release record, EXE wording, unsigned + "install/upgrade/uninstall not tested on a clean machine" notice,
  release notes + SHA256SUMS links in the release-notes card (the download card keeps exactly one link).
- `src/content/pageContent.ts` (install/prompts defaults), `src/content/prompts/index.ts`, `src/data/faq.ts`,
  `src/data/publicAlphaRelease.ts` — 0.4.0 Beta EXE wording; corrected limitations (helpers are packaged as pinned,
  unsigned binaries; clean-machine install untested; auto-update does not install this build).
- `server/archivePolicy.ts` — RAR allowlist moved from the deleted 0.3 object to the existing 0.4 RAR (only used by the
  signed/approved manifest path, which has no records).
- Tests and generated data updated: `tests/render.test.ts`, `tests/faq.test.ts`, `tests/publicAlphaDownload.test.ts`,
  `tests/download.test.ts`, `tests/fixtures/page-parity/{install,prompts,faq}.html` (re-rendered; diff = only the
  intended text), `docs/page-content-inventory/*` (via `scripts/seed-page-content.mjs`; insert-only, not applied to D1).

`npm run check`: typecheck, lint, **297/297 tests**, public + private builds, Functions build, V2.5 artifact scan — PASS.

## Deployment

- Preview: `7db556cc` (`release-v040-preview` branch) — checked at desktop and 375 px.
- Production: **`e494a7de-7362-4b74-8905-5dc2246ced64`** (`wrangler pages deploy dist-public --project-name webaidesk --branch main`),
  previous production (rollback target) `6cd94f86-df89-4390-b636-556922f00668`. Only `dist-public` was uploaded; Pages
  project bindings, Access, private Studio, DNS and D1 data were not changed.
- Production `/`, `/download`, `/install`, `/faq`, `/prompts`: 200. `/download`: H1 “AI Desk 0.4.0”, the only release links
  are the 0.4.0 EXE, RELEASE_NOTES.md and SHA256SUMS.txt; SHA-256 and 115.1 MB shown; unsigned notice; no 0.3/RAR text;
  no horizontal overflow.

## Update channels

`server/releaseData.ts` (signed-only `stable` feed) is still empty; `/api/updates/stable/latest.yml` and
`/api/releases/latest` returned 404 before and after. No latest/auto-update pointer was created or changed. The 0.4.0
app itself is check-only (no update publisher pinned).

## Not changed / follow-ups

- v0.3.0 is **not** downloadable: its R2 object was removed before this task. A byte-exact copy exists in
  `WedAiDesk-checkpoints\v03-only-20261021-132558\BoCaiDatAIDesk 0.3 Beta.rar` (SHA-256 `666eb793…dac03`) if the owner
  wants it restored.
- Published CMS article `ai-desk-vs-orca-herdr-paseo-aionui` still says “AI Desk (Beta 0.3.0)” in its comparison table;
  draft page records (`faq`, `prompts`) in D1 contain 0.3.0 seed text. Owner-authored CMS content was left untouched.
- `/download` hero badge still reads “Public Alpha” (`publicAlphaRelease.channel`, unchanged pre-existing label).
- Public download uses the `r2.dev` development URL (rate-limited by Cloudflare, not intended for production traffic).

## Update 2026-10-23 (later): complete RAR package is the single primary download

The owner asked for the complete package instead of the standalone EXE.

- R2 key `BoCaiDatAIDesk 0.4 Beta.rar` (unchanged, uploaded by the owner 08:46 UTC), public URL
  `https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev/BoCaiDatAIDesk%200.4%20Beta.rar`.
- RAR: **120,687,013 bytes**, SHA-256 **`1d7e6984f9435b68752a5b233bc567c9ffe47182aa90332bbd1d003983793473`**, ETag/MD5
  `dca7e462a5480a677cd41a16cf2860e7`, RAR5, `UnRAR t` OK. Contents: `AI-Desk-Setup-0.4.0-x64.exe` (SHA-256 `feb8cf17…ac76`
  = official build), `extension/` (MV3 manifest, key = bundled public key → id `fgbbgendfdgknlnhldhliikomcmjmdji`,
  background.js/content.js byte-identical to the desktop repo) and `Prompt-Kit/` (7 Markdown files).
- Website: `directDownload.ts` now describes the RAR (`format: 'RAR'`, own size/SHA-256, `innerInstaller` = EXE name + hash
  shown separately as a post-extraction check, release-notes URL kept, SHA256SUMS link removed because it lists the EXE).
  Buttons read “Tải AI Desk 0.4.0 Beta”; the hero CTA (“Tải bản beta 0.4.0”) keeps pointing to the home download section
  so the page has exactly one download button with the unsigned notice. Install guide / FAQ / release data: download RAR →
  verify → extract → run the included Setup.exe → GPT Bridge setup; archive contents explained. Tests and page-parity
  fixtures updated; `npm run check` PASS (297/297).
- Checkpoint before this change: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\v040-rar-switch-20261023`
  (`tracked-working-tree.patch` SHA-256 `e820d2e9…f42d`, `untracked.tar`, `status-before.txt`).
- Preview `c98a04bb` (exact link downloaded: 200, 120,687,013 B, SHA-256 `1d7e6984…`). Production
  **`e5c9a9fc-4621-4737-91f0-425720233607`**; previous production `e494a7de` (EXE) and `6cd94f86` (pre-0.4.0).
- Live: home and /download each have one download button → the RAR; live download SHA-256 `1d7e6984…`, extracted Setup
  `feb8cf17…`. R2 still has the 4 objects (RAR, standalone EXE, notes, SHA256SUMS), none changed. Update feed
  `/api/updates/stable/latest.yml` and `/api/releases/latest`: 404 before and after.
- Rollback: Cloudflare dashboard → Workers & Pages → webaidesk → Deployments → `e494a7de` (EXE) or `6cd94f86` →
  “Rollback to this deployment”; source: `git apply` the checkpoint patch onto `1702b2a` (or `git checkout -- .` then apply).
