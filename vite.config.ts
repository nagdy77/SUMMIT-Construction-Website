import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { webAssetsOnly } from './scripts/vite-web-assets.mjs'

export default defineConfig({
  base: '/SUMMIT-Construction-Website/',
  plugins: [react(), tailwindcss(), webAssetsOnly()],
  build: { copyPublicDir: false },
})
