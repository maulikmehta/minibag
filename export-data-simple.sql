-- ============================================================================
-- DATA EXPORT - Run in OLD Supabase (drbocrbecchxbzcfljol)
-- Copy each result and run in NEW database
-- ============================================================================

-- NOTE: Run these ONE AT A TIME, copy output after each

-- ============================================================================
-- 1. Export catalog_categories
-- ============================================================================

SELECT 'INSERT INTO catalog_categories (id, category_id, name, parent_id, icon, color, applicable_types, sort_order, is_active, created_at) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(category_id) || ',' ||
        quote_literal(name) || ',' ||
        COALESCE(quote_literal(parent_id::text) || '::uuid', 'NULL') || ',' ||
        COALESCE(quote_literal(icon), 'NULL') || ',' ||
        COALESCE(quote_literal(color), 'NULL') || ',' ||
        '''' || applicable_types::text || '''::text[],' ||
        COALESCE(sort_order::text, '0') || ',' ||
        is_active::text || ',' ||
        quote_literal(created_at::text) || '::timestamptz' ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM catalog_categories;

-- ============================================================================
-- 2. Export catalog_items
-- ============================================================================

SELECT 'INSERT INTO catalog_items (id, item_id, name, name_hi, name_gu, category_id, thumbnail_url, thumbnail_small, thumbnail_large, emoji, alt_text, unit, base_price, bulk_price, applicable_types, tags, popular, seasonal, bulk_threshold, max_quantity, created_at, updated_at, is_active, sort_order) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(item_id) || ',' ||
        quote_literal(name) || ',' ||
        COALESCE(quote_literal(name_hi), 'NULL') || ',' ||
        COALESCE(quote_literal(name_gu), 'NULL') || ',' ||
        COALESCE(quote_literal(category_id::text) || '::uuid', 'NULL') || ',' ||
        COALESCE(quote_literal(thumbnail_url), 'NULL') || ',' ||
        COALESCE(quote_literal(thumbnail_small), 'NULL') || ',' ||
        COALESCE(quote_literal(thumbnail_large), 'NULL') || ',' ||
        COALESCE(quote_literal(emoji), 'NULL') || ',' ||
        COALESCE(quote_literal(alt_text), 'NULL') || ',' ||
        quote_literal(unit) || ',' ||
        COALESCE(base_price::text, 'NULL') || ',' ||
        COALESCE(bulk_price::text, 'NULL') || ',' ||
        '''' || applicable_types::text || '''::text[],' ||
        COALESCE('''' || tags::text || '''::text[]', 'NULL') || ',' ||
        popular::text || ',' ||
        seasonal::text || ',' ||
        COALESCE(bulk_threshold::text, 'NULL') || ',' ||
        COALESCE(max_quantity::text, 'NULL') || ',' ||
        quote_literal(created_at::text) || '::timestamptz,' ||
        quote_literal(updated_at::text) || '::timestamptz,' ||
        is_active::text || ',' ||
        COALESCE(sort_order::text, '0') ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM catalog_items;

-- ============================================================================
-- 3. Export nicknames_pool
-- ============================================================================

SELECT 'INSERT INTO nicknames_pool (id, nickname, language, is_active, created_at) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(nickname) || ',' ||
        quote_literal(language) || ',' ||
        is_active::text || ',' ||
        quote_literal(created_at::text) || '::timestamptz' ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM nicknames_pool;

-- ============================================================================
-- 4. Export sessions (only if you have session data)
-- ============================================================================

-- First check if you have any sessions
SELECT COUNT(*) as session_count FROM sessions;

-- If count > 0, run this:
SELECT 'INSERT INTO sessions (id, session_id, session_type, status, invite_code, constant_invite_id, location, scheduled_at, expected_participants, participant_limit, created_at, updated_at, completed_at, creator_nickname, creator_real_name, session_pin, items_confirmed_at, payment_confirmed_at, items_confirmed_count, payment_confirmed_count) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(session_id) || ',' ||
        quote_literal(session_type) || ',' ||
        quote_literal(status) || ',' ||
        COALESCE(quote_literal(invite_code), 'NULL') || ',' ||
        COALESCE(quote_literal(constant_invite_id), 'NULL') || ',' ||
        quote_literal(location) || ',' ||
        quote_literal(scheduled_at::text) || '::timestamptz,' ||
        expected_participants::text || ',' ||
        participant_limit::text || ',' ||
        quote_literal(created_at::text) || '::timestamptz,' ||
        quote_literal(updated_at::text) || '::timestamptz,' ||
        COALESCE(quote_literal(completed_at::text) || '::timestamptz', 'NULL') || ',' ||
        quote_literal(creator_nickname) || ',' ||
        COALESCE(quote_literal(creator_real_name), 'NULL') || ',' ||
        COALESCE(quote_literal(session_pin), 'NULL') || ',' ||
        COALESCE(quote_literal(items_confirmed_at::text) || '::timestamptz', 'NULL') || ',' ||
        COALESCE(quote_literal(payment_confirmed_at::text) || '::timestamptz', 'NULL') || ',' ||
        COALESCE(items_confirmed_count::text, '0') || ',' ||
        COALESCE(payment_confirmed_count::text, '0') ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM sessions;

-- ============================================================================
-- 5. Export participants (only if you have session data)
-- ============================================================================

-- Check count first
SELECT COUNT(*) as participant_count FROM participants;

-- If count > 0, run this:
SELECT 'INSERT INTO participants (id, session_id, nickname, real_name, joined_at, last_active_at, timeout_at) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(session_id::text) || '::uuid,' ||
        quote_literal(nickname) || ',' ||
        COALESCE(quote_literal(real_name), 'NULL') || ',' ||
        quote_literal(joined_at::text) || '::timestamptz,' ||
        COALESCE(quote_literal(last_active_at::text) || '::timestamptz', 'NULL') || ',' ||
        COALESCE(quote_literal(timeout_at::text) || '::timestamptz', 'NULL') ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM participants;

-- ============================================================================
-- 6. Export items (only if you have session data)
-- ============================================================================

-- Check count first
SELECT COUNT(*) as item_count FROM items;

-- If count > 0, run this:
SELECT 'INSERT INTO items (id, session_id, participant_id, item_id, quantity, unit, notes, added_at) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(session_id::text) || '::uuid,' ||
        quote_literal(participant_id::text) || '::uuid,' ||
        quote_literal(item_id) || ',' ||
        quantity::text || ',' ||
        quote_literal(unit) || ',' ||
        COALESCE(quote_literal(notes), 'NULL') || ',' ||
        quote_literal(added_at::text) || '::timestamptz' ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM items;

-- ============================================================================
-- 7. Export payments (only if exists)
-- ============================================================================

-- Check if table exists first
SELECT COUNT(*) as payment_count FROM payments;

-- If count > 0, run this:
SELECT 'INSERT INTO payments (id, session_id, participant_id, amount, payment_method, payment_notes, paid_at, skipped, skip_reason) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(session_id::text) || '::uuid,' ||
        quote_literal(participant_id::text) || '::uuid,' ||
        COALESCE(amount::text, 'NULL') || ',' ||
        COALESCE(quote_literal(payment_method), 'NULL') || ',' ||
        COALESCE(quote_literal(payment_notes), 'NULL') || ',' ||
        COALESCE(quote_literal(paid_at::text) || '::timestamptz', 'NULL') || ',' ||
        COALESCE(skipped::text, 'false') || ',' ||
        COALESCE(quote_literal(skip_reason), 'NULL') ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM payments;

-- ============================================================================
-- 8. Export invites (only if exists)
-- ============================================================================

SELECT COUNT(*) as invite_count FROM invites;

-- If count > 0:
SELECT 'INSERT INTO invites (id, session_id, invite_code, invite_type, created_at, expires_at, max_uses, current_uses, is_active) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(session_id::text) || '::uuid,' ||
        quote_literal(invite_code) || ',' ||
        quote_literal(invite_type) || ',' ||
        quote_literal(created_at::text) || '::timestamptz,' ||
        COALESCE(quote_literal(expires_at::text) || '::timestamptz', 'NULL') || ',' ||
        COALESCE(max_uses::text, 'NULL') || ',' ||
        current_uses::text || ',' ||
        is_active::text ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM invites;

-- ============================================================================
-- 9. Export bill_access_tokens (only if exists)
-- ============================================================================

SELECT COUNT(*) as token_count FROM bill_access_tokens;

-- If count > 0:
SELECT 'INSERT INTO bill_access_tokens (id, session_id, token, created_at, expires_at, accessed_at, access_count) VALUES ' ||
    string_agg(
        '(' ||
        quote_literal(id::text) || '::uuid,' ||
        quote_literal(session_id::text) || '::uuid,' ||
        quote_literal(token) || ',' ||
        quote_literal(created_at::text) || '::timestamptz,' ||
        quote_literal(expires_at::text) || '::timestamptz,' ||
        COALESCE(quote_literal(accessed_at::text) || '::timestamptz', 'NULL') || ',' ||
        access_count::text ||
        ')',
        ',' || E'\n'
    ) || ' ON CONFLICT (id) DO NOTHING;' as insert_statement
FROM bill_access_tokens;

-- ============================================================================
-- VERIFICATION: Run in BOTH old and new after import
-- ============================================================================

SELECT
  'catalog_categories' as table_name, COUNT(*) as row_count FROM catalog_categories
UNION ALL
SELECT 'catalog_items', COUNT(*) FROM catalog_items
UNION ALL
SELECT 'nicknames_pool', COUNT(*) FROM nicknames_pool
UNION ALL
SELECT 'sessions', COUNT(*) FROM sessions
UNION ALL
SELECT 'participants', COUNT(*) FROM participants
UNION ALL
SELECT 'items', COUNT(*) FROM items
UNION ALL
SELECT 'payments', COUNT(*) FROM payments
UNION ALL
SELECT 'invites', COUNT(*) FROM invites
UNION ALL
SELECT 'bill_access_tokens', COUNT(*) FROM bill_access_tokens
ORDER BY table_name;
