import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

const baseConfig = viteConfig as Record<string, unknown>
const testConfig = defineConfig({
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
}) as Record<string, unknown>

export default mergeConfig(baseConfig, testConfig)
