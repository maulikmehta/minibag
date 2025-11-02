/**
 * Test Database Helpers
 *
 * Utilities for setting up and tearing down test data
 * Uses Supabase client for database operations
 */

import { createClient } from '@supabase/supabase-js';

// Test database client
// Note: Use test/dev database credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'test-anon-key';

let testClient = null;

/**
 * Get or create test database client
 */
export function getTestClient() {
  if (!testClient) {
    testClient = createClient(supabaseUrl, supabaseKey);
  }
  return testClient;
}

/**
 * Create a test session
 */
export async function createTestSession({
  sessionId = `TEST_${Date.now()}`,
  sessionType = 'minibag',
  hostName = 'Test Host',
  expectedParticipants = 5,
  status = 'waiting',
  pin = null,
} = {}) {
  const client = getTestClient();

  const { data, error } = await client
    .from('sessions')
    .insert({
      session_id: sessionId,
      session_type: sessionType,
      host_name: hostName,
      expected_participants: expectedParticipants,
      status,
      pin,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test session: ${error.message}`);
  }

  return data;
}

/**
 * Create a test participant
 */
export async function createTestParticipant({
  sessionId,
  nickname = 'Test Participant',
  realName = null,
  isHost = false,
} = {}) {
  const client = getTestClient();

  const { data, error } = await client
    .from('participants')
    .insert({
      session_id: sessionId,
      nickname,
      real_name: realName,
      is_host: isHost,
      joined_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test participant: ${error.message}`);
  }

  return data;
}

/**
 * Create a test participant item
 */
export async function createTestItem({
  participantId,
  itemName = 'Test Item',
  quantity = 1,
  price = 10,
  emoji = '🥕',
} = {}) {
  const client = getTestClient();

  const { data, error } = await client
    .from('participant_items')
    .insert({
      participant_id: participantId,
      item_name: itemName,
      quantity,
      price,
      emoji,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test item: ${error.message}`);
  }

  return data;
}

/**
 * Create a test payment
 */
export async function createTestPayment({
  sessionId,
  participantId,
  amountPaid = 100,
  paymentMethod = 'cash',
  skip = false,
} = {}) {
  const client = getTestClient();

  const { data, error } = await client
    .from('payments')
    .insert({
      session_id: sessionId,
      participant_id: participantId,
      amount_paid: amountPaid,
      payment_method: paymentMethod,
      skip,
      recorded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test payment: ${error.message}`);
  }

  return data;
}

/**
 * Delete a test session and all related data
 */
export async function deleteTestSession(sessionId) {
  const client = getTestClient();

  // Delete in reverse order of foreign key dependencies
  await client.from('payments').delete().eq('session_id', sessionId);

  const { data: participants } = await client
    .from('participants')
    .select('id')
    .eq('session_id', sessionId);

  if (participants && participants.length > 0) {
    const participantIds = participants.map(p => p.id);
    await client.from('participant_items').delete().in('participant_id', participantIds);
  }

  await client.from('participants').delete().eq('session_id', sessionId);
  await client.from('sessions').delete().eq('id', sessionId);
}

/**
 * Delete all test sessions (cleanup utility)
 */
export async function deleteAllTestSessions() {
  const client = getTestClient();

  const { data: sessions } = await client
    .from('sessions')
    .select('id')
    .like('session_id', 'TEST_%');

  if (sessions && sessions.length > 0) {
    for (const session of sessions) {
      await deleteTestSession(session.id);
    }
  }
}

/**
 * Create a complete test session with participants and items
 */
export async function createCompleteTestSession({
  sessionId = `TEST_${Date.now()}`,
  participantCount = 3,
  itemsPerParticipant = 2,
} = {}) {
  const session = await createTestSession({ sessionId });

  const participants = [];
  for (let i = 0; i < participantCount; i++) {
    const participant = await createTestParticipant({
      sessionId: session.id,
      nickname: `Participant ${i + 1}`,
      isHost: i === 0,
    });
    participants.push(participant);

    // Add items for each participant
    for (let j = 0; j < itemsPerParticipant; j++) {
      await createTestItem({
        participantId: participant.id,
        itemName: `Item ${j + 1}`,
        quantity: j + 1,
        price: (j + 1) * 10,
      });
    }
  }

  return { session, participants };
}

/**
 * Wait for a condition to be true (useful for async operations)
 */
export async function waitFor(condition, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Timeout waiting for condition');
}

/**
 * Reset test data between tests
 */
export async function resetTestData() {
  await deleteAllTestSessions();
}
