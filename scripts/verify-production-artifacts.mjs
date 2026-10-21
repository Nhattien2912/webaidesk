import { execFile } from 'node:child_process'
import { mkdtemp,readdir,readFile,rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename,join,relative } from 'node:path'
import { promisify } from 'node:util'

const run=promisify(execFile)
const forbidden=[/1x00000000000000000000AA/g,/local-studio-owner/g,/local-boundary-token/g,/local-only-siteverify-boundary/g,/cms-dev-worker/g,/localVerify/g,/local\.invalid/g,/invalid\.test/g,/security-test/g,/REPLACE_WITH/g]
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return(await Promise.all(entries.map(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]))).flat()}
async function scan(root,label){for(const file of await files(root)){const bytes=await readFile(file);if(bytes.includes(0))continue;const text=bytes.toString('utf8');for(const pattern of forbidden){pattern.lastIndex=0;if(pattern.test(text))throw new Error(`production artifact contamination: ${label}/${relative(root,file)} matched ${pattern}`)}}}

const temporary=await mkdtemp(join(tmpdir(),'aidesk-functions-'))
try{
  await scan(join(process.cwd(),'dist'),'dist')
  const command=join(process.cwd(),'node_modules','wrangler','bin','wrangler.js')
  await run(process.execPath,[command,'pages','functions','build','functions','--outdir',temporary,'--minify'],{cwd:process.cwd(),windowsHide:true})
  await scan(temporary,`functions-bundle:${basename(temporary)}`)
  const config=JSON.parse((await readFile(join(process.cwd(),'wrangler.staging.jsonc'),'utf8')).replace(/^\s*\/\/.*$/gm,''))
  if(config.vars?.ENVIRONMENT!=='staging'||!([undefined,'false'].includes(config.vars?.CMS_ADMIN_ENABLED)))throw new Error('staging config must default to a disabled Admin gate')
  console.log('Production artifacts clean: dist and compiled Pages Functions contain no local/test identity, secret, placeholder, or harness marker; staging Admin gate defaults disabled.')
}finally{await rm(temporary,{recursive:true,force:true})}
