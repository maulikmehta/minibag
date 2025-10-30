/**
 * Session-type agnostic calculations
 */

export function calculateSessionMetrics(session, participants) {
  const itemMap = new Map();
  
  participants.forEach(participant => {
    participant.items?.forEach(item => {
      const key = item.item_id;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          item_id: item.item_id,
          item_name: item.item_name,
          total_quantity: 0,
          participant_count: 0,
          unit: item.unit,
          base_price: item.base_price || 0,
          bulk_price: item.bulk_price || 0,
        });
      }
      
      const aggregate = itemMap.get(key);
      aggregate.total_quantity += parseFloat(item.quantity) || 0;
      aggregate.participant_count += 1;
    });
  });
  
  const aggregatedItems = Array.from(itemMap.values());
  
  const totalDemandValue = aggregatedItems.reduce((sum, item) => {
    return sum + (item.total_quantity * (item.bulk_price || item.base_price));
  }, 0);
  
  const potentialSavings = aggregatedItems.reduce((sum, item) => {
    const baseCost = item.total_quantity * item.base_price;
    const bulkCost = item.total_quantity * item.bulk_price;
    return sum + Math.max(0, baseCost - bulkCost);
  }, 0);
  
  const readyThresholds = {
    minibag: { minParticipants: 5, minValue: 2000 },
    partybag: { minParticipants: 3, minValue: 1500 },
    fitbag: { minParticipants: 4, minValue: 800 }
  };
  
  const threshold = readyThresholds[session.session_type] || readyThresholds.minibag;
  const readyForVendor = participants.length >= threshold.minParticipants && 
                         totalDemandValue >= threshold.minValue;
  
  return {
    participantCount: participants.length,
    aggregatedItems: aggregatedItems.sort((a, b) => 
      b.participant_count - a.participant_count
    ),
    totalDemandValue: Math.round(totalDemandValue),
    avgPerParticipant: participants.length > 0 
      ? Math.round(totalDemandValue / participants.length) 
      : 0,
    potentialSavings: Math.round(potentialSavings),
    savingsPercent: totalDemandValue > 0 
      ? Math.round((potentialSavings / totalDemandValue) * 100) 
      : 0,
    readyForVendor,
    topItems: aggregatedItems.slice(0, 5),
  };
}

export async function generateNickname(db) {
  const nicknamesRef = db.collection('nicknames_pool');
  
  const snapshot = await nicknamesRef
    .where('is_available', '==', true)
    .limit(50)
    .get();
  
  if (snapshot.empty) {
    throw new Error('No available nicknames. Please add more to pool.');
  }
  
  const available = snapshot.docs;
  const randomDoc = available[Math.floor(Math.random() * available.length)];
  const nickname = randomDoc.data();
  
  await randomDoc.ref.update({
    is_available: false,
    last_used: new Date(),
    times_used: (nickname.times_used || 0) + 1
  });
  
  setTimeout(async () => {
    await randomDoc.ref.update({ is_available: true });
  }, 24 * 60 * 60 * 1000);
  
  return {
    nickname: nickname.nickname,
    avatar_emoji: nickname.avatar_emoji
  };
}

export function generateSessionId(length = 6) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function shouldExpireSession(session) {
  const now = new Date();
  const scheduledTime = new Date(session.scheduled_time);
  const expiryBuffer = 2 * 60 * 60 * 1000;
  
  return now.getTime() > (scheduledTime.getTime() + expiryBuffer);
}
