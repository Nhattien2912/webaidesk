import { execFile } from 'node:child_process'
import { copyFile,mkdir,rm } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const run=promisify(execFile)
const root=process.cwd()
const artifactRoot=join(root,'artifacts','studio-v2-5-release')
const command=join(root,'node_modules','wrangler','bin','wrangler.js')
for(const target of ['public','private']){
  const output=join(artifactRoot,`functions-${target}`)
  await rm(output,{recursive:true,force:true})
  await mkdir(output,{recursive:true})
  await run(process.execPath,[command,'pages','functions','build',`functions-${target}`,'--outdir',output,'--minify'],{cwd:root,windowsHide:true})
  await copyFile(join(output,'index.js'),join(root,`dist-${target}`,'_worker.js'))
}
console.log('Built isolated Pages Functions and embedded each bundle as its target _worker.js.')
