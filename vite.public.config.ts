import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({plugins:[react()],define:{'import.meta.env.VITE_SITE_URL':JSON.stringify('https://webaidesk.pages.dev')},build:{outDir:'dist-public',sourcemap:false}})
