-- Replace Thumbnail Images with Emojis for Performance
-- Version: 1.0.0
-- Purpose: Remove external image URLs and use emojis exclusively for better performance
-- Created: November 2025

-- =============================================================================
-- PERFORMANCE OPTIMIZATION: Remove Thumbnail URLs
-- =============================================================================

-- Clear all thumbnail URLs to force the app to use emojis instead of loading external images
UPDATE catalog_items SET thumbnail_url = NULL;

-- Verification: Show items that will now use emojis
DO $$
DECLARE
  item_count INTEGER;
  veggie_count INTEGER;
  fruit_count INTEGER;
  dairy_count INTEGER;
  staples_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO item_count FROM catalog_items WHERE emoji IS NOT NULL;

  SELECT COUNT(*) INTO veggie_count
  FROM catalog_items ci
  JOIN catalog_categories cc ON ci.category_id = cc.id
  WHERE cc.category_id = 'vegetables' AND ci.emoji IS NOT NULL;

  SELECT COUNT(*) INTO fruit_count
  FROM catalog_items ci
  JOIN catalog_categories cc ON ci.category_id = cc.id
  WHERE cc.category_id = 'fruits' AND ci.emoji IS NOT NULL;

  SELECT COUNT(*) INTO dairy_count
  FROM catalog_items ci
  JOIN catalog_categories cc ON ci.category_id = cc.id
  WHERE cc.category_id = 'dairy' AND ci.emoji IS NOT NULL;

  SELECT COUNT(*) INTO staples_count
  FROM catalog_items ci
  JOIN catalog_categories cc ON ci.category_id = cc.id
  WHERE cc.category_id = 'staples' AND ci.emoji IS NOT NULL;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Image to Emoji Migration Complete';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Total items using emojis: %', item_count;
  RAISE NOTICE '  - Vegetables: % items', veggie_count;
  RAISE NOTICE '  - Fruits: % items', fruit_count;
  RAISE NOTICE '  - Dairy: % items', dairy_count;
  RAISE NOTICE '  - Staples: % items', staples_count;
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Performance improved: No external image loading required';
  RAISE NOTICE '==================================================';
END $$;
