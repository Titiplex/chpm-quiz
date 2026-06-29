import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const backendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const prismaCli = require.resolve('prisma/build/index.js')

const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://chpm:chpm@localhost:5432/chpm_quiz?schema=public',
}

const result = spawnSync(process.execPath, [prismaCli, ...process.argv.slice(2)], {
  cwd: backendDir,
  env,
  stdio: 'inherit',
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 0)
