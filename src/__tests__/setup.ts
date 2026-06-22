import { afterEach, vi } from 'vitest'

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => '00000000-0000-4000-8000-000000000000',
    },
    configurable: true,
  })
} else if (!globalThis.crypto.randomUUID) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: () => '00000000-0000-4000-8000-000000000000',
    configurable: true,
  })
}

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>()

  get length(): number {
    return this.items.size
  }

  clear(): void {
    this.items.clear()
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }

  setItem(key: string, value: string): void {
    this.items.set(key, String(value))
  }
}

function readLocalStorage(target: typeof globalThis | Window): Storage | undefined {
  try {
    return target.localStorage
  } catch {
    return undefined
  }
}

function ensureLocalStorage(target: typeof globalThis | Window, storage: Storage): void {
  const currentStorage = readLocalStorage(target)

  if (currentStorage && typeof currentStorage.clear === 'function') {
    return
  }

  Object.defineProperty(target, 'localStorage', {
    value: storage,
    configurable: true,
    enumerable: true,
    writable: false,
  })
}

const testLocalStorage = new MemoryStorage()
ensureLocalStorage(globalThis, testLocalStorage)

if (globalThis.window) {
  ensureLocalStorage(globalThis.window, testLocalStorage)
}

afterEach(() => {
  testLocalStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})
