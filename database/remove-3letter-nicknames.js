/**
 * Remove 3-letter nicknames from Supabase
 * Keep only 4-letter nicknames for consistency
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function removeShortNicknames() {
  console.log('🗑️  Removing non-4-letter nicknames from Supabase...\n');

  try {
    // First, get all nicknames to see what we're removing
    const { data: allNicknames } = await supabase
      .from('nicknames_pool')
      .select('id, nickname, gender, is_available')
      .order('nickname');

    // Group by length
    const byLength = {};
    allNicknames.forEach(n => {
      const len = n.nickname.length;
      if (!byLength[len]) byLength[len] = [];
      byLength[len].push(n.nickname);
    });

    console.log('📊 Current nicknames by length:');
    Object.keys(byLength).sort().forEach(len => {
      console.log(`  ${len}-letter: ${byLength[len].length} names`);
      if (len !== '4') {
        console.log(`    (will remove: ${byLength[len].join(', ')})`);
      }
    });

    console.log('\n🔍 Keeping only 4-letter nicknames...\n');

    // Get IDs of all non-4-letter nicknames
    const toDelete = allNicknames.filter(n => n.nickname.length !== 4);

    if (toDelete.length === 0) {
      console.log('✅ No nicknames to remove - database already clean!');
      return;
    }

    console.log(`📋 Found ${toDelete.length} nicknames to remove:\n`);

    // Group by length for display
    const deleteByLength = {};
    toDelete.forEach(n => {
      const len = n.nickname.length;
      if (!deleteByLength[len]) deleteByLength[len] = [];
      deleteByLength[len].push(n.nickname);
    });

    Object.keys(deleteByLength).sort().forEach(len => {
      console.log(`  ${len}-letter (${deleteByLength[len].length}): ${deleteByLength[len].join(', ')}`);
    });

    console.log('\n⚠️  Starting deletion...\n');

    // Delete in batches
    let deleted = 0;
    for (const nickname of toDelete) {
      const { error } = await supabase
        .from('nicknames_pool')
        .delete()
        .eq('id', nickname.id);

      if (error) {
        console.error(`  ✗ Failed to delete ${nickname.nickname}:`, error.message);
      } else {
        deleted++;
        console.log(`  ✓ Deleted: ${nickname.nickname} (${nickname.gender})`);
      }
    }

    console.log(`\n✅ Deletion complete!`);
    console.log(`\nSummary:`);
    console.log(`  ✓ Deleted: ${deleted} nicknames`);
    console.log(`  ✗ Failed: ${toDelete.length - deleted} nicknames`);

    // Verify final state
    const { data: remaining } = await supabase
      .from('nicknames_pool')
      .select('nickname, gender');

    const maleCount = remaining.filter(n => n.gender === 'male').length;
    const femaleCount = remaining.filter(n => n.gender === 'female').length;

    console.log(`\n📊 Final database state:`);
    console.log(`  Male nicknames: ${maleCount}`);
    console.log(`  Female nicknames: ${femaleCount}`);
    console.log(`  Total: ${remaining.length}`);
    console.log(`\n✨ All nicknames are now 4 letters!`);

  } catch (error) {
    console.error('\n❌ Operation failed:', error);
    process.exit(1);
  }
}

removeShortNicknames();
