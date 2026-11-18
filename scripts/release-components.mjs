#!/usr/bin/env node
// Signed component manifest (components.json) + GPT Bridge extension packages for the AI Desk Desktop-managed updaters.
//
// The Ed25519 PRIVATE key lives offline with the release owner (never in a repo, never in Cloudflare). AI Desk builds carry
// only the public key (AIDESK_RELEASE_FEED_KEYS="<keyId>:<base64 spki>") and refuse any manifest it cannot verify.
// Everything is a DRY RUN unless you pass --execute (uploads) or --write (edits server/releaseData.ts).
//
//   node scripts/release-components.mjs keygen  --out <path OUTSIDE this repo>.pem --key-id <id>
//   node scripts/release-components.mjs sign    --channel stable --sequence <n> --key <pem> --key-id <id> --out <dir>
//              [--desktop-yml <latest.yml of a SIGNED release record>] [--extension <AI-Desk-GPT-Bridge-x.y.z.aidext.json>
//               --ext-min-desktop <semver> [--ext-max-desktop <semver>]] [--withdraw-desktop a,b] [--withdraw-extension a]
//              [--expires-days 30] [--revoke-key-ids old1,old2]
//   node scripts/release-components.mjs verify  --file <components.json> --public-key <keyId:base64spki> --channel stable
//   node scripts/release-components.mjs stage   --channel stable --sequence <n> --dir <sign output> --account-id <id> [--aws-profile r2] [--execute] [--write]
//   node scripts/release-components.mjs approve|publish|withdraw --channel stable --sequence <n> [--write]
//   node scripts/release-components.mjs status  [--channel stable]
//
// Order: sign → verify → stage (upload packages FIRST, components.json LAST, --if-none-match '*') → review → approve →
// publish → deploy. Withdraw an extension/desktop version by signing a NEW sequence that lists it under withdrawn.

import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign as edSign, verify as edVerify } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readReleaseFile, writeReleaseFile, parseLatestYml } from './release.mjs'
import { checkComponents, componentsKey, COMPONENTS_FILE, currentComponents, extensionKey } from '../server/componentRecords.ts'
import { checkCatalog } from '../server/releaseRecords.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const BUCKET = 'aidesk-releases'
export const MANIFEST_FORMAT = 'aidesk-signed-manifest-v1'
export const PACKAGE_FORMAT = 'aidesk-extension-package-v1'
export const BRIDGE_PROTOCOL_VERSION = 1

const sha256 = (b) => createHash('sha256').update(b).digest('hex')

export function keygen() {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519')
  return { privatePem: privateKey.export({ type: 'pkcs8', format: 'pem' }), spki: publicKey.export({ type: 'spki', format: 'der' }).toString('base64') }
}

export function signPayload(payload, privateKey, keyId) {
  const bytes = Buffer.from(JSON.stringify(payload), 'utf8')
  return JSON.stringify({ format: MANIFEST_FORMAT, keyId, payload: bytes.toString('base64'), signature: edSign(null, bytes, privateKey).toString('base64') })
}

export function verifyEnvelope(text, keyId, spki) {
  const env = JSON.parse(text)
  if (env.format !== MANIFEST_FORMAT || env.keyId !== keyId) throw new Error('unknown format or keyId')
  const bytes = Buffer.from(env.payload, 'base64')
  const ok = edVerify(null, bytes, createPublicKey({ key: Buffer.from(spki, 'base64'), format: 'der', type: 'spki' }), Buffer.from(env.signature, 'base64'))
  if (!ok) throw new Error('signature invalid')
  return JSON.parse(bytes.toString('utf8'))
}

/** Extension entry from a package file (the same rules AI Desk applies: exactly background.js + content.js). */
export function extensionEntry(pkgPath, { minDesktop, maxDesktopExclusive }) {
  const bytes = readFileSync(pkgPath)
  const pkg = JSON.parse(bytes.toString('utf8'))
  if (pkg.format !== PACKAGE_FORMAT) throw new Error(`${pkgPath}: not an ${PACKAGE_FORMAT}`)
  if (Object.keys(pkg.files ?? {}).sort().join() !== 'background.js,content.js') throw new Error('package must contain exactly background.js + content.js')
  if (pkg.bridgeProtocol !== BRIDGE_PROTOCOL_VERSION) throw new Error(`package bridge protocol ${pkg.bridgeProtocol} ≠ ${BRIDGE_PROTOCOL_VERSION}`)
  const fileName = basename(pkgPath)
  if (fileName !== `AI-Desk-GPT-Bridge-${pkg.version}.aidext.json`) throw new Error(`package file must be named AI-Desk-GPT-Bridge-${pkg.version}.aidext.json`)
  if (!minDesktop) throw new Error('--ext-min-desktop is required')
  return { version: pkg.version, fileName, sha256: sha256(bytes), sizeBytes: bytes.length, bridgeProtocol: pkg.bridgeProtocol, minDesktop, ...(maxDesktopExclusive ? { maxDesktopExclusive } : {}), capabilities: pkg.capabilities }
}

/** Desktop entry from latest.yml; the version must be a SIGNED release record of the channel, or an unsigned one the Owner
 *  approved with `release.mjs approve --feed-only` (then this signed manifest is its only trust root). */
export function desktopEntry(ymlPath, releaseFile, channel) {
  const yml = parseLatestYml(readFileSync(ymlPath, 'utf8'))
  const f = yml.files[0]
  if (!yml.version || !f?.url || !f.sha512 || !f.size) throw new Error('latest.yml incomplete')
  const rec = checkCatalog(releaseFile).valid.find((r) => r.channel === channel && r.version === yml.version)
  if (!rec) throw new Error(`no release record ${channel}/${yml.version} (stage the desktop release first)`)
  if (rec.signature !== 'signed' && rec.updateTrust !== 'feed-only') throw new Error(`${channel}/${yml.version} is unsigned — authorize it for OTA only via "release.mjs approve --feed-only"`)
  if (rec.artifacts.installer.sha512 !== f.sha512 || rec.artifacts.installer.fileName !== f.url) throw new Error('latest.yml differs from the release record')
  return { version: yml.version, installer: { fileName: f.url, sha512: f.sha512, sizeBytes: f.size } }
}

export function buildPayload({ channel, sequence, desktop, extension, withdrawnDesktop = [], withdrawnExtension = [], expiresDays = 30, now = Date.now(), revokedKeyIds = [], signingKeyId = null }) {
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error('--sequence must be a positive integer')
  if (expiresDays < 1 || expiresDays > 180) throw new Error('--expires-days must be 1..180')
  if (signingKeyId && revokedKeyIds.includes(signingKeyId)) throw new Error('a manifest cannot revoke its own signing key')
  return {
    schemaVersion: 1, channel, sequence,
    issuedAt: new Date(now).toISOString(), expiresAt: new Date(now + expiresDays * 86_400_000).toISOString(),
    desktop: desktop ?? null, extension: extension ?? null,
    nativeHost: { protocol: BRIDGE_PROTOCOL_VERSION },
    withdrawn: { desktop: withdrawnDesktop, extension: withdrawnExtension },
    ...(revokedKeyIds.length ? { revokedKeyIds } : {}),
  }
}

export function componentRecord({ channel, sequence, manifestBytes, packages }) {
  return {
    channel, sequence, status: 'staged', approved: false,
    manifest: { fileName: COMPONENTS_FILE, r2Key: componentsKey(channel, sequence), sizeBytes: manifestBytes.length, sha256: sha256(manifestBytes) },
    extensionPackages: packages.map((p) => ({ version: p.version, fileName: p.fileName, r2Key: extensionKey(channel, p.version, p.fileName), sizeBytes: p.sizeBytes, sha256: p.sha256 })),
  }
}

/** Pure transition on releaseData.components. */
export function applyComponentTransition(file, op, sequence, channel) {
  const next = structuredClone(file)
  next.components ??= []
  const r = next.components.find((x) => x.channel === channel && x.sequence === sequence)
  if (!r) throw new Error(`no component manifest ${channel}/${sequence}`)
  if (op === 'approve') {
    if (r.status !== 'staged') throw new Error(`only staged manifests can be approved (is ${r.status})`)
    r.approved = true
  } else if (op === 'publish') {
    if (r.status !== 'staged' || !r.approved) throw new Error('approve a staged manifest before publishing')
    const current = currentComponents(checkComponents(file.components).valid, channel)
    if (current && current.sequence >= sequence) throw new Error(`sequence ${sequence} must be greater than the published ${current.sequence}`)
    r.status = 'published'
  } else if (op === 'withdraw') {
    if (r.status === 'withdrawn') throw new Error('already withdrawn')
    r.status = 'withdrawn'
  } else throw new Error(`unknown operation ${op}`)
  const check = checkComponents(next.components)
  if (check.errors.length) throw new Error(check.errors.join('\n'))
  return next
}

function args(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) out[a.slice(2)] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true
    else out._.push(a)
  }
  return out
}
const list = (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : [])

async function main() {
  const o = args(process.argv.slice(2))
  const cmd = o._[0]
  const channel = o.channel ?? 'stable'
  const sequence = o.sequence !== undefined ? Number(o.sequence) : undefined
  const file = readReleaseFile()
  const save = (next) => {
    if (o.write) {
      writeReleaseFile(next)
      console.log('Wrote server/releaseData.ts. Review the diff, then deploy.')
    } else console.log('Dry run: releaseData.ts not changed (add --write).')
  }
  if (cmd === 'keygen') {
    if (!o.out || !o['key-id']) throw new Error('--out <pem path outside the repo> and --key-id are required')
    const out = resolve(o.out)
    const rel = relative(ROOT, out)
    if (!rel.startsWith('..') && !isAbsolute(rel)) throw new Error('refusing to write a private key inside the repository')
    if (existsSync(out)) throw new Error(`${out} exists (never overwritten)`)
    const k = keygen()
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, k.privatePem, { mode: 0o600, flag: 'wx' })
    console.log(`Private key written to ${out} — keep it offline.\nAIDESK_RELEASE_FEED_KEYS=${o['key-id']}:${k.spki}`)
    return
  }
  if (cmd === 'sign') {
    if (!o.key || !o['key-id'] || !o.out || sequence === undefined) throw new Error('--key, --key-id, --out and --sequence are required')
    const desktop = o['desktop-yml'] ? desktopEntry(resolve(o['desktop-yml']), file, channel) : null
    const extension = o.extension ? extensionEntry(resolve(o.extension), { minDesktop: o['ext-min-desktop'], maxDesktopExclusive: o['ext-max-desktop'] }) : null
    if (!desktop && !extension && !o['withdraw-desktop'] && !o['withdraw-extension']) throw new Error('nothing to sign')
    const payload = buildPayload({ channel, sequence, desktop, extension, withdrawnDesktop: list(o['withdraw-desktop']), withdrawnExtension: list(o['withdraw-extension']), expiresDays: Number(o['expires-days'] ?? 30), revokedKeyIds: list(o['revoke-key-ids']), signingKeyId: o['key-id'] })
    const text = signPayload(payload, createPrivateKey(readFileSync(resolve(o.key))), o['key-id'])
    const outDir = resolve(o.out)
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, COMPONENTS_FILE), text, { flag: 'wx' })
    if (o.extension) writeFileSync(join(outDir, basename(o.extension)), readFileSync(resolve(o.extension)), { flag: 'wx' })
    console.log(JSON.stringify({ payload, record: componentRecord({ channel, sequence, manifestBytes: Buffer.from(text), packages: extension ? [extension] : [] }) }, null, 2))
    return
  }
  if (cmd === 'verify') {
    const [keyId, spki] = String(o['public-key'] ?? '').split(':')
    const payload = verifyEnvelope(readFileSync(resolve(o.file), 'utf8'), keyId, spki)
    if (payload.channel !== channel) throw new Error(`manifest channel ${payload.channel} ≠ ${channel}`)
    console.log(`SIGNATURE_OK sequence=${payload.sequence} expires=${payload.expiresAt}`)
    console.log(JSON.stringify(payload, null, 2))
    return
  }
  if (cmd === 'stage') {
    if (!o.dir || sequence === undefined) throw new Error('--dir and --sequence are required')
    const dir = resolve(o.dir)
    const text = readFileSync(join(dir, COMPONENTS_FILE))
    const payload = JSON.parse(Buffer.from(JSON.parse(text.toString('utf8')).payload, 'base64').toString('utf8'))
    if (payload.sequence !== sequence || payload.channel !== channel) throw new Error('manifest sequence/channel differ from the arguments')
    const packages = payload.extension ? [payload.extension] : []
    for (const p of packages) {
      const b = readFileSync(join(dir, p.fileName))
      if (sha256(b) !== p.sha256 || b.length !== p.sizeBytes) throw new Error(`${p.fileName} differs from the signed manifest`)
    }
    const record = componentRecord({ channel, sequence, manifestBytes: text, packages })
    const next = structuredClone(file)
    next.components = [...(next.components ?? []), record]
    const check = checkComponents(next.components)
    if (check.errors.length) throw new Error(check.errors.join('\n'))
    const uploads = [...record.extensionPackages.map((p) => ({ ref: p, path: join(dir, p.fileName) })), { ref: record.manifest, path: join(dir, COMPONENTS_FILE) }]
    if (!o['account-id'] || !/^[a-f0-9]{32}$/.test(o['account-id'])) throw new Error('--account-id <32-char Cloudflare account id> is required')
    const endpoint = `https://${o['account-id']}.r2.cloudflarestorage.com`
    for (const u of uploads) {
      console.log(`${o.execute ? 'UPLOAD' : 'PLAN'} ${u.ref.r2Key} <- ${u.path} (${statSync(u.path).size} B)`)
      if (!o.execute) continue
      const put = spawnSync('aws', ['s3api', 'put-object', '--bucket', BUCKET, '--key', u.ref.r2Key, '--body', u.path, '--content-type', 'application/json', '--metadata', `sha256=${u.ref.sha256}`, '--if-none-match', '*', '--endpoint-url', endpoint, '--profile', o['aws-profile'] ?? 'r2'], { encoding: 'utf8' })
      if (put.status !== 0) throw new Error(`upload failed for ${u.ref.r2Key} (exists already or permission denied)`)
      const head = spawnSync('aws', ['s3api', 'head-object', '--bucket', BUCKET, '--key', u.ref.r2Key, '--endpoint-url', endpoint, '--profile', o['aws-profile'] ?? 'r2'], { encoding: 'utf8' })
      const info = JSON.parse(head.stdout || '{}')
      if (head.status !== 0 || info.ContentLength !== u.ref.sizeBytes || info.Metadata?.sha256 !== u.ref.sha256) throw new Error(`verification failed for ${u.ref.r2Key}`)
    }
    if (!o.execute) return void console.log('Dry run: nothing uploaded (add --execute).')
    save(next)
    return
  }
  if (cmd === 'approve' || cmd === 'publish' || cmd === 'withdraw') {
    if (sequence === undefined) throw new Error('--sequence is required')
    save(applyComponentTransition(file, cmd, sequence, channel))
    console.log(`${cmd} ${channel}/components/${sequence}`)
    return
  }
  if (cmd === 'status') {
    const check = checkComponents(file.components)
    console.log(JSON.stringify({ errors: check.errors, current: currentComponents(check.valid, channel)?.sequence ?? null, components: (file.components ?? []).map((r) => `${r.channel}/${r.sequence} ${r.status} approved=${r.approved}`) }, null, 2))
    return
  }
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 20).join('\n'))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`ERROR: ${e.message}`)
    process.exit(1)
  })
}
