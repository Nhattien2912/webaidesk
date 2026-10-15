# Desktop Update Manager — Phase B contract (not implemented)

Scope: what the AI Desk Electron app must do to consume the Phase A feed. **No desktop code has been
changed.** Facts below were read from `AI-Desk` (read-only) on 2026-10-15.

## Current desktop state

- Electron 44, electron-builder 26.15.3, `electron-updater` **not installed**.
- `package.json` version `0.1.0`; targets: NSIS x64 (`oneClick: false`, `perMachine: false`) and portable x64.
- No `publish` config → no `app-update.yml` in the app and no `latest.yml` in `dist/`.
- `artifactName` is fixed (`AI-Desk-Setup-v0.1-alpha.${ext}`) → every build has the same file name.
- Every existing EXE is `NotSigned`. RC1 (`dist/rc1-c71a6c4`) is internal-only.
- Since the installed builds have no updater, users of 0.1.x must install the first updater-enabled
  version manually from the website; automatic updates start from that version onward.

## Build changes required (Phase B)

```jsonc
"version": "0.2.0",                          // bump for every release; semver, never reuse
"build": {
  "publish": [{ "provider": "generic", "url": "https://webaidesk.pages.dev/api/updates/stable", "channel": "latest" }],
  "nsis": { "artifactName": "AI-Desk-Setup-${version}.${ext}", … },
  "portable": { "artifactName": "AI-Desk-Portable-${version}.${ext}" },
  "win": { "signtoolOptions": { "publisherName": ["<exact certificate subject CN>"] } }
}
```

- Sign the installer (and portable, helpers) **before** `latest.yml` is generated; the SHA-512 in
  `latest.yml` must be of the signed file. Then run `scripts/release.mjs inspect` on the output.
- `publisherName` makes electron-updater verify the downloaded installer's Authenticode publisher.
- Never publish with `--publish always` from electron-builder; uploads go through `release.mjs` only.

## Update manager behaviour

| Area | Contract |
|---|---|
| Install type | NSIS installs only (`process.env.PORTABLE_EXECUTABLE_DIR` unset and `app.isPackaged`). Portable/dev: never download; show "new version available" + link to the website. |
| Check | On start (delay ≥ 60 s, after the coordinator is up) and every 6 h; manual "Check for updates" in Settings. `autoDownload = false`, `autoInstallOnAppQuit = false`, `allowDowngrade = false`, `allowPrerelease = false`. |
| Notify | Show new version, `releaseDate` and release notes (from `releaseNotes` in latest.yml or the website changelog link). No modal interruptions while a flow is running. |
| Download | Only after the user clicks "Download". Show progress (`download-progress`: percent, bytes, speed). Cancel via `CancellationToken`. Start with `disableDifferentialDownload = true` (the feed does not do multi-range); enable later after staging tests. |
| Verify | electron-updater verifies SHA-512 from latest.yml and (with `publisherName`) the Authenticode publisher; any mismatch = discard file, show error, never install. |
| Install | Only after explicit consent ("Restart and update"), via `quitAndInstall(false, true)`. |
| Busy guard | Refuse to quit/install while any of these is true: a coordinator flow holds admission (RUNNING / WAITING / RESULT_CAPTURED / RETURNING), a GPT Return is pending or not ACKed, a worker job is queued or running, the desktop input lock (`serial()`) is held, a Result Store delivery is unread for the current flow. Show "Update ready — will install when the current job finishes" and re-check on flow completion; the user may still choose to wait. Never kill worker windows. |
| Errors | Network/offline/5xx/404 on `latest.yml` = "no update information" (silent on automatic checks, visible on manual). Retry with backoff (1 min, 5 min, 30 min; max 3 per session). Partial download resumes on the next attempt (Range + ETag supported by the feed). `integrity_mismatch` / signature failure = stop, log, report; no retry until next version. |
| Privacy | Requests carry no user data beyond the standard electron-updater headers; no telemetry. |
| Logs | Log check/download/verify/install events to the existing relay trace without URLs containing tokens (there are none) and without user paths. |

## Tests to add in Phase B (desktop)

- Busy guard blocks install for each busy signal; allows install when idle.
- Portable/dev builds never call `downloadUpdate`.
- Feed errors (404 `no_release`, 503, offline) are non-fatal.
- Version comparison: no downgrade, prerelease ignored on `stable`.
- Staging end-to-end: 0.2.0 installed → 0.2.1 published on a preview deployment → download, verify,
  install after consent; then withdraw 0.2.1 → app is not offered a downgrade.
