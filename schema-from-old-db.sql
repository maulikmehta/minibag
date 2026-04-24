-- ============================================================================
-- SCHEMA EXPORTED FROM OLD DB (drbocrbecchxbzcfljol)
-- Generated: 2026-04-24
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CREATE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS bill_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  participant_id UUID,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS catalog_categories (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  category_id TEXT NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID,
  icon TEXT,
  color TEXT,
  applicable_types TEXT[] NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS catalog_items (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  name_hi TEXT,
  name_gu TEXT,
  category_id UUID,
  thumbnail_url TEXT,
  thumbnail_small TEXT,
  thumbnail_large TEXT,
  emoji TEXT,
  alt_text TEXT,
  unit TEXT NOT NULL,
  base_price NUMERIC,
  bulk_price NUMERIC,
  applicable_types TEXT[] NOT NULL,
  tags TEXT[],
  popular BOOLEAN DEFAULT false,
  seasonal BOOLEAN DEFAULT false,
  bulk_threshold INTEGER,
  max_quantity INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invites (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  invite_token TEXT NOT NULL,
  invite_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'::text,
  claimed_by UUID,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS nicknames_pool (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  nickname TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  currently_used_in UUID,
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  gender TEXT,
  language_origin TEXT,
  difficulty_level TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reserved_until TIMESTAMPTZ,
  reserved_by_session UUID,
  version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS participant_items (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL,
  item_id UUID NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,
  price_paid NUMERIC,
  price_per_unit NUMERIC,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS participants (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  user_id UUID,
  nickname TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_creator BOOLEAN DEFAULT false,
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,
  real_name TEXT,
  items_confirmed BOOLEAN DEFAULT false,
  marked_not_coming BOOLEAN DEFAULT false,
  marked_not_coming_at TIMESTAMPTZ,
  timed_out_at TIMESTAMPTZ,
  claimed_invite_id UUID,
  participant_token TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  method TEXT NOT NULL,
  recorded_by TEXT,
  vendor_name TEXT,
  status TEXT DEFAULT 'paid'::text,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  skipped BOOLEAN NOT NULL DEFAULT false,
  skip_reason TEXT DEFAULT 'Item wasn''t good enough to buy'::text,
  skip_payment BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS sessions (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL,
  session_type TEXT NOT NULL,
  creator_id UUID,
  creator_nickname TEXT NOT NULL,
  location_text TEXT NOT NULL,
  neighborhood TEXT,
  scheduled_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'open'::text,
  title TEXT,
  description TEXT,
  participant_count INTEGER DEFAULT 0,
  total_demand_value NUMERIC DEFAULT 0,
  is_pro BOOLEAN DEFAULT false,
  guaranteed_arrival BOOLEAN DEFAULT false,
  vendor_confirmed BOOLEAN DEFAULT false,
  vendor_id UUID,
  vendor_confirmed_at TIMESTAMPTZ,
  host_token VARCHAR(64),
  expected_participants INTEGER,
  checkpoint_complete BOOLEAN DEFAULT false,
  expected_participants_set_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  financially_settled_at TIMESTAMPTZ,
  items_confirmed_at TIMESTAMPTZ,
  payments_confirmed_at TIMESTAMPTZ,
  session_pin TEXT,
  invites_locked BOOLEAN DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  creator_real_name TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  product_type TEXT NOT NULL,
  plan TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'::text,
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'::text,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_billing_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_patterns (
  user_id UUID NOT NULL,
  avg_days_between_sessions INTEGER,
  usual_day_of_week INTEGER,
  pattern_confidence NUMERIC,
  pattern_type TEXT,
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_method TEXT,
  last_reminded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- CONSTRAINTS WILL BE ADDED NEXT (from Step 3)
-- ============================================================================
