/**
 * Database Cleanup Script
 * Cleans test sessions and related data
 */

import { supabase } from './db/supabase.js';

async function getDetailedStats() {
  try {
    // Get counts for all tables
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select('*');

    const { data: participants, error: participantsError } = await supabase
      .from('participants')
      .select('*');

    const { data: items, error: itemsError } = await supabase
      .from('participant_items')
      .select('*');

    const { data: nicknames, error: nicknamesError } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', false);

    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*');

    return {
      sessions: sessions || [],
      participants: participants || [],
      items: items || [],
      payments: payments || [],
      usedNicknames: nicknames || []
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
}

async function cleanDatabase() {
  console.log('\n=================================');
  console.log('Database Cleanup');
  console.log('=================================\n');

  // Get current stats
  console.log('Fetching current database state...\n');
  const stats = await getDetailedStats();

  if (!stats) {
    console.error('Failed to fetch database stats');
    return;
  }

  console.log('Current Database Statistics:');
  console.log(`  - Sessions: ${stats.sessions.length}`);
  console.log(`  - Participants: ${stats.participants.length}`);
  console.log(`  - Participant Items: ${stats.items.length}`);
  console.log(`  - Payments: ${stats.payments.length}`);
  console.log(`  - Used Nicknames: ${stats.usedNicknames.length}\n`);

  if (stats.sessions.length === 0) {
    console.log('✓ Database is already clean!\n');
    return;
  }

  // Show some session details
  console.log('Sessions:');
  stats.sessions.forEach((session, i) => {
    const scheduled = new Date(session.scheduled_time);
    console.log(`  ${i + 1}. ${session.session_id} - ${session.status} - Created: ${new Date(session.created_at).toLocaleString()}`);
  });

  console.log('\n⚠️  This will DELETE all sessions, participants, and items.');
  console.log('⚠️  Nicknames will be marked as available again.\n');

  // Delete in correct order (respecting foreign keys)
  console.log('Starting cleanup...\n');

  // 1. Delete payments first (no foreign key dependencies)
  if (stats.payments.length > 0) {
    console.log('1. Deleting payments...');
    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (paymentsError) {
      console.error('Error deleting payments:', paymentsError.message);
    } else {
      console.log(`   ✓ Deleted ${stats.payments.length} payments`);
    }
  }

  // 2. Delete participant items
  if (stats.items.length > 0) {
    console.log('2. Deleting participant items...');
    const { error: itemsError } = await supabase
      .from('participant_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (itemsError) {
      console.error('Error deleting items:', itemsError.message);
    } else {
      console.log(`   ✓ Deleted ${stats.items.length} participant items`);
    }
  }

  // 3. Delete participants
  if (stats.participants.length > 0) {
    console.log('3. Deleting participants...');
    const { error: participantsError } = await supabase
      .from('participants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (participantsError) {
      console.error('Error deleting participants:', participantsError.message);
    } else {
      console.log(`   ✓ Deleted ${stats.participants.length} participants`);
    }
  }

  // 4. Delete sessions
  if (stats.sessions.length > 0) {
    console.log('4. Deleting sessions...');
    const { error: sessionsError } = await supabase
      .from('sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (sessionsError) {
      console.error('Error deleting sessions:', sessionsError.message);
    } else {
      console.log(`   ✓ Deleted ${stats.sessions.length} sessions`);
    }
  }

  // 5. Reset nicknames pool
  if (stats.usedNicknames.length > 0) {
    console.log('5. Resetting nicknames pool...');
    const { error: nicknamesError } = await supabase
      .from('nicknames_pool')
      .update({
        is_available: true,
        currently_used_in: null
      })
      .eq('is_available', false);

    if (nicknamesError) {
      console.error('Error resetting nicknames:', nicknamesError.message);
    } else {
      console.log(`   ✓ Reset ${stats.usedNicknames.length} nicknames to available`);
    }
  }

  // Verify cleanup
  console.log('\n6. Verifying cleanup...');
  const newStats = await getDetailedStats();

  console.log('\nFinal Database Statistics:');
  console.log(`  - Sessions: ${newStats.sessions.length}`);
  console.log(`  - Participants: ${newStats.participants.length}`);
  console.log(`  - Participant Items: ${newStats.items.length}`);
  console.log(`  - Payments: ${newStats.payments.length}`);
  console.log(`  - Used Nicknames: ${newStats.usedNicknames.length}`);

  console.log('\n=================================');
  console.log('✅ Database cleanup completed!');
  console.log('=================================\n');
}

cleanDatabase().catch(error => {
  console.error('\n❌ Cleanup failed with error:', error.message);
  process.exit(1);
});
