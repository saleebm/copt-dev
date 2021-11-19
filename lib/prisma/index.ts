import { PrismaClient } from '@prisma/client'

// Prevent multiple instances of Prisma Client in development
const globalAny: typeof globalThis & { prisma?: PrismaClient } = global

const prisma =
  globalAny.prisma ||
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'warn', emit: 'event' },
      { level: 'info', emit: 'event' },
      { level: 'error', emit: 'event' }
    ],
    errorFormat: 'pretty'
  })

if (process.env.NODE_ENV === 'development' && !globalAny.prisma) {
  // method to find time for querying
  // @ts-ignore
  prisma.$use(async (params, next) => {
    const before = Date.now()

    const result = await next(params)

    const after = Date.now()

    console.log(`Query ${params.model}.${params.action} took ${after - before}ms`)

    return result
  })

  process.on('exit', async _code => {
    if (globalAny.prisma) {
      await globalAny.prisma.$disconnect()
      globalAny.prisma = undefined
      console.log(`Prisma Client disconnected`)
    }
  })

  globalAny.prisma = prisma
}

export default prisma
