-- ============================================================================
-- COMPLETE SCHEMA for NEW Database
-- Exported from: drbocrbecchxbzcfljol
-- Date: 2026-04-24
-- Run this ENTIRE file in NEW Supabase SQL Editor
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

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
-- PRIMARY KEYS
-- ============================================================================

ALTER TABLE bill_access_tokens ADD PRIMARY KEY (id);
ALTER TABLE catalog_categories ADD PRIMARY KEY (id);
ALTER TABLE catalog_items ADD PRIMARY KEY (id);
ALTER TABLE invites ADD PRIMARY KEY (id);
ALTER TABLE nicknames_pool ADD PRIMARY KEY (id);
ALTER TABLE participant_items ADD PRIMARY KEY (id);
ALTER TABLE participants ADD PRIMARY KEY (id);
ALTER TABLE payments ADD PRIMARY KEY (id);
ALTER TABLE sessions ADD PRIMARY KEY (id);
ALTER TABLE subscriptions ADD PRIMARY KEY (id);
ALTER TABLE user_patterns ADD PRIMARY KEY (user_id);

-- ============================================================================
-- FOREIGN KEYS
-- ============================================================================

ALTER TABLE bill_access_tokens ADD CONSTRAINT bill_access_tokens_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;
ALTER TABLE bill_access_tokens ADD CONSTRAINT bill_access_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE catalog_categories ADD CONSTRAINT catalog_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES catalog_categories(id);
ALTER TABLE catalog_items ADD CONSTRAINT catalog_items_category_id_fkey FOREIGN KEY (category_id) REFERENCES catalog_categories(id);
ALTER TABLE invites ADD CONSTRAINT invites_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;
ALTER TABLE invites ADD CONSTRAINT invites_claimed_by_fkey FOREIGN KEY (claimed_by) REFERENCES participants(id) ON DELETE SET NULL;
ALTER TABLE nicknames_pool ADD CONSTRAINT nicknames_pool_reserved_by_session_fkey FOREIGN KEY (reserved_by_session) REFERENCES sessions(id) ON DELETE SET NULL;
ALTER TABLE nicknames_pool ADD CONSTRAINT nicknames_pool_currently_used_in_fkey FOREIGN KEY (currently_used_in) REFERENCES sessions(id);
ALTER TABLE participant_items ADD CONSTRAINT participant_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES catalog_items(id);
ALTER TABLE participant_items ADD CONSTRAINT participant_items_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE;
ALTER TABLE participants ADD CONSTRAINT participants_claimed_invite_id_fkey FOREIGN KEY (claimed_invite_id) REFERENCES invites(id) ON DELETE SET NULL;
ALTER TABLE participants ADD CONSTRAINT participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- bill_access_tokens indexes
CREATE UNIQUE INDEX bill_access_tokens_access_token_key ON bill_access_tokens USING btree (access_token);
CREATE INDEX idx_bill_access_tokens_access_token ON bill_access_tokens USING btree (access_token);
CREATE INDEX idx_bill_access_tokens_access_token_expires ON bill_access_tokens USING btree (access_token, expires_at);
CREATE INDEX idx_bill_access_tokens_expires ON bill_access_tokens USING btree (expires_at);
CREATE INDEX idx_bill_access_tokens_session ON bill_access_tokens USING btree (session_id);
CREATE UNIQUE INDEX unique_session_participant ON bill_access_tokens USING btree (session_id, participant_id);

-- catalog_categories indexes
CREATE UNIQUE INDEX catalog_categories_category_id_key ON catalog_categories USING btree (category_id);
CREATE INDEX idx_catalog_categories_is_active ON catalog_categories USING btree (is_active);
CREATE INDEX idx_catalog_categories_sort_order ON catalog_categories USING btree (sort_order);
CREATE INDEX idx_categories_active ON catalog_categories USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_categories_type ON catalog_categories USING gin (applicable_types);

-- catalog_items indexes
CREATE UNIQUE INDEX catalog_items_item_id_key ON catalog_items USING btree (item_id);
CREATE INDEX idx_catalog_items_active ON catalog_items USING btree (is_active) WHERE (is_active = true);
CREATE INDEX idx_catalog_items_category ON catalog_items USING btree (category_id);
CREATE INDEX idx_catalog_items_category_active ON catalog_items USING btree (category_id, is_active);
CREATE INDEX idx_catalog_items_is_active ON catalog_items USING btree (is_active);
CREATE INDEX idx_catalog_items_item_id ON catalog_items USING btree (item_id);
CREATE INDEX idx_catalog_items_name_trgm ON catalog_items USING gin (name gin_trgm_ops);
CREATE INDEX idx_catalog_items_popular ON catalog_items USING btree (popular) WHERE (popular = true);
CREATE INDEX idx_catalog_items_type ON catalog_items USING gin (applicable_types);

-- invites indexes
CREATE INDEX idx_invites_invite_token ON invites USING btree (invite_token);
CREATE INDEX idx_invites_session ON invites USING btree (session_id);
CREATE INDEX idx_invites_status ON invites USING btree (status) WHERE (status = 'pending'::text);
CREATE INDEX idx_invites_token_status ON invites USING btree (invite_token, status);
CREATE UNIQUE INDEX invites_invite_token_key ON invites USING btree (invite_token);
CREATE UNIQUE INDEX invites_session_id_invite_number_key ON invites USING btree (session_id, invite_number);

-- nicknames_pool indexes
CREATE INDEX idx_nicknames_available ON nicknames_pool USING btree (is_available) WHERE (is_available = true);
CREATE INDEX idx_nicknames_available_gender ON nicknames_pool USING btree (is_available, gender) WHERE (is_available = true);
CREATE INDEX idx_nicknames_currently_used ON nicknames_pool USING btree (currently_used_in) WHERE (currently_used_in IS NOT NULL);
CREATE INDEX idx_nicknames_pool_available_gender ON nicknames_pool USING btree (is_available, gender);
CREATE INDEX idx_nicknames_pool_currently_used_in ON nicknames_pool USING btree (currently_used_in) WHERE (currently_used_in IS NOT NULL);
CREATE INDEX idx_nicknames_pool_reserved ON nicknames_pool USING btree (is_available, reserved_until) WHERE (reserved_until IS NULL);
CREATE INDEX idx_nicknames_usage ON nicknames_pool USING btree (times_used);
CREATE UNIQUE INDEX nicknames_pool_nickname_key ON nicknames_pool USING btree (nickname);

-- participant_items indexes
CREATE INDEX idx_item_price_history ON participant_items USING btree (participant_id, item_id, paid_at DESC);
CREATE INDEX idx_participant_items_item ON participant_items USING btree (item_id);
CREATE INDEX idx_participant_items_participant ON participant_items USING btree (participant_id);
CREATE INDEX idx_participant_items_participant_item ON participant_items USING btree (participant_id, item_id);
CREATE UNIQUE INDEX participant_items_participant_id_item_id_key ON participant_items USING btree (participant_id, item_id);

-- participants indexes
CREATE INDEX idx_participants_invite ON participants USING btree (claimed_invite_id) WHERE (claimed_invite_id IS NOT NULL);
CREATE INDEX idx_participants_joined_at ON participants USING btree (joined_at);
CREATE INDEX idx_participants_session ON participants USING btree (session_id);
CREATE INDEX idx_participants_session_joined ON participants USING btree (session_id, joined_at);
CREATE INDEX idx_participants_session_nickname ON participants USING btree (session_id, nickname);
CREATE INDEX idx_participants_session_user ON participants USING btree (session_id, user_id);
CREATE INDEX idx_participants_timed_out_at ON participants USING btree (timed_out_at) WHERE (timed_out_at IS NOT NULL);
CREATE INDEX idx_participants_token ON participants USING btree (participant_token) WHERE (participant_token IS NOT NULL);
CREATE INDEX idx_participants_user ON participants USING btree (user_id) WHERE (user_id IS NOT NULL);
CREATE UNIQUE INDEX participants_session_id_nickname_key ON participants USING btree (session_id, nickname);
CREATE UNIQUE INDEX unique_participant_token ON participants USING btree (participant_token);

-- payments indexes
CREATE INDEX idx_payments_item ON payments USING btree (item_id);
CREATE INDEX idx_payments_method ON payments USING btree (method);
CREATE INDEX idx_payments_recorded_at ON payments USING btree (recorded_at DESC);
CREATE INDEX idx_payments_session ON payments USING btree (session_id);
CREATE INDEX idx_payments_skipped ON payments USING btree (session_id, skipped);
CREATE UNIQUE INDEX payments_session_id_item_id_key ON payments USING btree (session_id, item_id);

-- sessions indexes
CREATE INDEX idx_sessions_cancelled_at ON sessions USING btree (cancelled_at) WHERE (cancelled_at IS NOT NULL);
CREATE INDEX idx_sessions_completed_at ON sessions USING btree (completed_at) WHERE (completed_at IS NOT NULL);
CREATE INDEX idx_sessions_created_at ON sessions USING btree (created_at DESC);
CREATE INDEX idx_sessions_creator ON sessions USING btree (creator_id) WHERE (creator_id IS NOT NULL);
CREATE INDEX idx_sessions_duplicate_check ON sessions USING btree (creator_nickname, status, created_at DESC) WHERE (status = 'open'::text);
CREATE INDEX idx_sessions_financially_settled_at ON sessions USING btree (financially_settled_at) WHERE (financially_settled_at IS NOT NULL);
CREATE INDEX idx_sessions_host_token ON sessions USING btree (host_token);
CREATE INDEX idx_sessions_neighborhood ON sessions USING btree (neighborhood) WHERE (neighborhood IS NOT NULL);
CREATE INDEX idx_sessions_pin ON sessions USING btree (session_pin) WHERE (session_pin IS NOT NULL);
CREATE INDEX idx_sessions_scheduled ON sessions USING btree (scheduled_time);
CREATE INDEX idx_sessions_session_id ON sessions USING btree (session_id);
CREATE INDEX idx_sessions_status ON sessions USING btree (status);
CREATE INDEX idx_sessions_status_created ON sessions USING btree (status, created_at DESC);
CREATE INDEX idx_sessions_type ON sessions USING btree (session_type);
CREATE INDEX idx_sessions_type_status ON sessions USING btree (session_type, status);
CREATE UNIQUE INDEX sessions_host_token_key ON sessions USING btree (host_token);
CREATE UNIQUE INDEX sessions_session_id_key ON sessions USING btree (session_id);

-- subscriptions indexes
CREATE INDEX idx_subscriptions_active_revenue ON subscriptions USING btree (status, product_type, created_at) WHERE (status = 'active'::text);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions USING btree (next_billing_at) WHERE (status = 'active'::text);
CREATE INDEX idx_subscriptions_product_type ON subscriptions USING btree (product_type);
CREATE INDEX idx_subscriptions_status ON subscriptions USING btree (status);
CREATE INDEX idx_subscriptions_user_id ON subscriptions USING btree (user_id);

-- ============================================================================
-- SCHEMA COMPLETE
-- Next: Import data using 02-import-data.sql
-- ============================================================================
