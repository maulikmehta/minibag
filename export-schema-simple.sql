-- ============================================================================
-- SIMPLE SCHEMA EXPORT - Works in all PostgreSQL versions
-- Run in OLD Supabase (drbocrbecchxbzcfljol) SQL Editor
-- Copy output manually for each section
-- ============================================================================

-- Step 1: List all tables
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- Step 2: Get complete CREATE TABLE statements
-- ============================================================================

-- Copy this entire result and save it
SELECT
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' || E'\n  ' ||
    string_agg(
        column_name || ' ' ||
        CASE
            WHEN data_type = 'character varying' THEN 'VARCHAR' || COALESCE('(' || character_maximum_length || ')', '')
            WHEN data_type = 'character' THEN 'CHAR' || COALESCE('(' || character_maximum_length || ')', '')
            WHEN data_type = 'numeric' THEN 'NUMERIC' || COALESCE('(' || numeric_precision || ',' || numeric_scale || ')', '')
            WHEN data_type = 'ARRAY' THEN
                CASE
                    WHEN udt_name = '_text' THEN 'TEXT[]'
                    WHEN udt_name = '_varchar' THEN 'VARCHAR[]'
                    WHEN udt_name = '_int4' THEN 'INTEGER[]'
                    WHEN udt_name = '_uuid' THEN 'UUID[]'
                    ELSE udt_name
                END
            WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE
            WHEN column_default IS NOT NULL THEN
                ' DEFAULT ' ||
                CASE
                    WHEN column_default LIKE 'nextval%' THEN column_default
                    WHEN column_default = 'now()' THEN 'now()'
                    WHEN column_default LIKE 'uuid_%' THEN column_default
                    ELSE column_default
                END
            ELSE ''
        END,
        ',' || E'\n  '
        ORDER BY ordinal_position
    ) || E'\n);' || E'\n' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- ============================================================================
-- Step 3: Get all PRIMARY KEY constraints
-- ============================================================================

SELECT
    'ALTER TABLE ' || tc.table_name ||
    ' ADD PRIMARY KEY (' || string_agg(kcu.column_name, ', ') || ');'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name
ORDER BY tc.table_name;

-- ============================================================================
-- Step 4: Get all UNIQUE constraints
-- ============================================================================

SELECT
    'ALTER TABLE ' || tc.table_name ||
    ' ADD CONSTRAINT ' || tc.constraint_name ||
    ' UNIQUE (' || string_agg(kcu.column_name, ', ') || ');'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
GROUP BY tc.table_name, tc.constraint_name
ORDER BY tc.table_name;

-- ============================================================================
-- Step 5: Get all FOREIGN KEY constraints
-- ============================================================================

SELECT
    'ALTER TABLE ' || tc.table_name ||
    ' ADD CONSTRAINT ' || tc.constraint_name ||
    ' FOREIGN KEY (' || kcu.column_name || ')' ||
    ' REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ')' ||
    CASE
        WHEN rc.delete_rule != 'NO ACTION' THEN ' ON DELETE ' || rc.delete_rule
        ELSE ''
    END ||
    ';'
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
    AND rc.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- Step 6: Get all INDEXES
-- ============================================================================

SELECT indexdef || ';'
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname NOT LIKE '%_pkey'  -- Skip primary key indexes
ORDER BY tablename, indexname;

-- ============================================================================
-- Step 7: Enable extensions (run first in NEW database)
-- ============================================================================

SELECT 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";' as extension_statement;
