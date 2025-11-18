/**
 * Verify Participant Limit Migration
 * Checks TEST database for proper migration
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

// Verify TEST database
if (!process.env.SUPABASE_URL.includes('cvseopmdpooznqojlads')) {
  console.error('❌ Not using TEST database!');
  process.exit(1);
}

console.log('✅ Verifying TEST database (cvseopmdpooznqojlads)\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verify() {
  console.log('🔍 Migration Verification Report\n');
  console.log('='.repeat(60));

  try {
    // 1. Check if max_participants column exists
    console.log('\n1️⃣  Checking schema...');
    const { data: sampleSession, error: schemaError } = await supabase
      .from('sessions')
      .select('session_id, max_participants, expected_participants')
      .limit(1)
      .single();

    if (schemaError && schemaError.code === 'PGRST204') {
      console.log('   ❌ max_participants column missing!');
      console.log('   Migration 029 was not applied successfully.');
      return;
    }

    console.log('   ✅ max_participants column exists');

    // 2. Check for broken group sessions
    console.log('\n2️⃣  Checking for broken group sessions...');
    const { data: brokenGroup } = await supabase
      .from('sessions')
      .select('session_id, expected_participants, max_participants')
      .eq('session_type', 'minibag')
      .gte('expected_participants', 1)
      .eq('max_participants', 1);

    if (brokenGroup && brokenGroup.length > 0) {
      console.log(`   ❌ Found ${brokenGroup.length} broken group sessions:`);
      console.table(brokenGroup);
    } else {
      console.log('   ✅ No broken group sessions (expected≥1 should have max=20)');
    }

    // 3. Check for broken solo sessions
    console.log('\n3️⃣  Checking for broken solo sessions...');
    const { data: brokenSolo } = await supabase
      .from('sessions')
      .select('session_id, expected_participants, max_participants')
      .eq('session_type', 'minibag')
      .eq('expected_participants', 0)
      .neq('max_participants', 1);

    if (brokenSolo && brokenSolo.length > 0) {
      console.log(`   ❌ Found ${brokenSolo.length} broken solo sessions:`);
      console.table(brokenSolo);
    } else {
      console.log('   ✅ No broken solo sessions (expected=0 should have max=1)');
    }

    // 4. Check for NULL max_participants
    console.log('\n4️⃣  Checking for NULL max_participants...');
    const { data: nullMax } = await supabase
      .from('sessions')
      .select('session_id, expected_participants, max_participants')
      .is('max_participants', null);

    if (nullMax && nullMax.length > 0) {
      console.log(`   ⚠️  Found ${nullMax.length} sessions with NULL max_participants:`);
      console.table(nullMax);
    } else {
      console.log('   ✅ All sessions have max_participants set');
    }

    // 5. Show distribution
    console.log('\n5️⃣  Session distribution by limit...');
    const { data: allSessions } = await supabase
      .from('sessions')
      .select('expected_participants, max_participants')
      .eq('session_type', 'minibag');

    if (allSessions) {
      const solo = allSessions.filter(s => s.max_participants === 1).length;
      const group = allSessions.filter(s => s.max_participants === 20).length;
      const other = allSessions.filter(s => s.max_participants !== 1 && s.max_participants !== 20).length;

      console.log(`   Solo mode (max=1):    ${solo} sessions`);
      console.log(`   Group mode (max=20):  ${group} sessions`);
      if (other > 0) {
        console.log(`   Other limits:         ${other} sessions`);
      }
    }

    // 6. Show recent sessions
    console.log('\n6️⃣  Recent sessions (last 10)...');
    const { data: recent } = await supabase
      .from('sessions')
      .select('session_id, expected_participants, max_participants, status, created_at')
      .eq('session_type', 'minibag')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recent && recent.length > 0) {
      console.table(recent.map(s => ({
        session_id: s.session_id,
        expected: s.expected_participants,
        max: s.max_participants,
        status: s.status,
        created: new Date(s.created_at).toLocaleString()
      })));
    } else {
      console.log('   No sessions found in database');
    }

    // 7. Final verdict
    console.log('\n' + '='.repeat(60));
    const totalBroken = (brokenGroup?.length || 0) + (brokenSolo?.length || 0) + (nullMax?.length || 0);

    if (totalBroken === 0) {
      console.log('\n✅ MIGRATION SUCCESSFUL!');
      console.log('   All sessions have correct participant limits.');
      console.log('\n📋 Next step: Test the failing invite link!');
    } else {
      console.log('\n⚠️  MIGRATION INCOMPLETE');
      console.log(`   Found ${totalBroken} sessions with issues.`);
      console.log('   Review the errors above and re-run migration if needed.');
    }
    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verify();
