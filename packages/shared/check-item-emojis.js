/**
 * Check Item Emojis Script
 * Shows all catalog items with their emojis
 */

import { supabase } from './db/supabase.js';

async function checkEmojis() {
  console.log('\n=================================');
  console.log('Catalog Items - Emoji Review');
  console.log('=================================\n');

  try {
    // Get all items with category info
    const { data: items, error } = await supabase
      .from('catalog_items')
      .select(`
        item_id,
        name,
        name_hi,
        emoji,
        category_id,
        category:catalog_categories(name, category_id)
      `)
      .order('category_id, sort_order');

    if (error) throw error;

    // Group by category
    const categories = {};
    items.forEach(item => {
      const catName = item.category?.name || 'Unknown';
      if (!categories[catName]) {
        categories[catName] = [];
      }
      categories[catName].push(item);
    });

    // Display by category
    for (const [catName, catItems] of Object.entries(categories)) {
      console.log(`\n${catName.toUpperCase()}`);
      console.log('='.repeat(50));
      catItems.forEach(item => {
        console.log(`${item.emoji}  ${item.name.padEnd(20)} (${item.name_hi}) - ${item.item_id}`);
      });
    }

    // Check for duplicate emojis
    console.log('\n=================================');
    console.log('Duplicate Emoji Analysis');
    console.log('=================================\n');

    const emojiCount = {};
    items.forEach(item => {
      if (item.emoji) {
        emojiCount[item.emoji] = emojiCount[item.emoji] || [];
        emojiCount[item.emoji].push(item.name);
      }
    });

    const duplicates = Object.entries(emojiCount).filter(([emoji, items]) => items.length > 1);

    if (duplicates.length > 0) {
      console.log('⚠️  Items sharing the same emoji:');
      duplicates.forEach(([emoji, itemNames]) => {
        console.log(`${emoji} - Used by ${itemNames.length} items:`);
        itemNames.forEach(name => console.log(`    - ${name}`));
        console.log('');
      });
    } else {
      console.log('✅ All items have unique emojis!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkEmojis();
