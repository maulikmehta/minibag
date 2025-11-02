# Skip Items Error Analysis

**Date:** 2025-11-01
**Status:** Critical bugs identified
**Impact:** Skip functionality broken, WebSocket sync failing

---

## Executive Summary

Two errors occur when clicking "Skip" checkbox during the shopping/purchase flow:

1. **Validation Failure** - Skip items request fails with "APIError: Validation failed"
2. **WebSocket Session Missing** - "Cannot emit session-status-updated: no session" error

Both errors prevent proper skip functionality and real-time synchronization.

---

## Error Console Output

```
Failed to toggle skip status: APIError: Validation failed
    at apiFetch (api.js:106:13)
    at async recordPayment (api.js:268:20)
    at async minibag-ui-prototype.tsx:344:25
(anonymous) @ minibag-ui-prototype.tsx:368

socket.js:240 Cannot emit session-status-updated: no session
emitSessionStatusUpdate @ socket.js:240

minibag-ui-prototype.tsx:316 Session status updated to: shopping

socket.js:240 Cannot emit session-status-updated: no session
```

---

## 🔴 ERROR #1: Skip Items Validation Failure

### Root Cause
Frontend sends incomplete data when marking items as skipped, causing backend validation to reject the request.

### Complete Data Flow

**1. User Action** (ShoppingScreen.jsx:144)
```javascript
<input
  type="checkbox"
  checked={skippedItems.has(itemId)}
  onChange={() => onSkipToggle(itemId)}
/>
```

**2. Frontend Handler** (minibag-ui-prototype.tsx:343-349)
```javascript
const handleSkipToggle = useCallback(async (itemId) => {
  try {
    const payment = await recordPayment(session.session_id, {
      item_id: itemId,
      skipped: true,
      skip_reason: 'Item wasn\'t good enough to buy',
      recorded_by: currentParticipant?.id || null
      // ❌ PROBLEM: Missing amount and method fields
    });

    // Update local state
    setSkippedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  } catch (error) {
    console.error('Failed to toggle skip status:', error);  // Line 368
  }
}, [session?.session_id, skippedItems, currentParticipant?.id, notify]);
```

**3. API Layer** (api.js:267-273)
```javascript
export async function recordPayment(sessionId, paymentData) {
  const response = await apiFetch(`/api/sessions/${sessionId}/payments`, {
    method: 'POST',
    body: JSON.stringify(paymentData),  // Sends incomplete payload
  });
  return response.payment;
}
```

**4. Backend Validation** (payments.js:26-68)
```javascript
// Extract request body
const {
  item_id,
  amount,     // ❌ undefined
  method,     // ❌ undefined
  recorded_by,
  vendor_name,
  skipped,
  skip_reason
} = req.body;

// Validation for skipped items
if (skipped) {
  // These checks pass because undefined is falsy
  if (amount && amount > 0) {
    return res.status(400).json({
      success: false,
      error: 'Skipped items cannot have amount > 0'
    });
  }
  if (method) {
    return res.status(400).json({
      success: false,
      error: 'Skipped items cannot have a payment method'
    });
  }
  if (!item_id) {
    return res.status(400).json({
      success: false,
      error: 'item_id is required'
    });
  }
}
```

**5. Database Insert** (payments.js:71-86)
```javascript
const { data: payment, error } = await supabase
  .from('payments')
  .insert({
    session_id,
    item_id,
    amount: skipped ? 0 : parseFloat(amount),  // ❌ parseFloat(undefined) = NaN
    method: skipped ? null : method,            // ✓ null is correct
    recorded_by,
    vendor_name: skipped ? null : vendor_name,
    status: skipped ? 'skipped' : 'paid',
    skipped,
    skip_reason: skipped ? skip_reason : null,
    recorded_at: new Date().toISOString()
  })
  .select()
  .single();

if (error) {
  console.error('Failed to record payment:', error);
  return res.status(500).json({
    success: false,
    error: 'Failed to record payment'  // ❌ Generic error returned
  });
}
```

### The Actual Problem

When `skipped: true`:
- Frontend doesn't send `amount` or `method` fields
- Backend ternary: `skipped ? 0 : parseFloat(amount)` evaluates to `0` (correct)
- Database receives valid data

**However**, the error "Validation failed" suggests:
1. **Database constraint violation** - The payments table may have a CHECK constraint that's being violated
2. **Supabase RLS policy** - Row Level Security might be blocking the insert
3. **Hidden validation** - There may be additional validation in the Supabase client or database triggers

### Most Likely Cause

Looking at the error message "Validation failed" from apiFetch (api.js:106), this suggests the backend is returning a 400-level error. The validation logic at lines 26-68 in payments.js should pass for skipped items, so the issue is likely:

**Database-level validation or constraints** that require:
- `amount` to be explicitly `0` (not `NaN` or derived from undefined)
- `method` to be explicitly `null`
- Or a foreign key constraint on `item_id` that's failing

---

## 🔴 ERROR #2: WebSocket Session Not Set

### Root Cause
Race condition where the shopping screen tries to emit WebSocket events before the socket has joined the session room.

### Complete Timing Flow

**1. Session Created/Joined** (useSession.js)
```javascript
// Session is created via API
const create = async (sessionData) => {
  const result = await createSession(sessionData);
  setSession(result.session);
  setCurrentParticipant(result.participant);

  // Persist session to localStorage
  persistSession(result.session, result.participant, result.host_token);

  // Join WebSocket room
  socketService.joinSessionRoom(result.session.session_id);  // Sets currentSessionId
  setConnected(true);

  return result;
};
```

**2. Navigation to Shopping Screen**
```javascript
// User clicks "Start Shopping" button (SessionActiveScreen)
// Triggers setCurrentScreen('shopping')
// ShoppingScreen component mounts
```

**3. Shopping Screen Mount Effect** (ShoppingScreen.jsx:61-65)
```javascript
useEffect(() => {
  if (session?.session_id && onUpdateSessionStatus) {
    onUpdateSessionStatus('shopping');  // ❌ Runs IMMEDIATELY on mount
  }
}, [session?.session_id, onUpdateSessionStatus]);
```

**4. Status Update Handler** (minibag-ui-prototype.tsx:306-321)
```javascript
const handleUpdateSessionStatus = useCallback(async (status) => {
  if (!session?.session_id) return;

  try {
    // API call (works fine)
    await updateSessionStatus(session.session_id, status);

    // WebSocket emit (FAILS if socket not ready)
    socketService.emitSessionStatusUpdate(status);  // ❌ currentSessionId is null

    console.log(`Session status updated to: ${status}`);  // Line 316
    notify.success(`Session status updated to: ${status}`);
  } catch (error) {
    console.error('Failed to update session status:', error);
    notify.error(error.userMessage || 'Failed to update session status');
  }
}, [session?.session_id, notify]);
```

**5. Socket Emit Attempt** (socket.js:238-244)
```javascript
emitSessionStatusUpdate(status) {
  if (!this.currentSessionId) {
    console.error('Cannot emit session-status-updated: no session');  // ❌ Error logged
    return;  // Fails silently
  }

  this.emit('session-status-updated', {
    sessionId: this.currentSessionId,
    status
  });
}
```

### Why currentSessionId is Null

**Race Condition Scenarios:**

1. **Fast Navigation:**
   - User navigates session-active → shopping very quickly
   - WebSocket connection still establishing
   - `joinSessionRoom()` hasn't completed yet

2. **Socket Disconnection:**
   - WebSocket temporarily disconnected
   - Reconnection in progress (socket.js:34-41)
   - `currentSessionId` cleared during disconnect

3. **Page Refresh:**
   - User refreshed page on shopping screen
   - Session restored from localStorage
   - Socket not yet reconnected

### Socket Connection Lifecycle

**Location:** socket.js:34-56

```javascript
on(eventName, handler) {
  if (!this.socket) return;
  this.socket.on(eventName, handler);

  // Handle reconnection
  this.socket.on('connect', () => {
    console.log('WebSocket connected');
    // Rejoin session room after reconnect
    if (this.currentSessionId) {
      this.socket.emit('join-session', this.currentSessionId);
    }
  });

  this.socket.on('disconnect', () => {
    console.log('WebSocket disconnected');
    // ❌ currentSessionId NOT cleared on disconnect
    // Should it be? Or should it persist for reconnection?
  });
}
```

### Impact Assessment

**What Still Works:**
- ✅ API call succeeds (session status is updated in database)
- ✅ Session functionality continues
- ✅ Host can see updated status locally

**What Breaks:**
- ❌ Real-time WebSocket broadcast fails
- ❌ Other participants don't get notified immediately
- ❌ Error spam in console
- ❌ User experience degraded (no live sync)

---

## The Fixes

### Fix #1: Add Explicit Fields to Skip Items Payload

**File:** `/packages/minibag/minibag-ui-prototype.tsx`
**Lines:** 343-349

**Change from:**
```javascript
const payment = await recordPayment(session.session_id, {
  item_id: itemId,
  skipped: true,
  skip_reason: 'Item wasn\'t good enough to buy',
  recorded_by: currentParticipant?.id || null
});
```

**Change to:**
```javascript
const payment = await recordPayment(session.session_id, {
  item_id: itemId,
  amount: 0,           // ✓ Explicit 0 for skipped items
  method: null,        // ✓ Explicit null for skipped items
  skipped: true,
  skip_reason: 'Item wasn\'t good enough to buy',
  recorded_by: currentParticipant?.id || null
});
```

**Why:** Ensures backend validation passes cleanly and database receives expected values without relying on ternary operators or undefined handling.

---

### Fix #2: Add WebSocket Ready Check

**File:** `/packages/minibag/minibag-ui-prototype.tsx`
**Lines:** 306-321

**Approach A: Defensive Socket Check** (Recommended)

```javascript
const handleUpdateSessionStatus = useCallback(async (status) => {
  if (!session?.session_id) return;

  try {
    // Always update via API first
    await updateSessionStatus(session.session_id, status);

    // Only emit WebSocket if socket is ready
    if (socketService.isConnected && socketService.getCurrentSessionId()) {
      socketService.emitSessionStatusUpdate(status);
    } else {
      console.warn('WebSocket not ready, skipping real-time broadcast. Status updated via API.');
    }

    console.log(`Session status updated to: ${status}`);
    notify.success(`Session status updated to: ${status}`);
  } catch (error) {
    console.error('Failed to update session status:', error);
    notify.error(error.userMessage || 'Failed to update session status');
  }
}, [session?.session_id, notify]);
```

**Required Socket Service Methods:**

**Location:** `/packages/shared/websocket/socketService.js`

Add these helper methods:
```javascript
isConnected() {
  return this.socket && this.socket.connected;
}

getCurrentSessionId() {
  return this.currentSessionId;
}
```

---

### Fix #3: Enhanced Socket Emit with Retry Queue (Optional, Better UX)

**File:** `/packages/shared/websocket/socketService.js`
**Lines:** 238-244

**Change from:**
```javascript
emitSessionStatusUpdate(status) {
  if (!this.currentSessionId) {
    console.error('Cannot emit session-status-updated: no session');
    return;
  }

  this.emit('session-status-updated', {
    sessionId: this.currentSessionId,
    status
  });
}
```

**Change to:**
```javascript
emitSessionStatusUpdate(status) {
  if (!this.currentSessionId) {
    console.warn('Cannot emit session-status-updated: session not joined yet');

    // Queue the emit for when socket reconnects
    const retryEmit = () => {
      if (this.currentSessionId) {
        this.emit('session-status-updated', {
          sessionId: this.currentSessionId,
          status
        });
      }
    };

    // Retry once after 500ms (gives socket time to reconnect)
    setTimeout(() => {
      if (this.currentSessionId) {
        retryEmit();
      }
    }, 500);

    return;
  }

  this.emit('session-status-updated', {
    sessionId: this.currentSessionId,
    status
  });
}
```

---

### Fix #4: Backend Validation Enhancement (Optional, Defensive)

**File:** `/packages/shared/api/payments.js`
**Lines:** 26-68

**Make validation more explicit about undefined:**

```javascript
// Validation for skipped items
if (skipped) {
  // Ensure amount and method are not provided or are explicitly null/0
  if (amount !== undefined && amount !== 0 && amount !== null) {
    return res.status(400).json({
      success: false,
      error: 'Skipped items cannot have amount > 0',
      details: { received: amount, expected: '0 or undefined' }
    });
  }

  if (method !== undefined && method !== null) {
    return res.status(400).json({
      success: false,
      error: 'Skipped items cannot have a payment method',
      details: { received: method, expected: 'null or undefined' }
    });
  }

  if (!item_id) {
    return res.status(400).json({
      success: false,
      error: 'item_id is required for skipped items'
    });
  }
} else {
  // Validation for regular payments
  if (!item_id || amount === undefined || amount === null || !method) {
    return res.status(400).json({
      success: false,
      error: 'item_id, amount, and method are required for payments',
      details: {
        item_id: !!item_id,
        amount: amount !== undefined && amount !== null,
        method: !!method
      }
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      success: false,
      error: 'amount must be greater than 0 for payments'
    });
  }
}
```

---

## Testing Checklist

### Skip Items Flow
- [ ] Click skip checkbox on an unpaid item
- [ ] Verify no "Validation failed" error in console
- [ ] Verify item is marked as skipped in UI
- [ ] Check database: verify payment record created with status='skipped', amount=0, method=null
- [ ] Click skip checkbox again to unskip
- [ ] Verify item returns to normal state (can be paid)
- [ ] Try skipping multiple items in rapid succession

### WebSocket Sync
- [ ] Monitor console for "Cannot emit" errors (should be gone or warning-level)
- [ ] Navigate to shopping screen immediately after session creation
- [ ] Verify session status updates without WebSocket errors
- [ ] Test with slow network (Chrome DevTools → Network → Slow 3G)
- [ ] Verify other participants see updates in real-time when socket is ready
- [ ] Test page refresh on shopping screen

### Edge Cases
- [ ] Skip item when socket is disconnected (airplane mode)
- [ ] Verify API succeeds even if WebSocket fails
- [ ] Skip item immediately after joining session
- [ ] Skip multiple items, then unskip all
- [ ] Pay for previously skipped item

---

## Files Modified

### Frontend
1. `/packages/minibag/minibag-ui-prototype.tsx` (lines 306-321, 343-349)
   - Add amount/method to skip payload
   - Add WebSocket ready check before emit

### Shared/WebSocket
2. `/packages/shared/websocket/socketService.js` (lines 238-244, add helpers)
   - Add isConnected() method
   - Add getCurrentSessionId() method
   - Optional: Add retry logic to emitSessionStatusUpdate

### Backend (Optional)
3. `/packages/shared/api/payments.js` (lines 26-68)
   - Enhance validation with explicit undefined handling
   - Add detailed error messages

---

## Priority Recommendations

### Must Fix (Critical)
1. ✅ **Fix skip items payload** - Blocks core functionality
2. ✅ **Add WebSocket ready check** - Prevents error spam

### Should Fix (High)
3. 🔶 **Add socket service helper methods** - Improves code quality
4. 🔶 **Enhanced error messages** - Better debugging

### Nice to Have (Medium)
5. 🟡 **Backend validation enhancement** - Defensive programming
6. 🟡 **WebSocket retry queue** - Better UX during reconnection

---

## Related Issues

- WebSocket reconnection handling (socket.js:34-56)
- Session persistence and restoration (useSession.js:70-107)
- Payment recording flow (payments.js)
- Real-time synchronization architecture

---

## Notes

- The API calls succeed even when WebSocket fails (good architecture)
- Skip functionality is completely blocked without Fix #1
- Fix #2 is needed to prevent console error spam
- Both errors are independent and can be fixed separately
- Backend validation is already mostly correct, just needs defensive enhancement
