# Minibag Development Documentation

**Last Updated:** October 12, 2025 (Smart Features Update)  
**Status:** UI Prototype Complete | Backend Planning | Smart Features Defined

---

## 🎯 Product Vision

### Core Concept
**Minibag** is a micro-coordination tool for Indian vegetable shopping that enables group purchasing without changing buyer behavior. It's positioned as a **personal shopping list app that happens to support collaboration** - not a "group buying app."

### Key Principle
> "Digitally enable the ways people already help each other."

**The host gets value immediately even if zero people join:**
- Solo use: Shopping list + payment tracker + price memory
- Group use: Bonus cost-splitting with neighbors

---

## 🆕 Smart Features (Note-Taking Intelligence)

### Philosophy
Position as "smart notes, not analytics" - contextual hints that feel helpful, not surveillance.

---

### Feature Set (Phase 1 MVP)

#### **1. Price Memory (Per Item)** ✅ MVP
**Purpose:** Remember what you paid last time

**Guest Mode:**
```javascript
// Session-scoped (localStorage)
localStorage.setItem('minibag_session_abc123', JSON.stringify({
  v1: { lastPaid: 35, perKg: 35 },
  v2: { lastPaid: 30, perKg: 30 }
}));
```

**UI (Guest):**
```
┌─────────────────────────────────────┐
│ 🍅 Tomatoes                         │
│ Earlier: ₹35/kg                     │ ← Session memory
│ [Pay ₹__]                           │
└─────────────────────────────────────┘
```

**Signed-In Mode:**
```sql
-- Database query
SELECT price_per_unit, paid_at 
FROM participant_items 
WHERE user_id = $1 AND item_id = $2 
ORDER BY paid_at DESC 
LIMIT 3
```

**UI (Signed-In):**
```
┌─────────────────────────────────────┐
│ 🍅 Tomatoes                         │
│ Last time: ₹35/kg (Oct 5)          │ ← Full history
│ 3 runs ago: ₹38/kg (Sep 21)        │
│ [Pay ₹__]                           │
└─────────────────────────────────────┘
```

**Value:** 
- Guest: Consistency within session
- Signed-in: Price trends, negotiation data
- **No auth friction:** Works for both, better with sign-up

---

#### **2. Quick Re-run (Smart Defaults)** ✅ MVP
**Purpose:** One-tap to recreate last week's list

**Guest Mode:**
- ❌ Not available (no history)

**Signed-In Mode:**
- ✅ Shows on home screen if user has 2+ past runs
- "Use Oct 5 list" button
- Pre-fills items from last session

**UI (Home Screen Addition):**
```
┌─────────────────────────────────────┐
│ 🛒 Track your shopping              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 💡 Quick re-run                 │ │
│ │ Use your Oct 5 list?            │ │
│ │ Tomatoes, Onions, Potatoes      │ │
│ │                                 │ │
│ │ [Use this list →]               │ │
│ └─────────────────────────────────┘ │
│                      [+ New run]    │
└─────────────────────────────────────┘
```

**Logic:**
```javascript
// Show if:
- User has 2+ completed sessions
- Last session was 3-14 days ago
- Don't show if pattern is irregular
```

**Value:**
- Saves time for repeat behavior
- Natural sign-up incentive after 2nd guest session

---

#### **3. Shopping List Archive (Past Runs Search)** ✅ MVP
**Purpose:** Search past shopping history

**Guest Mode:**
- ❌ Not available

**Signed-In Mode:**
- ✅ Past runs with search bar
- "When did I last buy tomatoes?"
- Shows all sessions with that item
- Click item to see price history

**UI (Enhanced Past Runs):**
```
┌─────────────────────────────────────┐
│ Past runs                           │
│                                     │
│ [🔍 Search past items...]           │ ← New search
│                                     │
│ ─────────────────────────────────   │
│ Oct 5 • 4.5kg • ₹420 • Solo        │
│ Tomatoes ₹70, Onions ₹30...        │
│ [View details]                      │
│                                     │
│ Sep 28 • 6kg • ₹580 • 3 people     │
│ Tomatoes ₹80, Onions ₹30...        │
│ [View details]                      │
└─────────────────────────────────────┘
```

**Search Features:**
- Filter by item name
- Filter by date range
- Sort by date/amount
- Export to CSV (Pro)

**Tier Limits:**
- Free: Last 10 runs
- Pro: Unlimited history

---

#### **4. Gentle Reminders (Pattern Detection)** 🔵 Phase 2
**Purpose:** Notify users on their usual shopping day

**Guest Mode:**
- ❌ Not available (no identity)

**Signed-In Mode:**
- ✅ Optional web push notifications
- Requires explicit opt-in
- Only after 3+ sessions show pattern

**UI (Opt-in Banner on Home):**
```
┌─────────────────────────────────────┐
│ 📅 You usually shop on Saturdays    │
│ Get reminded the day before?        │
│                                     │
│ [Enable reminders] [No thanks]      │
└─────────────────────────────────────┘
```

**Pattern Detection Logic:**
```javascript
// After 3+ sessions
const sessions = await getUserSessions(userId);
const dayGaps = calculateDaysBetweenSessions(sessions);
const avgGap = mean(dayGaps);

if (stdDev(dayGaps) < 2 && avgGap >= 6 && avgGap <= 8) {
  // Strong weekly pattern detected
  pattern = {
    frequency: 'weekly',
    usualDay: mode(sessions.map(s => s.dayOfWeek)),
    confidence: 0.8
  };
}
```

**Notification Example:**
```
📱 Web Push (Saturday 4pm):
"Your usual shopping day is tomorrow!
Tap to create your run 🛒"
```

**Implementation:** 
- Phase 2 (Month 2)
- Web push notifications (free)
- SMS for Pro users (Phase 3)

---

### Features NOT Included ❌

To maintain simplicity:
- ❌ Analytics dashboard (charts/graphs)
- ❌ Social features (comments/likes)
- ❌ Gamification (badges/streaks)
- ❌ Price alerts
- ❌ Vendor ratings
- ❌ Neighborhood price comparison (Phase 3+)
- ❌ Budget limits/tracking (Phase 3+)

---

## 📊 Feature Availability Matrix

| Feature | Guest Mode | Signed-In (Free) | Pro (₹49/mo) |
|---------|-----------|------------------|--------------|
| **Core Features** |
| Create sessions | ✅ Unlimited | ✅ Unlimited | ✅ Unlimited |
| Share with neighbors | ✅ Yes | ✅ Yes | ✅ Yes |
| Payment tracking | ✅ Yes | ✅ Yes | ✅ Yes |
| Participant limit | ✅ 4 max | ✅ 4 max | ✅ Unlimited |
| **Smart Features** |
| Price memory | ✅ Session-only | ✅ Full history | ✅ Full history |
| Quick re-run | ❌ | ✅ Last 3 runs | ✅ All runs |
| Past runs view | ❌ | ✅ Last 10 | ✅ Unlimited |
| Search history | ❌ | ✅ Yes | ✅ Yes |
| Reminders (Phase 2) | ❌ | ✅ Web push | ✅ SMS/WhatsApp |
| Export history | ❌ | ❌ | ✅ CSV/PDF |
| **Pro Features** |
| Vendor confirmation | ❌ | ❌ | ✅ Guaranteed |
| Custom items | ❌ | ❌ | ✅ Yes |
| Analytics | ❌ | ❌ | ✅ Savings tracker |
| Scheduled runs | ❌ | ❌ | ✅ Recurring |

---

## 🔐 Authentication Strategy (Unchanged)

### Guest Mode (Default)
**Promise:** "No signup required for single sessions"

**Capabilities:**
- Create unlimited sessions
- Share with neighbors
- Track payments
- Session-scoped price memory

**Limitations:**
- No history (sessions lost after completion)
- No quick re-run
- No reminders
- No Pro features

### Sign-up Prompts (Progressive)

**After Session 1 (Guest):**
```
✓ Session complete!
[Continue] ← No friction
```

**After Session 2 (Guest):**
```
💡 Sign up to reuse lists & track prices

[Sign up with Phone] [Maybe later]
```

**After Session 3 (Guest):**
```
🎉 You've completed 3 runs!

Sign up to unlock:
✓ Save & reuse lists
✓ Price history
✓ Weekly reminders
✓ Try Pro free for 7 days

[Sign up with Phone] ← Primary
[Continue as guest]  ← Secondary
```

**Conversion Goal:** 30-40% sign-up rate after 3 sessions

---

## 🗄️ Database Schema Updates

### **Existing Tables (from previous doc)**
```sql
-- sessions, participants, catalog_items, etc.
-- (See original schema)
```

### **New Fields for Smart Features**

#### **participant_items table (ADD columns):**
```sql
ALTER TABLE participant_items 
ADD COLUMN price_paid DECIMAL,           -- Total paid for this item
ADD COLUMN price_per_unit DECIMAL,       -- Calculated: price_paid / quantity
ADD COLUMN paid_at TIMESTAMP,
ADD COLUMN payment_method TEXT;          -- 'upi' or 'cash'

-- Index for quick "last price" lookup
CREATE INDEX idx_user_item_history 
ON participant_items(participant_id, item_id, paid_at DESC);
```

#### **user_patterns table (NEW - Phase 2):**
```sql
CREATE TABLE user_patterns (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  
  -- Pattern detection
  avg_days_between_sessions INTEGER,      -- 7 for weekly
  usual_day_of_week INTEGER,              -- 6 for Saturday (0=Sun)
  pattern_confidence DECIMAL,             -- 0.8 = strong pattern
  pattern_type TEXT,                      -- 'weekly', 'biweekly', 'irregular'
  
  -- Reminder settings
  reminder_enabled BOOLEAN DEFAULT false,
  reminder_method TEXT,                   -- 'web_push', 'sms', 'whatsapp'
  last_reminded_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### **notification_subscriptions table (NEW - Phase 2):**
```sql
CREATE TABLE notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  
  -- Web Push
  subscription_json JSONB,                -- Push subscription object
  endpoint TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(user_id, endpoint)
);
```

---

## 🛠️ Technical Implementation Notes

### **Guest Mode Price Memory (localStorage)**

```javascript
// Store prices during shopping
function saveSessionPrice(sessionId, itemId, price, quantity) {
  const key = `minibag_session_${sessionId}`;
  const session = JSON.parse(localStorage.getItem(key) || '{}');
  
  session[itemId] = {
    lastPaid: price,
    perUnit: price / quantity,
    timestamp: Date.now()
  };
  
  localStorage.setItem(key, JSON.stringify(session));
}

// Retrieve during payment screen
function getSessionPrice(sessionId, itemId) {
  const key = `minibag_session_${sessionId}`;
  const session = JSON.parse(localStorage.getItem(key) || '{}');
  return session[itemId]?.perUnit || null;
}
```

### **Signed-In Price History (Database)**

```javascript
// Fetch last 3 prices for item
async function getItemPriceHistory(userId, itemId, limit = 3) {
  const { data } = await supabase
    .from('participant_items')
    .select('price_per_unit, paid_at, sessions(scheduled_time)')
    .eq('participant_id', userId)
    .eq('item_id', itemId)
    .order('paid_at', { ascending: false })
    .limit(limit);
  
  return data;
}
```

### **Quick Re-run Implementation**

```javascript
// Get last session items
async function getLastSessionItems(userId) {
  const { data: lastSession } = await supabase
    .from('sessions')
    .select('id, scheduled_time, participants!inner(items)')
    .eq('participants.user_id', userId)
    .order('scheduled_time', { ascending: false })
    .limit(1)
    .single();
  
  return lastSession?.participants?.items || [];
}

// Pre-fill create session
function useLastSessionList(items) {
  setHostItems(
    items.reduce((acc, item) => ({
      ...acc,
      [item.item_id]: item.quantity
    }), {})
  );
}
```

### **Pattern Detection Algorithm (Phase 2)**

```javascript
// Run daily via cron job
async function detectUserPatterns() {
  const users = await getActiveUsers(); // Users with 3+ sessions
  
  for (const user of users) {
    const sessions = await getUserSessions(user.id, limit = 10);
    const pattern = analyzePattern(sessions);
    
    if (pattern.confidence > 0.7) {
      await supabase.from('user_patterns').upsert({
        user_id: user.id,
        avg_days_between_sessions: pattern.avgGap,
        usual_day_of_week: pattern.usualDay,
        pattern_confidence: pattern.confidence,
        pattern_type: pattern.type
      });
    }
  }
}

function analyzePattern(sessions) {
  const gaps = [];
  for (let i = 1; i < sessions.length; i++) {
    const gap = daysBetween(sessions[i-1].date, sessions[i].date);
    gaps.push(gap);
  }
  
  const avgGap = mean(gaps);
  const stdDev = standardDeviation(gaps);
  const dayOfWeekCounts = countByDayOfWeek(sessions);
  const usualDay = mostFrequentDay(dayOfWeekCounts);
  
  return {
    avgGap: Math.round(avgGap),
    usualDay,
    confidence: stdDev < 2 ? 0.8 : 0.5,
    type: avgGap >= 6 && avgGap <= 8 ? 'weekly' : 'irregular'
  };
}
```

---

## 📱 Screen Updates Needed

### **Screen 0: Home** (Enhancement)
**Add (for signed-in users with 2+ runs):**
```
┌─────────────────────────────────────┐
│ 💡 Quick re-run                     │
│ Use your Oct 5 list?                │
│ [View list] [Use it]                │
└─────────────────────────────────────┘
```

**Add (for users with pattern, no reminder set):**
```
┌─────────────────────────────────────┐
│ 📅 You usually shop on Saturdays    │
│ [Enable reminders] [Not now]        │
└─────────────────────────────────────┘
```

---

### **Screen 1: Create Session** (Enhancement)
**During item selection:**
```
┌─────────────────────────────────────┐
│ 🍅 Tomatoes                         │
│ Last time: ₹35/kg (Oct 5) ← NEW    │
│ [Add]                               │
└─────────────────────────────────────┘
```

---

### **Screen 4: Shopping** (Enhancement)
**During payment modal:**
```
┌─────────────────────────────────────┐
│ Record payment for Tomatoes         │
│                                     │
│ 💡 Last time: ₹35/kg ← NEW          │
│                                     │
│ [UPI | Cash]                        │
│ Amount: [₹___]                      │
│ [Confirm]                           │
└─────────────────────────────────────┘
```

---

### **Screen: Past Runs** (NEW - Enhanced)
```
┌─────────────────────────────────────┐
│ Past runs                           │
│                                     │
│ [🔍 Search items or dates...]       │ ← NEW
│                                     │
│ Filters: [All] [Solo] [Group]      │ ← NEW
│                                     │
│ Oct 5 • Solo • ₹420                 │
│ 🍅 Tomatoes ₹70 (₹35/kg)           │
│ 🧅 Onions ₹30 (₹30/kg)             │
│ [Use this list] [View details]      │
│                                     │
│ Sep 28 • 3 people • ₹580            │
│ 🍅 Tomatoes ₹80 (₹40/kg)           │
│ 🧅 Onions ₹30 (₹30/kg)             │
│ [View details]                      │
│                                     │
│ Showing 3 of 10 runs                │
│ [Sign up for Pro → Unlimited]       │
└─────────────────────────────────────┘
```

---

## 🚀 Implementation Timeline (Updated)

### **Phase 1: MVP (Weeks 1-3)**
**Backend (Supabase):**
- [ ] Database schema (sessions, participants, items)
- [ ] Auth (phone OTP via Supabase)
- [ ] API endpoints (CRUD)
- [ ] Price tracking (store in participant_items)

**Frontend:**
- [ ] Connect to Supabase
- [ ] Price memory UI (inline hints)
- [ ] Quick re-run button (home screen)
- [ ] Past runs with basic search
- [ ] Sign-up prompts (after sessions 2 & 3)

**Skip for MVP:**
- Reminders (Phase 2)
- Pattern detection (Phase 2)
- SMS notifications (Phase 3)

### **Phase 2: Smart Features (Month 2)**
- [ ] Pattern detection algorithm
- [ ] Gentle reminders (web push)
- [ ] Opt-in flow for notifications
- [ ] User patterns table

### **Phase 3: Scale (Month 3+)**
- [ ] SMS reminders for Pro
- [ ] WhatsApp notifications (if volume justifies)
- [ ] Export history (CSV/PDF)
- [ ] Advanced analytics

---

## 📊 Success Metrics (Updated)

### **Smart Feature Adoption**
- **Price memory usage:** % of users who check "last time" prices
- **Quick re-run rate:** % of sessions created via "Use last list"
- **Search engagement:** % of signed-in users who search past runs
- **Reminder opt-in:** % of eligible users who enable reminders
- **Pattern accuracy:** % of reminders sent on correct day

### **Conversion Metrics**
- **Guest → Sign-up:** Target 30-40% after 3 sessions
- **Free → Pro:** Target 5-8% within 90 days
- **Reminder → Session:** % of reminders that result in session creation

---

## 🔒 Privacy Considerations (Updated)

### **Guest Mode Data:**
- Stored in localStorage only
- No server-side tracking
- Cleared on session completion
- No cross-device sync

### **Signed-In User Data:**
- Historical data stored in database
- Price history is private (not shared)
- Pattern detection runs server-side
- Notifications require explicit opt-in

### **What We DON'T Collect:**
- No precise GPS location (text descriptions only)
- No device fingerprinting
- No cross-app tracking
- No phone numbers for guests
- No notification tokens without permission

---

## 📝 Next Steps

### **Immediate (This Week):**
1. ✅ Document smart features (this update)
2. 🔄 Polish frontend in separate chat
3. 🔄 Begin Supabase backend setup

### **Week 1-2: Backend Foundation**
- Supabase project setup
- Database schema implementation
- Core API endpoints
- Auth flow

### **Week 3: Frontend Integration**
- Connect UI to Supabase
- Add price memory UI
- Quick re-run implementation
- Past runs enhancement

### **Week 4: Polish & Deploy**
- Error handling
- Loading states
- Sign-up flow
- Production deployment

---

## 🤝 Team Notes

**Current Status:** Solo founder
**Tech Stack:** React + Tailwind + Supabase + Vercel
**Focus:** MVP launch in 1 neighborhood within 4 weeks

**Critical Path:**
1. Backend working (Week 1-2)
2. Frontend connected (Week 3)
3. Manual validation (Week 4)
4. Smart features polish (Month 2)

---

**Document Version:** 2.0  
**Last Review:** October 12, 2025  
**Next Review:** After MVP backend complete  
**Maintained By:** Founder

---

## 📎 Related Files
- `minibag-ui-prototype.tsx` - Current UI implementation
- `session.schema.js` - Database schemas
- `items.js` - Catalog API
- `calculations.js` - Business logic

---

*This document is the single source of truth for Minibag development. All features, timelines, and technical decisions should reference this document.*