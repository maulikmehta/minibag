/**
 * Database Connection Test Script
 * Run this to verify Supabase setup
 */

import { supabase, testConnection, getDbStats } from './db/supabase.js';

async function main() {
  console.log('\n=================================');
  console.log('LocalLoops Database Test');
  console.log('=================================\n');

  // Test connection
  console.log('1. Testing database connection...');
  const isConnected = await testConnection();

  if (!isConnected) {
    console.error('\n❌ Database connection failed!');
    console.error('Please check:');
    console.error('  - .env file exists in project root');
    console.error('  - SUPABASE_URL is correct');
    console.error('  - SUPABASE_SERVICE_KEY is correct');
    console.error('  - Database tables are created (run SQL migrations)');
    process.exit(1);
  }

  // Get database stats
  console.log('\n2. Fetching database statistics...');
  const stats = await getDbStats();

  if (stats) {
    console.log('\nDatabase Statistics:');
    console.log('  - Categories:', stats.categories);
    console.log('  - Catalog Items:', stats.items);
    console.log('  - Nicknames Pool:', stats.nicknames);
    console.log('  - Sessions:', stats.sessions);
  }

  // Test catalog query
  console.log('\n3. Testing catalog query...');
  const { data: categories, error: catError } = await supabase
    .from('catalog_categories')
    .select('*')
    .order('sort_order');

  if (catError) {
    console.error('Error fetching categories:', catError.message);
  } else {
    console.log(`\n✓ Found ${categories.length} categories:`);
    categories.forEach(cat => {
      console.log(`  ${cat.icon} ${cat.name} (${cat.category_id})`);
    });
  }

  // Test items query
  console.log('\n4. Testing items query (top 5)...');
  const { data: items, error: itemError } = await supabase
    .from('catalog_items')
    .select('item_id, name, name_hi, emoji, base_price, unit')
    .eq('is_active', true)
    .order('sort_order')
    .limit(5);

  if (itemError) {
    console.error('Error fetching items:', itemError.message);
  } else {
    console.log(`\n✓ Found ${items.length} items (showing top 5):`);
    items.forEach(item => {
      console.log(`  ${item.emoji} ${item.name} (${item.name_hi}) - ₹${item.base_price}/${item.unit}`);
    });
  }

  // Test nicknames query
  console.log('\n5. Testing nicknames query (random 5)...');
  const { data: nicknames, error: nickError } = await supabase
    .from('nicknames_pool')
    .select('nickname, avatar_emoji, language_origin')
    .eq('is_available', true)
    .limit(5);

  if (nickError) {
    console.error('Error fetching nicknames:', nickError.message);
  } else {
    console.log(`\n✓ Available nicknames (showing 5):`);
    nicknames.forEach(nick => {
      console.log(`  ${nick.avatar_emoji} ${nick.nickname} (${nick.language_origin})`);
    });
  }

  console.log('\n=================================');
  console.log('✅ Database test completed!');
  console.log('=================================\n');

  console.log('Next steps:');
  console.log('  1. Start dev servers: npm run dev');
  console.log('  2. Access frontend: http://localhost:5173');
  console.log('  3. Access backend: http://localhost:3000');
  console.log('  4. Set up Cloudflare tunnel for mobile testing\n');
}

main().catch(error => {
  console.error('\n❌ Test failed with error:', error.message);
  process.exit(1);
});
