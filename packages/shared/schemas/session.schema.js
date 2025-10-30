/**
 * Session Schema - Works for minibag, partybag, fitbag
 * Core coordination entity that's session-type agnostic
 */

export const sessionSchema = {
  // Unique identifier
  session_id: "string",
  
  // Session type (enables different products)
  session_type: "enum", // minibag, partybag, fitbag
  
  // Creator info (anonymous)
  creator_nickname: "string",
  
  // Location (text only, no GPS)
  location_text: "string",
  neighborhood: "string",
  
  // Timing
  scheduled_time: "timestamp",
  created_at: "timestamp",
  expires_at: "timestamp",
  
  // Status tracking
  status: "enum", // open, confirmed, completed, expired, cancelled
  
  // Metadata
  title: "string",
  description: "string",
  
  // Calculated stats
  participant_count: "number",
  total_demand_value: "number",
  
  // Pro features
  is_pro: "boolean",
  pro_features: {
    guaranteed_arrival: "boolean",
    custom_items_enabled: "boolean"
  },
  
  // Vendor confirmation
  vendor_confirmed: "boolean",
  vendor_id: "string",
  vendor_confirmed_at: "timestamp"
};

export const participantSchema = {
  participant_id: "string",
  session_id: "string",
  nickname: "string",
  avatar_emoji: "string",
  
  items: [
    {
      item_id: "string",
      item_name: "string",
      quantity: "number",
      unit: "string",
      notes: "string"
    }
  ],
  
  joined_at: "timestamp",
  last_updated: "timestamp",
  is_creator: "boolean"
};
