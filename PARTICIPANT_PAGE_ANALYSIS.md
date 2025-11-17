# Participant Page "Your List" Status - User Journey Analysis

**Date:** 2025-11-01
**Status:** Critical bugs identified
**Impact:** Steps 2 & 3 not updating, Bill summary shows 0 items/0kg

---

## Executive Summary

The ParticipantTrackingScreen (showing "Your List" status) has three critical bugs preventing proper user journey:

1. **WebSocket Event Mismatch** - Steps 2 & 3 never update because frontend listens to wrong event
2. **Data Not Transformed** - Bill summary shows 0 items because untransformed API data is passed
3. **Participant Reference Wrong** - Current participant uses API data instead of transformed state

---

## Intended User Journey

### For Participants (Non-Host Users)

**Step 1: List submitted to host** ✅ (Always works)
- Participant joins via invite link
- Adds items on `ParticipantAddItemsScreen`
- Clicks "Done" → triggers `updateParticipantStatus()` → sets `items_confirmed: true`
- Navigates to `ParticipantTrackingScreen`

**Step 2: Shopping in progress** ❌ (Not updating)
- SHOULD update when host navigates to `ShoppingScreen`
- `ShoppingScreen` has `useEffect` that calls `onUpdateSessionStatus('shopping')` on mount
- Updates database session status to 'shopping'
- WebSocket emits `session-status-updated` event

**Step 3: All done!** ❌ (Not updating)
- SHOULD update when host completes shopping
- Session status changes to 'completed'
- WebSocket notifies all participants

**Bill Summary (Your Items)** ❌ (Shows 0 items/0kg)
- SHOULD display participant's items from `participant.items`
- SHOULD calculate total weight using `getTotalWeight(myItems)`
- SHOULD show item count as `Object.keys(myItems).length`

---

## 🔴 BUG #1: Steps 2 & 3 Never Update

### Root Cause
WebSocket event name mismatch between backend and frontend.

### Evidence

**Location:** `/packages/minibag/src/hooks/useSession.js:284-286`

```javascript
// Listen for status changes
socketService.onSessionStatusChanged((newStatus) => {  // ❌ Wrong event name
  setSession(prev => ({ ...prev, status: newStatus }));
});
```

**Backend emits:** `session-status-updated` (from `/packages/shared/websocket/handlers.js:90`)
**Frontend listens to:** `session-status-changed` (legacy event)

### Impact
When the host:
- Starts shopping → backend emits `session-status-updated`
- Completes session → backend emits `session-status-updated`

Participants never receive these updates because they're listening to the wrong event name.

### Current Behavior in ParticipantTrackingScreen

**Location:** `/packages/minibag/src/screens/ParticipantTrackingScreen.jsx:44, 57-77`

```javascript
// Line 44: Session status is read once from props
const sessionStatus = session?.status || 'active';

// Lines 57-77: Steps calculated from this static sessionStatus
const steps = [
  {
    number: 1,
    label: 'List shared with host',
    status: 'completed', // Always completed
  },
  {
    number: 2,
    label: 'Shopping in progress',
    status: sessionStatus === 'shopping' || sessionStatus === 'completed'
      ? 'completed'
      : 'pending', // ❌ Stays pending forever
  },
  {
    number: 3,
    label: 'All done!',
    status: sessionStatus === 'completed'
      ? 'completed'
      : 'pending', // ❌ Stays pending forever
  },
];
```

### Why This Happens
1. Component receives `session` prop with initial status 'active'
2. `useSession` hook has WebSocket listener but uses wrong event name
3. When backend emits `session-status-updated`, listener never fires
4. Session state never updates
5. Component never re-renders with new status
6. Steps remain stuck at "pending"

### Socket Service Investigation

**Location:** `/packages/shared/websocket/socketService.js:147-148, 238`

```javascript
// Line 147-148: TWO different listener methods exist
onSessionStatusChanged: (callback) => {  // Legacy - listens to 'session-status-changed'
  on('session-status-changed', callback);
},
onSessionStatusUpdated: (callback) => {  // New - listens to 'session-status-updated'
  on('session-status-updated', callback);
},

// Line 238: Backend emits 'session-status-updated'
const emitSessionStatusUpdated = (sessionId, status) => {
  emit('session-status-updated', { sessionId, status });
};
```

The socket service has both methods, but `useSession` hook only uses the legacy one!

---

## 🔴 BUG #2: Bill Summary Shows 0 Items / 0kg

### Root Cause
Data structure mismatch - component receives untransformed API data.

### Evidence

**Component expectation** - `/packages/minibag/src/screens/ParticipantTrackingScreen.jsx:52-54`

```javascript
const myItems = participant?.items || {};  // Expects OBJECT
const myTotalWeight = getTotalWeight(myItems);
const itemCount = Object.keys(myItems).length;  // ❌ Returns 0 when items is an array
```

**What component expects:**
```javascript
{
  items: {
    'itemId1': 2,
    'itemId2': 3
  }
}
```

**What API returns** - `/packages/shared/api/participants.js:111-120`

```javascript
const { data: updatedParticipant, error: fetchError } = await supabase
  .from('participants')
  .select(`
    *,
    items:participant_items(
      *,
      catalog_item:catalog_items(*)
    )
  `)
  .eq('id', participant_id)
  .single();
```

**What participant actually contains:**
```javascript
{
  items: [
    { item_id: 'uuid', quantity: 2, unit: 'kg', catalog_item: {...} },
    { item_id: 'uuid', quantity: 3, unit: 'kg', catalog_item: {...} }
  ]
}
```

### Why This Happens

**Location:** `/packages/minibag/minibag-ui-prototype.tsx:159-188, 741`

```javascript
// Lines 159-188: Data transformation DOES happen
React.useEffect(() => {
  if (session && apiParticipants) {
    const { hostItems: transformedHostItems, participants: transformedParticipants } =
      transformSessionData(session, apiParticipants);

    setHostItems(transformedHostItems);
    setParticipants(transformedParticipants);  // ✅ Transformed data stored in state
  }
}, [session, apiParticipants, currentParticipant, loadParticipantItemsFromLocalStorage]);

// Line 741: But wrong data is passed to component
<ParticipantTrackingScreen
  session={session}
  participant={currentParticipant}  // ❌ Uses untransformed currentParticipant
  participants={apiParticipants}    // ❌ Uses untransformed apiParticipants
  // ...
/>
```

### Impact
1. Component receives `participant.items` as an array
2. `Object.keys(myItems).length` returns array length (but arrays don't work with getTotalWeight)
3. `getTotalWeight(myItems)` expects object format like `{itemId: qty}`, gets array instead
4. Returns 0 or undefined
5. UI shows "0 items, 0kg"

---

## 🔴 BUG #3: Participant Data Reference Wrong

### Root Cause
Both `participant` and `participants` props use untransformed API data instead of transformed state.

### Evidence

**Location:** `/packages/minibag/minibag-ui-prototype.tsx:740-741`

```javascript
<ParticipantTrackingScreen
  session={session}
  participant={currentParticipant}  // ❌ From API, not transformed state
  participants={apiParticipants}    // ❌ From API, not transformed state
  hostItems={hostItems}
  catalogItems={catalogItems}
/>
```

**Should be:**
```javascript
<ParticipantTrackingScreen
  session={session}
  participant={participants.find(p => p.id === currentParticipant?.id) || currentParticipant}  // ✅
  participants={participants}  // ✅ Use transformed state
  hostItems={hostItems}
  catalogItems={catalogItems}
/>
```

### Why This Matters
- The `participants` state contains properly transformed data with items as objects
- But the component never receives it
- This compounds the bill summary issue

---

## Data Flow Analysis

### Current (Broken) Flow

```
API Response (apiParticipants)
  ↓
  items: [{item_id, quantity, catalog_item}]  ← Array format
  ↓
transformSessionData(session, apiParticipants)
  ↓
setParticipants(transformedParticipants)  ← Converts to object format
  ↓
State: participants  ← items: {itemId: quantity}
  ↓
BUT...
  ↓
<ParticipantTrackingScreen
  participant={currentParticipant}  ← Still uses array format! ❌
  participants={apiParticipants}    ← Still uses array format! ❌
/>
```

### Expected (Fixed) Flow

```
API Response (apiParticipants)
  ↓
  items: [{item_id, quantity, catalog_item}]
  ↓
transformSessionData(session, apiParticipants)
  ↓
setParticipants(transformedParticipants)
  ↓
State: participants  ← items: {itemId: quantity}
  ↓
<ParticipantTrackingScreen
  participant={participants.find(...)}  ← Uses transformed data ✅
  participants={participants}           ← Uses transformed data ✅
/>
```

---

## The Fixes

### Fix #1: Update WebSocket Event Listener

**File:** `/packages/minibag/src/hooks/useSession.js`
**Line:** 284-286

**Change from:**
```javascript
socketService.onSessionStatusChanged((newStatus) => {
  setSession(prev => ({ ...prev, status: newStatus }));
});
```

**Change to:**
```javascript
socketService.onSessionStatusUpdated((data) => {
  setSession(prev => ({ ...prev, status: data.status }));
});
```

**Why:** Use the correct event name that matches backend emissions.

---

### Fix #2: Pass Transformed Participant Data

**File:** `/packages/minibag/minibag-ui-prototype.tsx`
**Lines:** 740-741

**Change from:**
```javascript
<ParticipantTrackingScreen
  session={session}
  participant={currentParticipant}
  participants={apiParticipants}
  hostItems={hostItems}
  catalogItems={catalogItems}
/>
```

**Change to:**
```javascript
<ParticipantTrackingScreen
  session={session}
  participant={participants.find(p => p.id === currentParticipant?.id) || currentParticipant}
  participants={participants}
  hostItems={hostItems}
  catalogItems={catalogItems}
/>
```

**Why:** Pass the transformed data that has items in the correct object format.

---

### Fix #3: Verify Data Transformer

**File:** `/packages/minibag/src/utils/sessionTransformers.js`

**Action:** Verify that the transformer correctly converts items from array to object format.

**Expected transformation:**
```javascript
// Input (from API)
participant.items = [
  { item_id: 'uuid1', quantity: 2, unit: 'kg' },
  { item_id: 'uuid2', quantity: 3, unit: 'kg' }
]

// Output (for component)
participant.items = {
  'uuid1': 2,
  'uuid2': 3
}
```

---

## Expected Outcomes After Fixes

✅ **Step 2 updates in real-time** when host starts shopping
✅ **Step 3 updates in real-time** when shopping completes
✅ **Bill summary shows correct item count** (e.g., "5 items")
✅ **Bill summary shows correct total weight** (e.g., "12.5kg")
✅ **Participant sees their full list** in "Your Items" section

---

## Testing Checklist

After implementing fixes, verify:

1. **Steps Update:**
   - [ ] Open participant tracking screen (see "Your List" title)
   - [ ] Host navigates to shopping screen
   - [ ] Step 2 changes from pending to completed
   - [ ] Host completes all payments
   - [ ] Step 3 changes from pending to completed

2. **Bill Summary:**
   - [ ] Add items to participant list
   - [ ] Confirm items
   - [ ] Navigate to tracking screen
   - [ ] Verify item count matches number of items added
   - [ ] Verify weight calculation is correct

3. **Real-time Updates:**
   - [ ] Multiple participants in same session
   - [ ] Host changes session status
   - [ ] All participants see updates simultaneously

---

## Files Modified

1. `/packages/minibag/src/hooks/useSession.js` - WebSocket listener
2. `/packages/minibag/minibag-ui-prototype.tsx` - Component props
3. `/packages/minibag/src/utils/sessionTransformers.js` - Verify transformation (may need fix)

---

## Related Components

- `ParticipantTrackingScreen` - `/packages/minibag/src/screens/ParticipantTrackingScreen.jsx`
- `ShoppingScreen` - Triggers session status change to 'shopping'
- `useSession` hook - Manages session state and WebSocket listeners
- Socket service - `/packages/shared/websocket/socketService.js`
- Participant API - `/packages/shared/api/participants.js`

---

## Notes

- The socket service already has both `onSessionStatusChanged` and `onSessionStatusUpdated` methods
- The transformation logic exists and works - we just need to use the transformed data
- This is a data flow issue, not a logic issue
- Backend is working correctly - only frontend needs updates
