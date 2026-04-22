/**
 * Database Configuration Validator
 * Prevents Issue #2: Database Configuration Confusion
 */

import { z } from 'zod';
import { DatabaseConfigSchema, type DatabaseConfig } from '../schemas/index.js';

/**
 * Parse DATABASE_URL and validate configuration
 */
export function parseDatabaseURL(databaseURL: string): DatabaseConfig {
  if (!databaseURL) {
    throw new Error(
      '❌ DATABASE_URL not found!\n\n' +
      'Sessions SDK requires a PostgreSQL database.\n' +
      'Add to your .env file:\n' +
      '  DATABASE_URL="postgresql://user:password@localhost:5432/sessions_test"\n\n' +
      'See: https://sessions-sdk.dev/docs/database-setup'
    );
  }

  let url: URL;
  try {
    url = new URL(databaseURL);
  } catch (error) {
    throw new Error(
      `❌ Invalid DATABASE_URL format!\n\n` +
      `Provided: ${databaseURL}\n` +
      `Expected: postgresql://user:password@host:port/database\n\n` +
      `Example: postgresql://postgres@localhost:5432/sessions_test`
    );
  }

  const protocol = url.protocol.replace(':', '');
  if (protocol !== 'postgresql' && protocol !== 'postgres') {
    throw new Error(
      `❌ Invalid database protocol: ${protocol}\n\n` +
      `Sessions SDK only supports PostgreSQL.\n` +
      `Your DATABASE_URL: ${databaseURL}\n` +
      `Expected protocol: postgresql:// or postgres://`
    );
  }

  const host = url.hostname;
  const port = parseInt(url.port || '5432', 10);
  const database = url.pathname.replace('/', '');
  const username = url.username || 'postgres';
  const password = url.password || '';

  const isLocal = host === 'localhost' || host === '127.0.0.1';
  const isSupabase = host.includes('supabase.co') || host.includes('supabase.com');

  const config: DatabaseConfig = {
    url: databaseURL,
    protocol: protocol as 'postgresql' | 'postgres',
    host,
    port,
    database,
    username,
    password,
    isLocal,
    isSupabase,
  };

  // Validate with Zod
  return DatabaseConfigSchema.parse(config);
}

/**
 * Validate database configuration for Sessions SDK
 * Throws helpful errors for common misconfigurations
 */
export function validateDatabaseConfig(databaseURL?: string): DatabaseConfig {
  const url = databaseURL || process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      '❌ DATABASE_URL environment variable not set!\n\n' +
      'Sessions SDK requires a dedicated PostgreSQL database.\n\n' +
      '📋 Quick Setup:\n' +
      '1. Install PostgreSQL (postgres.app or brew install postgresql)\n' +
      '2. Create database: createdb sessions_test\n' +
      '3. Add to .env:\n' +
      '   DATABASE_URL="postgresql://postgres@localhost:5432/sessions_test"\n' +
      '4. Run migrations: npx prisma migrate dev\n\n' +
      'See: https://sessions-sdk.dev/docs/database-setup'
    );
  }

  const config = parseDatabaseURL(url);

  // ⚠️ Warn if using Supabase (common mistake)
  if (config.isSupabase) {
    console.warn(
      '\n⚠️  WARNING: DATABASE_URL points to Supabase!\n\n' +
      'Sessions SDK requires a LOCAL PostgreSQL database for its own schema.\n' +
      'Your app can still use Supabase for other data.\n\n' +
      'Current DATABASE_URL: ' + config.host + '\n' +
      'Expected: localhost or 127.0.0.1\n\n' +
      '🔧 Fix:\n' +
      '1. Install PostgreSQL locally (postgres.app)\n' +
      '2. Update DATABASE_URL:\n' +
      '   DATABASE_URL="postgresql://postgres@localhost:5432/sessions_test"\n' +
      '3. Run: npx prisma migrate dev\n'
    );
  }

  // ✅ Success message for local PostgreSQL
  if (config.isLocal) {
    console.log(`✅ Database config validated: ${config.database} @ ${config.host}:${config.port}`);
  }

  return config;
}

/**
 * Check if database is accessible
 */
export async function checkDatabaseConnection(prisma: any): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    const err = error as Error;
    throw new Error(
      `❌ Database connection failed!\n\n` +
      `Error: ${err.message}\n\n` +
      `Troubleshooting:\n` +
      `1. Is PostgreSQL running? (check with: pg_isready)\n` +
      `2. Does the database exist? (check with: psql -l)\n` +
      `3. Are credentials correct in DATABASE_URL?\n` +
      `4. Did you run migrations? (npx prisma migrate dev)\n\n` +
      `DATABASE_URL: ${process.env.DATABASE_URL}`
    );
  }
}
