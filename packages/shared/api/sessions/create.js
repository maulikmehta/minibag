import { generateSessionId, generateNickname } from '../../utils/calculations.js';

/**
 * Create session - Works for any session type
 */

export async function createSession(db, data) {
  // Validate
  const requiredFields = ['session_type', 'location_text', 'scheduled_time'];
  for (const field of requiredFields) {
    if (!data[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  const validTypes = ['minibag', 'partybag', 'fitbag'];
  if (!validTypes.includes(data.session_type)) {
    throw new Error(`Invalid session_type. Must be one of: ${validTypes.join(', ')}`);
  }
  
  const sessionId = generateSessionId();
  
  let creatorNickname = data.creator_nickname;
  if (!creatorNickname) {
    const generated = await generateNickname(db);
    creatorNickname = generated.nickname;
  }
  
  const scheduledTime = new Date(data.scheduled_time);
  // Free sessions expire 4 hours after scheduled time
  const expiresAt = new Date(scheduledTime.getTime() + 4 * 60 * 60 * 1000);
  
  const session = {
    session_id: sessionId,
    session_type: data.session_type,
    creator_nickname: creatorNickname,
    
    location_text: data.location_text,
    neighborhood: data.neighborhood || null,
    
    scheduled_time: scheduledTime.toISOString(),
    created_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    
    status: 'open',
    
    title: data.title || generateDefaultTitle(data.session_type, scheduledTime),
    description: data.description || '',
    
    participant_count: 0,
    total_demand_value: 0,
    
    is_pro: data.is_pro || false,
    pro_features: {
      guaranteed_arrival: data.is_pro || false,
      custom_items_enabled: data.is_pro || false
    },
    
    vendor_confirmed: false,
    vendor_id: null,
    vendor_confirmed_at: null
  };
  
  await db.collection('sessions').doc(sessionId).set(session);
  
  const shortUrl = getShortUrl(data.session_type, sessionId);
  
  return {
    success: true,
    session_id: sessionId,
    short_url: shortUrl,
    creator_nickname: creatorNickname,
    expires_at: expiresAt.toISOString(),
    session: session
  };
}

function generateDefaultTitle(sessionType, scheduledTime) {
  const typeNames = {
    minibag: 'Vegetables',
    partybag: 'Celebration Items',
    fitbag: 'Fitness Session'
  };
  
  const dateStr = scheduledTime.toLocaleDateString('en-IN', { 
    month: 'short', 
    day: 'numeric' 
  });
  
  return `${typeNames[sessionType]} - ${dateStr}`;
}

function getShortUrl(sessionType, sessionId) {
  const domains = {
    minibag: 'minibag.in',
    partybag: 'partybag.in',
    fitbag: 'fitbag.in'
  };
  
  return `${domains[sessionType]}/${sessionId}`;
}
