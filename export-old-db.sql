-- ============================================================================
-- EXPORT OLD DATABASE (drbocrbecchxbzcfljol)
-- Run this entire file in OLD Supabase SQL Editor
-- Copy ALL output and save for importing to new DB
-- ============================================================================

-- Step 1: List all tables (for verification)
SELECT 'Tables found:' as info;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ============================================================================
-- SCHEMA EXPORT
-- ============================================================================

-- Get CREATE TABLE statements for all tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        RAISE NOTICE E'\n-- Table: %\n', r.tablename;
        EXECUTE format('
            SELECT pg_get_tabledef(oid)
            FROM pg_class
            WHERE relname = %L
            AND relnamespace = ''public''::regnamespace',
            r.tablename
        );
    END LOOP;
END $$;

-- ============================================================================
-- Alternative: Manual schema export (if above fails)
-- ============================================================================

-- Copy this output and run in new DB:
SELECT
    'CREATE TABLE ' || table_name || ' (' || E'\n' ||
    string_agg(
        '  ' || column_name || ' ' ||
        CASE
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
            WHEN data_type = 'ARRAY' THEN udt_name
            ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ',' || E'\n'
    ) || E'\n);' as create_statement
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- ============================================================================
-- INDEXES EXPORT
-- ============================================================================

SELECT
    indexdef || ';' as index_statement
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================================================
-- FOREIGN KEYS EXPORT
-- ============================================================================

SELECT
    'ALTER TABLE ' || tc.table_name ||
    ' ADD CONSTRAINT ' || tc.constraint_name ||
    ' FOREIGN KEY (' || kcu.column_name || ')' ||
    ' REFERENCES ' || ccu.table_name || '(' || ccu.column_name || ');' as fk_statement
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- ============================================================================
-- DATA EXPORT (INSERT statements)
-- ============================================================================

-- Export catalog_categories
SELECT 'INSERT INTO catalog_categories VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(category_id) || ',' ||
        quote_literal(name) || ',' ||
        COALESCE(quote_literal(parent_id), 'NULL') || ',' ||
        COALESCE(quote_literal(icon), 'NULL') || ',' ||
        COALESCE(quote_literal(color), 'NULL') || ',' ||
        quote_literal(applicable_types::text) || '::text[],' ||
        COALESCE(sort_order::text, 'NULL') || ',' ||
        is_active::text || ',' ||
        quote_literal(created_at) ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM catalog_categories;

-- Export catalog_items
SELECT 'INSERT INTO catalog_items VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(item_id) || ',' ||
        quote_literal(name) || ',' ||
        COALESCE(quote_literal(name_hi), 'NULL') || ',' ||
        COALESCE(quote_literal(name_gu), 'NULL') || ',' ||
        COALESCE(quote_literal(category_id), 'NULL') || ',' ||
        COALESCE(quote_literal(thumbnail_url), 'NULL') || ',' ||
        COALESCE(quote_literal(thumbnail_small), 'NULL') || ',' ||
        COALESCE(quote_literal(thumbnail_large), 'NULL') || ',' ||
        COALESCE(quote_literal(emoji), 'NULL') || ',' ||
        COALESCE(quote_literal(alt_text), 'NULL') || ',' ||
        quote_literal(unit) || ',' ||
        COALESCE(base_price::text, 'NULL') || ',' ||
        COALESCE(bulk_price::text, 'NULL') || ',' ||
        quote_literal(applicable_types::text) || '::text[],' ||
        COALESCE(quote_literal(tags::text), 'NULL') || '::text[],' ||
        popular::text || ',' ||
        seasonal::text || ',' ||
        COALESCE(bulk_threshold::text, 'NULL') || ',' ||
        COALESCE(max_quantity::text, 'NULL') || ',' ||
        quote_literal(created_at) || ',' ||
        quote_literal(updated_at) || ',' ||
        is_active::text || ',' ||
        COALESCE(sort_order::text, '0') ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM catalog_items;

-- Export nicknames_pool
SELECT 'INSERT INTO nicknames_pool VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(nickname) || ',' ||
        quote_literal(language) || ',' ||
        is_active::text || ',' ||
        quote_literal(created_at) ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM nicknames_pool;

-- Export sessions
SELECT 'INSERT INTO sessions VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(session_id) || ',' ||
        quote_literal(session_type) || ',' ||
        quote_literal(status) || ',' ||
        COALESCE(quote_literal(invite_code), 'NULL') || ',' ||
        COALESCE(quote_literal(constant_invite_id), 'NULL') || ',' ||
        quote_literal(location) || ',' ||
        quote_literal(scheduled_at) || ',' ||
        expected_participants || ',' ||
        participant_limit || ',' ||
        quote_literal(created_at) || ',' ||
        quote_literal(updated_at) || ',' ||
        COALESCE(quote_literal(completed_at), 'NULL') || ',' ||
        quote_literal(creator_nickname) || ',' ||
        COALESCE(quote_literal(creator_real_name), 'NULL') || ',' ||
        COALESCE(quote_literal(session_pin), 'NULL') || ',' ||
        COALESCE(quote_literal(items_confirmed_at), 'NULL') || ',' ||
        COALESCE(quote_literal(payment_confirmed_at), 'NULL') || ',' ||
        COALESCE(items_confirmed_count::text, '0') || ',' ||
        COALESCE(payment_confirmed_count::text, '0') ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM sessions
WHERE EXISTS (SELECT 1 FROM sessions);

-- Export participants
SELECT 'INSERT INTO participants VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(session_id) || ',' ||
        quote_literal(nickname) || ',' ||
        COALESCE(quote_literal(real_name), 'NULL') || ',' ||
        quote_literal(joined_at) || ',' ||
        COALESCE(quote_literal(last_active_at), 'NULL') || ',' ||
        COALESCE(quote_literal(timeout_at), 'NULL') ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM participants
WHERE EXISTS (SELECT 1 FROM participants);

-- Export items
SELECT 'INSERT INTO items VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(session_id) || ',' ||
        quote_literal(participant_id) || ',' ||
        quote_literal(item_id) || ',' ||
        quantity || ',' ||
        quote_literal(unit) || ',' ||
        COALESCE(quote_literal(notes), 'NULL') || ',' ||
        quote_literal(added_at) ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM items
WHERE EXISTS (SELECT 1 FROM items);

-- Export payments
SELECT 'INSERT INTO payments VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(session_id) || ',' ||
        quote_literal(participant_id) || ',' ||
        COALESCE(amount::text, 'NULL') || ',' ||
        COALESCE(quote_literal(payment_method), 'NULL') || ',' ||
        COALESCE(quote_literal(payment_notes), 'NULL') || ',' ||
        COALESCE(quote_literal(paid_at), 'NULL') || ',' ||
        COALESCE(skipped::text, 'false') || ',' ||
        COALESCE(quote_literal(skip_reason), 'NULL') ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM payments
WHERE EXISTS (SELECT 1 FROM payments);

-- Export invites
SELECT 'INSERT INTO invites VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(session_id) || ',' ||
        quote_literal(invite_code) || ',' ||
        quote_literal(invite_type) || ',' ||
        quote_literal(created_at) || ',' ||
        COALESCE(quote_literal(expires_at), 'NULL') || ',' ||
        COALESCE(max_uses::text, 'NULL') || ',' ||
        current_uses || ',' ||
        is_active::text ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM invites
WHERE EXISTS (SELECT 1 FROM invites);

-- Export bill_access_tokens
SELECT 'INSERT INTO bill_access_tokens VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(session_id) || ',' ||
        quote_literal(token) || ',' ||
        quote_literal(created_at) || ',' ||
        quote_literal(expires_at) || ',' ||
        COALESCE(quote_literal(accessed_at), 'NULL') || ',' ||
        access_count ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM bill_access_tokens
WHERE EXISTS (SELECT 1 FROM bill_access_tokens);

-- Export subscriptions (if exists)
SELECT 'INSERT INTO subscriptions VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id) || ',' ||
        quote_literal(session_id) || ',' ||
        quote_literal(subscriber_email) || ',' ||
        quote_literal(subscription_tier) || ',' ||
        quote_literal(status) || ',' ||
        quote_literal(subscribed_at) ||
        ')',
        ','
    ) || ' ON CONFLICT DO NOTHING;'
FROM subscriptions
WHERE EXISTS (SELECT 1 FROM subscriptions);

-- ============================================================================
-- VERIFICATION QUERY (run in both old and new after migration)
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM catalog_categories) as categories,
  (SELECT COUNT(*) FROM catalog_items) as catalog_items,
  (SELECT COUNT(*) FROM nicknames_pool) as nicknames,
  (SELECT COUNT(*) FROM sessions) as sessions,
  (SELECT COUNT(*) FROM participants) as participants,
  (SELECT COUNT(*) FROM items) as items,
  (SELECT COUNT(*) FROM payments) as payments,
  (SELECT COUNT(*) FROM invites) as invites,
  (SELECT COUNT(*) FROM bill_access_tokens) as bill_tokens;
