import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type PluginOption } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const defaultAppName = 'CHPM Survey'
const defaultAppDescription =
  'Plateforme de questionnaires, invitations, passation sécurisée et statistiques pseudonymisées.'

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function readConfigurableMetaValue(mode: string, name: string, fallback: string): string {
  const env = loadEnv(mode, process.cwd(), '')
  const value = process.env[name] ?? env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function configurableHtmlMetadataPlugin(mode: string): PluginOption {
  return {
    name: 'chpm-configurable-html-metadata',
    transformIndexHtml(html) {
      const appName = escapeHtml(readConfigurableMetaValue(mode, 'VITE_APP_NAME', defaultAppName))
      const appDescription = escapeHtml(
        readConfigurableMetaValue(mode, 'VITE_APP_DESCRIPTION', defaultAppDescription),
      )

      return html
        .replaceAll('%CHPM_APP_NAME%', appName)
        .replaceAll('%CHPM_APP_DESCRIPTION%', appDescription)
    },
  }
}

// https://vite.dev/config/
const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.BASE_PATH ?? (process.env.GITHUB_ACTIONS === 'true' && repositoryName ? `/${repositoryName}/` : '/')

export default defineConfig(({ mode }) => ({
  base,
  plugins: [
    configurableHtmlMetadataPlugin(mode),
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url))
    },
  },
}))
