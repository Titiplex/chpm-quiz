import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const backendSource = join(repositoryRoot, 'backend', 'src')
const openapiPath = join(repositoryRoot, 'docs', 'openapi.yaml')

const failures = []
const controllerOperations = readControllerOperations()
const documentedOperations = readOpenApiOperations()

for (const operation of controllerOperations) {
  if (!documentedOperations.has(operation)) {
    failures.push(`OpenAPI is missing controller operation: ${operation}`)
  }
}

for (const operation of documentedOperations.keys()) {
  if (!controllerOperations.has(operation)) {
    failures.push(`OpenAPI documents a route not implemented by a controller: ${operation}`)
  }
}

const operationIds = new Map()
for (const [operation, metadata] of documentedOperations) {
  if (!metadata.operationId) {
    failures.push(`OpenAPI operation has no operationId: ${operation}`)
  } else if (operationIds.has(metadata.operationId)) {
    failures.push(
      `Duplicate OpenAPI operationId ${metadata.operationId}: ${operationIds.get(metadata.operationId)} and ${operation}`,
    )
  } else {
    operationIds.set(metadata.operationId, operation)
  }

  if (!metadata.hasResponses) {
    failures.push(`OpenAPI operation has no responses object: ${operation}`)
  }

  if (metadata.errorOnly && metadata.hasSuccessResponse) {
    failures.push(`Error-only OpenAPI operation unexpectedly documents a success or redirect response: ${operation}`)
  }

  if (!metadata.errorOnly && !metadata.hasSuccessResponse) {
    failures.push(`OpenAPI operation has no 2xx/3xx response and is not marked x-error-only: ${operation}`)
  }
}

const markdownFiles = [
  join(repositoryRoot, 'README.md'),
  join(repositoryRoot, 'backend', 'README.md'),
  join(repositoryRoot, 'shared', 'README.md'),
  ...walkFiles(join(repositoryRoot, 'docs')).filter((path) => extname(path) === '.md'),
]

for (const markdownPath of markdownFiles) {
  validateMarkdownLinks(markdownPath)
}

if (failures.length) {
  console.error('Documentation validation failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exitCode = 1
} else {
  console.log(
    `Documentation validation passed: ${controllerOperations.size} API operations, ` +
      `${markdownFiles.length} Markdown files, and ${operationIds.size} unique operationIds.`,
  )
}

/**
 * Derives the API surface from NestJS controller decorators. Controller paths use
 * `:parameter`; OpenAPI uses `{parameter}`, so both are normalized before comparison.
 */
function readControllerOperations() {
  const operations = new Set()
  const controllerFiles = walkFiles(backendSource).filter((path) => path.endsWith('.controller.ts'))

  for (const controllerPath of controllerFiles) {
    const source = readFileSync(controllerPath, 'utf8')
    const controllers = [
      ...source.matchAll(/@Controller\((?:'([^']*)')?\)\s*export class/g),
    ]

    for (const [index, controller] of controllers.entries()) {
      const prefix = controller[1] ?? ''
      const start = (controller.index ?? 0) + controller[0].length
      const end = controllers[index + 1]?.index ?? source.length
      const classSource = source.slice(start, end)

      for (const route of classSource.matchAll(/@(Get|Post|Put|Patch|Delete)\((?:'([^']*)')?\)/g)) {
        const method = route[1].toUpperCase()
        const suffix = route[2] ?? ''
        const path = normalizeControllerPath(prefix, suffix)
        operations.add(`${method} ${path}`)
      }
    }
  }

  return operations
}

/**
 * Reads the deliberately regular path/method indentation in `docs/openapi.yaml`.
 * Structural OpenAPI/YAML validation is handled independently by Redocly.
 */
function readOpenApiOperations() {
  const lines = readFileSync(openapiPath, 'utf8').split(/\r?\n/)
  const operations = new Map()
  let currentPath
  let currentOperation

  for (const line of lines) {
    const pathMatch = line.match(/^  (\/[^:]+):\s*$/)
    if (pathMatch) {
      currentPath = pathMatch[1]
      currentOperation = undefined
      continue
    }

    const methodMatch = line.match(/^    (get|post|put|patch|delete):\s*$/)
    if (currentPath && methodMatch) {
      currentOperation = `${methodMatch[1].toUpperCase()} ${currentPath}`
      operations.set(currentOperation, {
        operationId: undefined,
        hasResponses: false,
        hasSuccessResponse: false,
        errorOnly: false,
      })
      continue
    }

    if (!currentOperation) continue

    const operationIdMatch = line.match(/^      operationId:\s*([^\s#]+)\s*$/)
    if (operationIdMatch) {
      operations.get(currentOperation).operationId = operationIdMatch[1]
    }

    if (/^      responses:\s*$/.test(line)) {
      operations.get(currentOperation).hasResponses = true
    }

    if (/^      x-error-only:\s*true\s*$/.test(line)) {
      operations.get(currentOperation).errorOnly = true
    }

    if (/^        ['"]?[23]\d\d['"]?:\s*$/.test(line)) {
      operations.get(currentOperation).hasSuccessResponse = true
    }
  }

  return operations
}

function normalizeControllerPath(prefix, suffix) {
  const segments = [prefix, suffix]
    .flatMap((value) => value.split('/'))
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^:([A-Za-z0-9_]+)$/, '{$1}'))

  return `/${segments.join('/')}`
}

function validateMarkdownLinks(markdownPath) {
  const content = readFileSync(markdownPath, 'utf8')
  const links = content.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g)

  for (const match of links) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '')
    if (
      !rawTarget ||
      rawTarget.startsWith('#') ||
      /^[a-z][a-z0-9+.-]*:/i.test(rawTarget)
    ) {
      continue
    }

    const pathPart = rawTarget.split('#', 1)[0].split('?', 1)[0]
    if (!pathPart) continue

    let decodedTarget
    try {
      decodedTarget = decodeURIComponent(pathPart)
    } catch {
      failures.push(`${displayPath(markdownPath)} contains an invalid encoded link: ${rawTarget}`)
      continue
    }

    const resolvedTarget = resolve(dirname(markdownPath), decodedTarget)
    if (!resolvedTarget.startsWith(`${repositoryRoot}${sep}`) && resolvedTarget !== repositoryRoot) {
      failures.push(`${displayPath(markdownPath)} links outside the repository: ${rawTarget}`)
    } else if (!existsSync(resolvedTarget)) {
      failures.push(`${displayPath(markdownPath)} has a broken relative link: ${rawTarget}`)
    }
  }
}

function walkFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? walkFiles(path) : statSync(path).isFile() ? [path] : []
  })
}

function displayPath(path) {
  return relative(repositoryRoot, path).split(sep).join('/')
}
