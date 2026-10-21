import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Second, separate build for the Studio's page preview (private/preview.html). It must not share chunks with the Studio entry:
// the preview loads the public Tailwind stylesheet, which would otherwise be attached to the Studio's own pages.
export default defineConfig({
  root: resolve(import.meta.dirname, 'private'),
  publicDir: false,
  plugins: [react()],
  define: { 'import.meta.env.VITE_CMS_API_ENABLED': JSON.stringify('true') },
  resolve: { alias: { '/src': resolve(import.meta.dirname, 'src') } },
  build: { outDir: resolve(import.meta.dirname, 'dist-private'), emptyOutDir: false, sourcemap: false, rollupOptions: { input: { preview: resolve(import.meta.dirname, 'private/preview.html') } } },
})
