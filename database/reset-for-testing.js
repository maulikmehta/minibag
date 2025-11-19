/**
 * Reset Database for Clean Testing
 * - Deletes all sessions, participants, items, payments
 * - Resets all nicknames to available
 * - Clears all reservations
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

async function resetDatabase() {
  console.log('🗑️  Resetting database for clean testing...\n');

  try {
    // 1. Delete all payments
    console.log('1️⃣  Deleting all payments...');
    const { error: paymentsError, count: paymentsCount } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (paymentsError) {
      console.error('  ✗ Error:', paymentsError.message);
    } else {
      console.log(`  ✓ Deleted ${paymentsCount || 0} payment records`);
    }

    // 2. Delete all participant items
    console.log('\n2️⃣  Deleting all participant items...');
    const { error: itemsError, count: itemsCount } = await supabase
      .from('participant_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (itemsError) {
      console.error('  ✗ Error:', itemsError.message);
    } else {
      console.log(`  ✓ Deleted ${itemsCount || 0} item records`);
    }

    // 3. Delete all participants
    console.log('\n3️⃣  Deleting all participants...');
    const { error: participantsError, count: participantsCount } = await supabase
      .from('participants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (participantsError) {
      console.error('  ✗ Error:', participantsError.message);
    } else {
      console.log(`  ✓ Deleted ${participantsCount || 0} participant records`);
    }

    // 4. Delete all sessions
    console.log('\n4️⃣  Deleting all sessions...');
    const { error: sessionsError, count: sessionsCount } = await supabase
      .from('sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (sessionsError) {
      console.error('  ✗ Error:', sessionsError.message);
    } else {
      console.log(`  ✓ Deleted ${sessionsCount || 0} session records`);
    }

    // 5. Reset all nicknames to available and clear reservations
    console.log('\n5️⃣  Resetting all nicknames to available...');
    const { error: nicknamesError, count: nicknamesCount } = await supabase
      .from('nicknames_pool')
      .update({
        is_available: true,
        currently_used_in: null,
        times_used: 0,
        last_used: null
      })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    if (nicknamesError) {
      console.error('  ✗ Error:', nicknamesError.message);
    } else {
      console.log(`  ✓ Reset ${nicknamesCount || 0} nicknames to available`);
    }

    // 6. Verify final state
    console.log('\n📊 Final database state:');

    const { count: finalSessions } = await supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    const { count: finalParticipants } = await supabase
      .from('participants')
      .select('*', { count: 'exact', head: true });

    const { count: finalItems } = await supabase
      .from('participant_items')
      .select('*', { count: 'exact', head: true });

    const { count: finalPayments } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true });

    const { data: nicknameStats } = await supabase
      .from('nicknames_pool')
      .select('is_available, gender');

    const availableCount = nicknameStats?.filter(n => n.is_available).length || 0;
    const totalNicknames = nicknameStats?.length || 0;

    console.log(`  Sessions: ${finalSessions || 0}`);
    console.log(`  Participants: ${finalParticipants || 0}`);
    console.log(`  Items: ${finalItems || 0}`);
    console.log(`  Payments: ${finalPayments || 0}`);
    console.log(`  Available nicknames: ${availableCount}/${totalNicknames}`);

    console.log('\n✅ Database reset complete! Ready for clean testing.');

  } catch (error) {
    console.error('\n❌ Reset failed:', error);
    process.exit(1);
  }
}

resetDatabase();
