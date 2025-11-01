# Minibag Pre-User Testing Improvements
**Implementation Plan: Notifications System + Skip Items Feature**

**Date:** November 1, 2025
**Status:** Ready for Implementation
**Estimated Time:** 8-10 hours total
**Bundle Impact:** < 10 KB increase expected

---

## Table of Contents
1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Feature 1: Global Notification System](#feature-1-global-notification-system)
4. [Feature 2: Skip Items During Shopping](#feature-2-skip-items-during-shopping)
5. [Implementation Phases](#implementation-phases)
6. [Testing Strategy](#testing-strategy)
7. [Risk Assessment](#risk-assessment)
8. [Success Criteria](#success-criteria)

---

## Overview

### Business Goals
- Improve UX consistency before user testing
- Reduce user confusion during shopping phase
- Handle real-world scenarios (unavailable items, price changes)

### Technical Goals
- Centralize notification system (currently fragmented)
- Add skip item functionality to shopping flow
- Maintain bundle size < 250 KB (current: 192 KB)

### User Requirements Summary

**Notifications:**
✅ Global notification center/toast system
✅ Real-time participant updates across all screens
✅ Error notifications for failed operations

**Skip Items:**
✅ Checkbox to skip items during shopping
✅ Standard reason: "Item wasn't good enough to buy"
✅ Display skipped items in final bill
✅ No real-time notifications (show in bill only)
✅ Skip for everyone (all-or-nothing for shared items)

---

## Current State Analysis

### Notifications - Current Implementation

**Architecture:**
- **Type:** Scattered hook-based system
- **Location:** `src/hooks/useSessionNotifications.js`
- **Coverage:** Only SessionActiveScreen
- **Limitations:**
  - No error notifications
  - No notification queue
  - Not available across all screens
  - Manual dismissal only

**Current Notification Triggers:**
| Event | Screen | Format |
|-------|--------|--------|
| Participant joins | SessionActiveScreen | "Name joined the session" |
| Status update | SessionActiveScreen | "Name marked as coming" |
| List submission | SessionActiveScreen | "Name submitted the list" |
| Payment update | N/A | Not displayed (only Socket event) |
| API errors | N/A | Console only (not user-facing) |

**Socket Events Triggering Notifications:**
- `participant-joined`
- `participant-status-updated`
- `participant-items-updated`
- `payment-updated` (not currently shown to users)

### Shopping Flow - Current Implementation

**Current Payment Flow:**
```
ShoppingScreen → PaymentModal → Record Payment → Update State → WebSocket Sync
```

**Current Item States:**
| State | Description | Payment Required |
|-------|-------------|------------------|
| Unpaid | No payment recorded | Yes |
| Paid | Payment recorded (UPI/Cash + amount) | N/A |

**Current Limitations:**
- ❌ No "skip" or "unavailable" status
- ❌ Must record payment for ALL items
- ❌ Can't handle unavailable/too expensive items
- ❌ No quantity adjustment during shopping
- ❌ All-or-nothing: either pay for item or block completion

**Current Billing Logic:**
```javascript
// For each item:
totalQty = sum of quantities from all participants + host
pricePerKg = payment.amount / totalQty
participantCost = participantQty * pricePerKg

// Total to receive = sum of all participant costs
```

---

## Feature 1: Global Notification System

### Architecture Design

#### Component Hierarchy
```
App (MinibagPrototype)
  └── NotificationProvider (Context)
        ├── NotificationToast (UI Component)
        │     └── Notification Queue Manager
        └── All Screens (Consumer Components)
              └── useNotification() hook
```

#### State Management

**NotificationContext State:**
```javascript
{
  notifications: [
    {
      id: "uuid",
      type: "success" | "error" | "warning" | "info",
      message: "Text to display",
      duration: 3000,  // ms
      timestamp: Date.now()
    }
  ],
  addNotification: (type, message, duration) => void,
  removeNotification: (id) => void,
  clearAll: () => void
}
```

**Queue Logic:**
- Maximum 3 notifications visible simultaneously
- New notifications added to queue
- Auto-dismiss after duration (default: 3s)
- Manual dismiss by clicking
- FIFO order (first in, first out)

#### UI Design

**NotificationToast Component:**
```
┌─────────────────────────────────────┐
│ [Icon] Message text here            │ ← Success (Green)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [X] Error message text              │ ← Error (Red)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [!] Warning message                 │ ← Warning (Yellow)
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ [i] Info message                    │ ← Info (Blue)
└─────────────────────────────────────┘
```

**Styling:**
- Position: Fixed top-center
- Z-index: 9999 (above all content)
- Width: 90% mobile, max 400px desktop
- Animation: Slide down + fade in
- Exit: Fade out + slide up

**Colors (Tailwind):**
- Success: `bg-green-500 text-white`
- Error: `bg-red-500 text-white`
- Warning: `bg-yellow-500 text-gray-900`
- Info: `bg-blue-500 text-white`

**Icons (lucide-react):**
- Success: `CheckCircle`
- Error: `XCircle`
- Warning: `AlertTriangle`
- Info: `Info`

**Accessibility:**
- `role="alert"` for errors/warnings
- `role="status"` for success/info
- `aria-live="polite"` or `"assertive"`
- Keyboard dismissible (Escape key)
- Focus trap when visible

### Implementation Details

#### File Structure

**New Files:**
```
src/
├── contexts/
│   └── NotificationContext.jsx        (150 lines)
├── components/
│   ├── NotificationToast.jsx          (100 lines)
│   └── NotificationQueue.jsx          (80 lines)
└── hooks/
    └── useNotification.js             (30 lines)
```

#### NotificationContext.jsx
```javascript
import React, { createContext, useState, useCallback, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((type, message, duration = 3000) => {
    const id = uuidv4();
    const notification = { id, type, message, duration, timestamp: Date.now() };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss
    setTimeout(() => {
      removeNotification(id);
    }, duration);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      addNotification,
      removeNotification,
      clearAll
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotificationContext = () => useContext(NotificationContext);
```

#### useNotification.js Hook
```javascript
import { useNotificationContext } from '../contexts/NotificationContext';

export function useNotification() {
  const { addNotification } = useNotificationContext();

  return {
    success: (message, duration) => addNotification('success', message, duration),
    error: (message, duration) => addNotification('error', message, duration),
    warning: (message, duration) => addNotification('warning', message, duration),
    info: (message, duration) => addNotification('info', message, duration),
  };
}
```

#### Usage Example
```javascript
// In any component:
import { useNotification } from '../hooks/useNotification';

function MyComponent() {
  const notify = useNotification();

  const handleSave = async () => {
    try {
      await saveData();
      notify.success('Saved successfully!');
    } catch (error) {
      notify.error('Failed to save: ' + error.message);
    }
  };
}
```

### Integration Points

**Files to Modify:**

1. **minibag-ui-prototype.tsx**
   - Wrap app with `<NotificationProvider>`
   - Replace old toast logic

2. **src/services/api.js**
   - Add error notifications to all API calls
   - Centralized error handling

3. **src/hooks/useParticipantSync.js**
   - Replace `showNotification` with `useNotification()`
   - Use new context

4. **src/screens/SessionActiveScreen.jsx**
   - Remove old toast UI
   - Use new notification system

5. **src/services/socket.js**
   - Add error notifications for connection issues
   - Notify on disconnect/reconnect

### Error Notification Coverage

**API Errors to Catch:**
- Network failures (fetch errors)
- 500 Internal Server Error
- 404 Not Found
- 403 Forbidden
- Timeout errors
- Invalid response format

**User-Friendly Messages:**
```javascript
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'No internet connection. Please check your network.',
  SERVER_ERROR: 'Something went wrong on our end. Please try again.',
  NOT_FOUND: 'Session not found. The link may be expired.',
  FORBIDDEN: 'You don\'t have permission to do that.',
  TIMEOUT: 'Request timed out. Please check your connection.',
};
```

---

## Feature 2: Skip Items During Shopping

### Architecture Design

#### Data Model

**Extended Payment Record:**
```javascript
{
  id: "payment_id",
  session_id: "session_123",
  item_id: "item_456",
  amount: 0,              // ← 0 for skipped items
  method: null,           // ← null for skipped
  recorded_by: "participant_id",

  // NEW FIELDS:
  skipped: true,          // ← boolean flag
  skip_reason: "Item wasn't good enough to buy",  // ← default text

  created_at: "2025-11-01T10:30:00Z"
}
```

**Backend Schema Changes:**
```sql
-- Migration: Add skip fields to payments table
ALTER TABLE payments
ADD COLUMN skipped BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN skip_reason TEXT DEFAULT 'Item wasn''t good enough to buy';

-- Index for querying skipped items
CREATE INDEX idx_payments_skipped ON payments(session_id, skipped);
```

**API Endpoint Updates:**

**POST /api/sessions/:id/payments**
```javascript
// Request body (for skipped item):
{
  item_id: "item_123",
  skipped: true,
  skip_reason: "Item wasn't good enough to buy"
  // amount and method optional when skipped=true
}

// Response:
{
  success: true,
  data: {
    id: "payment_456",
    item_id: "item_123",
    amount: 0,
    method: null,
    skipped: true,
    skip_reason: "Item wasn't good enough to buy"
  }
}
```

**GET /api/sessions/:id/payments**
```javascript
// Response includes skipped field:
{
  success: true,
  data: [
    {
      id: "payment_1",
      item_id: "tomatoes",
      amount: 50,
      method: "upi",
      skipped: false
    },
    {
      id: "payment_2",
      item_id: "potatoes",
      amount: 0,
      method: null,
      skipped: true,
      skip_reason: "Item wasn't good enough to buy"
    }
  ]
}
```

#### State Management

**New State in MinibagPrototype:**
```javascript
const [skippedItems, setSkippedItems] = useState({});
// Structure:
{
  "item_id_1": {
    skipped: true,
    reason: "Item wasn't good enough to buy",
    timestamp: Date.now()
  }
}
```

**Item Completion Logic:**
```javascript
// OLD: Item complete only if paid
const isComplete = !!itemPayments[itemId];

// NEW: Item complete if paid OR skipped
const isComplete = !!itemPayments[itemId] || !!skippedItems[itemId];

// All items complete when:
const allComplete = Object.keys(allItems).every(id =>
  itemPayments[id] || skippedItems[id]
);
```

### UI Design

#### ShoppingScreen Changes

**Item Card Layout (BEFORE):**
```
┌───────────────────────────────────────┐
│ Tomatoes (5 kg)                       │
│                                       │
│ [Pay] [Edit]                          │
└───────────────────────────────────────┘
```

**Item Card Layout (AFTER):**
```
┌───────────────────────────────────────┐
│ Tomatoes (5 kg)                       │
│                                       │
│ ☐ Skip this item                      │
│ [Pay] [Edit]                          │
└───────────────────────────────────────┘

When checkbox checked:
┌───────────────────────────────────────┐
│ Tomatoes (5 kg)              [SKIPPED]│ ← Badge
│                                       │
│ ☑ Skip this item                      │ ← Checked
│ [Pay] [Edit]                          │ ← Disabled/hidden
└───────────────────────────────────────┘
```

**Visual States:**

1. **Unpaid/Unskipped (Default):**
   - White background
   - Checkbox unchecked
   - Pay/Edit buttons enabled

2. **Paid:**
   - Light green background
   - Payment details shown
   - Edit button enabled
   - Checkbox hidden/disabled

3. **Skipped:**
   - Light gray background
   - "SKIPPED" badge (red/orange)
   - Checkbox checked
   - Pay/Edit buttons hidden
   - Show reason text

**Checkbox Behavior:**
```javascript
const handleSkipToggle = async (itemId) => {
  if (skippedItems[itemId]) {
    // Unskip: Remove from skipped items
    setSkippedItems(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });

    // Remove skip record from backend
    await deletePayment(skippedItems[itemId].paymentId);
  } else {
    // Skip: Add to skipped items
    const payment = await recordPayment(sessionId, {
      item_id: itemId,
      skipped: true,
      skip_reason: "Item wasn't good enough to buy"
    });

    setSkippedItems(prev => ({
      ...prev,
      [itemId]: {
        skipped: true,
        reason: payment.skip_reason,
        paymentId: payment.id,
        timestamp: Date.now()
      }
    }));

    // Emit WebSocket for real-time sync
    socketService.emitPaymentUpdate(sessionId, payment);
  }
};
```

#### PaymentSplitScreen Changes

**Layout (BEFORE):**
```
Your Bill
─────────────────────────
Tomatoes (2 kg)      ₹25
Onions (1 kg)        ₹30
─────────────────────────
Total:               ₹55
```

**Layout (AFTER):**
```
Your Bill
─────────────────────────
✓ Purchased Items
Tomatoes (2 kg)      ₹25
Onions (1 kg)        ₹30
─────────────────────────
Subtotal:            ₹55

⊘ Skipped Items
Potatoes (3 kg)
  → Item wasn't good enough to buy
Carrots (1 kg)
  → Item wasn't good enough to buy
─────────────────────────
Total to Pay:        ₹55
```

**Styling:**
- Skipped section: Light gray background
- Strikethrough text for item names
- Italic text for skip reason
- "⊘" icon or "SKIPPED" badge

**For Host View:**
```
What You Spent
─────────────────────────
✓ Purchased Items
Tomatoes (5 kg)      ₹125
Onions (3 kg)        ₹90
─────────────────────────
Total Spent:         ₹215

⊘ Items You Skipped
Potatoes (3 kg)
Carrots (1 kg)
─────────────────────────

What You'll Receive
From Participant A:  ₹55
From Participant B:  ₹40
─────────────────────────
Total to Receive:    ₹95
```

### Implementation Details

#### Updated Billing Calculation

```javascript
// PaymentSplitScreen.jsx - Updated calculation logic

const calculateCosts = () => {
  // Filter out skipped items
  const purchasedItemIds = Object.keys(allItems).filter(
    id => !skippedItems[id]
  );

  let hostCost = 0;
  const participantCosts = {};

  purchasedItemIds.forEach(itemId => {
    const payment = itemPayments[itemId];
    if (!payment) return; // Should not happen if validation works

    // Calculate total quantity for this item
    const totalQty = calculateTotalQuantity(itemId, allItems);
    const pricePerKg = payment.amount / totalQty;

    // Host cost for this item
    const hostQty = hostItems[itemId]?.quantity || 0;
    hostCost += hostQty * pricePerKg;

    // Participant costs for this item
    participants.forEach(p => {
      const pQty = p.items[itemId]?.quantity || 0;
      if (pQty > 0) {
        participantCosts[p.id] = (participantCosts[p.id] || 0) + (pQty * pricePerKg);
      }
    });
  });

  return { hostCost, participantCosts };
};
```

#### WebSocket Sync for Skipped Items

**Socket Events:**
```javascript
// Emit when item skipped
socketService.emitPaymentUpdate(sessionId, {
  type: 'skip',
  item_id: itemId,
  skipped: true,
  skip_reason: reason
});

// Emit when item unskipped
socketService.emitPaymentUpdate(sessionId, {
  type: 'unskip',
  item_id: itemId,
  payment_id: paymentId
});

// Listen for updates
socket.on('payment-updated', (data) => {
  if (data.skipped) {
    setSkippedItems(prev => ({
      ...prev,
      [data.item_id]: {
        skipped: true,
        reason: data.skip_reason
      }
    }));
  } else {
    // Handle regular payment update
  }
});
```

---

## Implementation Phases

### Phase 1: Notification System Foundation (2-3 hours)

**Goal:** Create reusable notification infrastructure

**Tasks:**

#### 1.1 Create NotificationContext (45 min)
- [ ] Create `/src/contexts/NotificationContext.jsx`
- [ ] Implement notification state management
- [ ] Create add/remove/clearAll functions
- [ ] Add queue logic (max 3 notifications)
- [ ] Implement auto-dismiss timers
- [ ] Add TypeScript types (if using TS)

**Deliverable:** Working context that can be imported

#### 1.2 Create NotificationToast Component (60 min)
- [ ] Create `/src/components/NotificationToast.jsx`
- [ ] Design UI for 4 types (success, error, warning, info)
- [ ] Add icons from lucide-react
- [ ] Implement slide-in/fade-out animations
- [ ] Add click-to-dismiss functionality
- [ ] Add keyboard dismiss (Escape key)
- [ ] Add ARIA labels for accessibility
- [ ] Style with Tailwind (mobile-first)

**Deliverable:** Toast component that renders notifications

#### 1.3 Create useNotification Hook (15 min)
- [ ] Create `/src/hooks/useNotification.js`
- [ ] Wrap context with friendly API
- [ ] Export success/error/warning/info functions
- [ ] Add JSDoc comments

**Deliverable:** Hook ready for consumption

#### 1.4 Integration & Testing (30 min)
- [ ] Wrap MinibagPrototype with NotificationProvider
- [ ] Test queue behavior (add 5 notifications rapidly)
- [ ] Test auto-dismiss timing
- [ ] Test manual dismiss
- [ ] Test keyboard dismiss
- [ ] Verify animations work on mobile

**Deliverable:** Working notification system integrated into app

---

### Phase 2: Notification Implementation (1 hour)

**Goal:** Replace old notifications and add error handling

**Tasks:**

#### 2.1 Update SessionActiveScreen (15 min)
- [ ] Remove old toast UI code
- [ ] Import useNotification hook
- [ ] Replace showNotification calls with notify.success
- [ ] Test participant join notifications
- [ ] Test list submission notifications

**Deliverable:** SessionActiveScreen using new system

#### 2.2 Update useParticipantSync (20 min)
- [ ] Import useNotification hook
- [ ] Replace old notification calls
- [ ] Add error notifications for Socket errors
- [ ] Test real-time participant updates
- [ ] Test offline/online scenarios

**Deliverable:** Real-time notifications working across app

#### 2.3 Add API Error Notifications (25 min)
- [ ] Update `/src/services/api.js`
- [ ] Add try-catch to all API functions
- [ ] Map error codes to user-friendly messages
- [ ] Import and use useNotification in service
- [ ] Test network error handling
- [ ] Test 500 error handling
- [ ] Test timeout handling

**Deliverable:** All API errors show user-friendly notifications

---

### Phase 3: Skip Items Backend (1 hour)

**Goal:** Update backend to support skipped items

**Tasks:**

#### 3.1 Database Migration (15 min)
- [ ] Write migration script
- [ ] Add `skipped` BOOLEAN column (default: FALSE)
- [ ] Add `skip_reason` TEXT column (default: standard message)
- [ ] Add index on (session_id, skipped)
- [ ] Run migration on dev database
- [ ] Verify schema changes

**Deliverable:** Database ready for skipped items

#### 3.2 Update API Endpoints (30 min)
- [ ] Modify POST /api/sessions/:id/payments
  - Accept `skipped` and `skip_reason` fields
  - Set amount=0 and method=null when skipped=true
  - Validate: cannot skip with amount > 0
- [ ] Modify GET /api/sessions/:id/payments
  - Include `skipped` and `skip_reason` in response
- [ ] Update response serialization
- [ ] Add validation logic

**Deliverable:** API endpoints accept and return skip data

#### 3.3 API Testing (15 min)
- [ ] Test POST with skipped=true (Postman/curl)
- [ ] Test POST with skipped=false (normal payment)
- [ ] Test GET returns skip data correctly
- [ ] Test validation: skip + amount > 0 rejected
- [ ] Test default skip_reason applied

**Deliverable:** Backend fully supports skip functionality

---

### Phase 4: Skip Items Frontend UI (3-4 hours)

**Goal:** Add skip checkbox UI to ShoppingScreen

**Tasks:**

#### 4.1 Add State Management (30 min)
- [ ] Add `skippedItems` state to MinibagPrototype
- [ ] Create `handleSkipToggle` function
- [ ] Pass down to ShoppingScreen as props
- [ ] Add skip data to initial load from API
- [ ] Update WebSocket listener for skip events

**Deliverable:** State management ready

#### 4.2 Update ShoppingScreen UI (90 min)
- [ ] Add checkbox to each item card
- [ ] Implement checkbox toggle handler
- [ ] Add "SKIPPED" badge component
- [ ] Style skipped items (gray background)
- [ ] Disable/hide Pay/Edit when skipped
- [ ] Update "Done shopping" button logic
  - Enable when all items paid OR skipped
- [ ] Add loading state during skip API call
- [ ] Handle skip errors with notifications

**Deliverable:** ShoppingScreen with skip functionality

#### 4.3 Update PaymentSplitScreen (60 min)
- [ ] Separate skipped items into own section
- [ ] Add "⊘ Skipped Items" header
- [ ] Style skipped items (strikethrough, gray)
- [ ] Display skip_reason for each item
- [ ] Update cost calculation to exclude skipped
- [ ] Show different view for host vs participants
- [ ] Test with all items skipped edge case
- [ ] Test with mix of paid/skipped items

**Deliverable:** Bill correctly shows skipped items

#### 4.4 WebSocket Sync (30 min)
- [ ] Emit skip event when item skipped
- [ ] Emit unskip event when checkbox unchecked
- [ ] Handle incoming skip events from other clients
- [ ] Update local state when remote skip received
- [ ] Test multi-device sync
- [ ] Test offline/online edge cases

**Deliverable:** Real-time sync for skipped items

---

### Phase 5: Integration Testing (1 hour)

**Goal:** Comprehensive end-to-end testing

**Tasks:**

#### 5.1 Notification Testing (20 min)
- [ ] Test notification queue (10+ rapid notifications)
- [ ] Test all 4 notification types visible correctly
- [ ] Test auto-dismiss timing accurate
- [ ] Test manual dismiss works
- [ ] Test keyboard dismiss (Escape)
- [ ] Test notifications during poor network
- [ ] Test notifications on mobile viewport
- [ ] Verify accessibility with screen reader

**Test Scenarios:**
- Multiple participants joining rapidly
- API failure during payment recording
- WebSocket disconnection
- Form validation errors

#### 5.2 Skip Items Testing (40 min)

**Test Cases:**

| # | Scenario | Expected Behavior |
|---|----------|-------------------|
| 1 | Skip single item | Item marked skipped, excluded from bill |
| 2 | Skip all items | Done button enabled, bill shows ₹0 |
| 3 | Skip shared item | All participants affected, none charged |
| 4 | Unskip item | Item returns to unpaid state |
| 5 | Offline participant | Sees skipped items when back online |
| 6 | Skip → refresh | Skip persists (loaded from API) |
| 7 | Pay → Skip | Payment removed, item skipped |
| 8 | Skip → Pay | Item unskipped, payment recorded |

**Multi-User Testing:**
- [ ] Host skips item, participant sees it in bill
- [ ] Host unskips, participant bill updates
- [ ] Two devices: skip on device A, verify on B
- [ ] Offline scenario: skip while offline, sync on reconnect

**Edge Cases:**
- [ ] All items skipped (host pays ₹0)
- [ ] 50/50 skip/pay mix
- [ ] Skip last remaining item
- [ ] Rapidly toggle skip on/off

**Deliverable:** All tests passing, edge cases handled

---

## Testing Strategy

### Unit Tests

**NotificationContext.test.js**
```javascript
describe('NotificationContext', () => {
  test('adds notification to queue', () => {});
  test('auto-dismisses after duration', () => {});
  test('removes notification on manual dismiss', () => {});
  test('limits queue to 3 notifications', () => {});
  test('clearAll removes all notifications', () => {});
});
```

**useNotification.test.js**
```javascript
describe('useNotification hook', () => {
  test('success() adds success notification', () => {});
  test('error() adds error notification', () => {});
  test('custom duration works', () => {});
});
```

### Integration Tests

**ShoppingScreen.test.js**
```javascript
describe('ShoppingScreen with skip', () => {
  test('clicking skip checkbox calls handleSkipToggle', () => {});
  test('skipped item shows SKIPPED badge', () => {});
  test('skipped item hides Pay/Edit buttons', () => {});
  test('Done button enabled when all items paid or skipped', () => {});
});
```

**PaymentSplitScreen.test.js**
```javascript
describe('PaymentSplitScreen with skipped items', () => {
  test('skipped items appear in separate section', () => {});
  test('skipped items excluded from cost calculation', () => {});
  test('skip reason displayed correctly', () => {});
  test('bill total correct with mix of paid/skipped', () => {});
});
```

### Manual Testing Checklist

**Notification System:**
- [ ] Notifications visible on all screens
- [ ] Error notifications show on API failures
- [ ] Queue works with rapid notifications
- [ ] Animations smooth on mobile
- [ ] Accessible with keyboard/screen reader

**Skip Items:**
- [ ] Can skip item from ShoppingScreen
- [ ] Can unskip item
- [ ] Skipped items show in bill with reason
- [ ] Cost calculation excludes skipped items
- [ ] WebSocket sync works across devices
- [ ] Offline/online handling correct

**Regression Testing:**
- [ ] Normal payment flow still works
- [ ] Participant join flow unchanged
- [ ] Session creation unaffected
- [ ] Bill calculation accurate for non-skipped items

---

## Risk Assessment

### High Risk Areas

**1. Billing Calculation Edge Cases**
- **Risk:** Skipped items might still be charged
- **Mitigation:**
  - Add unit tests for all edge cases
  - Manual testing with real calculations
  - Validate on backend as well as frontend

**2. WebSocket Sync Failures**
- **Risk:** Offline participant misses skip events
- **Mitigation:**
  - Reload payments from API on reconnect
  - Show notification when catching up
  - Add retry logic for failed emits

**3. State Inconsistency**
- **Risk:** Frontend state diverges from backend
- **Mitigation:**
  - Single source of truth (API)
  - Reload from API after mutations
  - Optimistic updates with rollback

### Medium Risk Areas

**4. Notification Queue Overload**
- **Risk:** Too many notifications overwhelm UI
- **Mitigation:**
  - Limit to 3 visible notifications
  - Debounce similar notifications
  - Provide "Clear all" option

**5. Skip/Unskip Toggle Race Conditions**
- **Risk:** Rapid clicking causes duplicate API calls
- **Mitigation:**
  - Disable checkbox during API call
  - Show loading spinner
  - Debounce toggle handler

### Low Risk Areas

**6. Bundle Size Increase**
- **Risk:** Exceeding 250 KB limit
- **Mitigation:**
  - NotificationContext: ~5 KB
  - NotificationToast: ~3 KB
  - Total increase: ~8 KB (safe)
  - Run `npm run size` after implementation

**7. Accessibility Issues**
- **Risk:** Screen reader users can't use notifications
- **Mitigation:**
  - Use proper ARIA roles
  - Test with screen reader
  - Keyboard navigation support

---

## Success Criteria

### Functional Requirements

**Notifications:**
- ✅ Notifications appear on all screens consistently
- ✅ Error messages show for all API failures
- ✅ Success messages for participant actions
- ✅ Queue handles multiple rapid notifications
- ✅ Auto-dismiss after 3 seconds
- ✅ Manual dismiss works (click or Escape)

**Skip Items:**
- ✅ Host can check/uncheck skip checkbox
- ✅ Skipped items show "SKIPPED" badge
- ✅ Skipped items excluded from billing
- ✅ Skip reason displayed in bill
- ✅ Done button enabled when all items paid OR skipped
- ✅ WebSocket syncs skip status across devices

### Non-Functional Requirements

**Performance:**
- ✅ Notification appears within 100ms of trigger
- ✅ Skip toggle responds within 500ms
- ✅ No UI lag when rendering skipped items
- ✅ Bundle size increase < 10 KB

**Accessibility:**
- ✅ Notifications announce to screen readers
- ✅ Keyboard navigation works
- ✅ Color contrast meets WCAG AA
- ✅ Focus management correct

**User Experience:**
- ✅ Intuitive skip checkbox placement
- ✅ Clear visual distinction for skipped items
- ✅ Understandable skip reason text
- ✅ No confusing error messages

---

## Rollback Plan

### If Notifications Break

**Symptoms:**
- Notifications not appearing
- App crashes on notification trigger
- Memory leak from notifications

**Rollback Steps:**
1. Remove NotificationProvider wrapper
2. Revert to old useSessionNotifications hook
3. Comment out error notification code in API service
4. Deploy rollback

**Files to Revert:**
- `minibag-ui-prototype.tsx`
- `src/services/api.js`
- `src/hooks/useParticipantSync.js`

### If Skip Items Break Billing

**Symptoms:**
- Incorrect bill calculations
- Skipped items still charged
- App crashes on payment split screen

**Rollback Steps:**
1. Disable skip checkbox UI (hide it)
2. Revert billing calculation logic
3. Backend: Ignore skip fields, process all as paid
4. Deploy rollback

**Files to Revert:**
- `src/screens/ShoppingScreen.jsx`
- `src/screens/PaymentSplitScreen.jsx`
- `minibag-ui-prototype.tsx` (skip state logic)

---

## Post-Implementation Checklist

### Code Quality
- [ ] All new code linted (ESLint)
- [ ] No console.log statements
- [ ] PropTypes defined (or TypeScript types)
- [ ] Functions documented with JSDoc
- [ ] No duplicate code

### Testing
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Manual testing completed
- [ ] Edge cases verified
- [ ] Regression testing done

### Performance
- [ ] Bundle size checked: `npm run size`
- [ ] No memory leaks (Chrome DevTools)
- [ ] Lighthouse score still > 85
- [ ] Mobile performance acceptable

### Documentation
- [ ] README updated (if needed)
- [ ] API documentation updated
- [ ] Migration guide for backend changes
- [ ] User-facing changes documented

### Deployment
- [ ] Backend migration run on staging
- [ ] Frontend deployed to staging
- [ ] Smoke tests on staging
- [ ] User acceptance testing
- [ ] Deploy to production

---

## Files Modified/Created Summary

### New Files (4)
1. `/packages/minibag/src/contexts/NotificationContext.jsx` (~150 lines)
2. `/packages/minibag/src/components/NotificationToast.jsx` (~100 lines)
3. `/packages/minibag/src/hooks/useNotification.js` (~30 lines)
4. `/packages/minibag/src/components/SkippedItemsBadge.jsx` (~40 lines, optional)

### Modified Files (8)
1. `/packages/minibag/minibag-ui-prototype.tsx`
   - Add NotificationProvider wrapper
   - Add skippedItems state
   - Add handleSkipToggle function
   - Pass skip props to screens

2. `/packages/minibag/src/screens/ShoppingScreen.jsx`
   - Add skip checkbox UI
   - Add SKIPPED badge
   - Update completion logic
   - Handle skip toggle

3. `/packages/minibag/src/screens/PaymentSplitScreen.jsx`
   - Add skipped items section
   - Update billing calculation
   - Display skip reasons

4. `/packages/minibag/src/components/PaymentModal.jsx`
   - Optional: Add skip button (alternative to checkbox)

5. `/packages/minibag/src/services/api.js`
   - Add error notifications
   - Update recordPayment for skip
   - Add deletePayment (for unskip)

6. `/packages/minibag/src/hooks/useParticipantSync.js`
   - Replace old notifications
   - Use new useNotification hook

7. `/packages/minibag/src/screens/SessionActiveScreen.jsx`
   - Remove old toast UI
   - Use new notification system

8. `/packages/minibag/src/services/socket.js`
   - Add error notifications
   - Handle skip events

### Backend Files (2)
1. Database migration script
2. API endpoint updates (payments controller)

---

## Estimated Timeline

| Phase | Task | Time | Running Total |
|-------|------|------|---------------|
| **Phase 1** | Notification Foundation | 2-3 hours | 3h |
| **Phase 2** | Notification Implementation | 1 hour | 4h |
| **Phase 3** | Skip Items Backend | 1 hour | 5h |
| **Phase 4** | Skip Items Frontend | 3-4 hours | 9h |
| **Phase 5** | Integration Testing | 1 hour | 10h |
| | **TOTAL** | **8-10 hours** | |

**Recommended Schedule:**
- Day 1 (4 hours): Phase 1-2 (Notifications complete)
- Day 2 (4 hours): Phase 3-4 (Skip items UI complete)
- Day 3 (2 hours): Phase 5 + buffer (Testing & polish)

---

## Questions for Clarification

Before starting implementation, confirm:

1. **Skip reason customization:** Should host be able to edit the skip reason, or always use default text?
   - **Answer:** Always use default text "Item wasn't good enough to buy"

2. **Unskip functionality:** Should there be an "Undo skip" button, or just unchecking the checkbox?
   - **Answer:** Unchecking the checkbox unskips the item

3. **Notification persistence:** Should notifications be saved and viewable later (notification center)?
   - **Answer:** No, just toast notifications (auto-dismiss)

4. **Mobile optimization:** Any specific mobile gestures needed (swipe to dismiss notifications)?
   - **Answer:** Click/tap to dismiss is sufficient

5. **Backend ownership:** Who will implement the database migration and API changes?
   - **Answer:** [TO BE DETERMINED]

---

**Status:** Ready for Implementation
**Next Step:** Begin Phase 1 - Notification System Foundation

**Last Updated:** November 1, 2025
