-- LocalLoops Seed Data
-- Version: 1.0.0
-- Purpose: Initial data for nicknames pool and Minibag catalog
-- Created: October 2025

-- =============================================================================
-- SEED: Nicknames Pool
-- Purpose: Anonymous, fun nicknames for participants
-- =============================================================================

INSERT INTO nicknames_pool (nickname, avatar_emoji, gender, language_origin, difficulty_level) VALUES
-- Hindi/Indian Names - Male (3 letters, common recognizable names)
('Raj', '👑', 'male', 'hindi', 'easy'),
('Avi', '⚡', 'male', 'hindi', 'easy'),
('Tej', '🌟', 'male', 'hindi', 'easy'),
('Ved', '🏹', 'male', 'hindi', 'easy'),
('Jai', '🎯', 'male', 'hindi', 'easy'),
('Adi', '☀️', 'male', 'hindi', 'easy'),
('Dev', '🦁', 'male', 'hindi', 'easy'),
('Sam', '🌊', 'male', 'hindi', 'easy'),
('Sid', '🚀', 'male', 'hindi', 'easy'),
('Vik', '🎨', 'male', 'hindi', 'easy'),
('Om', '🕉️', 'male', 'hindi', 'easy'),
('Yug', '🏆', 'male', 'hindi', 'easy'),
('Nav', '⛵', 'male', 'hindi', 'easy'),
('Arv', '🌳', 'male', 'hindi', 'easy'),
('Mir', '⭐', 'male', 'hindi', 'easy'),

-- Hindi/Indian Names - Female (3 letters, common recognizable names)
('Ria', '🌸', 'female', 'hindi', 'easy'),
('Anu', '🦋', 'female', 'hindi', 'easy'),
('Sia', '💫', 'female', 'hindi', 'easy'),
('Ira', '🌺', 'female', 'hindi', 'easy'),
('Pia', '🌼', 'female', 'hindi', 'easy'),
('Mia', '🎵', 'female', 'hindi', 'easy'),
('Iva', '✨', 'female', 'hindi', 'easy'),
('Uma', '💝', 'female', 'hindi', 'easy'),
('Niv', '🌙', 'female', 'hindi', 'easy'),
('Dia', '💎', 'female', 'hindi', 'easy'),
('Eva', '🌿', 'female', 'hindi', 'easy'),
('Ruh', '🕊️', 'female', 'hindi', 'easy'),
('Ara', '🦢', 'female', 'hindi', 'easy'),
('Diy', '🪔', 'female', 'hindi', 'easy'),
('Jia', '❤️', 'female', 'hindi', 'easy'),

-- Gujarati Names - Male (3 letters)
('Jay', '🎯', 'male', 'gujarati', 'easy'),
('Het', '🔥', 'male', 'gujarati', 'easy'),
('Mit', '🤝', 'male', 'gujarati', 'easy'),
('Vir', '🦁', 'male', 'gujarati', 'easy'),
('Nay', '💡', 'male', 'gujarati', 'easy'),
('Ruj', '🌺', 'male', 'gujarati', 'easy'),
('Pax', '☮️', 'male', 'gujarati', 'easy'),

-- Gujarati Names - Female (3 letters)
('Rit', '🍂', 'female', 'gujarati', 'easy'),
('Neh', '💕', 'female', 'gujarati', 'easy'),
('Sar', '🌊', 'female', 'gujarati', 'easy'),
('Tia', '👑', 'female', 'gujarati', 'easy'),
('Vya', '📖', 'female', 'gujarati', 'easy'),
('Hir', '💎', 'female', 'gujarati', 'easy'),
('Kal', '🎭', 'female', 'gujarati', 'easy'),

-- Neutral/Simple Names (3 letters, easy to write)
('Ayu', '😄', 'neutral', 'hindi', 'easy'),
('Ish', '🌟', 'neutral', 'hindi', 'easy'),
('Ore', '🍀', 'neutral', 'english', 'easy'),
('Ace', '⭐', 'neutral', 'english', 'easy'),
('Max', '🌞', 'neutral', 'english', 'easy'),
('Leo', '🦁', 'neutral', 'english', 'easy'),
('Rex', '🐕', 'neutral', 'english', 'easy'),
('Kai', '🌊', 'neutral', 'english', 'easy'),
('Sky', '☁️', 'neutral', 'english', 'easy'),
('Zen', '🧘', 'neutral', 'english', 'easy'),
('Fox', '🦊', 'neutral', 'english', 'easy'),
('Ash', '🌋', 'neutral', 'english', 'easy'),
('Rio', '🏖️', 'neutral', 'english', 'easy'),
('Zed', '⚡', 'neutral', 'english', 'easy'),
('Eli', '🌳', 'neutral', 'english', 'easy');

-- =============================================================================
-- SEED: Catalog Categories (Minibag)
-- Purpose: Vegetable and grocery categories
-- =============================================================================

INSERT INTO catalog_categories (category_id, name, icon, color, applicable_types, sort_order) VALUES
('vegetables', 'Vegetables', '🥬', '#10b981', ARRAY['minibag'], 1),
('fruits', 'Fruits', '🍎', '#f59e0b', ARRAY['minibag'], 2),
('dairy', 'Dairy', '🥛', '#3b82f6', ARRAY['minibag'], 3),
('staples', 'Staples', '🌾', '#8b5cf6', ARRAY['minibag'], 4),
('snacks', 'Snacks', '🍪', '#ec4899', ARRAY['minibag'], 5);

-- =============================================================================
-- SEED: Catalog Items (Minibag - Vegetables)
-- Purpose: Common vegetables with pricing
-- =============================================================================

INSERT INTO catalog_items (
  item_id, name, name_hi, name_gu, category_id, emoji, unit,
  base_price, bulk_price, bulk_threshold, applicable_types, popular, sort_order
)
SELECT
  item_id, name, name_hi, name_gu,
  (SELECT id FROM catalog_categories WHERE category_id = 'vegetables'),
  emoji, unit, base_price, bulk_price, bulk_threshold,
  ARRAY['minibag'], popular, sort_order
FROM (VALUES
  -- Common Vegetables
  ('v001', 'Tomatoes', 'टमाटर', 'ટામેટાં', '🍅', 'kg', 40, 35, 5, true, 1),
  ('v002', 'Potatoes', 'आलू', 'બટાકા', '🥔', 'kg', 30, 25, 10, true, 2),
  ('v003', 'Onions', 'प्याज', 'ડુંગળી', '🧅', 'kg', 35, 30, 5, true, 3),
  ('v004', 'Green Chili', 'हरी मिर्च', 'લીલા મરચાં', '🌶️', 'kg', 60, 50, 2, true, 4),
  ('v005', 'Coriander', 'धनिया', 'કોથમીર', '🌿', 'bunch', 20, 15, 5, true, 5),

  -- Leafy Greens
  ('v006', 'Spinach', 'पालक', 'પાલક', '🥬', 'bunch', 25, 20, 3, false, 6),
  ('v007', 'Fenugreek', 'मेथी', 'મેથી', '🌱', 'bunch', 20, 15, 3, false, 7),
  ('v008', 'Cabbage', 'पत्तागोभी', 'કોબી', '🥬', 'piece', 30, 25, 2, false, 8),
  ('v009', 'Cauliflower', 'फूलगोभी', 'ફૂલકોબી', '🥦', 'piece', 40, 35, 2, false, 9),

  -- Other Vegetables
  ('v010', 'Carrots', 'गाजर', 'ગાજર', '🥕', 'kg', 45, 40, 3, false, 10),
  ('v011', 'Beans', 'फलियां', 'ફરસબી', '🫘', 'kg', 60, 50, 2, false, 11),
  ('v012', 'Peas', 'मटर', 'વટાણા', '🫛', 'kg', 80, 70, 2, false, 12),
  ('v013', 'Cucumber', 'खीरा', 'કાકડી', '🥒', 'kg', 35, 30, 3, false, 13),
  ('v014', 'Brinjal', 'बैंगन', 'રીંગણ', '🍆', 'kg', 40, 35, 3, false, 14),
  ('v015', 'Capsicum', 'शिमला मिर्च', 'સીમલા મરચાં', '🫑', 'kg', 60, 50, 2, false, 15),
  ('v016', 'Bottle Gourd', 'लौकी', 'દૂધી', '🥒', 'kg', 30, 25, 3, false, 16),
  ('v017', 'Ridge Gourd', 'तोरी', 'તુરીયા', '🥒', 'kg', 40, 35, 2, false, 17),
  ('v018', 'Bitter Gourd', 'करेला', 'કારેલા', '🥒', 'kg', 50, 40, 2, false, 18),
  ('v019', 'Radish', 'मूली', 'મૂળા', '🥕', 'kg', 35, 30, 3, false, 19),
  ('v020', 'Beetroot', 'चुकंदर', 'ચુકંદર', '🥬', 'kg', 45, 40, 3, false, 20)
) AS items(item_id, name, name_hi, name_gu, emoji, unit, base_price, bulk_price, bulk_threshold, popular, sort_order);

-- =============================================================================
-- SEED: Catalog Items (Minibag - Fruits)
-- =============================================================================

INSERT INTO catalog_items (
  item_id, name, name_hi, name_gu, category_id, emoji, unit,
  base_price, bulk_price, bulk_threshold, applicable_types, popular, sort_order
)
SELECT
  item_id, name, name_hi, name_gu,
  (SELECT id FROM catalog_categories WHERE category_id = 'fruits'),
  emoji, unit, base_price, bulk_price, bulk_threshold,
  ARRAY['minibag'], popular, sort_order
FROM (VALUES
  ('f001', 'Bananas', 'केला', 'કેળા', '🍌', 'dozen', 60, 50, 2, true, 1),
  ('f002', 'Apples', 'सेब', 'સફરજન', '🍎', 'kg', 150, 130, 3, true, 2),
  ('f003', 'Oranges', 'संतरा', 'સંતરા', '🍊', 'kg', 80, 70, 3, true, 3),
  ('f004', 'Mangoes', 'आम', 'કેરી', '🥭', 'kg', 120, 100, 3, true, 4),
  ('f005', 'Grapes', 'अंगूर', 'દ્રાક્ષ', '🍇', 'kg', 100, 80, 2, false, 5),
  ('f006', 'Watermelon', 'तरबूज', 'તરબૂચ', '🍉', 'piece', 50, 40, 2, false, 6),
  ('f007', 'Papaya', 'पपीता', 'પપૈયા', '🍈', 'kg', 40, 35, 3, false, 7),
  ('f008', 'Pomegranate', 'अनार', 'દાડમ', '🍒', 'kg', 180, 160, 2, false, 8)
) AS items(item_id, name, name_hi, name_gu, emoji, unit, base_price, bulk_price, bulk_threshold, popular, sort_order);

-- =============================================================================
-- SEED: Catalog Items (Minibag - Dairy)
-- =============================================================================

INSERT INTO catalog_items (
  item_id, name, name_hi, name_gu, category_id, emoji, unit,
  base_price, bulk_price, bulk_threshold, applicable_types, popular, sort_order
)
SELECT
  item_id, name, name_hi, name_gu,
  (SELECT id FROM catalog_categories WHERE category_id = 'dairy'),
  emoji, unit, base_price, bulk_price, bulk_threshold,
  ARRAY['minibag'], popular, sort_order
FROM (VALUES
  ('d001', 'Milk', 'दूध', 'દૂધ', '🥛', 'liter', 60, 55, 5, true, 1),
  ('d002', 'Curd', 'दही', 'દહીં', '🥣', 'kg', 70, 65, 3, true, 2),
  ('d003', 'Paneer', 'पनीर', 'પનીર', '🧀', 'kg', 350, 320, 2, false, 3),
  ('d004', 'Butter', 'मक्खन', 'માખણ', '🧈', 'kg', 500, 450, 2, false, 4)
) AS items(item_id, name, name_hi, name_gu, emoji, unit, base_price, bulk_price, bulk_threshold, popular, sort_order);

-- =============================================================================
-- SEED: Catalog Items (Minibag - Staples)
-- =============================================================================

INSERT INTO catalog_items (
  item_id, name, name_hi, name_gu, category_id, emoji, unit,
  base_price, bulk_price, bulk_threshold, applicable_types, popular, sort_order
)
SELECT
  item_id, name, name_hi, name_gu,
  (SELECT id FROM catalog_categories WHERE category_id = 'staples'),
  emoji, unit, base_price, bulk_price, bulk_threshold,
  ARRAY['minibag'], popular, sort_order
FROM (VALUES
  ('s001', 'Rice', 'चावल', 'ચોખા', '🌾', 'kg', 60, 50, 10, true, 1),
  ('s002', 'Wheat Flour', 'आटा', 'લોટ', '🌾', 'kg', 40, 35, 10, true, 2),
  ('s003', 'Lentils (Toor)', 'तूर दाल', 'તુવેર', '🫘', 'kg', 140, 130, 5, true, 3),
  ('s004', 'Sugar', 'चीनी', 'ખાંડ', '🧂', 'kg', 50, 45, 5, false, 4),
  ('s005', 'Salt', 'नमक', 'મીઠું', '🧂', 'kg', 20, 18, 5, false, 5),
  ('s006', 'Oil', 'तेल', 'તેલ', '🛢️', 'liter', 150, 140, 3, true, 6)
) AS items(item_id, name, name_hi, name_gu, emoji, unit, base_price, bulk_price, bulk_threshold, popular, sort_order);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Count records
DO $$
DECLARE
  nickname_count INTEGER;
  category_count INTEGER;
  item_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO nickname_count FROM nicknames_pool;
  SELECT COUNT(*) INTO category_count FROM catalog_categories;
  SELECT COUNT(*) INTO item_count FROM catalog_items;

  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Seed Data Summary:';
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Nicknames Pool: % nicknames', nickname_count;
  RAISE NOTICE 'Categories: % categories', category_count;
  RAISE NOTICE 'Catalog Items: % items', item_count;
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Breakdown by category:';
  RAISE NOTICE '  - Vegetables: % items', (SELECT COUNT(*) FROM catalog_items ci JOIN catalog_categories cc ON ci.category_id = cc.id WHERE cc.category_id = 'vegetables');
  RAISE NOTICE '  - Fruits: % items', (SELECT COUNT(*) FROM catalog_items ci JOIN catalog_categories cc ON ci.category_id = cc.id WHERE cc.category_id = 'fruits');
  RAISE NOTICE '  - Dairy: % items', (SELECT COUNT(*) FROM catalog_items ci JOIN catalog_categories cc ON ci.category_id = cc.id WHERE cc.category_id = 'dairy');
  RAISE NOTICE '  - Staples: % items', (SELECT COUNT(*) FROM catalog_items ci JOIN catalog_categories cc ON ci.category_id = cc.id WHERE cc.category_id = 'staples');
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Seed data loaded successfully!';
  RAISE NOTICE 'Database is ready for development.';
  RAISE NOTICE '==================================================';
END $$;
