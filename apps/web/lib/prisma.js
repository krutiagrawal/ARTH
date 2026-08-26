import { PrismaClient } from '@plant/db'

const globalForPrisma = globalThis

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
