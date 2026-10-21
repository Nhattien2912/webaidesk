# AI Desk website — V0.3.0-only public release

Date: 2026-10-21 (Asia/Bangkok)

## Final verdict

**PUBLIC DEPLOYED VERIFIED**

The existing Cloudflare Pages project `webaidesk` now advertises and links only AI Desk **0.3.0 Beta** for **Windows x64** as the public release. V0.2 was removed from current website UI/configuration without deleting historical documentation, D1 records, or R2 objects. Private Studio was not deployed or changed.

## Safety and recovery

- Repository: `C:\Users\clubb\Desktop\WedAiDesk`
- Branch/HEAD at deployment: `feature/website-v3-premium-light` / `6ef0c74f44ff54ce14128cd02b9bc6365752f975`
- Existing dirty and untracked work was preserved.
- Recoverable checkpoint: `C:\Users\clubb\Desktop\WedAiDesk-checkpoints\v03-only-20261021-132558`
- Checkpoint SHA-256: repository bundle `899fd85da43ec3da9247d4e1f3792fe3e48b151aa33611542db9a78111a1983d`; tracked patch `3966983d0c5f80cbc6b8e34436b7145681e871df90382c4bc46f63d803a3ac99`; source tar `7df6d4d3cd546a58a291a3539ba39bb0be0536913d45e8e3dd964b5f19b72c0a`.
- No reset/clean, force push, DNS change, Access-policy change, destructive migration, R2 overwrite/delete, private Studio deployment, or desktop repository/updater change occurred.

## Release and UI changes

Modified current product/release surfaces:

- `src/lib/directDownload.ts`: V0.3.0 is the sole direct public release; removed the V0.2 `PREVIOUS_DOWNLOADS` entry.
- `src/pages/DownloadPage.tsx`: removed the Previous Versions/V0.2 section; labels the real artifact as V0.3.0 Beta, Windows x64 and RAR; added truthful extraction and unsigned executable guidance.
- `src/components/DownloadSection.tsx`: V0.3.0/Beta/RAR wording and unsigned warning.
- `src/components/Hero.tsx`: V0.3.0 Beta Windows x64 wording.
- `src/pages/InstallPage.tsx`: V0.3.0 Beta Windows x64 RAR extraction/checksum guidance.
- `src/pages/PromptsPage.tsx` and `src/content/prompts/index.ts`: current artifact wording updated to V0.3.0 Beta.
- `src/data/publicAlphaRelease.ts`: removed claims about a signed installer; onboarding now describes checksum verification and RAR extraction.
- `src/data/faq.ts`: states that V0.3.0 Beta is the only public release and that neither the archive nor enclosed executable is digitally signed or independently security-certified.
- `server/archivePolicy.ts`: obsolete V0.2 allowlist replaced with V0.3.0 and the verified R2 key/size/SHA-256. This is website server policy, not desktop updater metadata.
- `tests/download.test.ts`, `tests/faq.test.ts`, `tests/render.test.ts`: updated release and V0.2-removal regressions.

Historical deployment reports and audit evidence mentioning V0.2 were intentionally retained.

## CMS inspection

The existing staging D1 database `aidesk-studio-staging` was queried for application records and titles/slugs referencing V0.2. It returned zero rows. No archive/unpublish mutation was necessary, and no D1 row was deleted or modified.

## R2 verification

Verified the existing object without overwriting it:

- URL: `https://pub-afeeb98d61ba4ab4b97137b6b1bdf3c0.r2.dev/BoCaiDatAIDesk%200.3%20Beta.rar`
- HTTP: `200`
- size: `120629335` bytes
- SHA-256 after full download: `666eb793899160acaf40d7961fc2fb4544836b22f24a4b95abbee790af4dac03`
- first eight bytes: `52 61 72 21 1A 07 01 00` (RAR5)
- R2 ETag: `e12e1e9228524251e280f5b76bd0ea32`
- observed Content-Type: `application/x-compressed`

No EXE or ZIP URL is advertised or invented. The object filename still contains `0.3 Beta`; the website's product version label is the owner-approved semantic version `0.3.0`.

## Tests and artifact checks

- `npm run typecheck`: PASS
- `npm run lint`: PASS
- automated tests: **202/202 PASS**
- public and private builds: PASS
- isolated Pages Functions build: PASS
- V2.5 artifact security scanner: PASS; no Admin code in public artifact, no private demo/local bypass markers
- scan of `src`, `server`, `functions`, `public`, `dist-public` and `functions-public`: no current-release V0.2 label, prior-version section, old R2 URL or V0.2 404 message
- D1 CMS query: zero V0.2 application/content rows

## Browser verification

The built public site and the deployed production site were checked at widths 390, 768 and 1440 pixels.

At all three widths:

- no horizontal overflow;
- H1 is `AI Desk 0.3.0`;
- Windows x64, Beta, RAR and unsigned warnings are present;
- V0.2/Previous Versions text is absent;
- exactly one downloadable artifact target is present on `/download`;
- that target is the verified V0.3 R2 URL;
- no public download control targets an EXE, ZIP, V0.2 URL or 404.

The R2 target independently returned HTTP 200 and the expected content length after deployment.

## Cloudflare Pages deployment

- Existing project: `webaidesk`
- Environment/branch: Production / `main`
- Deployment ID: `e63d1201-6c9b-48a4-b36a-70465e146169`
- Immutable deployment URL: `https://e63d1201.webaidesk.pages.dev`
- Production URL: `https://webaidesk.pages.dev/`
- Production `/` and `/download`: HTTP 200

No Pages project was recreated. The deployment uploaded `dist-public` only.

## Private Studio preservation

`aidesk-studio-private`, its staging D1/R2 resources and Access configuration were not deployed or modified. An unauthenticated post-deployment check still received HTTP 302 to `<ACCESS_TEAM>.cloudflareaccess.com`, confirming the existing edge protection remains active.

## Remaining non-blocking notes

- The R2 response uses generic `application/x-compressed` and has no explicit Content-Disposition. The verified URL/extension still produces the real RAR5 download. This task intentionally did not overwrite the live object.
- The repository remains dirty by design because pre-existing user changes were preserved; no commit or push was requested or performed.
