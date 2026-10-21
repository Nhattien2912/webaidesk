import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root:resolve(import.meta.dirname,'private'),
  publicDir:resolve(import.meta.dirname,'private-public'),
  plugins:[react()],
  define:{'import.meta.env.VITE_CMS_API_ENABLED':JSON.stringify('true')},
  resolve:{alias:{'/src':resolve(import.meta.dirname,'src')}},
  build:{outDir:resolve(import.meta.dirname,'dist-private'),emptyOutDir:true,sourcemap:false},
})
