/**
 * Real-time Error Monitor for minibag-2
 * Watches for errors and billing mismatches
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

// Verify TEST database
if (!process.env.SUPABASE_URL.includes('cvseopmdpooznqojlads')) {
  console.error('❌ Not using TEST database!');
  process.exit(1);
}

console.log('🔍 Monitoring TEST database (cvseopmdpooznqojlads)\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkBillingMismatch(sessionId) {
  console.log(`\n🔍 Checking billing for session: ${sessionId}\n`);

  try {
    // Get session internal ID
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('id, session_id')
      .eq('session_id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Get all participants
    const { data: participants, error: partError } = await supabase
      .from('participants')
      .select('id, nickname, real_name')
      .eq('session_id', session.id)
      .eq('marked_not_coming', false);

    if (partError) throw partError;

    console.log(`📋 Found ${participants?.length || 0} participants:\n`);

    // Get participant_items
    const { data: participantItems, error: itemsError } = await supabase
      .from('participant_items')
      .select(`
        *,
        catalog_item:catalog_items(item_id, name, unit),
        participant:participants(id, nickname, real_name)
      `)
      .eq('participant.session_id', session.id);

    if (itemsError) throw itemsError;

    // Analyze each participant's items
    const itemAnalysis = [];
    const participantItemMap = {};

    for (const participant of participants || []) {
      participantItemMap[participant.id] = [];
    }

    // Group items by participant
    for (const item of participantItems || []) {
      const participantId = item.participant?.id;
      if (participantId && participantItemMap[participantId]) {
        participantItemMap[participantId].push(item);
      }
    }

    // Display items per participant
    for (const participant of participants || []) {
      const items = participantItemMap[participant.id] || [];
      console.log(`  ${participant.nickname || participant.real_name}:`);
      console.log(`    Items: ${items.length}`);
      items.forEach(item => {
        const itemId = item.catalog_item?.item_id || 'unknown';
        const name = item.catalog_item?.name || 'unknown';
        console.log(`      - ${itemId} (${name}): ${item.quantity}${item.unit || ''}`);

        itemAnalysis.push({
          participant_id: participant.id,
          participant_name: participant.nickname || participant.real_name,
          item_id: itemId,
          name: name,
          quantity: item.quantity,
          unit: item.unit
        });
      });
    }

    // Get payments (payments table uses TEXT session_id, not UUID)
    const { data: payments, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('session_id', session.session_id);

    if (payError) throw payError;

    console.log(`\n💰 Found ${payments?.length || 0} payment records:\n`);
    payments?.forEach(payment => {
      console.log(`  ${payment.item_id}: ₹${payment.amount} (${payment.method}) ${payment.skipped ? '- SKIPPED' : ''}`);
    });

    // Get aggregated bill items (from API)
    console.log('\n📊 Checking bill aggregation...\n');

    // Compare: participant items vs payments
    const participantItemIds = new Set(itemAnalysis.map(i => i.item_id));
    const paymentItemIds = new Set(payments?.map(p => p.item_id) || []);

    const missingPayments = [...participantItemIds].filter(id => !paymentItemIds.has(id));
    const extraPayments = [...paymentItemIds].filter(id => !participantItemIds.has(id));

    if (missingPayments.length > 0) {
      console.log(`⚠️  Items in participant records but NO payment:`);
      missingPayments.forEach(itemId => {
        const details = itemAnalysis.filter(i => i.item_id === itemId);
        details.forEach(d => {
          console.log(`   - ${itemId} (${d.participant_name}): ${d.quantity}${d.unit}`);
        });
      });
    }

    if (extraPayments.length > 0) {
      console.log(`⚠️  Payments exist but NO item in participant records:`);
      extraPayments.forEach(itemId => {
        console.log(`   - ${itemId}`);
      });
    }

    if (missingPayments.length === 0 && extraPayments.length === 0) {
      console.log('✅ All participant items have corresponding payments');
    }

    return {
      participants: participants?.length || 0,
      totalItems: itemAnalysis.length,
      payments: payments?.length || 0,
      missingPayments,
      extraPayments,
      itemAnalysis
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function getRecentSessions() {
  const { data } = await supabase
    .from('sessions')
    .select('session_id, status, created_at')
    .eq('session_type', 'minibag')
    .order('created_at', { ascending: false })
    .limit(5);

  return data || [];
}

async function monitor() {
  console.log('='.repeat(60));
  console.log('Real-time Error Monitor - minibag-2');
  console.log('='.repeat(60));

  // Get recent sessions
  const sessions = await getRecentSessions();

  if (sessions.length === 0) {
    console.log('\nℹ️  No recent sessions found');
    return;
  }

  console.log('\n📋 Recent sessions:\n');
  sessions.forEach((s, i) => {
    console.log(`  ${i + 1}. ${s.session_id} - ${s.status} (${new Date(s.created_at).toLocaleString()})`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('Enter session ID to check, or press Ctrl+C to exit');
  console.log('='.repeat(60));
}

// Check if session ID provided as argument
if (process.argv[2]) {
  checkBillingMismatch(process.argv[2])
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  monitor();
}
