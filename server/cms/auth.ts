import { createRemoteJWKSet, jwtVerify } from 'jose'
import type { AccessIdentity, CmsEnv } from './types.ts'

export type VerifyAccess = (token: string, env: CmsEnv, hostname?: string) => Promise<AccessIdentity>
const jwksCache=new Map<string,ReturnType<typeof createRemoteJWKSet>>()
function jwksFor(issuer:string){let jwks=jwksCache.get(issuer);if(jwks)return jwks;if(jwksCache.size>=8)jwksCache.delete(jwksCache.keys().next().value!);jwks=createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`),{cooldownDuration:30_000,cacheMaxAge:600_000});jwksCache.set(issuer,jwks);return jwks}

function audienceFor(env:CmsEnv,hostname?:string):string{
  if(env.ACCESS_AUDIENCE_MAP?.trim()){
    let map:unknown
    try{map=JSON.parse(env.ACCESS_AUDIENCE_MAP)}catch{throw new Error('access_not_configured')}
    if(!map||Array.isArray(map)||typeof map!=='object'||!hostname)throw new Error('access_not_configured')
    const normalized=hostname.toLowerCase()
    const entries=Object.entries(map as Record<string,unknown>)
    if(entries.some(([host,aud])=>host.includes('*')||!host.trim()||typeof aud!=='string'||!aud.trim()))throw new Error('access_not_configured')
    const audience=entries.find(([host])=>host.toLowerCase()===normalized)?.[1]
    if(typeof audience!=='string'||!audience.trim())throw new Error('access_not_configured')
    return audience.trim()
  }
  if(env.ACCESS_AUD?.trim())return env.ACCESS_AUD.trim()
  throw new Error('access_not_configured')
}

function configured(env: CmsEnv): asserts env is CmsEnv & Required<Pick<CmsEnv,'ACCESS_TEAM_DOMAIN'|'ACCESS_ALLOWED_IDENTITIES'>> {
  if (!env.ACCESS_TEAM_DOMAIN?.trim() || !env.ACCESS_ALLOWED_IDENTITIES?.trim()) throw new Error('access_not_configured')
}

export const verifyAccess: VerifyAccess = async (token, env, hostname) => {
  configured(env)
  const team = env.ACCESS_TEAM_DOMAIN.trim().replace(/^https?:\/\//,'').replace(/\/$/,'')
  if(!/^[a-z0-9-]+\.cloudflareaccess\.com$/i.test(team))throw new Error('access_not_configured')
  const issuer = `https://${team}`
  const jwks = jwksFor(issuer)
  const { payload } = await jwtVerify(token, jwks, { issuer, audience: audienceFor(env,hostname), algorithms:['RS256'] })
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''
  const allowed = env.ACCESS_ALLOWED_IDENTITIES.split(',').map((v)=>v.trim().toLowerCase()).filter(Boolean)
  if (!email || !allowed.includes(email) || !payload.sub || !payload.exp) throw new Error('access_forbidden')
  return { sub:payload.sub, email, exp:payload.exp }
}

async function hmac(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign'])
  const signature = await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(value))
  return btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
}

export async function csrfToken(identity: AccessIdentity, env: CmsEnv): Promise<string> {
  if (!env.CMS_CSRF_SECRET || env.CMS_CSRF_SECRET.length < 32) throw new Error('csrf_not_configured')
  return hmac(`${identity.sub}.${identity.exp}`,env.CMS_CSRF_SECRET)
}

function allowedOrigin(request: Request, env: CmsEnv): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return false
  const configuredOrigins = (env.CMS_ALLOWED_ORIGINS ?? '').split(',').map((v)=>v.trim()).filter(Boolean)
  return configuredOrigins.includes(origin) && request.headers.get('sec-fetch-site') !== 'cross-site'
}

function constantTimeEqual(left:string,right:string):boolean{if(left.length!==right.length)return false;let result=0;for(let index=0;index<left.length;index++)result|=left.charCodeAt(index)^right.charCodeAt(index);return result===0}

async function rateAllowed(identity:AccessIdentity,env:CmsEnv):Promise<boolean>{
  if(!env.CMS_DB)return false
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity.sub));const principal=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')
  const windowStart=Math.floor(Date.now()/60_000)*60_000
  await env.CMS_DB.prepare('INSERT INTO cms_rate_limits (principal_hash,window_start,attempts) VALUES (?1,?2,1) ON CONFLICT(principal_hash,window_start) DO UPDATE SET attempts=attempts+1').bind(principal,windowStart).run()
  const row=await env.CMS_DB.prepare('SELECT attempts FROM cms_rate_limits WHERE principal_hash=?1 AND window_start=?2').bind(principal,windowStart).first<{attempts:number}>()
  return Number(row?.attempts??999)<=120
}

export async function authorize(request: Request, env: CmsEnv, verify: VerifyAccess = verifyAccess): Promise<{ ok:true; identity:AccessIdentity }|{ ok:false; status:number; code:string }> {
  if (!env.ACCESS_TEAM_DOMAIN || (!env.ACCESS_AUD&&!env.ACCESS_AUDIENCE_MAP) || !env.ACCESS_ALLOWED_IDENTITIES) return {ok:false,status:503,code:'access_not_configured'}
  const token = request.headers.get('cf-access-jwt-assertion')
  if (!token) return {ok:false,status:401,code:'authentication_required'}
  try {
    const identity = await verify(token,env,new URL(request.url).hostname)
    if(env.CMS_DB&&!await rateAllowed(identity,env))return {ok:false,status:429,code:'rate_limited'}
    if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
      if (!allowedOrigin(request,env)) return {ok:false,status:403,code:'origin_forbidden'}
      const expected = await csrfToken(identity,env)
      if (!constantTimeEqual(request.headers.get('x-csrf-token')??'',expected)) return {ok:false,status:403,code:'csrf_invalid'}
    }
    return {ok:true,identity}
  } catch (error) {
    const internal=error instanceof Error?error.message:'unknown'
    const code=internal==='access_forbidden'?'access_forbidden':internal==='access_not_configured'?'access_not_configured':'access_invalid'
    console.warn(JSON.stringify({event:'access_denied',category:code}))
    return {ok:false,status:code==='access_forbidden'?403:code==='access_not_configured'?503:401,code}
  }
}
