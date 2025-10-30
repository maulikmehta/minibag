-- LocalLoops Database Schema
-- Version: 1.0.0
-- Database: Supabase (PostgreSQL)
-- Created: October 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: catalog_categories
-- Purpose: Product categories for all LocalLoops products
-- =============================================================================
CREATE TABLE catalog_categories (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT UNIQUE NOT NULL,

  -- Basic info
  name TEXT NOT NULL,
  parent_id UUID REFERENCES catalog_categories(id),

  -- Visual
  icon TEXT,
  color TEXT,

  -- Product applicability
  applicable_types TEXT[] NOT NULL,

  -- Admin
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for categories
CREATE INDEX idx_categories_type ON catalog_categories USING GIN(applicable_types);
CREATE INDEX idx_categories_active ON catalog_categories(is_active) WHERE is_active = true;

-- =============================================================================
-- TABLE: catalog_items
-- Purpose: Unified product catalog for all LocalLoops products
-- =============================================================================
CREATE TABLE catalog_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id TEXT UNIQUE NOT NULL,

  -- Basic info
  name TEXT NOT NULL,
  name_hi TEXT,
  name_gu TEXT,
  category_id UUID REFERENCES catalog_categories(id),

  -- Visual
  thumbnail_url TEXT,
  thumbnail_small TEXT,
  thumbnail_large TEXT,
  emoji TEXT,
  alt_text TEXT,

  -- Pricing
  unit TEXT NOT NULL,
  base_price DECIMAL,
  bulk_price DECIMAL,

  -- Product applicability (KEY FIELD)
  applicable_types TEXT[] NOT NULL,

  -- Metadata
  tags TEXT[],
  popular BOOLEAN DEFAULT false,
  seasonal BOOLEAN DEFAULT false,

  -- Business logic
  bulk_threshold INTEGER,
  max_quantity INTEGER,

  -- Admin
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Indexes for catalog_items
CREATE INDEX idx_catalog_items_type ON catalog_items USING GIN(applicable_types);
CREATE INDEX idx_catalog_items_active ON catalog_items(is_active) WHERE is_active = true;
CREATE INDEX idx_catalog_items_popular ON catalog_items(popular) WHERE popular = true;
CREATE INDEX idx_catalog_items_category ON catalog_items(category_id);

-- =============================================================================
-- TABLE: sessions
-- Purpose: Shopping sessions (Minibag, Partybag, Fitbag)
-- =============================================================================
CREATE TABLE sessions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,
  session_type TEXT NOT NULL,

  -- Creator
  creator_id UUID,
  creator_nickname TEXT NOT NULL,

  -- Location (text only, no GPS)
  location_text TEXT NOT NULL,
  neighborhood TEXT,

  -- Timing
  scheduled_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'open',

  -- Metadata
  title TEXT,
  description TEXT,

  -- Calculated stats
  participant_count INTEGER DEFAULT 0,
  total_demand_value DECIMAL DEFAULT 0,

  -- Pro features
  is_pro BOOLEAN DEFAULT false,
  guaranteed_arrival BOOLEAN DEFAULT false,

  -- Vendor
  vendor_confirmed BOOLEAN DEFAULT false,
  vendor_id UUID,
  vendor_confirmed_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_session_type CHECK (session_type IN ('minibag', 'partybag', 'fitbag')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'active', 'shopping', 'completed', 'expired', 'cancelled'))
);

-- Indexes for sessions
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_time);
CREATE INDEX idx_sessions_creator ON sessions(creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX idx_sessions_neighborhood ON sessions(neighborhood) WHERE neighborhood IS NOT NULL;
CREATE INDEX idx_sessions_type_status ON sessions(session_type, status);

-- =============================================================================
-- TABLE: participants
-- Purpose: Session participants with anonymous identity
-- =============================================================================
CREATE TABLE participants (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID,

  -- Anonymous identity
  nickname TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL,

  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_creator BOOLEAN DEFAULT false,

  -- Status
  locked BOOLEAN DEFAULT false,
  locked_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(session_id, nickname)
);

-- Indexes for participants
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_user ON participants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_participants_session_user ON participants(session_id, user_id);

-- =============================================================================
-- TABLE: participant_items
-- Purpose: Items selected by participants in sessions
-- =============================================================================
CREATE TABLE participant_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES catalog_items(id),

  -- Quantity
  quantity DECIMAL NOT NULL,
  unit TEXT NOT NULL,
  notes TEXT,

  -- Payment tracking
  price_paid DECIMAL,
  price_per_unit DECIMAL,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('upi', 'cash', NULL)),
  UNIQUE(participant_id, item_id)
);

-- Indexes for participant_items
CREATE INDEX idx_participant_items_participant ON participant_items(participant_id);
CREATE INDEX idx_participant_items_item ON participant_items(item_id);
CREATE INDEX idx_item_price_history ON participant_items(participant_id, item_id, paid_at DESC);

-- =============================================================================
-- TABLE: nicknames_pool
-- Purpose: Pool of anonymous nicknames for participants
-- =============================================================================
CREATE TABLE nicknames_pool (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT UNIQUE NOT NULL,
  avatar_emoji TEXT NOT NULL,

  -- Availability
  is_available BOOLEAN DEFAULT true,
  currently_used_in UUID REFERENCES sessions(id),

  -- Usage stats
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,

  -- Categorization
  gender TEXT,
  language_origin TEXT,
  difficulty_level TEXT,

  -- Admin
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for nicknames_pool
CREATE INDEX idx_nicknames_available ON nicknames_pool(is_available) WHERE is_available = true;
CREATE INDEX idx_nicknames_usage ON nicknames_pool(times_used);

-- =============================================================================
-- TABLE: user_patterns
-- Purpose: Smart features - track user patterns for reminders
-- =============================================================================
CREATE TABLE user_patterns (
  -- Identity
  user_id UUID PRIMARY KEY,

  -- Pattern detection
  avg_days_between_sessions INTEGER,
  usual_day_of_week INTEGER,
  pattern_confidence DECIMAL,
  pattern_type TEXT,

  -- Reminders
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_method TEXT,
  last_reminded_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================================
-- ROW-LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_categories ENABLE ROW LEVEL SECURITY;

-- Sessions: Public read for active sessions
CREATE POLICY "Anyone can view active sessions"
ON sessions FOR SELECT
USING (status IN ('open', 'active'));

-- Sessions: Anyone can create sessions (guest mode)
CREATE POLICY "Anyone can create sessions"
ON sessions FOR INSERT
WITH CHECK (true);

-- Sessions: Creator can update their own sessions
CREATE POLICY "Creators can update their sessions"
ON sessions FOR UPDATE
USING (creator_id = auth.uid() OR creator_id IS NULL);

-- Participants: Session members can view participants
CREATE POLICY "Session members can view participants"
ON participants FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM participants WHERE user_id = auth.uid()
  )
  OR
  session_id IN (
    SELECT id FROM sessions WHERE status IN ('open', 'active')
  )
);

-- Participants: Anyone can join sessions (guest mode)
CREATE POLICY "Anyone can join sessions"
ON participants FOR INSERT
WITH CHECK (true);

-- Participants: Users can update their own participant records
CREATE POLICY "Users can update own participant records"
ON participants FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

-- Participant items: Participants can view items in their session
CREATE POLICY "Participants can view session items"
ON participant_items FOR SELECT
USING (
  participant_id IN (
    SELECT p.id FROM participants p
    WHERE p.session_id IN (
      SELECT session_id FROM participants WHERE user_id = auth.uid()
    )
    OR p.session_id IN (
      SELECT id FROM sessions WHERE status IN ('open', 'active')
    )
  )
);

-- Participant items: Participants can manage their own items
CREATE POLICY "Participants can manage own items"
ON participant_items FOR ALL
USING (
  participant_id IN (
    SELECT id FROM participants WHERE user_id = auth.uid() OR user_id IS NULL
  )
);

-- Catalog: Public read for active items
CREATE POLICY "Anyone can view active catalog items"
ON catalog_items FOR SELECT
USING (is_active = true);

-- Catalog Categories: Public read for active categories
CREATE POLICY "Anyone can view active categories"
ON catalog_categories FOR SELECT
USING (is_active = true);

-- =============================================================================
-- FUNCTIONS & TRIGGERS
-- =============================================================================

-- Function to update participant count in sessions
CREATE OR REPLACE FUNCTION update_session_participant_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE sessions
    SET participant_count = participant_count + 1
    WHERE id = NEW.session_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE sessions
    SET participant_count = participant_count - 1
    WHERE id = OLD.session_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update participant count
CREATE TRIGGER trg_update_participant_count
AFTER INSERT OR DELETE ON participants
FOR EACH ROW
EXECUTE FUNCTION update_session_participant_count();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamps on catalog_items
CREATE TRIGGER trg_catalog_items_updated_at
BEFORE UPDATE ON catalog_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update timestamps on participant_items
CREATE TRIGGER trg_participant_items_updated_at
BEFORE UPDATE ON participant_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View: Active sessions with participant counts
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT
  s.*,
  COUNT(DISTINCT p.id) as actual_participant_count,
  COALESCE(SUM(pi.quantity * ci.base_price), 0) as estimated_total_value
FROM sessions s
LEFT JOIN participants p ON s.id = p.session_id
LEFT JOIN participant_items pi ON p.id = pi.participant_id
LEFT JOIN catalog_items ci ON pi.item_id = ci.id
WHERE s.status IN ('open', 'active')
  AND s.expires_at > now()
GROUP BY s.id;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE sessions IS 'Shopping sessions for Minibag, Partybag, and Fitbag';
COMMENT ON TABLE participants IS 'Anonymous participants in shopping sessions';
COMMENT ON TABLE participant_items IS 'Items selected by participants with quantities and pricing';
COMMENT ON TABLE catalog_items IS 'Unified product catalog for all LocalLoops products';
COMMENT ON TABLE catalog_categories IS 'Product categories with hierarchical support';
COMMENT ON TABLE nicknames_pool IS 'Pool of fun, anonymous nicknames for participants';
COMMENT ON TABLE user_patterns IS 'User behavior patterns for smart reminders';

-- =============================================================================
-- INITIAL SETUP COMPLETE
-- =============================================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'LocalLoops database schema created successfully!';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run seed data script (002_seed_data.sql)';
  RAISE NOTICE '2. Verify tables: SELECT tablename FROM pg_tables WHERE schemaname = ''public'';';
  RAISE NOTICE '3. Test RLS policies';
END $$;
