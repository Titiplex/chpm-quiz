type PrismaClientConstructor = new (options?: { datasourceUrl?: string }) => any

export function loadPrismaClient(): PrismaClientConstructor {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@prisma/client').PrismaClient as PrismaClientConstructor
  } catch (error) {
    if (process.env.VITEST || process.env.NODE_ENV === 'test') {
      return class PrismaClientTestFallback {} as PrismaClientConstructor
    }

    throw error
  }
}
