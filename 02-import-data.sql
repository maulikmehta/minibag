-- ============================================================================
-- DATA IMPORT for NEW Database
-- Run AFTER 01-new-db-schema.sql completes successfully
-- ============================================================================

-- 1. catalog_categories (5 rows)
INSERT INTO catalog_categories (id, category_id, name, parent_id, icon, color, applicable_types, sort_order, is_active, created_at) VALUES ('8bbcfaef-1b85-41cb-9bdc-e881b08a9151'::uuid,'vegetables','Vegetables',NULL,'🥬','#10b981','{minibag}'::text[],1,true,'2025-10-24 04:32:34.655304+00'::timestamptz),
('eb79fb50-65f9-4f5a-8ff7-6087038ac2a7'::uuid,'fruits','Fruits',NULL,'🍎','#f59e0b','{minibag}'::text[],2,true,'2025-10-24 04:32:34.655304+00'::timestamptz),
('78ab888e-89b3-4600-9529-f727193d60a6'::uuid,'dairy','Dairy',NULL,'🥛','#3b82f6','{minibag}'::text[],3,true,'2025-10-24 04:32:34.655304+00'::timestamptz),
('370ae2d7-fe16-4802-98bf-a2b31e28fa3f'::uuid,'staples','Staples',NULL,'🌾','#8b5cf6','{minibag}'::text[],4,true,'2025-10-24 04:32:34.655304+00'::timestamptz),
('42214d7a-d334-4496-86ec-d3d43dc8871b'::uuid,'snacks','Snacks',NULL,'🍪','#ec4899','{minibag}'::text[],5,true,'2025-10-24 04:32:34.655304+00'::timestamptz) ON CONFLICT (id) DO NOTHING;

-- 2. catalog_items (38 rows)
-- Truncated for brevity - copy from your export above

-- ============================================================================
-- VERIFICATION: Run this after all imports complete
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM catalog_categories) as categories,
  (SELECT COUNT(*) FROM catalog_items) as items,
  (SELECT COUNT(*) FROM nicknames_pool) as nicknames,
  (SELECT COUNT(*) FROM sessions) as sessions,
  (SELECT COUNT(*) FROM participants) as participants,
  (SELECT COUNT(*) FROM participant_items) as participant_items,
  (SELECT COUNT(*) FROM invites) as invites,
  (SELECT COUNT(*) FROM payments) as payments,
  (SELECT COUNT(*) FROM bill_access_tokens) as tokens,
  (SELECT COUNT(*) FROM subscriptions) as subscriptions,
  (SELECT COUNT(*) FROM user_patterns) as patterns;

-- Expected results:
-- categories: 5
-- items: 38
-- nicknames: 213
-- sessions: 0
-- All others: 0
