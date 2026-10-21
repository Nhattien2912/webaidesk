import test from 'node:test'
import assert from 'node:assert/strict'
import { exportJWK,generateKeyPair,SignJWT } from 'jose'
import { verifyAccess } from '../server/cms/auth.ts'
import type { CmsEnv } from '../server/cms/types.ts'

const b64=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url')
test('Access JWT verifies RS256 and rejects forgery, wrong claims and unauthorized identity',async()=>{
  const {publicKey,privateKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='owner-key';jwk.alg='RS256';jwk.use='sig'
  const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}),{headers:{'content-type':'application/json','cache-control':'max-age=600'}})
  const env:CmsEnv={ACCESS_TEAM_DOMAIN:'security-test.cloudflareaccess.com',ACCESS_AUD:'security-aud',ACCESS_ALLOWED_IDENTITIES:'owner@example.com'};const issuer='https://security-test.cloudflareaccess.com';const now=Math.floor(Date.now()/1000)
  const sign=(claims:Record<string,unknown>={})=>new SignJWT({email:'owner@example.com',...claims}).setProtectedHeader({alg:'RS256',kid:'owner-key'}).setIssuer(issuer).setAudience('security-aud').setSubject('owner').setIssuedAt(now).setExpirationTime(now+600).sign(privateKey)
  try{
    assert.equal((await verifyAccess(await sign(),env)).email,'owner@example.com')
    await assert.rejects(verifyAccess(`${b64({alg:'none',kid:'owner-key'})}.${b64({iss:issuer,aud:'security-aud',sub:'owner',email:'owner@example.com',exp:now+600})}.`,env))
    await assert.rejects(verifyAccess(await new SignJWT({email:'owner@example.com'}).setProtectedHeader({alg:'RS256',kid:'owner-key'}).setIssuer(issuer).setAudience('wrong-aud').setSubject('owner').setExpirationTime(now+600).sign(privateKey),env))
    await assert.rejects(verifyAccess(await sign({email:'attacker@example.com'}),env),/access_forbidden/)
    await assert.rejects(verifyAccess(await new SignJWT({email:'owner@example.com'}).setProtectedHeader({alg:'RS256',kid:'owner-key'}).setIssuer('https://evil.cloudflareaccess.com').setAudience('security-aud').setSubject('owner').setExpirationTime(now+600).sign(privateKey),env))
    await assert.rejects(verifyAccess(await new SignJWT({email:'owner@example.com'}).setProtectedHeader({alg:'RS256',kid:'owner-key'}).setIssuer(issuer).setAudience('security-aud').setSubject('owner').setExpirationTime(now-10).sign(privateKey),env))
    await assert.rejects(verifyAccess(await new SignJWT({email:'owner@example.com'}).setProtectedHeader({alg:'RS256',kid:'owner-key'}).setIssuer(issuer).setAudience('security-aud').setSubject('owner').setNotBefore(now+600).setExpirationTime(now+1200).sign(privateKey),env))
  } finally {globalThis.fetch=original}
})

test('Access JWKS source rejects non-Cloudflare team domains',async()=>{await assert.rejects(verifyAccess('not-a-token',{ACCESS_TEAM_DOMAIN:'attacker.example',ACCESS_AUD:'aud',ACCESS_ALLOWED_IDENTITIES:'owner@example.com'}),/access_not_configured/)})

test('Access audience map requires an exact hostname and rejects wildcard configuration',async()=>{
  const base:CmsEnv={ACCESS_TEAM_DOMAIN:'security-test.cloudflareaccess.com',ACCESS_ALLOWED_IDENTITIES:'owner@example.com'}
  await assert.rejects(verifyAccess('not-a-token',{...base,ACCESS_AUDIENCE_MAP:JSON.stringify({'aidesk-studio-private.pages.dev':'prod-aud'})},'unknown.pages.dev'),/access_not_configured/)
  await assert.rejects(verifyAccess('not-a-token',{...base,ACCESS_AUDIENCE_MAP:JSON.stringify({'*.aidesk-studio-private.pages.dev':'preview-aud'})},'x.aidesk-studio-private.pages.dev'),/access_not_configured/)
  await assert.rejects(verifyAccess('not-a-token',{...base,ACCESS_AUDIENCE_MAP:'not-json'},'aidesk-studio-private.pages.dev'),/access_not_configured/)
})
