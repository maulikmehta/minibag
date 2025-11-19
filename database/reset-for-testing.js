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
    const { data: allPayments } = await supabase.from('payments').select('id');
    let paymentsCount = 0;
    if (allPayments && allPayments.length > 0) {
      const { error } = await supabase
        .from('payments')
        .delete()
        .in('id', allPayments.map(p => p.id));
      if (error) {
        console.error('  ✗ Error:', error.message);
      } else {
        paymentsCount = allPayments.length;
      }
    }
    console.log(`  ✓ Deleted ${paymentsCount} payment records`);

    // 2. Delete all participant items
    console.log('\n2️⃣  Deleting all participant items...');
    const { data: allItems } = await supabase.from('participant_items').select('id');
    let itemsCount = 0;
    if (allItems && allItems.length > 0) {
      const { error } = await supabase
        .from('participant_items')
        .delete()
        .in('id', allItems.map(i => i.id));
      if (error) {
        console.error('  ✗ Error:', error.message);
      } else {
        itemsCount = allItems.length;
      }
    }
    console.log(`  ✓ Deleted ${itemsCount} item records`);

    // 3. Delete all participants
    console.log('\n3️⃣  Deleting all participants...');
    const { data: allParticipants } = await supabase.from('participants').select('id');
    let participantsCount = 0;
    if (allParticipants && allParticipants.length > 0) {
      const { error } = await supabase
        .from('participants')
        .delete()
        .in('id', allParticipants.map(p => p.id));
      if (error) {
        console.error('  ✗ Error:', error.message);
      } else {
        participantsCount = allParticipants.length;
      }
    }
    console.log(`  ✓ Deleted ${participantsCount} participant records`);

    // 4. Delete all sessions
    console.log('\n4️⃣  Deleting all sessions...');
    const { data: allSessions } = await supabase.from('sessions').select('id');
    let sessionsCount = 0;
    if (allSessions && allSessions.length > 0) {
      const { error } = await supabase
        .from('sessions')
        .delete()
        .in('id', allSessions.map(s => s.id));
      if (error) {
        console.error('  ✗ Error:', error.message);
      } else {
        sessionsCount = allSessions.length;
      }
    }
    console.log(`  ✓ Deleted ${sessionsCount} session records`);

    // 5. Reset all nicknames to available and clear reservations
    console.log('\n5️⃣  Resetting all nicknames to available...');
    const { data: allNicknames } = await supabase.from('nicknames_pool').select('id');
    let nicknamesCount = 0;
    if (allNicknames && allNicknames.length > 0) {
      const { error } = await supabase
        .from('nicknames_pool')
        .update({
          is_available: true,
          currently_used_in: null,
          times_used: 0,
          last_used: null
        })
        .in('id', allNicknames.map(n => n.id));
      if (error) {
        console.error('  ✗ Error:', error.message);
      } else {
        nicknamesCount = allNicknames.length;
      }
    }
    console.log(`  ✓ Reset ${nicknamesCount} nicknames to available`);

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
