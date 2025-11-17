# Backend Requirements for Skip Items Feature

**Status:** Pending Backend Implementation
**Date:** November 1, 2025
**Priority:** Required before frontend Skip Items can be completed

---

## Overview

The Skip Items feature requires backend support to store and retrieve skip status for items during the shopping phase. This document outlines the required database schema changes and API endpoint updates.

---

## Database Schema Changes

### Table: `payments`

Add two new columns to support skipped items:

```sql
-- Migration: Add skip fields to payments table
ALTER TABLE payments
ADD COLUMN skipped BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN skip_reason TEXT DEFAULT 'Item wasn''t good enough to buy';

-- Index for querying skipped items
CREATE INDEX idx_payments_skipped ON payments(session_id, skipped);
```

**Field Descriptions:**

- `skipped` (BOOLEAN):
  - `true` = item was skipped (not purchased)
  - `false` = normal payment record
  - Default: `false`

- `skip_reason` (TEXT):
  - Reason why item was skipped
  - Default: `"Item wasn't good enough to buy"`
  - Only relevant when `skipped = true`

**Validation Rules:**

- When `skipped = true`:
  - `amount` MUST be `0`
  - `method` MUST be `null`
- When `skipped = false`:
  - Normal payment validation applies (amount > 0, valid method)

---

## API Endpoint Changes

### 1. POST `/api/sessions/:sessionId/payments`

**Purpose:** Record a payment OR mark an item as skipped

#### Request Body (Normal Payment)
```json
{
  "item_id": "item_123",
  "amount": 150,
  "method": "upi",
  "skipped": false
}
```

#### Request Body (Skipped Item)
```json
{
  "item_id": "item_456",
  "skipped": true,
  "skip_reason": "Item wasn't good enough to buy"  // optional, uses default if not provided
}
```

#### Response (Skipped Item)
```json
{
  "success": true,
  "data": {
    "id": "payment_789",
    "session_id": "session_123",
    "item_id": "item_456",
    "amount": 0,
    "method": null,
    "skipped": true,
    "skip_reason": "Item wasn't good enough to buy",
    "recorded_by": "participant_abc",
    "created_at": "2025-11-01T10:30:00Z"
  }
}
```

#### Validation

```javascript
// Backend validation logic
if (req.body.skipped === true) {
  // Skipped item validation
  if (req.body.amount && req.body.amount !== 0) {
    return res.status(400).json({
      error: "Skipped items cannot have an amount"
    });
  }
  if (req.body.method) {
    return res.status(400).json({
      error: "Skipped items cannot have a payment method"
    });
  }

  // Set defaults
  req.body.amount = 0;
  req.body.method = null;
  req.body.skip_reason = req.body.skip_reason || "Item wasn't good enough to buy";
} else {
  // Normal payment validation
  if (!req.body.amount || req.body.amount <= 0) {
    return res.status(400).json({
      error: "Amount must be greater than 0"
    });
  }
  if (!['upi', 'cash'].includes(req.body.method)) {
    return res.status(400).json({
      error: "Payment method must be 'upi' or 'cash'"
    });
  }
}
```

---

### 2. GET `/api/sessions/:sessionId/payments`

**Purpose:** Retrieve all payments including skipped items

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "payment_1",
      "session_id": "session_123",
      "item_id": "tomatoes",
      "amount": 50,
      "method": "upi",
      "skipped": false,
      "skip_reason": null,
      "recorded_by": "host_xyz",
      "created_at": "2025-11-01T10:25:00Z"
    },
    {
      "id": "payment_2",
      "session_id": "session_123",
      "item_id": "potatoes",
      "amount": 0,
      "method": null,
      "skipped": true,
      "skip_reason": "Item wasn't good enough to buy",
      "recorded_by": "host_xyz",
      "created_at": "2025-11-01T10:28:00Z"
    }
  ]
}
```

**Changes:**
- Include `skipped` and `skip_reason` fields in all payment records
- Skipped items will have `amount: 0` and `method: null`

---

### 3. DELETE `/api/sessions/:sessionId/payments/:paymentId`

**Purpose:** Delete a payment record (used for un-skipping items)

#### Request
```
DELETE /api/sessions/:sessionId/payments/:paymentId
```

#### Response
```json
{
  "success": true,
  "message": "Payment record deleted"
}
```

**Use Case:**
- When user unchecks the skip checkbox, frontend needs to remove the skip record
- Also used if user wants to change a skipped item back to paid

---

## WebSocket Events

### Event: `payment-updated`

**Purpose:** Notify all session participants when a payment is recorded OR an item is skipped

#### Payload (Skip Event)
```javascript
{
  type: 'payment-updated',
  session_id: 'session_123',
  payment: {
    id: 'payment_789',
    item_id: 'item_456',
    amount: 0,
    method: null,
    skipped: true,
    skip_reason: 'Item wasn\'t good enough to buy',
    recorded_by: 'participant_abc'
  }
}
```

#### Payload (Unskip Event - Payment Deleted)
```javascript
{
  type: 'payment-deleted',
  session_id: 'session_123',
  payment_id: 'payment_789',
  item_id: 'item_456'
}
```

**Frontend Behavior:**
- When receiving `payment-updated` with `skipped: true`, update local state to show item as skipped
- When receiving `payment-deleted`, remove skip status from local state

---

## Business Logic

### Cost Calculation with Skipped Items

**Important:** Skipped items MUST be excluded from all cost calculations.

```javascript
// Example: Calculate participant costs
function calculateParticipantCosts(session, payments) {
  const results = {};

  // Get only non-skipped payments
  const paidPayments = payments.filter(p => !p.skipped);

  paidPayments.forEach(payment => {
    const item = session.items.find(i => i.id === payment.item_id);

    // Calculate total quantity (host + all participants)
    const totalQty = calculateTotalQuantity(item.id, session);

    // Price per unit
    const pricePerKg = payment.amount / totalQty;

    // Calculate each participant's cost
    session.participants.forEach(participant => {
      const participantQty = participant.items[item.id] || 0;
      if (participantQty > 0) {
        results[participant.id] = (results[participant.id] || 0) + (participantQty * pricePerKg);
      }
    });
  });

  return results;
}
```

**Edge Cases:**
1. **All items skipped:** Valid scenario, host pays ₹0, all participants owe ₹0
2. **Mixed paid/skipped:** Only include paid items in calculations
3. **Item paid then skipped:** Delete old payment record, create skip record
4. **Item skipped then paid:** Delete skip record, create payment record

---

## Migration Script

```sql
-- Run this migration on the database

-- Step 1: Add columns (safe, allows nulls initially)
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS skipped BOOLEAN,
ADD COLUMN IF NOT EXISTS skip_reason TEXT;

-- Step 2: Set default values for existing records
UPDATE payments
SET skipped = FALSE,
    skip_reason = NULL
WHERE skipped IS NULL;

-- Step 3: Add NOT NULL constraint
ALTER TABLE payments
ALTER COLUMN skipped SET NOT NULL,
ALTER COLUMN skipped SET DEFAULT FALSE;

-- Step 4: Add default for skip_reason
ALTER TABLE payments
ALTER COLUMN skip_reason SET DEFAULT 'Item wasn''t good enough to buy';

-- Step 5: Add index
CREATE INDEX IF NOT EXISTS idx_payments_skipped
ON payments(session_id, skipped)
WHERE skipped = TRUE;

-- Step 6: Verify migration
SELECT
  COUNT(*) as total_payments,
  COUNT(CASE WHEN skipped = TRUE THEN 1 END) as skipped_count,
  COUNT(CASE WHEN skipped = FALSE THEN 1 END) as paid_count
FROM payments;
```

---

## Testing Checklist (Backend)

### Database Tests
- [ ] Can insert payment with `skipped = true`
- [ ] Can insert payment with `skipped = false`
- [ ] Default `skip_reason` is applied when not provided
- [ ] Index on `(session_id, skipped)` improves query performance

### API Tests
- [ ] POST /payments with `skipped: true` returns correct record
- [ ] POST /payments with `skipped: true` AND `amount > 0` is rejected
- [ ] POST /payments with `skipped: true` AND `method != null` is rejected
- [ ] GET /payments includes `skipped` and `skip_reason` fields
- [ ] DELETE /payments/:id successfully deletes skip record
- [ ] WebSocket emits `payment-updated` when item skipped
- [ ] WebSocket emits `payment-deleted` when skip record deleted

### Integration Tests
- [ ] Skip item → bill calculation excludes it
- [ ] Skip all items → bill total is ₹0
- [ ] Skip item → unskip item → works correctly
- [ ] Pay item → skip item → old payment deleted

---

## Frontend Integration Points

Once backend is ready, frontend will:

1. **ShoppingScreen:**
   - Add skip checkbox to each item card
   - Call `POST /api/sessions/:id/payments` with `skipped: true`
   - Listen for WebSocket `payment-updated` events

2. **PaymentSplitScreen:**
   - Filter out skipped items from cost calculation
   - Display skipped items in separate section with reason

3. **State Management:**
   - Track `skippedItems` state in MinibagPrototype
   - Update state on WebSocket events
   - Sync skip status across all devices

---

## Estimated Backend Work

- **Database Migration:** 15 minutes
- **API Endpoint Updates:** 30 minutes
- **WebSocket Events:** 15 minutes
- **Testing:** 30 minutes
- **Total:** ~1.5 hours

---

## Questions for Backend Team

1. **Database:** Do we use Supabase or custom PostgreSQL?
2. **Migrations:** What tool do we use for database migrations?
3. **WebSocket:** Are we using Socket.io or Supabase Realtime?
4. **Testing:** Do we have automated API tests set up?

---

**Next Steps:**

1. Backend team implements changes per this spec
2. Backend team deploys to staging
3. Frontend team completes Phase 4 (Skip Items UI)
4. End-to-end testing
5. Deploy to production

**Status:** Ready for backend implementation
**Blocked By:** Backend API changes
**Contact:** Frontend team ready to integrate once backend is deployed
