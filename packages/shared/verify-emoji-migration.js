/**
 * Verify Emoji Migration Script
 * Checks that thumbnail URLs have been removed and emojis are present
 */

import { supabase } from './db/supabase.js';

async function verifyMigration() {
  console.log('\n=================================');
  console.log('Emoji Migration Verification');
  console.log('=================================\n');

  try {
    // Check all items
    const { data: items, error } = await supabase
      .from('catalog_items')
      .select('item_id, name, emoji, thumbnail_url, category_id')
      .order('item_id');

    if (error) {
      throw error;
    }

    console.log(`Total items in catalog: ${items.length}\n`);

    // Count items by migration status
    const withEmoji = items.filter(item => item.emoji && item.emoji.trim() !== '');
    const withThumbnail = items.filter(item => item.thumbnail_url !== null);
    const withoutEmoji = items.filter(item => !item.emoji || item.emoji.trim() === '');

    console.log('Migration Status:');
    console.log('=================================');
    console.log(`✅ Items with emoji: ${withEmoji.length}/${items.length}`);
    console.log(`🖼️  Items with thumbnail_url: ${withThumbnail.length}/${items.length}`);
    console.log(`❌ Items without emoji: ${withoutEmoji.length}/${items.length}\n`);

    // Show status by category
    const { data: categories } = await supabase
      .from('catalog_categories')
      .select('id, name, category_id')
      .order('sort_order');

    if (categories) {
      console.log('Status by Category:');
      console.log('=================================');
      for (const cat of categories) {
        const catItems = items.filter(item => item.category_id === cat.id);
        const catWithEmoji = catItems.filter(item => item.emoji && item.emoji.trim() !== '');
        const catWithThumbnail = catItems.filter(item => item.thumbnail_url !== null);

        console.log(`${cat.name}:`);
        console.log(`  Total: ${catItems.length} items`);
        console.log(`  With emoji: ${catWithEmoji.length}`);
        console.log(`  With thumbnail: ${catWithThumbnail.length}`);
        console.log('');
      }
    }

    // Show sample items
    console.log('Sample Items (first 10):');
    console.log('=================================');
    items.slice(0, 10).forEach(item => {
      const emojiStatus = item.emoji ? '✅' : '❌';
      const thumbnailStatus = item.thumbnail_url ? '🖼️ ' : '✅';
      console.log(`${emojiStatus} ${thumbnailStatus} ${item.emoji || '❓'} ${item.name} (${item.item_id})`);
    });

    // Check if any items have thumbnails
    if (withThumbnail.length > 0) {
      console.log('\n⚠️  WARNING: Some items still have thumbnail URLs!');
      console.log('Items with thumbnails:');
      withThumbnail.forEach(item => {
        console.log(`  - ${item.item_id}: ${item.name}`);
      });
    }

    // Check if any items are missing emojis
    if (withoutEmoji.length > 0) {
      console.log('\n⚠️  WARNING: Some items are missing emojis!');
      console.log('Items without emojis:');
      withoutEmoji.forEach(item => {
        console.log(`  - ${item.item_id}: ${item.name}`);
      });
    }

    // Final verdict
    console.log('\n=================================');
    if (withThumbnail.length === 0 && withoutEmoji.length === 0) {
      console.log('✅ Migration SUCCESSFUL!');
      console.log('All items have emojis and no thumbnail URLs.');
    } else if (withThumbnail.length === 0 && withoutEmoji.length > 0) {
      console.log('⚠️  Migration PARTIAL');
      console.log('Thumbnails removed but some items missing emojis.');
    } else {
      console.log('❌ Migration INCOMPLETE');
      console.log('Some items still have thumbnail URLs.');
    }
    console.log('=================================\n');

  } catch (error) {
    console.error('❌ Error during verification:', error.message);
    process.exit(1);
  }
}

verifyMigration();
