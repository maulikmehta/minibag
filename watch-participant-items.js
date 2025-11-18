/**
 * Real-time Participant Items Monitor
 * Watches for changes in participant_items table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let lastCheckTime = new Date().toISOString();

async function checkRecentChanges() {
  // Get recent participant_items changes
  const { data: recentItems } = await supabase
    .from('participant_items')
    .select(`
      *,
      catalog_item:catalog_items(item_id, name),
      participant:participants(nickname, real_name, session_id, items_confirmed, created_at)
    `)
    .gte('created_at', lastCheckTime)
    .order('created_at', { ascending: false });

  if (recentItems && recentItems.length > 0) {
    console.log(`\n🔔 ${new Date().toLocaleTimeString()} - ${recentItems.length} new items detected!\n`);

    // Group by participant
    const byParticipant = {};
    for (const item of recentItems) {
      const participantId = item.participant_id;
      if (!byParticipant[participantId]) {
        byParticipant[participantId] = {
          nickname: item.participant?.nickname || 'Unknown',
          real_name: item.participant?.real_name,
          session_id: item.participant?.session_id,
          items_confirmed: item.participant?.items_confirmed,
          items: []
        };
      }
      byParticipant[participantId].items.push({
        item_id: item.catalog_item?.item_id,
        name: item.catalog_item?.name,
        quantity: item.quantity,
        unit: item.unit,
        created_at: item.created_at
      });
    }

    // Display grouped by participant
    for (const [participantId, data] of Object.entries(byParticipant)) {
      console.log(`👤 ${data.nickname} (${data.real_name})`);
      console.log(`   Session: ${data.session_id}`);
      console.log(`   Items Confirmed: ${data.items_confirmed ? '✅ YES' : '❌ NO'}`);
      console.log(`   Items (${data.items.length}):`);
      data.items.forEach(item => {
        console.log(`      - ${item.item_id} (${item.name}): ${item.quantity}${item.unit}`);
        console.log(`        Created: ${new Date(item.created_at).toLocaleTimeString()}`);
      });
      console.log('');

      // Check total items for this participant
      const { data: allItems, count } = await supabase
        .from('participant_items')
        .select('*', { count: 'exact' })
        .eq('participant_id', participantId);

      console.log(`   📊 Total items in DB for this participant: ${count}`);
      if (count !== data.items.length) {
        console.log(`   ⚠️  Only showing ${data.items.length} recent items, but participant has ${count} total`);
      }
      console.log('');
    }
  }

  lastCheckTime = new Date().toISOString();
}

async function monitorSession(sessionId) {
  console.log('='.repeat(60));
  console.log('Real-time Participant Items Monitor');
  console.log('='.repeat(60));
  console.log(`Session: ${sessionId || 'All sessions'}`);
  console.log(`Started: ${new Date().toLocaleTimeString()}`);
  console.log('Watching for new items...\n');

  // Check every 2 seconds
  setInterval(checkRecentChanges, 2000);
}

// Usage: node watch-participant-items.js [session_id]
const sessionId = process.argv[2];
monitorSession(sessionId);
