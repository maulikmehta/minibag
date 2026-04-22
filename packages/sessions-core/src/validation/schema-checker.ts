/**
 * Schema Compatibility Checker
 * Prevents Issue #1: Schema Mismatch
 * Validates database schema matches SDK expectations
 */

import { getDatabaseClient } from '../database/client.js';

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface SchemaRequirements {
  table: string;
  required_columns: string[];
  forbidden_columns: string[]; // Columns that should NOT exist (deprecated)
}

const SCHEMA_REQUIREMENTS: SchemaRequirements[] = [
  {
    table: 'participants',
    required_columns: [
      'id',
      'session_id',
      'nickname',
      'avatar_emoji',
      'marked_not_coming',
      'left_at', // ✅ Must have left_at
      'joined_at',
    ],
    forbidden_columns: [
      'timed_out_at', // ❌ Deprecated column
    ],
  },
  {
    table: 'nicknames_pool',
    required_columns: [
      'id',
      'nickname',
      'avatar_emoji',
      'is_available', // ✅ Must have is_available
      'currently_used_in',
      'reserved_until',
    ],
    forbidden_columns: [
      'released_at', // ❌ Deprecated column
    ],
  },
  {
    table: 'sessions',
    required_columns: [
      'id',
      'session_id',
      'status',
      'expected_participants',
      'max_participants',
      'checkpoint_complete',
      'created_at',
    ],
    forbidden_columns: [],
  },
  {
    table: 'invites',
    required_columns: [
      'id',
      'session_id',
      'invite_token',
      'status',
      'invite_type',
    ],
    forbidden_columns: [],
  },
];

/**
 * Get actual database schema for a table
 */
async function getTableSchema(tableName: string): Promise<ColumnInfo[]> {
  const prisma = getDatabaseClient();

  const columns = await prisma.$queryRaw<ColumnInfo[]>`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = ${tableName}
    AND table_schema = 'public'
    ORDER BY ordinal_position
  `;

  return columns;
}

/**
 * Validate a single table's schema
 */
async function validateTableSchema(requirement: SchemaRequirements): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const actualColumns = await getTableSchema(requirement.table);
    const actualColumnNames = actualColumns.map(c => c.column_name);

    // Check for missing required columns
    for (const requiredCol of requirement.required_columns) {
      if (!actualColumnNames.includes(requiredCol)) {
        errors.push(
          `❌ Missing required column: ${requirement.table}.${requiredCol}\n` +
          `   Run: npx prisma migrate dev`
        );
      }
    }

    // Check for forbidden deprecated columns
    for (const forbiddenCol of requirement.forbidden_columns) {
      if (actualColumnNames.includes(forbiddenCol)) {
        errors.push(
          `❌ Deprecated column found: ${requirement.table}.${forbiddenCol}\n` +
          `   This column is no longer used by Sessions SDK.\n` +
          `   Please update your schema to match the latest Prisma schema.`
        );
      }
    }

  } catch (error) {
    const err = error as Error;
    errors.push(
      `❌ Table not found: ${requirement.table}\n` +
      `   Error: ${err.message}\n` +
      `   Run: npx prisma migrate dev`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Check schema compatibility for all required tables
 */
export async function checkSchemaCompatibility(): Promise<{
  compatible: boolean;
  errors: string[];
  warnings: string[];
}> {
  console.log('🔍 Checking database schema compatibility...');

  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const requirement of SCHEMA_REQUIREMENTS) {
    const result = await validateTableSchema(requirement);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  const compatible = allErrors.length === 0;

  if (compatible) {
    console.log('✅ Database schema is compatible with Sessions SDK');
  } else {
    console.error('\n❌ Database schema compatibility check FAILED:\n');
    allErrors.forEach(err => console.error(err + '\n'));
  }

  if (allWarnings.length > 0) {
    console.warn('\n⚠️  Schema warnings:\n');
    allWarnings.forEach(warn => console.warn(warn + '\n'));
  }

  return {
    compatible,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Validate schema and throw if incompatible
 * Use this during dashboard mount to prevent runtime errors
 */
export async function validateSchemaOrThrow(): Promise<void> {
  const result = await checkSchemaCompatibility();

  if (!result.compatible) {
    throw new Error(
      '❌ Database schema is incompatible with Sessions SDK!\n\n' +
      result.errors.join('\n\n') +
      '\n\n' +
      '📋 To fix:\n' +
      '1. Check your Prisma schema matches Sessions SDK schema\n' +
      '2. Run: npx prisma migrate dev\n' +
      '3. Restart your server\n\n' +
      'See: https://sessions-sdk.dev/docs/schema-compatibility'
    );
  }
}

/**
 * Get detailed schema diff for debugging
 */
export async function getSchemaReport(): Promise<string> {
  const lines: string[] = [];
  lines.push('='.repeat(60));
  lines.push('SESSIONS SDK - DATABASE SCHEMA REPORT');
  lines.push('='.repeat(60));
  lines.push('');

  for (const requirement of SCHEMA_REQUIREMENTS) {
    const columns = await getTableSchema(requirement.table);

    lines.push(`Table: ${requirement.table}`);
    lines.push('-'.repeat(60));
    lines.push('Columns:');
    columns.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      lines.push(`  - ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${nullable}`);
    });
    lines.push('');
  }

  lines.push('='.repeat(60));
  return lines.join('\n');
}
