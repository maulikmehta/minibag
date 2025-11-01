# Core Data Models

**Version:** 1.0
**Last Updated:** 2025-11-01
**Status:** Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Identity Layer](#identity-layer)
4. [Catalog Layer](#catalog-layer)
5. [Events Layer](#events-layer)
6. [Coordination Layer](#coordination-layer)
7. [Indexes & Performance](#indexes--performance)
8. [Data Governance](#data-governance)
9. [Migration Strategy](#migration-strategy)

---

## Overview

### Purpose

The LocalLoops Core Data Models define the **database schema** for the shared infrastructure that all apps (Minibag, StreetHawk, Fitbag, Partybag) will use.

### Database Technology

**Primary:** Supabase (PostgreSQL + realtime + auth)

**Why Supabase:**
- Managed PostgreSQL (scales from 0 to 10K+ users)
- Built-in realtime subscriptions (WebSocket)
- Row-Level Security (RLS) for multi-tenancy
- Built-in authentication (optional, for Phase 1+)
- Generous free tier (500MB database, 2GB bandwidth)

---

### Design Principles

1. **App-Scoped Data:** Logical partitioning by `app_id` (not separate databases)
2. **Privacy by Default:** No PII in public-facing tables
3. **Soft Deletes:** Never hard-delete, use `is_active` flags
4. **Multilingual:** All text fields have `*_local` JSONB columns
5. **Audit-Ready:** All tables have `created_at`, `updated_at` timestamps
6. **Scalable:** Indexed for common queries, partitioned for scale

---

## Database Architecture

### Layered Schema

```
┌─────────────────────────────────────────────────────┐
│  Apps (Minibag, StreetHawk, Fitbag, Partybag)     │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  Core Infrastructure Layers                         │
│  ┌─────────────────────────────────────────────┐   │
│  │  Identity Layer                             │   │
│  │  - users                                    │   │
│  │  - app_profiles                             │   │
│  │  - auth_sessions (future)                   │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │  Catalog Layer                              │   │
│  │  - catalog_categories                       │   │
│  │  - catalog_items                            │   │
│  │  - item_aliases (future)                    │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │  Events Layer                               │   │
│  │  - events (canonical event log)             │   │
│  │  - notifications                            │   │
│  └─────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────┐   │
│  │  Coordination Layer (Generic)               │   │
│  │  - sessions                                 │   │
│  │  - participants                             │   │
│  │  - participant_items                        │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## Identity Layer

### Phase 0: Current State (Session-Based)

**Status:** No persistent user accounts yet

**Identity Mechanism:**
- Session creators: Identified by `host_token` (stored in localStorage)
- Participants: Identified by `participant_id` (stored in localStorage)
- No cross-session identity linking

---

### Phase 1: Persistent User Accounts (Future)

#### Table: `users`

**Purpose:** Universal user identity across all LocalLoops apps

```sql
CREATE TABLE users (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Authentication
  phone TEXT UNIQUE NOT NULL,
  phone_verified BOOLEAN DEFAULT false,
  phone_verified_at TIMESTAMPTZ,

  -- Profile
  display_name TEXT,
  display_name_local JSONB,  -- { "en": "Maulik", "gu": "માઉલિક", "hi": "मौलिक" }

  -- Trust & Reputation
  trust_score DECIMAL DEFAULT 0.5,
  trust_score_updated_at TIMESTAMPTZ,
  verified_flags JSONB DEFAULT '{}',  -- { "phone": true, "email": false }

  -- Privacy
  consent_data_usage BOOLEAN DEFAULT false,
  consent_analytics BOOLEAN DEFAULT false,
  consent_given_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT valid_phone CHECK (phone ~ '^\+91[0-9]{10}$')
);

-- Indexes
CREATE INDEX idx_users_phone ON users(phone) WHERE is_active = true;
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_trust_score ON users(trust_score DESC);
```

**Sample Data:**
```json
{
  "id": "usr_abc123",
  "phone": "+919876543210",
  "phone_verified": true,
  "display_name": "Maulik Patel",
  "display_name_local": {
    "en": "Maulik Patel",
    "gu": "માઉલિક પટેલ",
    "hi": "मौलिक पटेल"
  },
  "trust_score": 0.85,
  "verified_flags": {
    "phone": true,
    "email": false
  },
  "consent_data_usage": true,
  "consent_analytics": true,
  "created_at": "2025-11-01T10:00:00Z",
  "last_login_at": "2025-11-01T12:00:00Z"
}
```

---

#### Table: `app_profiles`

**Purpose:** App-specific user data (keeps apps logically separated)

```sql
CREATE TABLE app_profiles (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,  -- 'minibag', 'streethawk', 'fitbag', 'partybag'

  -- App-specific role
  app_role TEXT NOT NULL DEFAULT 'user',  -- 'user', 'host', 'vendor', 'admin'

  -- App-specific preferences
  preferences JSONB DEFAULT '{}',  -- App can store any preferences

  -- App-specific stats
  stats JSONB DEFAULT '{}',  -- Computed stats

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,

  -- Constraints
  UNIQUE(user_id, app_id),
  CONSTRAINT valid_app_id CHECK (app_id IN ('minibag', 'streethawk', 'fitbag', 'partybag', 'core')),
  CONSTRAINT valid_app_role CHECK (app_role IN ('user', 'host', 'vendor', 'admin'))
);

-- Indexes
CREATE INDEX idx_app_profiles_user ON app_profiles(user_id);
CREATE INDEX idx_app_profiles_app ON app_profiles(app_id);
CREATE INDEX idx_app_profiles_user_app ON app_profiles(user_id, app_id);
```

**Sample Data:**
```json
{
  "id": "prof_xyz",
  "user_id": "usr_abc123",
  "app_id": "minibag",
  "app_role": "user",
  "preferences": {
    "language": "gu",
    "notifications": true,
    "defaultNeighborhood": "nbh_123"
  },
  "stats": {
    "sessionsCreated": 12,
    "sessionsJoined": 45,
    "completionRate": 0.92,
    "avgResponseTime": 120
  },
  "created_at": "2025-11-01T10:00:00Z",
  "last_active_at": "2025-11-01T12:00:00Z"
}
```

---

#### Table: `auth_sessions` (Future)

**Purpose:** JWT token management, blacklist

```sql
CREATE TABLE auth_sessions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token
  token_hash TEXT NOT NULL,  -- SHA-256 hash of JWT

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  invalidated_at TIMESTAMPTZ,

  -- Device info
  device_fingerprint TEXT,
  user_agent TEXT,
  ip_address TEXT,

  -- Constraints
  UNIQUE(token_hash)
);

-- Indexes
CREATE INDEX idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX idx_auth_sessions_token ON auth_sessions(token_hash);
CREATE INDEX idx_auth_sessions_valid ON auth_sessions(expires_at)
  WHERE invalidated_at IS NULL AND expires_at > now();
```

---

#### Table: `trust_events`

**Purpose:** Track events that affect trust score

```sql
CREATE TABLE trust_events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Event
  event_type TEXT NOT NULL,  -- 'session_completed', 'payment_completed', 'dispute', 'late', etc.
  impact DECIMAL NOT NULL,  -- -0.1 to +0.1

  -- Context
  session_id UUID,
  app_id TEXT,
  metadata JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      'session_completed', 'session_cancelled',
      'payment_completed', 'payment_failed',
      'on_time', 'late',
      'dispute_reported', 'dispute_resolved',
      'positive_feedback', 'negative_feedback'
    )
  )
);

-- Indexes
CREATE INDEX idx_trust_events_user ON trust_events(user_id);
CREATE INDEX idx_trust_events_type ON trust_events(event_type);
CREATE INDEX idx_trust_events_session ON trust_events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_trust_events_created ON trust_events(created_at DESC);
```

**Sample Data:**
```json
{
  "id": "te_123",
  "user_id": "usr_abc123",
  "event_type": "session_completed",
  "impact": 0.05,
  "session_id": "sess_xyz",
  "app_id": "minibag",
  "metadata": {
    "participantCount": 5,
    "onTime": true
  },
  "created_at": "2025-11-01T15:00:00Z"
}
```

---

## Catalog Layer

### Table: `catalog_categories`

**Purpose:** Product categories for all LocalLoops apps

**Current Schema:**
```sql
CREATE TABLE catalog_categories (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT UNIQUE NOT NULL,  -- 'cat_veggies', 'cat_staples'

  -- Basic info
  name TEXT NOT NULL,
  name_local JSONB,  -- { "en": "Veggies", "gu": "શાકભાજી", "hi": "सब्जियां" }
  parent_id UUID REFERENCES catalog_categories(id),

  -- Visual
  icon TEXT,  -- 'vegetable', 'grain', 'dairy'
  emoji TEXT,  -- '🥬', '🌾', '🥛'
  color TEXT,  -- 'bg-green-100', 'bg-yellow-100'

  -- Applicability
  applicable_types TEXT[] NOT NULL,  -- ['minibag', 'streethawk']

  -- Admin
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_categories_type ON catalog_categories USING GIN(applicable_types);
CREATE INDEX idx_categories_active ON catalog_categories(is_active) WHERE is_active = true;
CREATE INDEX idx_categories_parent ON catalog_categories(parent_id) WHERE parent_id IS NOT NULL;
```

**Sample Data:**
```json
{
  "id": "cat_uuid_123",
  "category_id": "cat_veggies",
  "name": "Veggies",
  "name_local": {
    "en": "Veggies",
    "gu": "શાકભાજી",
    "hi": "सब्जियां"
  },
  "parent_id": null,
  "icon": "vegetable",
  "emoji": "🥬",
  "color": "bg-green-100",
  "applicable_types": ["minibag", "streethawk"],
  "sort_order": 1,
  "is_active": true,
  "created_at": "2025-11-01T10:00:00Z"
}
```

---

### Table: `catalog_items`

**Purpose:** Unified product catalog for all apps

**Current Schema:**
```sql
CREATE TABLE catalog_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id TEXT UNIQUE NOT NULL,  -- 'tomatoes', 'onions'

  -- Basic info
  name TEXT NOT NULL,
  name_hi TEXT,
  name_gu TEXT,
  name_local JSONB,  -- Future: Consolidated multilingual
  category_id UUID REFERENCES catalog_categories(id),

  -- Visual
  thumbnail_url TEXT,
  thumbnail_small TEXT,
  thumbnail_large TEXT,
  emoji TEXT,
  alt_text TEXT,

  -- Pricing
  unit TEXT NOT NULL,  -- 'kg', 'liters', 'pieces'
  base_price DECIMAL,
  bulk_price DECIMAL,

  -- Applicability
  applicable_types TEXT[] NOT NULL,  -- ['minibag', 'streethawk']

  -- Metadata
  tags TEXT[],  -- ['seasonal', 'popular', 'organic']
  popular BOOLEAN DEFAULT false,
  seasonal BOOLEAN DEFAULT false,
  seasonality TEXT,  -- 'High', 'Medium', 'Low'
  repeat_cycle TEXT,  -- 'Daily', 'Weekly', 'Monthly'

  -- Business logic
  bulk_threshold INTEGER,
  max_quantity INTEGER,
  min_quantity DECIMAL DEFAULT 0.25,
  default_quantity DECIMAL DEFAULT 0.5,

  -- Admin
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,

  -- Constraints
  CONSTRAINT valid_unit CHECK (unit IN ('kg', 'liters', 'pieces', 'grams', 'bunches')),
  CONSTRAINT valid_seasonality CHECK (seasonality IN ('High', 'Medium', 'Low', NULL)),
  CONSTRAINT valid_repeat_cycle CHECK (repeat_cycle IN ('Daily', 'Weekly', 'Monthly', 'Seasonal', NULL))
);

-- Indexes
CREATE INDEX idx_catalog_items_type ON catalog_items USING GIN(applicable_types);
CREATE INDEX idx_catalog_items_active ON catalog_items(is_active) WHERE is_active = true;
CREATE INDEX idx_catalog_items_popular ON catalog_items(popular) WHERE popular = true;
CREATE INDEX idx_catalog_items_category ON catalog_items(category_id);
CREATE INDEX idx_catalog_items_tags ON catalog_items USING GIN(tags);
```

**Sample Data:**
```json
{
  "id": "item_uuid_123",
  "item_id": "tomatoes",
  "name": "Tomatoes",
  "name_hi": "टमाटर",
  "name_gu": "ટામેટાં",
  "name_local": {
    "en": "Tomatoes",
    "gu": "ટામેટાં",
    "hi": "टमाटर"
  },
  "category_id": "cat_uuid_123",
  "thumbnail_url": "https://cdn.localloops.in/items/tomatoes.jpg",
  "emoji": "🍅",
  "unit": "kg",
  "base_price": 30,
  "bulk_price": 25,
  "applicable_types": ["minibag", "streethawk"],
  "tags": ["popular", "seasonal"],
  "popular": true,
  "seasonal": true,
  "seasonality": "High",
  "repeat_cycle": "Weekly",
  "min_quantity": 0.25,
  "default_quantity": 0.5,
  "max_quantity": 10,
  "is_active": true,
  "sort_order": 1
}
```

---

### Table: `item_aliases` (Future)

**Purpose:** Voice search and multilingual aliases

```sql
CREATE TABLE item_aliases (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES catalog_items(id) ON DELETE CASCADE,

  -- Alias
  alias TEXT NOT NULL,
  language TEXT NOT NULL,  -- 'en', 'gu', 'hi'

  -- Metadata
  alias_type TEXT,  -- 'phonetic', 'regional', 'common'
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  UNIQUE(item_id, alias, language),
  CONSTRAINT valid_language CHECK (language IN ('en', 'gu', 'hi', 'ta', 'te', 'mr', 'kn', 'bn', 'ml', 'pa'))
);

-- Indexes
CREATE INDEX idx_item_aliases_item ON item_aliases(item_id);
CREATE INDEX idx_item_aliases_alias ON item_aliases(alias);
CREATE INDEX idx_item_aliases_language ON item_aliases(language);
CREATE INDEX idx_item_aliases_usage ON item_aliases(usage_count DESC);

-- Full-text search index (PostgreSQL)
CREATE INDEX idx_item_aliases_alias_fts ON item_aliases USING gin(to_tsvector('english', alias));
```

**Sample Data:**
```json
[
  {
    "item_id": "item_uuid_123",
    "alias": "tamatar",
    "language": "hi",
    "alias_type": "phonetic"
  },
  {
    "item_id": "item_uuid_123",
    "alias": "tameta",
    "language": "gu",
    "alias_type": "phonetic"
  },
  {
    "item_id": "item_uuid_123",
    "alias": "टमाटर",
    "language": "hi",
    "alias_type": "common"
  }
]
```

---

## Events Layer

### Table: `events`

**Purpose:** Canonical event log for all apps (event sourcing)

```sql
CREATE TABLE events (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT UNIQUE NOT NULL,  -- 'evt_abc123'

  -- Event metadata
  event_type TEXT NOT NULL,  -- 'session_created', 'participant_joined', etc.
  event_version TEXT DEFAULT '1.0',

  -- Source
  app_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  session_id UUID,

  -- Payload
  data JSONB NOT NULL,

  -- Targets (for routing)
  target_app TEXT,
  target_users UUID[],

  -- Processing
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_app_id CHECK (app_id IN ('minibag', 'streethawk', 'fitbag', 'partybag', 'core')),
  CONSTRAINT valid_event_type CHECK (
    event_type IN (
      -- Session events
      'session_created', 'session_updated', 'session_completed', 'session_cancelled',
      -- Participant events
      'participant_joined', 'participant_left', 'participant_items_updated',
      -- Vendor events (StreetHawk)
      'vendor_search_request', 'vendor_confirmed', 'vendor_declined',
      -- Payment events
      'payment_initiated', 'payment_completed', 'payment_failed',
      -- Trust events
      'trust_score_updated',
      -- Custom events
      'custom'
    )
  )
);

-- Indexes
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_app ON events(app_id);
CREATE INDEX idx_events_user ON events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_session ON events(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX idx_events_created ON events(created_at DESC);
CREATE INDEX idx_events_unprocessed ON events(processed) WHERE processed = false;
CREATE INDEX idx_events_target_app ON events(target_app) WHERE target_app IS NOT NULL;

-- Partitioning (for scale - future)
-- Partition by created_at (monthly)
```

**Sample Data:**
```json
{
  "id": "uuid_123",
  "event_id": "evt_abc123",
  "event_type": "session_created",
  "event_version": "1.0",
  "app_id": "minibag",
  "user_id": "usr_abc123",
  "session_id": "sess_xyz",
  "data": {
    "sessionId": "abcd1234",
    "hostId": "usr_abc123",
    "neighborhoodId": "nbh_123",
    "scheduledTime": "2025-11-01T14:00:00Z",
    "status": "active"
  },
  "target_app": "streethawk",
  "target_users": ["usr_vendor_123"],
  "processed": false,
  "created_at": "2025-11-01T13:30:00Z"
}
```

---

### Table: `notifications`

**Purpose:** User-facing notifications

```sql
CREATE TABLE notifications (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Target
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL,

  -- Notification content
  type TEXT NOT NULL,  -- 'info', 'success', 'warning', 'error'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,

  -- Priority
  priority TEXT DEFAULT 'normal',  -- 'low', 'normal', 'high', 'urgent'

  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Delivery
  delivered BOOLEAN DEFAULT false,
  delivered_at TIMESTAMPTZ,
  delivery_method TEXT,  -- 'push', 'in_app', 'sms', 'email'

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_type CHECK (type IN ('info', 'success', 'warning', 'error')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

-- Indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX idx_notifications_priority ON notifications(priority, created_at DESC);
CREATE INDEX idx_notifications_app ON notifications(app_id);
```

**Sample Data:**
```json
{
  "id": "ntf_123",
  "user_id": "usr_abc123",
  "app_id": "minibag",
  "type": "info",
  "title": "Session starting soon",
  "message": "Your shopping session starts in 15 minutes",
  "action_url": "/sessions/abcd1234",
  "priority": "high",
  "is_read": false,
  "delivered": true,
  "delivered_at": "2025-11-01T13:45:00Z",
  "delivery_method": "in_app",
  "created_at": "2025-11-01T13:45:00Z"
}
```

---

## Coordination Layer

### Table: `sessions`

**Purpose:** Generic coordination sessions (shopping, fitness, events)

**Current Schema (Minibag-specific, needs generalization):**
```sql
CREATE TABLE sessions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,  -- 'abcd1234' (short, shareable)
  session_type TEXT NOT NULL,  -- 'minibag', 'streethawk', 'fitbag', 'partybag'

  -- Creator
  creator_id UUID REFERENCES users(id),  -- Future: Link to users table
  creator_nickname TEXT NOT NULL,  -- Anonymous display

  -- Location (coarse-grained)
  location_text TEXT NOT NULL,  -- "Bodakdev, Ahmedabad"
  neighborhood TEXT,  -- Future: Link to neighborhoods table
  neighborhood_id UUID,

  -- Timing
  scheduled_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT DEFAULT 'open',  -- 'open', 'active', 'shopping', 'completed', 'expired', 'cancelled'

  -- Metadata
  title TEXT,
  description TEXT,

  -- Capacity
  max_participants INTEGER DEFAULT 5,
  participant_count INTEGER DEFAULT 0,  -- Auto-updated via trigger
  max_weight_kg INTEGER DEFAULT 20,  -- Minibag-specific

  -- Calculated stats
  total_demand_value DECIMAL DEFAULT 0,

  -- Pro features
  is_pro BOOLEAN DEFAULT false,
  guaranteed_arrival BOOLEAN DEFAULT false,  -- Pro tier

  -- Vendor (StreetHawk integration)
  vendor_confirmed BOOLEAN DEFAULT false,
  vendor_id UUID,
  vendor_confirmed_at TIMESTAMPTZ,

  -- Admin
  is_active BOOLEAN DEFAULT true,
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_session_type CHECK (session_type IN ('minibag', 'streethawk', 'fitbag', 'partybag')),
  CONSTRAINT valid_status CHECK (status IN ('open', 'active', 'shopping', 'completed', 'expired', 'cancelled'))
);

-- Indexes
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_time);
CREATE INDEX idx_sessions_creator ON sessions(creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX idx_sessions_neighborhood ON sessions(neighborhood_id) WHERE neighborhood_id IS NOT NULL;
CREATE INDEX idx_sessions_type_status ON sessions(session_type, status);
CREATE INDEX idx_sessions_active ON sessions(status, expires_at) WHERE status IN ('open', 'active') AND expires_at > now();
```

**Sample Data:**
```json
{
  "id": "sess_uuid_123",
  "session_id": "abcd1234",
  "session_type": "minibag",
  "creator_id": "usr_abc123",
  "creator_nickname": "Dev",
  "location_text": "Bodakdev, Ahmedabad",
  "neighborhood_id": "nbh_123",
  "scheduled_time": "2025-11-01T14:00:00Z",
  "created_at": "2025-11-01T13:00:00Z",
  "expires_at": "2025-11-01T15:00:00Z",
  "status": "active",
  "title": "Morning veggies run",
  "max_participants": 5,
  "participant_count": 3,
  "max_weight_kg": 20,
  "is_pro": true,
  "guaranteed_arrival": true,
  "vendor_confirmed": true,
  "vendor_id": "vnd_123",
  "vendor_confirmed_at": "2025-11-01T13:45:00Z"
}
```

---

### Table: `participants`

**Purpose:** Session participants with anonymous identity

**Current Schema:**
```sql
CREATE TABLE participants (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),  -- Future: Link to users

  -- Anonymous identity
  nickname TEXT NOT NULL,  -- '3-letter nickname (e.g., "Dev", "Sam")
  real_name TEXT,  -- First name (e.g., "Maulik")
  avatar_emoji TEXT NOT NULL,  -- '👨', '👩', etc.

  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_creator BOOLEAN DEFAULT false,

  -- Status
  locked BOOLEAN DEFAULT false,  -- Items locked (shopping started)
  locked_at TIMESTAMPTZ,

  -- Timeout protection
  last_activity_at TIMESTAMPTZ DEFAULT now(),
  timeout_warned BOOLEAN DEFAULT false,

  -- Admin
  is_active BOOLEAN DEFAULT true,
  left_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(session_id, nickname)
);

-- Indexes
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_user ON participants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_participants_session_user ON participants(session_id, user_id);
CREATE INDEX idx_participants_active ON participants(session_id, is_active) WHERE is_active = true;
```

**Sample Data:**
```json
{
  "id": "prt_uuid_123",
  "session_id": "sess_uuid_123",
  "user_id": "usr_abc123",
  "nickname": "Dev",
  "real_name": "Maulik",
  "avatar_emoji": "👨",
  "joined_at": "2025-11-01T13:05:00Z",
  "is_creator": true,
  "locked": false,
  "last_activity_at": "2025-11-01T13:30:00Z",
  "is_active": true
}
```

---

### Table: `participant_items`

**Purpose:** Items selected by participants in sessions

**Current Schema:**
```sql
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

  -- Status
  confirmed BOOLEAN DEFAULT false,  -- Item purchase confirmed
  confirmed_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('upi', 'cash', NULL)),
  UNIQUE(participant_id, item_id)
);

-- Indexes
CREATE INDEX idx_participant_items_participant ON participant_items(participant_id);
CREATE INDEX idx_participant_items_item ON participant_items(item_id);
CREATE INDEX idx_participant_items_confirmed ON participant_items(confirmed) WHERE confirmed = true;
CREATE INDEX idx_item_price_history ON participant_items(item_id, paid_at DESC) WHERE paid_at IS NOT NULL;
```

**Sample Data:**
```json
{
  "id": "pi_uuid_123",
  "participant_id": "prt_uuid_123",
  "item_id": "item_uuid_123",
  "quantity": 2.0,
  "unit": "kg",
  "notes": null,
  "price_paid": 60,
  "price_per_unit": 30,
  "paid_at": "2025-11-01T14:30:00Z",
  "payment_method": "upi",
  "confirmed": true,
  "confirmed_at": "2025-11-01T14:30:00Z",
  "created_at": "2025-11-01T13:10:00Z",
  "updated_at": "2025-11-01T14:30:00Z"
}
```

---

### Table: `nicknames_pool`

**Purpose:** Pool of anonymous nicknames for participants

**Current Schema:**
```sql
CREATE TABLE nicknames_pool (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT UNIQUE NOT NULL,  -- '3-letter (e.g., "Dev", "Sam", "Avi")
  avatar_emoji TEXT NOT NULL,

  -- Availability
  is_available BOOLEAN DEFAULT true,
  currently_used_in UUID REFERENCES sessions(id),

  -- Usage stats
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,

  -- Categorization
  gender TEXT,  -- 'male', 'female', 'neutral'
  language_origin TEXT,  -- 'hindi', 'gujarati', 'english'
  difficulty_level TEXT,  -- 'easy', 'medium', 'hard'

  -- Admin
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_gender CHECK (gender IN ('male', 'female', 'neutral', NULL))
);

-- Indexes
CREATE INDEX idx_nicknames_available ON nicknames_pool(is_available) WHERE is_available = true;
CREATE INDEX idx_nicknames_usage ON nicknames_pool(times_used);
CREATE INDEX idx_nicknames_gender ON nicknames_pool(gender) WHERE is_available = true;
```

**Sample Data:**
```json
{
  "id": "nn_uuid_123",
  "nickname": "Dev",
  "avatar_emoji": "👨",
  "is_available": true,
  "currently_used_in": null,
  "times_used": 12,
  "last_used": "2025-10-31T10:00:00Z",
  "gender": "male",
  "language_origin": "hindi",
  "difficulty_level": "easy",
  "created_at": "2025-10-01T10:00:00Z"
}
```

---

## Indexes & Performance

### Query Patterns & Optimization

**Common Query: Get active sessions in neighborhood**
```sql
-- Before: Full table scan
SELECT * FROM sessions WHERE neighborhood_id = 'nbh_123' AND status = 'active';

-- After: Uses composite index
CREATE INDEX idx_sessions_neighborhood_status ON sessions(neighborhood_id, status)
  WHERE status IN ('open', 'active');
```

**Common Query: Get user's unread notifications**
```sql
-- Before: Sequential scan
SELECT * FROM notifications WHERE user_id = 'usr_123' AND is_read = false;

-- After: Uses partial index
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read)
  WHERE is_read = false;
```

**Common Query: Search items by name (multilingual)**
```sql
-- Before: LIKE query (slow)
SELECT * FROM catalog_items WHERE name ILIKE '%tamatar%' OR name_hi ILIKE '%tamatar%';

-- After: Full-text search with aliases
CREATE INDEX idx_item_aliases_fts ON item_aliases USING gin(to_tsvector('simple', alias));

SELECT DISTINCT i.*
FROM catalog_items i
JOIN item_aliases a ON i.id = a.item_id
WHERE to_tsvector('simple', a.alias) @@ to_tsquery('simple', 'tamatar');
```

---

### Partitioning Strategy (Future - 10K+ sessions)

**Table: `events` (partition by month)**
```sql
-- Parent table
CREATE TABLE events (
  -- columns...
  created_at TIMESTAMPTZ DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Monthly partitions
CREATE TABLE events_2025_11 PARTITION OF events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE events_2025_12 PARTITION OF events
  FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- Auto-create partitions via pg_partman (extension)
```

**Table: `sessions` (partition by type + status)**
```sql
-- Partition active sessions separately (hot data)
CREATE TABLE sessions_active PARTITION OF sessions
  FOR VALUES IN ('open', 'active', 'shopping');

-- Partition completed sessions (cold data)
CREATE TABLE sessions_completed PARTITION OF sessions
  FOR VALUES IN ('completed', 'expired', 'cancelled');
```

---

## Data Governance

### Privacy Compliance (DPDPA 2023)

**Data Minimization:**
- Collect only what's necessary for coordination
- Delete raw session data after 30 days (keep anonymized aggregates)

**User Rights:**
1. **Right to Access:** `GET /api/identity/me` returns all user data
2. **Right to Delete:** `DELETE /api/identity/me` soft-deletes user
3. **Right to Portability:** `GET /api/identity/export` returns JSON export

**Anonymization Pipeline:**
```sql
-- After session completion, anonymize participant details
CREATE OR REPLACE FUNCTION anonymize_completed_sessions()
RETURNS void AS $$
BEGIN
  -- Sessions older than 30 days
  UPDATE participants
  SET
    real_name = NULL,
    user_id = NULL,
    nickname = 'User' || id
  WHERE session_id IN (
    SELECT id FROM sessions
    WHERE status = 'completed'
    AND created_at < now() - INTERVAL '30 days'
  );
END;
$$ LANGUAGE plpgsql;

-- Run daily via cron job
```

---

### Audit Logging

**Table: `audit_log` (Future)**
```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Actor
  user_id UUID,
  app_id TEXT,

  -- Action
  action TEXT NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'READ'
  resource_type TEXT NOT NULL,  -- 'users', 'sessions', 'catalog_items'
  resource_id UUID,

  -- Changes
  old_value JSONB,
  new_value JSONB,

  -- Context
  ip_address TEXT,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_resource ON audit_log(resource_type, resource_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
```

---

## Migration Strategy

### Phase 0 → Phase 1: Add Persistent Users

**Step 1: Create `users` and `app_profiles` tables**
```sql
-- See Identity Layer schemas above
CREATE TABLE users (...);
CREATE TABLE app_profiles (...);
```

**Step 2: Link existing sessions to users**
```sql
-- Add user_id column to sessions (nullable initially)
ALTER TABLE sessions ADD COLUMN user_id UUID REFERENCES users(id);

-- Migrate: When user logs in, associate past sessions
UPDATE sessions
SET user_id = 'usr_abc123'
WHERE creator_id IS NULL
  AND creator_nickname IN (
    SELECT nickname FROM participants WHERE user_id = 'usr_abc123'
  );
```

**Step 3: Deprecate `host_token`**
- After 80% migration, require JWT for new sessions
- After 95% migration, remove `host_token` support

---

### Phase 1 → Phase 2: Migrate to Item Aliases

**Step 1: Create `item_aliases` table**
```sql
CREATE TABLE item_aliases (...);
```

**Step 2: Migrate existing aliases from `catalog_items`**
```sql
-- Extract Hindi name as alias
INSERT INTO item_aliases (item_id, alias, language, alias_type)
SELECT id, name_hi, 'hi', 'common'
FROM catalog_items
WHERE name_hi IS NOT NULL AND name_hi != '';

-- Extract Gujarati name as alias
INSERT INTO item_aliases (item_id, alias, language, alias_type)
SELECT id, name_gu, 'gu', 'common'
FROM catalog_items
WHERE name_gu IS NOT NULL AND name_gu != '';
```

**Step 3: Deprecate `name_hi`, `name_gu` columns**
```sql
-- After migration, drop old columns
ALTER TABLE catalog_items DROP COLUMN name_hi;
ALTER TABLE catalog_items DROP COLUMN name_gu;

-- Use name_local JSONB instead
ALTER TABLE catalog_items ADD COLUMN name_local JSONB;
```

---

### Backup & Restore

**Automated Backups (Supabase):**
- Daily automated backups (retained for 7 days on free tier)
- Point-in-time recovery (PITR) available on Pro tier

**Manual Backup:**
```bash
# Export schema
pg_dump --schema-only -h db.supabase.co -U postgres localloops > schema.sql

# Export data (specific tables)
pg_dump --data-only -t catalog_items -t catalog_categories -h db.supabase.co -U postgres localloops > catalog_data.sql
```

**Restore:**
```bash
# Restore schema
psql -h db.supabase.co -U postgres localloops < schema.sql

# Restore data
psql -h db.supabase.co -U postgres localloops < catalog_data.sql
```

---

## Related Documents

- [LocalLoops Design System](./LOCALLOOPS_DESIGN_SYSTEM.md)
- [Shared Component Library Structure](./SHARED_COMPONENT_LIBRARY.md)
- [Core Infrastructure API Specification](./CORE_API_SPECIFICATION.md)

---

**Maintained by:** LocalLoops Core Team
**Questions?** Open an issue in the repository
