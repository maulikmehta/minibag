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
  creator_real_name: "string",

  // Host authentication
  host_token: "string", // Secure token for host-only actions

  // Location (text only, no GPS)
  location_text: "string",
  neighborhood: "string",

  // Timing
  scheduled_time: "timestamp",
  created_at: "timestamp",
  expires_at: "timestamp",

  // Status tracking
  status: "enum", // open, active, shopping, completed, expired, cancelled

  // Metadata
  title: "string",
  description: "string",

  // Calculated stats
  participant_count: "number",
  total_demand_value: "number",

  // Participant checkpoint system
  expected_participants: "number", // 0-3, null = not set
  expected_participants_set_at: "timestamp", // When host set expected count (starts 20min timer)
  checkpoint_complete: "boolean", // Whether checkpoint is complete
  is_invite_expired: "boolean", // Computed: 20 minutes elapsed since expected_participants_set_at

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
  real_name: "string", // Actual name for payment/receipts

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
  is_creator: "boolean",

  // Participant status
  items_confirmed: "boolean", // Whether participant confirmed their list
  marked_not_coming: "boolean", // Whether host marked as not coming
  marked_not_coming_at: "timestamp" // When marked as not coming
};
