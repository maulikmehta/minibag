/**
 * Emoji mapping utilities for catalog items
 * Provides fallback emojis based on item category
 */

/**
 * Default emoji mapping by category
 */
export const CATEGORY_EMOJI_MAP = {
  vegetables: '🥬',
  fruits: '🍎',
  dairy: '🥛',
  grains: '🌾',
  pulses: '🫘',
  spices: '🌶️',
  oil: '🫗',
  snacks: '🍿',
  beverages: '☕',
  bakery: '🍞',
  meat: '🍗',
  fish: '🐟',
  eggs: '🥚',
  default: '🛒'
};

/**
 * Specific item name to emoji mapping (for better accuracy)
 */
export const ITEM_NAME_EMOJI_MAP = {
  // Vegetables
  tomato: '🍅',
  carrot: '🥕',
  potato: '🥔',
  onion: '🧅',
  garlic: '🧄',
  broccoli: '🥦',
  cucumber: '🥒',
  eggplant: '🍆',
  pepper: '🫑',
  corn: '🌽',
  cabbage: '🥬',
  lettuce: '🥬',
  spinach: '🥬',
  mushroom: '🍄',

  // Fruits
  apple: '🍎',
  banana: '🍌',
  orange: '🍊',
  lemon: '🍋',
  watermelon: '🍉',
  grapes: '🍇',
  strawberry: '🍓',
  mango: '🥭',
  pineapple: '🍍',
  peach: '🍑',
  cherry: '🍒',
  kiwi: '🥝',
  coconut: '🥥',
  avocado: '🥑',

  // Dairy
  milk: '🥛',
  cheese: '🧀',
  butter: '🧈',
  yogurt: '🥛',
  curd: '🥛',

  // Grains & Bakery
  bread: '🍞',
  rice: '🌾',
  wheat: '🌾',

  // Others
  egg: '🥚',
  chicken: '🍗',
  fish: '🐟',
  shrimp: '🦐',

  // Defaults for common names
  'default': '🛒'
};

/**
 * Gets emoji for an item based on its name and category
 * @param {string} itemName - Name of the item
 * @param {string} category - Category of the item
 * @param {string} itemEmoji - Emoji from item data (preferred)
 * @returns {string} Emoji character
 */
export const getItemEmoji = (itemName = '', category = '', itemEmoji = null) => {
  // First priority: use item's own emoji if available
  if (itemEmoji && itemEmoji.trim() !== '') {
    return itemEmoji;
  }

  // Second priority: match by item name
  const normalizedName = itemName.toLowerCase().trim();
  for (const [key, emoji] of Object.entries(ITEM_NAME_EMOJI_MAP)) {
    if (normalizedName.includes(key)) {
      return emoji;
    }
  }

  // Third priority: use category emoji
  const normalizedCategory = category.toLowerCase().trim();
  if (CATEGORY_EMOJI_MAP[normalizedCategory]) {
    return CATEGORY_EMOJI_MAP[normalizedCategory];
  }

  // Final fallback
  return CATEGORY_EMOJI_MAP.default;
};

/**
 * Gets emoji for a category
 * @param {string} category - Category name
 * @returns {string} Emoji character
 */
export const getCategoryEmoji = (category = '') => {
  const normalized = category.toLowerCase().trim();
  return CATEGORY_EMOJI_MAP[normalized] || CATEGORY_EMOJI_MAP.default;
};
