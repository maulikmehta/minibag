/**
 * Verify Test Session - Micky (host) and Donald (participant)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function findTestSession() {
  // Find session with Micky as host
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, session_id, status, created_at')
    .eq('session_type', 'minibag')
    .order('created_at', { ascending: false })
    .limit(10);

  for (const session of sessions || []) {
    // Get participants for this session
    const { data: participants } = await supabase
      .from('participants')
      .select('id, nickname, real_name, is_creator, items_confirmed, marked_not_coming')
      .eq('session_id', session.id);

    // Check if this session has Micky and Donald
    const micky = participants?.find(p => p.real_name?.toLowerCase().includes('micky') || p.nickname?.toLowerCase().includes('micky'));
    const donald = participants?.find(p => p.real_name?.toLowerCase().includes('donald') || p.nickname?.toLowerCase().includes('donald'));

    if (micky || donald) {
      return { session, participants };
    }
  }

  return null;
}

async function verifySession() {
  console.log('🔍 Searching for test session with Micky and Donald...\n');

  const result = await findTestSession();

  if (!result) {
    console.log('❌ Could not find session with Micky and Donald');
    console.log('Showing most recent session instead:\n');

    const { data: recent } = await supabase
      .from('sessions')
      .select('id, session_id, status, created_at')
      .eq('session_type', 'minibag')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const { data: participants } = await supabase
      .from('participants')
      .select('id, nickname, real_name, is_creator')
      .eq('session_id', recent.id);

    console.log('Most recent session:', recent.session_id);
    console.log('Participants:', participants.map(p => `${p.nickname || p.real_name} (${p.is_creator ? 'Host' : 'Participant'})`).join(', '));

    return;
  }

  const { session, participants } = result;

  console.log('✅ Found test session!');
  console.log('='.repeat(60));
  console.log(`Session ID: ${session.session_id}`);
  console.log(`Status: ${session.status}`);
  console.log(`Created: ${new Date(session.created_at).toLocaleString()}`);
  console.log('='.repeat(60));

  console.log('\n👥 Participants:\n');

  for (const participant of participants) {
    console.log(`${participant.is_creator ? '👑' : '👤'} ${participant.nickname || participant.real_name} ${participant.is_creator ? '(Host)' : '(Participant)'}`);
    console.log(`   Items Confirmed: ${participant.items_confirmed ? '✅' : '❌'}`);
    console.log(`   Marked Not Coming: ${participant.marked_not_coming ? '✅' : '❌'}`);

    // Get items for this participant
    const { data: items } = await supabase
      .from('participant_items')
      .select(`
        *,
        catalog_item:catalog_items(item_id, name, unit, base_price)
      `)
      .eq('participant_id', participant.id);

    console.log(`   Items (${items?.length || 0}):`);
    if (items && items.length > 0) {
      items.forEach(item => {
        console.log(`      - ${item.catalog_item?.item_id} (${item.catalog_item?.name}): ${item.quantity}${item.unit}`);
      });
    } else {
      console.log('      (no items)');
    }
    console.log('');
  }

  // Get payments
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('session_id', session.session_id);

  console.log('\n💰 Payments:\n');
  if (payments && payments.length > 0) {
    payments.forEach(payment => {
      console.log(`   ${payment.item_id}: ₹${payment.amount} (${payment.method}) ${payment.skipped ? '- SKIPPED' : ''}`);
    });
  } else {
    console.log('   (no payments recorded)');
  }

  // Get bill items from API
  console.log('\n📊 Bill Calculation (from API):\n');

  try {
    const response = await fetch(`http://localhost:3000/api/sessions/${session.session_id}/bill-items`);
    const billData = await response.json();

    if (billData.success) {
      billData.data.participants.forEach(p => {
        console.log(`   ${p.nickname || p.real_name}:`);
        console.log(`      Total Cost: ₹${p.total_cost}`);
        console.log(`      Items Count: ${p.items_count}`);
        console.log(`      Items in Bill:`);
        p.items.forEach(item => {
          console.log(`         - ${item.item_id} (${item.name}): ${item.quantity}${item.unit} @ ₹${item.price_per_kg}/${item.unit} = ₹${item.item_cost}`);
        });
        console.log('');
      });
    }
  } catch (error) {
    console.log('   ❌ Could not fetch bill data:', error.message);
  }

  // Final verification
  console.log('='.repeat(60));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  for (const participant of participants) {
    const { data: items } = await supabase
      .from('participant_items')
      .select('*', { count: 'exact' })
      .eq('participant_id', participant.id);

    const itemCount = items?.length || 0;
    const name = participant.nickname || participant.real_name;
    const role = participant.is_creator ? 'Host' : 'Participant';

    console.log(`${name} (${role}): ${itemCount} items in database`);

    if (itemCount === 0 && !participant.marked_not_coming) {
      console.log('   ⚠️  No items saved!');
    }
  }

  console.log('\n✅ Verification complete!\n');
}

verifySession();
