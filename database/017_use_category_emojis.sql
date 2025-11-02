-- Use Single Emoji Per Category
-- Version: 1.0.0
-- Purpose: Simplify by using one consistent emoji per category
-- Created: November 2025

-- =============================================================================
-- SET: Category-Based Emojis
-- This makes it easier to add new items without finding unique emojis
-- =============================================================================

-- Vegetables - All use 🥬 (leafy green)
UPDATE catalog_items
SET emoji = '🥬'
WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'vegetables');

-- Fruits - All use 🍎 (apple)
UPDATE catalog_items
SET emoji = '🍎'
WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'fruits');

-- Dairy - All use 🥛 (milk)
UPDATE catalog_items
SET emoji = '🥛'
WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'dairy');

-- Staples - All use 🌾 (wheat)
UPDATE catalog_items
SET emoji = '🌾'
WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'staples');

-- Snacks - All use 🍪 (cookie)
UPDATE catalog_items
SET emoji = '🍪'
WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'snacks');

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  veg_emoji TEXT;
  fruit_emoji TEXT;
  dairy_emoji TEXT;
  staples_emoji TEXT;
  snacks_emoji TEXT;
  veg_count INTEGER;
  fruit_count INTEGER;
  dairy_count INTEGER;
  staples_count INTEGER;
BEGIN
  -- Get distinct emojis per category
  SELECT DISTINCT emoji INTO veg_emoji FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'vegetables');
  SELECT DISTINCT emoji INTO fruit_emoji FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'fruits');
  SELECT DISTINCT emoji INTO dairy_emoji FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'dairy');
  SELECT DISTINCT emoji INTO staples_emoji FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'staples');
  SELECT DISTINCT emoji INTO snacks_emoji FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'snacks');

  -- Count items per category
  SELECT COUNT(*) INTO veg_count FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'vegetables');
  SELECT COUNT(*) INTO fruit_count FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'fruits');
  SELECT COUNT(*) INTO dairy_count FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'dairy');
  SELECT COUNT(*) INTO staples_count FROM catalog_items WHERE category_id = (SELECT id FROM catalog_categories WHERE category_id = 'staples');

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Category-Based Emojis Applied';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Vegetables:  % (% items)', veg_emoji, veg_count;
  RAISE NOTICE 'Fruits:      % (% items)', fruit_emoji, fruit_count;
  RAISE NOTICE 'Dairy:       % (% items)', dairy_emoji, dairy_count;
  RAISE NOTICE 'Staples:     % (% items)', staples_emoji, staples_count;
  RAISE NOTICE '==================================================';
  RAISE NOTICE '✅ All items now use category emoji';
  RAISE NOTICE '✅ Easy to add new items - just use category emoji';
  RAISE NOTICE '==================================================';
END $$;
