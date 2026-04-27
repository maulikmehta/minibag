#!/usr/bin/env node

/**
 * Cleanup Script
 * Deletes all test sessions and resets nickname pool
 * Use after deployment to start fresh
 */

import { createClient } from '@supabase/supabase-js';
import { getDatabaseClient } from '@sessions/core';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load production env
dotenv.config({ path: join(__dirname, '..', '.env.production') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const prisma = getDatabaseClient();

async function cleanup() {
  console.log('🧹 Starting cleanup...\n');

  try {
    // 1. Delete all sessions from Sessions SDK (cascades to participants, invites)
    console.log('📦 Deleting Sessions SDK data...');
    const sessionsDeleted = await prisma.session.deleteMany({});
    console.log(`✓ Deleted ${sessionsDeleted.count} sessions from Postgres`);

    // 2. Reset nickname pool availability
    console.log('\n🎭 Resetting nickname pool...');
    const nicknamesReset = await prisma.nicknamesPool.updateMany({
      data: {
        isAvailable: true,
        currentlyUsedIn: null,
        reservedUntil: null,
        reservedBySession: null,
      }
    });
    console.log(`✓ Reset ${nicknamesReset.count} nicknames to available`);

    // 3. Delete all sessions from Supabase (shopping metadata)
    console.log('\n🛒 Deleting Supabase shopping data...');

    // Delete in order due to foreign keys
    const { error: itemsError } = await supabase
      .from('participant_items')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (itemsError) console.warn('⚠️  Items cleanup:', itemsError.message);

    const { error: paymentsError } = await supabase
      .from('payments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (paymentsError) console.warn('⚠️  Payments cleanup:', paymentsError.message);

    const { error: participantsError, count: participantsCount } = await supabase
      .from('participants')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id', { count: 'exact' });

    if (participantsError) console.warn('⚠️  Participants cleanup:', participantsError.message);
    else console.log(`✓ Deleted ${participantsCount || 0} participants from Supabase`);

    const { error: invitesError } = await supabase
      .from('invites')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (invitesError) console.warn('⚠️  Invites cleanup:', invitesError.message);

    const { error: sessionsError, count: sessionsCount } = await supabase
      .from('sessions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id', { count: 'exact' });

    if (sessionsError) console.warn('⚠️  Sessions cleanup:', sessionsError.message);
    else console.log(`✓ Deleted ${sessionsCount || 0} sessions from Supabase`);

    console.log('\n✅ Cleanup complete!\n');
    console.log('Ready for fresh testing with:');
    console.log('  - All sessions deleted');
    console.log('  - Nickname pool reset');
    console.log('  - Clean database state\n');

  } catch (error) {
    console.error('\n❌ Cleanup failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

cleanup();
