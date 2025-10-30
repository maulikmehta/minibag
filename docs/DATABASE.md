# Database Design & Strategy

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Decision Status:** Firebase vs Supabase - DECISION REQUIRED

---

## 🎯 Overview

This document defines the database architecture for LocalLoops platform, covering choice rationale, schema design, and implementation strategy.

**Critical Decision:** Choose between Firebase and Supabase before backend development.

---

## ⚖️ Database Choice: Firebase vs Supabase

### Decision Matrix

| Criterion | Firebase (Firestore) | Supabase (PostgreSQL) | Winner |
|-----------|---------------------|----------------------|--------|
| **Setup Speed** | Very fast (15 min) | Medium (30 min) | Firebase |
| **Real-time** | Native, excellent | Postgres pub/sub, good | Firebase |
| **Cost (MVP)** | ₹0-2,000/month | ₹0-1,000/month | Supabase |
| **Cost (Scale)** | ₹10k-30k/month | ₹3k-8k/month | Supabase |
| **Query Flexibility** | Limited (NoSQL) | Full SQL power | Supabase |
| **Learning Curve** | Easy | Medium | Firebase |
| **Data Model Fit** | Okay (NoSQL) | Perfect (Relational) | Supabase |
| **Vendor Lock-in** | High | Low (Postgres) | Supabase |
| **Local Development** | Emulator | Direct DB | Supabase |
| **Auth Integration** | Excellent | Excellent | Tie |
| **Community** | Large | Growing fast | Firebase |

### Cost Comparison (Detailed)

#### **MVP (0-300 Users)**

**Firebase:**
```
Reads: 100k/day × 30 = 3M/month
Writes: 10k/day × 30 = 300k/month

Firestore Pricing:
- Reads: 3M × ₹0.0004 = ₹1,200
- Writes: 300k × ₹0.0012 = ₹360
- Storage: 1GB = ₹200
Total: ₹1,760/month
```

**Supabase:**
```
Free tier: 500MB DB, 2GB storage, 50k MAU
Cost: ₹0/month (within limits)

Pro tier (if needed): $25/month = ₹2,000/month
```

#### **Scale (1000-3000 Users)**

**Firebase:**
```
Reads: 1M/day × 30 = 30M/month
Writes: 100k/day × 30 = 3M/month

Firestore Pricing:
- Reads: 30M × ₹0.0004 = ₹12,000
- Writes: 3M × ₹0.0012 = ₹3,600
- Storage: 5GB = ₹1,000
- Bandwidth: 50GB × ₹120/GB = ₹6,000
Total: ₹22,600/month
```

**Supabase:**
```
Pro Plan: $25/month = ₹2,000/month
+ Compute: ~₹2,000/month
+ Storage: ~₹500/month
Total: ₹4,500/month
```

**Supabase is 5x cheaper at scale.**

---

## 🎯 Recommendation: **Supabase**

### Why Supabase?

1. **Your data is relational:**
   ```
   Sessions → Participants (one-to-many)
   Sessions → Items (many-to-many)
   Users → Sessions (one-to-many)
   ```
   Perfect for PostgreSQL, awkward in NoSQL.

2. **Cost matters:**
   - Free for MVP
   - 5x cheaper at scale
   - Predictable pricing

3. **SQL power:**
   ```sql
   -- Easy in Postgres, hard in Firestore
   SELECT s.*, COUNT(p.id) as participants
   FROM sessions s
   LEFT JOIN participants p ON s.id = p.session_id
   WHERE s.status = 'active'
   GROUP BY s.id
   ```

4. **No vendor lock-in:**
   - It's just PostgreSQL
   - Can migrate to self-hosted if needed
   - Standard SQL knowledge applies

5. **Local development:**
   ```bash
   supabase start
   # Full local DB running
   ```

### When to Choose Firebase Instead

Choose Firebase if:
- You need ultra-fast setup (launch in 1 week)
- Real-time is absolutely critical (Firestore is faster)
- You're already familiar with Firebase
- Cost is not a concern

**For LocalLoops: Supabase is the right choice.**

---

## 🗄️ Database Schema (PostgreSQL)

### Core Tables

#### **1. sessions**
```sql
CREATE TABLE sessions (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT UNIQUE NOT NULL,              -- Short code: "abc123"
  session_type TEXT NOT NULL,                    -- minibag, partybag, fitbag
  
  -- Creator
  creator_id UUID REFERENCES auth.users(id),     -- NULL for guest sessions
  creator_nickname TEXT NOT NULL,                -- Anonymous name
  
  -- Location (text only, no GPS)
  location_text TEXT NOT NULL,                   -- "Building A, Gate 2"
  neighborhood TEXT,                             -- For analytics
  
  -- Timing
  scheduled_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,               -- +2 hours after scheduled
  
  -- Status
  status TEXT DEFAULT 'open',                    -- open, active, shopping, completed, expired, cancelled
  
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

-- Indexes for performance
CREATE INDEX idx_sessions_type ON sessions(session_type);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_scheduled ON sessions(scheduled_time);
CREATE INDEX idx_sessions_creator ON sessions(creator_id) WHERE creator_id IS NOT NULL;
CREATE INDEX idx_sessions_neighborhood ON sessions(neighborhood) WHERE neighborhood IS NOT NULL;
```

#### **2. participants**
```sql
CREATE TABLE participants (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),        -- NULL for guest participants
  
  -- Anonymous identity
  nickname TEXT NOT NULL,                        -- Auto-generated
  avatar_emoji TEXT NOT NULL,                    -- Random emoji
  
  -- Metadata
  joined_at TIMESTAMPTZ DEFAULT now(),
  is_creator BOOLEAN DEFAULT false,
  
  -- Status
  locked BOOLEAN DEFAULT false,                  -- Has participant locked their order?
  locked_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(session_id, nickname)                   -- No duplicate nicknames in session
);

-- Indexes
CREATE INDEX idx_participants_session ON participants(session_id);
CREATE INDEX idx_participants_user ON participants(user_id) WHERE user_id IS NOT NULL;
```

#### **3. participant_items**
```sql
CREATE TABLE participant_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES catalog_items(id),
  
  -- Quantity
  quantity DECIMAL NOT NULL,                     -- 2.5kg, 1 piece, etc.
  unit TEXT NOT NULL,                            -- kg, piece, hour, session
  notes TEXT,                                    -- Optional participant notes
  
  -- Payment tracking (filled after shopping)
  price_paid DECIMAL,                            -- Total paid for this item
  price_per_unit DECIMAL,                        -- Calculated: price_paid / quantity
  paid_at TIMESTAMPTZ,
  payment_method TEXT,                           -- upi, cash
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_payment_method CHECK (payment_method IN ('upi', 'cash', NULL)),
  UNIQUE(participant_id, item_id)                -- One entry per item per participant
);

-- Indexes
CREATE INDEX idx_participant_items_participant ON participant_items(participant_id);
CREATE INDEX idx_participant_items_item ON participant_items(item_id);
CREATE INDEX idx_item_price_history ON participant_items(participant_id, item_id, paid_at DESC);
```

#### **4. catalog_items** (Unified Catalog)
```sql
CREATE TABLE catalog_items (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id TEXT UNIQUE NOT NULL,                  -- "v001", "c001", "f001"
  
  -- Basic info
  name TEXT NOT NULL,                            -- "Tomatoes"
  name_hi TEXT,                                  -- "टमाटर"
  name_gu TEXT,                                  -- "ટામેટાં"
  category_id UUID REFERENCES catalog_categories(id),
  
  -- Visual
  thumbnail_url TEXT,
  thumbnail_small TEXT,
  thumbnail_large TEXT,
  emoji TEXT,
  alt_text TEXT,
  
  -- Pricing
  unit TEXT NOT NULL,                            -- kg, piece, hour, session
  base_price DECIMAL,                            -- Individual price (reference)
  bulk_price DECIMAL,                            -- Bulk discount price
  
  -- Product applicability (KEY FIELD)
  applicable_types TEXT[] NOT NULL,              -- {minibag}, {partybag}, {fitbag}
  
  -- Metadata
  tags TEXT[],                                   -- {fresh, daily}, {celebration}
  popular BOOLEAN DEFAULT false,
  seasonal BOOLEAN DEFAULT false,
  
  -- Business logic
  bulk_threshold INTEGER,                        -- Min quantity for bulk price
  max_quantity INTEGER,                          -- Optional limit per participant
  
  -- Admin
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX idx_catalog_items_type ON catalog_items USING GIN(applicable_types);
CREATE INDEX idx_catalog_items_active ON catalog_items(is_active) WHERE is_active = true;
CREATE INDEX idx_catalog_items_popular ON catalog_items(popular) WHERE popular = true;
```

#### **5. catalog_categories**
```sql
CREATE TABLE catalog_categories (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id TEXT UNIQUE NOT NULL,              -- "vegetables", "cakes", "fitness"
  
  -- Basic info
  name TEXT NOT NULL,                            -- "Vegetables"
  parent_id UUID REFERENCES catalog_categories(id),
  
  -- Visual
  icon TEXT,                                     -- Emoji or icon name
  color TEXT,                                    -- Hex color for UI
  
  -- Product applicability (KEY FIELD)
  applicable_types TEXT[] NOT NULL,              -- {minibag}, {partybag}, {fitbag}
  
  -- Admin
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_categories_type ON catalog_categories USING GIN(applicable_types);
CREATE INDEX idx_categories_active ON catalog_categories(is_active) WHERE is_active = true;
```

#### **6. nicknames_pool** (Anonymous Identity)
```sql
CREATE TABLE nicknames_pool (
  -- Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nickname TEXT UNIQUE NOT NULL,                 -- "Raj", "Maya", "Amit"
  avatar_emoji TEXT NOT NULL,                    -- "👑", "🌸", "⚡"
  
  -- Availability
  is_available BOOLEAN DEFAULT true,
  currently_used_in UUID REFERENCES sessions(id), -- NULL when available
  
  -- Usage stats
  times_used INTEGER DEFAULT 0,
  last_used TIMESTAMPTZ,
  
  -- Categorization
  gender TEXT,                                   -- male, female, neutral
  language_origin TEXT,                          -- hindi, gujarati, tamil
  difficulty_level TEXT,                         -- easy, medium
  
  -- Admin
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nicknames_available ON nicknames_pool(is_available) WHERE is_available = true;
CREATE INDEX idx_nicknames_usage ON nicknames_pool(times_used);
```

#### **7. user_patterns** (Smart Features)
```sql
CREATE TABLE user_patterns (
  -- Identity
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  
  -- Pattern detection
  avg_days_between_sessions INTEGER,
  usual_day_of_week INTEGER,                     -- 0=Sunday, 6=Saturday
  pattern_confidence DECIMAL,                    -- 0.0 to 1.0
  pattern_type TEXT,                             -- weekly, biweekly, irregular
  
  -- Reminders
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_method TEXT,                          -- web_push, sms, whatsapp
  last_reminded_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔒 Row-Level Security (RLS)

Supabase uses PostgreSQL's RLS for security:

```sql
-- Enable RLS on all tables
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_items ENABLE ROW LEVEL SECURITY;

-- Sessions: Public read for active sessions
CREATE POLICY "Anyone can view active sessions"
ON sessions FOR SELECT
USING (status IN ('open', 'active'));

-- Sessions: Creator can update their own
CREATE POLICY "Creators can update their sessions"
ON sessions FOR UPDATE
USING (creator_id = auth.uid());

-- Participants: Session members can view
CREATE POLICY "Session members can view participants"
ON participants FOR SELECT
USING (
  session_id IN (
    SELECT session_id FROM participants WHERE user_id = auth.uid()
  )
  OR
  session_id IN (
    SELECT id FROM sessions WHERE creator_id = auth.uid()
  )
);

-- Participant items: Users can only view their own items
CREATE POLICY "Users can only view own items"
ON participant_items FOR SELECT
USING (
  participant_id IN (
    SELECT id FROM participants WHERE user_id = auth.uid()
  )
);

-- Catalog: Public read, admin write
CREATE POLICY "Anyone can view active catalog"
ON catalog_items FOR SELECT
USING (is_active = true);

CREATE POLICY "Only admins can modify catalog"
ON catalog_items FOR ALL
USING (auth.uid() IN (SELECT id FROM auth.users WHERE role = 'admin'));
```

---

## 📊 Query Patterns

### Common Queries

#### **Get Active Sessions (for homepage)**
```sql
SELECT 
  s.*,
  COUNT(DISTINCT p.id) as participant_count
FROM sessions s
LEFT JOIN participants p ON s.id = p.session_id
WHERE s.status = 'active'
  AND s.session_type = 'minibag'
  AND s.expires_at > now()
GROUP BY s.id
ORDER BY s.scheduled_time ASC
LIMIT 20;
```

#### **Get Session with Participants**
```sql
SELECT 
  s.*,
  json_agg(
    json_build_object(
      'id', p.id,
      'nickname', p.nickname,
      'avatar_emoji', p.avatar_emoji,
      'joined_at', p.joined_at,
      'is_creator', p.is_creator
    )
  ) as participants
FROM sessions s
LEFT JOIN participants p ON s.id = p.session_id
WHERE s.session_id = 'abc123'
GROUP BY s.id;
```

#### **Get Participant's Items with Details**
```sql
SELECT 
  pi.*,
  ci.name,
  ci.name_hi,
  ci.name_gu,
  ci.emoji,
  ci.thumbnail_url,
  ci.unit
FROM participant_items pi
JOIN catalog_items ci ON pi.item_id = ci.id
WHERE pi.participant_id = $1
ORDER BY pi.created_at;
```

#### **Get Aggregate Demand per Item**
```sql
SELECT 
  ci.id,
  ci.name,
  ci.emoji,
  ci.unit,
  SUM(pi.quantity) as total_quantity,
  COUNT(DISTINCT pi.participant_id) as participant_count
FROM participant_items pi
JOIN catalog_items ci ON pi.item_id = ci.id
WHERE pi.participant_id IN (
  SELECT id FROM participants WHERE session_id = $1
)
GROUP BY ci.id, ci.name, ci.emoji, ci.unit
ORDER BY total_quantity DESC;
```

#### **Get User's Price History for Item**
```sql
SELECT 
  pi.price_per_unit,
  pi.paid_at,
  s.scheduled_time,
  s.session_id
FROM participant_items pi
JOIN participants p ON pi.participant_id = p.id
JOIN sessions s ON p.session_id = s.id
WHERE p.user_id = $1
  AND pi.item_id = $2
  AND pi.price_per_unit IS NOT NULL
ORDER BY pi.paid_at DESC
LIMIT 5;
```

---

## 🚀 Migration Strategy

### Phase 1: localStorage → Supabase (Week 3-4)

**Current State (v0.2.0):**
```javascript
// localStorage
{
  session_abc123: {
    creator: "Host",
    items: { v1: 2, v2: 1.5 },
    participants: [...]
  }
}
```

**Target State (v2.0.0):**
```javascript
// Supabase
sessions table → session data
participants table → participant data
participant_items table → items
```

**Migration Steps:**
1. Keep localStorage as fallback (Week 3)
2. Write to both localStorage + Supabase (Week 4)
3. Read from Supabase, fallback to localStorage (Week 4)
4. Remove localStorage dependency (Week 5)

**Code Pattern:**
```javascript
// Dual write (Week 4)
async function saveSession(sessionData) {
  // Write to Supabase (primary)
  try {
    await supabase.from('sessions').insert(sessionData);
  } catch (error) {
    console.error('Supabase write failed:', error);
  }
  
  // Write to localStorage (fallback)
  localStorage.setItem('session', JSON.stringify(sessionData));
}

// Dual read (Week 4)
async function getSession(sessionId) {
  // Try Supabase first
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('session_id', sessionId)
    .single();
  
  if (data) return data;
  
  // Fallback to localStorage
  const cached = localStorage.getItem('session');
  return cached ? JSON.parse(cached) : null;
}
```

---

## 💰 Cost Projections

### MVP (0-300 Users)

**Supabase Free Tier:**
```
Database: 500MB
Storage: 1GB
Bandwidth: 2GB
MAU: 50,000
Cost: ₹0/month
```

**Within limits for MVP? YES**
- Database: ~50MB (300 users × 10 sessions each)
- Storage: ~100MB (item images)
- Bandwidth: ~500MB/month
- MAU: 300

### Scale (1000-3000 Users)

**Supabase Pro:**
```
Base: $25/month = ₹2,000/month
+ Compute: ₹2,000/month (additional resources)
+ Storage: ₹500/month (images)
Total: ₹4,500/month
```

**Revenue at this scale:**
- 3000 users × 5% Pro conversion = 150 Pro users
- 150 × ₹49/month = ₹7,350/month
- Profit: ₹7,350 - ₹4,500 = ₹2,850/month

**Profitable at 1000+ users.**

---

## 🔄 Backup & Recovery

### Automated Backups

**Supabase:**
- Daily automatic backups (Pro plan)
- Point-in-time recovery (PITR)
- 7-day retention (Pro), 30-day (Team)

**Setup:**
```sql
-- Enable PITR
ALTER DATABASE postgres SET wal_level = replica;

-- Verify backups
SELECT * FROM pg_available_extensions WHERE name = 'pgbackrest';
```

### Manual Backup

```bash
# Export entire database
supabase db dump > backup.sql

# Restore from backup
supabase db reset
psql -U postgres -f backup.sql
```

### Disaster Recovery Plan

1. **Detection:** Monitoring alerts on errors
2. **Assessment:** Check backup availability
3. **Recovery:** Restore from latest backup
4. **Verification:** Run test queries
5. **Communication:** Notify users if downtime

**RTO (Recovery Time Objective):** <15 minutes
**RPO (Recovery Point Objective):** <24 hours

---

## 📈 Performance Optimization

### Indexing Strategy

**Already defined in schema above, but key indexes:**
```sql
-- Most frequent queries
CREATE INDEX idx_sessions_type_status ON sessions(session_type, status);
CREATE INDEX idx_participants_session_user ON participants(session_id, user_id);
CREATE INDEX idx_items_participant ON participant_items(participant_id) INCLUDE (item_id, quantity);
```

### Caching Strategy

**Client-side (React Query/SWR):**
- Cache catalog items (rarely change)
- Cache user's own data (frequently accessed)
- Invalidate on mutations

**Database-side (Materialized Views):**
```sql
-- Pre-calculate popular items
CREATE MATERIALIZED VIEW popular_items AS
SELECT 
  item_id,
  COUNT(*) as usage_count,
  AVG(quantity) as avg_quantity
FROM participant_items
WHERE created_at > now() - interval '30 days'
GROUP BY item_id
ORDER BY usage_count DESC;

-- Refresh daily
REFRESH MATERIALIZED VIEW popular_items;
```

---

## ✅ Implementation Checklist

### Week 3: Database Setup

- [ ] Create Supabase project
- [ ] Run SQL schema (sessions, participants, etc.)
- [ ] Set up RLS policies
- [ ] Create indexes
- [ ] Seed catalog items (Minibag vegetables)
- [ ] Seed nickname pool (200+ names)
- [ ] Test basic CRUD operations
- [ ] Configure backup schedule

### Week 4: Migration

- [ ] Implement dual write (localStorage + Supabase)
- [ ] Implement dual read (Supabase first, localStorage fallback)
- [ ] Test multi-device sync
- [ ] Monitor for errors
- [ ] Verify data consistency

### Week 5: Optimize

- [ ] Add missing indexes (if needed)
- [ ] Set up monitoring (error logs)
- [ ] Configure alerting
- [ ] Document common queries
- [ ] Remove localStorage dependency

---

## 🎯 Decision Required

**FINAL DECISION: Use Supabase**

**Reasons:**
1. ✅ Cost-effective (5x cheaper at scale)
2. ✅ Perfect for relational data
3. ✅ SQL flexibility
4. ✅ No vendor lock-in
5. ✅ Excellent local development

**Next Steps:**
1. Create Supabase account
2. Create new project
3. Run SQL schema
4. Begin backend development

---

**Last Updated:** October 13, 2025  
**Next Review:** After database implementation (Week 4)  
**Maintained By:** LocalLoops Team