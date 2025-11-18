/**
 * Apply Pending Migrations to TEST Database
 * WARNING: Uses minibag-test database (cvseopmdpooznqojlads)
 * DO NOT run against production!
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load TEST environment variables from minibag-2
dotenv.config({ path: join(__dirname, '../.env') });

// Verify we're using TEST database
const supabaseUrl = process.env.SUPABASE_URL;
if (!supabaseUrl.includes('cvseopmdpooznqojlads')) {
  console.error('❌ SAFETY CHECK FAILED!');
  console.error('   Expected TEST database: cvseopmdpooznqojlads');
  console.error('   Got:', supabaseUrl);
  console.error('   Please verify .env file points to test database');
  process.exit(1);
}

console.log('✅ Safety check passed: Using TEST database (cvseopmdpooznqojlads)\n');

// Create Supabase client with service role key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyMigrations() {
  console.log('🔧 Applying participant limit migrations to TEST database...\n');

  try {
    // Check if max_participants column exists
    console.log('📊 Checking current schema...');
    const { error: checkError } = await supabase
      .from('sessions')
      .select('max_participants')
      .limit(1);

    if (checkError && checkError.code === 'PGRST204') {
      console.log('❌ max_participants column does not exist');
      console.log('\n⚠️  Migration 029 needs to be applied first via Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/cvseopmdpooznqojlads/sql');
      console.log('\n   Paste contents of: /Users/maulik/llcode/localloops/database/APPLY_PARTICIPANT_LIMIT_MIGRATIONS.sql');
      process.exit(1);
    }

    console.log('✅ max_participants column exists\n');
    console.log('📊 Running migration 031 to fix existing sessions...\n');

    // Step 1: Fix group sessions (expected >= 1 but max = 1)
    console.log('Step 1: Fixing group sessions (expected >= 1, max = 1)...');
    const { data: groupFix, error: groupError } = await supabase
      .from('sessions')
      .update({ max_participants: 20 })
      .eq('session_type', 'minibag')
      .gte('expected_participants', 1)
      .eq('max_participants', 1)
      .select('session_id, expected_participants, max_participants');

    if (groupError) {
      console.error('❌ Error:', groupError.message);
      throw groupError;
    }

    console.log(`✅ Fixed ${groupFix?.length || 0} group sessions`);
    if (groupFix && groupFix.length > 0) {
      console.log('   Updated:', groupFix.map(s => s.session_id).join(', '));
    }

    // Step 2: Fix solo sessions (expected = 0 but max != 1)
    console.log('\nStep 2: Fixing solo sessions (expected = 0, max != 1)...');
    const { data: soloFix0, error: soloError0 } = await supabase
      .from('sessions')
      .update({ max_participants: 1 })
      .eq('session_type', 'minibag')
      .eq('expected_participants', 0)
      .neq('max_participants', 1)
      .select('session_id');

    if (soloError0) {
      console.error('❌ Error:', soloError0.message);
    } else {
      console.log(`✅ Fixed ${soloFix0?.length || 0} solo sessions (expected=0)`);
    }

    // Step 3: Fix NULL expected_participants (treat as solo)
    console.log('\nStep 3: Fixing sessions with NULL expected_participants...');
    const { data: soloFixNull, error: soloErrorNull } = await supabase
      .from('sessions')
      .update({ max_participants: 1 })
      .eq('session_type', 'minibag')
      .is('expected_participants', null)
      .neq('max_participants', 1)
      .select('session_id');

    if (soloErrorNull) {
      console.error('❌ Error:', soloErrorNull.message);
    } else {
      console.log(`✅ Fixed ${soloFixNull?.length || 0} sessions (expected=NULL)`);
    }

    // Step 4: Set defaults for NULL max_participants
    console.log('\nStep 4: Setting defaults for sessions without max_participants...');
    const { data: defaultFix, error: defaultError } = await supabase
      .from('sessions')
      .update({ max_participants: 20 })
      .is('max_participants', null)
      .select('session_id');

    if (defaultError) {
      console.error('❌ Error:', defaultError.message);
    } else {
      console.log(`✅ Set defaults for ${defaultFix?.length || 0} sessions`);
    }

    // Verification
    console.log('\n🔍 Verifying fixes...');

    // Check for broken group sessions
    const { data: brokenGroup } = await supabase
      .from('sessions')
      .select('session_id, expected_participants, max_participants')
      .eq('session_type', 'minibag')
      .gte('expected_participants', 1)
      .eq('max_participants', 1);

    // Check for broken solo sessions
    const { data: brokenSolo } = await supabase
      .from('sessions')
      .select('session_id, expected_participants, max_participants')
      .eq('session_type', 'minibag')
      .eq('expected_participants', 0)
      .neq('max_participants', 1);

    const totalBroken = (brokenGroup?.length || 0) + (brokenSolo?.length || 0);

    if (totalBroken > 0) {
      console.warn(`⚠️  Found ${totalBroken} sessions still with issues:`);
      if (brokenGroup?.length) console.table(brokenGroup);
      if (brokenSolo?.length) console.table(brokenSolo);
    } else {
      console.log('✅ All sessions have consistent limits!');
    }

    // Show sample of sessions
    console.log('\n📋 Sample of recent sessions:');
    const { data: sample } = await supabase
      .from('sessions')
      .select('session_id, expected_participants, max_participants, status, created_at')
      .eq('session_type', 'minibag')
      .order('created_at', { ascending: false })
      .limit(10);

    if (sample && sample.length > 0) {
      console.table(sample);
    } else {
      console.log('   No sessions found in test database');
    }

    console.log('\n✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
}

applyMigrations();
