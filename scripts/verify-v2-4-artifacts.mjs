import { readdir,readFile } from 'node:fs/promises'
import { join,relative } from 'node:path'

const root=process.cwd()
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return(await Promise.all(entries.map(entry=>entry.isDirectory()?files(join(dir,entry.name)):[join(dir,entry.name)]))).flat()}
async function scan(dir,label,patterns){
  for(const file of await files(dir)){
    if(file.endsWith('.map'))throw new Error(`${label} contains source map: ${relative(dir,file)}`)
    const bytes=await readFile(file);if(bytes.includes(0))continue
    const value=bytes.toString('utf8')
    for(const pattern of patterns){pattern.lastIndex=0;if(pattern.test(value))throw new Error(`${label}/${relative(dir,file)} matched ${pattern}`)}
  }
}
const local=[/local-studio-owner/gi,/local-boundary-token/gi,/local-only-siteverify-boundary/gi,/cms-dev-worker/gi,/localVerify/g,/local\.invalid/gi,/invalid\.test/gi,/security-test/gi,/REPLACE_WITH/gi]
const admin=[/StudioPage/g,/AI Desk Studio/g,/\/api\/admin/g,/cf-access-jwt-assertion/gi,/CMS_ADMIN_ENABLED/g,/ACCESS_AUDIENCE_MAP/g]
await scan(join(root,'dist-public'),'public-assets',[...local,...admin])
await scan(join(root,'artifacts','studio-v2-4-private-admin','functions-public'),'public-functions',[...local,...admin])
await scan(join(root,'dist-private'),'private-assets',local)
await scan(join(root,'artifacts','studio-v2-4-private-admin','functions-private'),'private-functions',local)
const privateHtml=await readFile(join(root,'dist-private','index.html'),'utf8')
if(!/noindex/.test(privateHtml))throw new Error('private HTML must be noindex')
console.log('V2.4 artifact separation verified: public excludes Admin, both targets exclude local/test markers and source maps.')
