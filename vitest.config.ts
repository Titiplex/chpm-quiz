import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { configDefaults, defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('./shared', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:5173/',
      },
    },
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**'],
    root: fileURLToPath(new URL('./', import.meta.url)),
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/frontend',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,vue}'],
      exclude: [
        'src/main.ts',
        'src/**/*.d.ts',
        'src/__tests__/**',
        'src/**/*.spec.ts',
        'src/**/*.functional.spec.ts',
        'src/data/staticPagesDemo.ts',
        'src/services/demoApi.ts',
        'src/views/**',
      ],
      thresholds: {
        statements: 60,
        branches: 45,
        functions: 50,
        lines: 60,
      },
    },
  },
})
