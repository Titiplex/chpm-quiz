import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' && repositoryName ? `/${repositoryName}/` : '/')

export default defineConfig({
  base,
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url))
    },
  },
})
