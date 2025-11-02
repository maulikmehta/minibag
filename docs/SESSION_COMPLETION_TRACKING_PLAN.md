# LocalLoops Session Completion Tracking - Implementation Plan

**Date:** 2025-11-02
**Status:** Ready for Implementation

---

## Problem Statement

We need to identify complete sessions (both solo and group) to register completion-related data points to LocalLoops platform analytics.

---

## Key Findings

### Session Completion Definition

- A session is **complete** when `status='completed'` (set when host reaches PaymentSplitScreen)
- Completion happens when all items are "handled" = paid OR skipped
- Skipped items are valid completion paths (quality issues), not failures
- Skip data is internal only, NOT propagated to LocalLoops

### Session Types

- **Solo:** `participant_count = 0` (host only)
- **Group:** `participant_count > 0` (host + participants)
- No separate type field, differentiated by participant count

### Two Completion Events

1. **Session Completed** - All items handled, status set to 'completed'
2. **Financially Settled** - All payment records finalized

---

## Implementation Plan

### 1. Database Changes

Create migration: `database/014_add_completion_timestamps.sql`

```sql
-- Add completion timestamps to sessions table
ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS financially_settled_at TIMESTAMPTZ;

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at
ON sessions(completed_at) WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_financially_settled_at
ON sessions(financially_settled_at) WHERE financially_settled_at IS NOT NULL;
```

---

### 2. API Enhancements

**File:** `/packages/shared/api/sessions.js`

**Modify status update endpoint** (around line 633-726):

```javascript
// When status changes to 'completed', set completed_at timestamp
if (status === 'completed' && !session.completed_at) {
  await supabase
    .from('sessions')
    .update({ completed_at: new Date().toISOString() })
    .eq('id', session.id);
}

// Check if financially settled (all items paid or skipped)
const isFinanciallySettled = await checkFinancialSettlement(session.id);
if (isFinanciallySettled && !session.financially_settled_at) {
  await supabase
    .from('sessions')
    .update({ financially_settled_at: new Date().toISOString() })
    .eq('id', session.id);
}
```

**Add helper function:**

```javascript
async function checkFinancialSettlement(sessionId) {
  // Get all participant items for this session
  const { data: participantItems } = await supabase
    .from('participant_items')
    .select('id, item_id')
    .eq('session_id', sessionId);

  // Get all payments for this session
  const { data: payments } = await supabase
    .from('payments')
    .select('item_id, skipped')
    .eq('session_id', sessionId);

  // Check if all items are either paid or skipped
  const handledItemIds = new Set(payments.map(p => p.item_id));
  return participantItems.every(item => handledItemIds.has(item.item_id));
}
```

---

### 3. Data Points for LocalLoops Registration

**Session Metadata:**
- `session_id`
- `session_type` (minibag, partybag, fitbag)
- `participant_count` (0 = solo, >0 = group)
- `scheduled_time`
- `created_at`
- `completed_at`
- `financially_settled_at`
- `duration_minutes` = `(completed_at - created_at) / 60000`

**Financial Metrics:**
- `total_revenue` (sum of paid amounts, excludes skipped)
- `upi_amount`
- `cash_amount`
- `items_purchased_count` (items with payment records, paid only)

**Trust Metrics (per Design Doc):**
- Completion rate (track per user for trust scores)
- On-time arrival (future)
- Payment completion rate

---

### 4. Analytics API Endpoints

**File:** `/packages/shared/api/analytics.js`

**Add new endpoint:**

```javascript
/**
 * GET /api/analytics/sessions/completions
 * Get session completion metrics
 */
router.get('/sessions/completions', async (req, res) => {
  const { start_date, end_date, session_type } = req.query;

  const query = supabase
    .from('sessions')
    .select('*')
    .not('completed_at', 'is', null);

  if (start_date) query.gte('completed_at', start_date);
  if (end_date) query.lte('completed_at', end_date);
  if (session_type) query.eq('session_type', session_type);

  const { data: sessions, error } = await query;

  if (error) throw error;

  // Calculate metrics
  const metrics = {
    total_completed: sessions.length,
    solo_sessions: sessions.filter(s => s.participant_count === 0).length,
    group_sessions: sessions.filter(s => s.participant_count > 0).length,
    avg_duration_minutes: sessions.reduce((sum, s) => {
      const duration = (new Date(s.completed_at) - new Date(s.created_at)) / 60000;
      return sum + duration;
    }, 0) / sessions.length,
    // Add revenue metrics from payments table
  };

  res.json({ success: true, data: metrics });
});
```

---

### 5. Privacy Compliance (Design Doc)

**Data Lifecycle:**
- **24 hours:** Anonymize participant details (real names, nicknames)
- **7 days:** Archive to analytics (aggregated only)
- **30 days:** Delete raw session data

**What to Keep (Anonymized):**
- Session completion counts by neighborhood
- Revenue totals by session_type
- Average session duration
- Solo vs group distribution

**What to Delete:**
- Individual participant names
- Session chat history (if implemented)
- Detailed item lists

**What NOT to Send to LocalLoops:**
- Skip rates/reasons (internal vendor quality metrics only)
- PII (phone numbers, exact addresses)
- Individual participant data

---

## Implementation Checklist

- [ ] Create database migration `014_add_completion_timestamps.sql`
- [ ] Run migration on Supabase
- [ ] Update `/packages/shared/api/sessions.js` status endpoint
- [ ] Add `checkFinancialSettlement()` helper function
- [ ] Create analytics endpoint `/api/analytics/sessions/completions`
- [ ] Update session schema in `/packages/shared/schemas/session.schema.js`
- [ ] Test solo session completion flow
- [ ] Test group session completion flow
- [ ] Test with skipped items
- [ ] Implement data lifecycle automation (24h/7d/30d)
- [ ] Document LocalLoops registration format

---

## Files to Modify

1. `database/014_add_completion_timestamps.sql` (NEW)
2. `/packages/shared/api/sessions.js` (UPDATE)
3. `/packages/shared/api/analytics.js` (UPDATE)
4. `/packages/shared/schemas/session.schema.js` (UPDATE)

---

**Ready to implement!**
