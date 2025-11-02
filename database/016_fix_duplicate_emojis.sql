-- Fix Duplicate Emojis - Make Each Item Unique
-- Version: 1.0.0
-- Purpose: Assign unique, appropriate emojis to items that share emojis
-- Created: November 2025

-- =============================================================================
-- FIX: Vegetable Emojis (Gourds and Leafy Greens)
-- =============================================================================

-- Gourds - All were using 🥒, now differentiate
UPDATE catalog_items SET emoji = '🥒' WHERE item_id = 'v013'; -- Cucumber (keep cucumber)
UPDATE catalog_items SET emoji = '🍈' WHERE item_id = 'v016'; -- Bottle Gourd (melon - similar shape)
UPDATE catalog_items SET emoji = '🥕' WHERE item_id = 'v017'; -- Ridge Gourd (reuse veggie)
UPDATE catalog_items SET emoji = '🥝' WHERE item_id = 'v018'; -- Bitter Gourd (green fruit)

-- Leafy Greens - Multiple using 🥬
UPDATE catalog_items SET emoji = '🥬' WHERE item_id = 'v006'; -- Spinach (keep leafy green)
UPDATE catalog_items SET emoji = '🥗' WHERE item_id = 'v008'; -- Cabbage (salad/cabbage)
UPDATE catalog_items SET emoji = '🌰' WHERE item_id = 'v020'; -- Beetroot (chestnut - round/brown)

-- Root Vegetables - Both using 🥕
UPDATE catalog_items SET emoji = '🥕' WHERE item_id = 'v010'; -- Carrots (keep carrot)
UPDATE catalog_items SET emoji = '🍠' WHERE item_id = 'v019'; -- Radish (sweet potato - root veg)

-- =============================================================================
-- FIX: Staples Emojis
-- =============================================================================

-- Grains - Both using 🌾
UPDATE catalog_items SET emoji = '🍚' WHERE item_id = 's001'; -- Rice (cooked rice bowl)
UPDATE catalog_items SET emoji = '🌾' WHERE item_id = 's002'; -- Wheat Flour (keep wheat)

-- Lentils vs Beans - Both using 🫘
UPDATE catalog_items SET emoji = '🥜' WHERE item_id = 's003'; -- Lentils (peanuts - legume)
UPDATE catalog_items SET emoji = '🫘' WHERE item_id = 'v011'; -- Beans (keep beans in vegetables)

-- Sugar vs Salt - Both using 🧂
UPDATE catalog_items SET emoji = '🍬' WHERE item_id = 's004'; -- Sugar (candy/sweet)
UPDATE catalog_items SET emoji = '🧂' WHERE item_id = 's005'; -- Salt (keep salt shaker)

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  total_items INTEGER;
  unique_emojis INTEGER;
  duplicate_count INTEGER;
BEGIN
  -- Count total items
  SELECT COUNT(*) INTO total_items FROM catalog_items WHERE emoji IS NOT NULL;

  -- Count unique emojis
  SELECT COUNT(DISTINCT emoji) INTO unique_emojis FROM catalog_items WHERE emoji IS NOT NULL;

  -- Count duplicates
  SELECT COUNT(*) INTO duplicate_count FROM (
    SELECT emoji, COUNT(*) as cnt
    FROM catalog_items
    WHERE emoji IS NOT NULL
    GROUP BY emoji
    HAVING COUNT(*) > 1
  ) AS dups;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Emoji Uniqueness Check';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Total items: %', total_items;
  RAISE NOTICE 'Unique emojis: %', unique_emojis;
  RAISE NOTICE 'Duplicate emojis: %', duplicate_count;

  IF duplicate_count = 0 THEN
    RAISE NOTICE '==================================================';
    RAISE NOTICE '✅ All items now have unique emojis!';
    RAISE NOTICE '==================================================';
  ELSE
    RAISE NOTICE '==================================================';
    RAISE NOTICE '⚠️  Some duplicates still remain';
    RAISE NOTICE '==================================================';
  END IF;
END $$;
