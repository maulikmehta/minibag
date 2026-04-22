/**
 * Database Client for Sessions SDK
 * Using Prisma for type-safe database access
 */

import { PrismaClient } from '@prisma/client';

// Singleton instance to prevent multiple connections
let prisma: PrismaClient | null = null;

export function getDatabaseClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export { PrismaClient };
