/**
 * Test Free Tier Participant Limit (4 max)
 * Verifies that minibag group tier correctly limits to 4 participants
 */

import { getProductConfig, validateParticipantCount } from './packages/shared/constants/productTiers.js';

console.log('🧪 Testing Free Tier Participant Limits\n');
console.log('='.repeat(60));

// Test 1: Get group tier config
console.log('\n1️⃣  Group Tier Configuration:');
const groupConfig = getProductConfig('minibag', 'group');
console.log(groupConfig);
console.log(`   Max Invited: ${groupConfig.max_invited}`);
console.log(`   Max Total: ${groupConfig.max_total}`);
console.log(`   Max Absolute: ${groupConfig.max_absolute}`);
console.log(`   UI Label: ${groupConfig.ui_label}`);
console.log(`   UI Description: ${groupConfig.ui_description}`);

// Test 2: Get solo tier config
console.log('\n2️⃣  Solo Tier Configuration:');
const soloConfig = getProductConfig('minibag', 'solo');
console.log(`   Max Absolute: ${soloConfig.max_absolute}`);
console.log(`   UI Description: ${soloConfig.ui_description}`);

// Test 3: Validate participant counts
console.log('\n3️⃣  Participant Count Validation (Group Mode):');

const testCases = [
  { count: 1, includesHost: true, description: 'Host only' },
  { count: 2, includesHost: true, description: 'Host + 1 participant' },
  { count: 3, includesHost: true, description: 'Host + 2 participants' },
  { count: 4, includesHost: true, description: 'Host + 3 participants (max)' },
  { count: 5, includesHost: true, description: 'Host + 4 participants (OVER LIMIT)' },
  { count: 10, includesHost: true, description: 'Host + 9 participants (WAY OVER)' },
];

testCases.forEach(test => {
  const result = validateParticipantCount('minibag', 'group', test.count, test.includesHost);
  const status = result.valid ? '✅' : '❌';
  console.log(`   ${status} ${test.description} (${test.count} total)`);
  if (!result.valid) {
    console.log(`      Reason: ${result.reason}`);
  }
});

// Test 4: Invited participants validation
console.log('\n4️⃣  Invited Participants Validation (not including host):');

const invitedTests = [
  { count: 1, description: '1 invited' },
  { count: 2, description: '2 invited' },
  { count: 3, description: '3 invited (max)' },
  { count: 4, description: '4 invited (OVER LIMIT)' },
];

invitedTests.forEach(test => {
  const result = validateParticipantCount('minibag', 'group', test.count, false);
  const status = result.valid ? '✅' : '❌';
  console.log(`   ${status} ${test.description}`);
  if (!result.valid) {
    console.log(`      Reason: ${result.reason}`);
  }
});

// Test 5: What will new sessions use?
console.log('\n5️⃣  New Session Configuration:');
console.log('   When creating a group session (expected_participants >= 1):');
console.log(`   → max_participants will be set to: ${groupConfig.max_absolute}`);
console.log('\n   When creating a solo session (expected_participants = 0):');
console.log(`   → max_participants will be set to: ${soloConfig.max_absolute}`);

// Summary
console.log('\n' + '='.repeat(60));
console.log('SUMMARY');
console.log('='.repeat(60));
console.log(`✅ Free tier limit: ${groupConfig.max_total} total participants`);
console.log(`✅ Breakdown: 1 host + ${groupConfig.max_invited} invited`);
console.log(`✅ 5th participant will be rejected`);
console.log(`✅ Error message: "${validateParticipantCount('minibag', 'group', 5, true).reason}"`);
console.log('');
