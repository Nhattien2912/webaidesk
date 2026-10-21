import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

const command=process.argv[2]??'dev'
const run=(program,args,extraEnv={})=>{const result=spawnSync(program,args,{stdio:'inherit',env:{...process.env,...extraEnv}});if(result.error)console.error(result.error.message);if(result.status!==0)process.exit(result.status??1)}
const tool=(name,args,env={})=>run(process.execPath,[name==='vite'?'node_modules/vite/bin/vite.js':'node_modules/wrangler/bin/wrangler.js',...args],env)
const persist=['--persist-to',process.env.CMS_LOCAL_PERSIST_TO??'.wrangler/state/cms-v2-1']
if(command==='migrate')tool('wrangler',['d1','migrations','apply','aidesk-studio-local','--local','--config','wrangler.local.jsonc',...persist])
else if(command==='inspect')tool('wrangler',['d1','execute','aidesk-studio-local','--local','--config','wrangler.local.jsonc',...persist,'--command',process.argv.slice(3).join(' ')||"SELECT kind,status,COUNT(*) total FROM cms_contents GROUP BY kind,status;"])
else if(command==='dev'){
  tool('vite',['build','--config','vite.private.config.ts','--outDir',join(process.cwd(),'dist-cms-local'),'--emptyOutDir'],{VITE_CMS_API_ENABLED:'true',VITE_COMMENTS_TURNSTILE_SITE_KEY:'1x00000000000000000000AA'})
  tool('wrangler',['dev','--config','wrangler.local.jsonc',...persist,'--ip','127.0.0.1','--port',process.env.CMS_LOCAL_PORT??'8787'])
} else if(command==='public'){
  tool('vite',['build','--config','vite.public.config.ts','--outDir',join(process.cwd(),'dist-public-local'),'--emptyOutDir'],{VITE_CMS_API_ENABLED:'true',VITE_COMMENTS_TURNSTILE_SITE_KEY:'1x00000000000000000000AA'})
  tool('wrangler',['dev','--config','wrangler.local.public.jsonc',...persist,'--ip','127.0.0.1','--port',process.env.CMS_LOCAL_PUBLIC_PORT??'8788'])
} else { console.error('Unknown cms-local command');process.exit(2) }
