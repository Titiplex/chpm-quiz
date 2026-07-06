import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    exclude: ['node_modules/**', 'dist/**'],
    root: '.',
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/backend',
      reporter: ['text', 'html', 'lcov'],
      all: true,
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/app.module.ts',
        'src/**/*.module.ts',
        'src/**/*.dto.ts',
        'src/**/*.types.ts',
        'src/**/*.spec.ts',
        'src/**/*.functional.spec.ts',
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
