# Shopping Screen Aggregation Issue - Analysis & Fix Plan

## Problem Statement

The shopping screen (record payments screen) is not displaying the correct aggregated list from all participants. When Jaidev (host) and Rujuta (participant) submit their lists, the shopping screen should show combined quantities from both, but it's currently showing incorrect or incomplete data.

---

## Root Causes Identified

### 1. **Stale Closure in WebSocket Event Handlers** (PRIMARY ISSUE)

**Location:** `packages/minibag/src/hooks/useParticipantSync.js` lines 77-128

**Problem:**
- The `useEffect` has `participants` in its dependency array (line 77)
- Every time participants update, the effect re-runs and creates new WebSocket listeners
- These listeners capture the OLD participants value in their closure
- When WebSocket events fire, they use the stale participants array to compute updates

**Code Example:**
```javascript
useEffect(() => {
  socketService.on('participant-items-updated', (data) => {
    // This closure captures the OLD participants array!
    const updatedParticipants = participants.map(p =>
      p.id === data.participantId ? { ...p, items: data.items } : p
    );
    setParticipants(updatedParticipants);
  });
}, [participants]); // <-- Re-creates listener every time participants change
```

**Impact:**
- When a participant updates their items via WebSocket
- The handler uses outdated participant data from previous render
- Results in incorrect aggregated calculations

---

### 2. **Data Transformation Issues** (SECONDARY)

**Location:** `packages/minibag/src/utils/sessionTransformers.js` line 25

**Problem:**
```javascript
const itemId = item.catalog_item?.item_id || item.item_id;
```

- When `catalog_item` relation is not populated from the API (NULL/undefined)
- Falls back to `item.item_id` which is a **UUID** (e.g., "8f4f1775-e187-4a21-8e96-34d83b20f7f2")
- Should use string ID format (e.g., "v001", "f001", "d001")

**Consequence:**
1. `hostItems` and `participants[].items` get UUID keys instead of string IDs
2. `aggregateAllItems()` produces object with UUID keys
3. `ShoppingScreen` tries to find items by UUID in catalog
4. Catalog items only have mappings by string ID
5. Item lookup fails, shows nothing or wrong data

**API Query (in `packages/shared/api/sessions.js` lines 594-597):**
```javascript
items:participant_items(
  *,
  catalog_item:catalog_items(*)
)
```

This SHOULD populate `catalog_item`, but if the foreign key relationship is not properly configured in Supabase, it may return NULL.

---

### 3. **useMemo in ShoppingScreen.jsx** (WORKING CORRECTLY ✓)

**Location:** `packages/minibag/src/screens/ShoppingScreen.jsx` lines 76-79

**Code:**
```javascript
const allItems = useMemo(
  () => aggregateAllItems(hostItems, participants),
  [hostItems, participants]
);
```

**Status:** ✅ Correctly implemented
- Dependencies include both `hostItems` and `participants`
- Will recalculate when either changes
- This is NOT the source of the problem

---

## Impact Chain

When participants join or update their items:

1. ❌ WebSocket event fires with new participant data
2. ❌ Event handler uses **stale participants array** from closure
3. ❌ Updated participants computed from **outdated data**
4. ✅ ShoppingScreen's useMemo sees new array reference
5. ✅ aggregateAllItems recalculates
6. ❌ But with **incorrect participant data** (stale or wrong format)
7. ❌ UI shows outdated/incorrect aggregated list

---

## Fix Plan

### Step 1: Fix Stale Closure in useParticipantSync.js

**Approach A: Use useRef (Recommended)**
```javascript
const participantsRef = useRef(participants);

useEffect(() => {
  participantsRef.current = participants;
}, [participants]);

useEffect(() => {
  socketService.on('participant-items-updated', (data) => {
    // Use ref to get latest value
    const updatedParticipants = participantsRef.current.map(p =>
      p.id === data.participantId ? { ...p, items: data.items } : p
    );
    setParticipants(updatedParticipants);
  });

  return () => socketService.off('participant-items-updated');
}, []); // <-- Empty dependency array, no stale closure
```

**Approach B: Use Functional setState (Alternative)**
```javascript
useEffect(() => {
  socketService.on('participant-items-updated', (data) => {
    setParticipants(prevParticipants =>
      prevParticipants.map(p =>
        p.id === data.participantId ? { ...p, items: data.items } : p
      )
    );
  });

  return () => socketService.off('participant-items-updated');
}, []);
```

---

### Step 2: Fix Data Transformation in sessionTransformers.js

**Option A: Add Defensive Lookup (Quick Fix)**
```javascript
export function transformParticipantItems(apiItems, catalogItems = []) {
  if (!apiItems || !Array.isArray(apiItems)) {
    return {};
  }

  return apiItems.reduce((acc, item) => {
    // Try to get item_id from catalog_item relation
    let itemId = item.catalog_item?.item_id;

    // If missing, do a lookup by UUID in catalog
    if (!itemId && item.item_id && catalogItems.length > 0) {
      const catalogItem = catalogItems.find(ci => ci.id === item.item_id);
      itemId = catalogItem?.item_id;
    }

    // Last resort: use the UUID (will likely fail)
    if (!itemId) {
      console.warn('Could not resolve item_id for participant item:', item);
      itemId = item.item_id;
    }

    acc[itemId] = item.quantity;
    return acc;
  }, {});
}
```

**Option B: Fix API Query (Proper Fix)**
- Verify Supabase foreign key relationship is configured:
  - `participant_items.item_id` → `catalog_items.id` (UUID → UUID)
- Check that the API query properly joins catalog data
- Add server-side logging to verify `catalog_item` is populated

---

### Step 3: Add Debugging in minibag-ui-prototype.tsx

**Location:** Lines 159-188 (where session data is synced)

```javascript
React.useEffect(() => {
  if (session && apiParticipants) {
    const { hostItems: transformedHostItems, participants: transformedParticipants } =
      transformSessionData(session, apiParticipants);

    // DEBUG: Log transformed data
    console.log('🔍 Transformed Data:', {
      hostItems: transformedHostItems,
      participants: transformedParticipants,
      rawApiParticipants: apiParticipants
    });

    setHostItems(transformedHostItems);
    setParticipants(transformedParticipants);
  }
}, [session, apiParticipants, currentParticipant, loadParticipantItemsFromLocalStorage]);
```

---

### Step 4: Add Debugging in ShoppingScreen.jsx

**Location:** Lines 76-79 (where allItems is calculated)

```javascript
const allItems = useMemo(() => {
  const aggregated = aggregateAllItems(hostItems, participants);

  // DEBUG: Log aggregation
  console.log('🛒 Shopping Screen - Aggregated Items:', {
    hostItems,
    participants: participants.map(p => ({ id: p.id, name: p.name, items: p.items })),
    aggregated
  });

  return aggregated;
}, [hostItems, participants]);
```

---

### Step 5: Verify Item Lookup in ShoppingScreen.jsx

**Location:** Line 121 (item lookup)

**Current Code:**
```javascript
const veg = items.find(v => v.item_id === itemId || v.id === itemId);
```

**Status:** ✅ Already correctly handles both string ID and UUID
- First tries `v.item_id` (string like "v001")
- Falls back to `v.id` (UUID)

---

## Files to Modify

1. ✅ **packages/minibag/src/hooks/useParticipantSync.js**
   - Fix stale closure with useRef or functional setState
   - Lines 77-128

2. ✅ **packages/minibag/src/utils/sessionTransformers.js**
   - Add defensive item ID resolution
   - Lines 17-28

3. ✅ **packages/minibag/minibag-ui-prototype.tsx**
   - Add debugging logs
   - Lines 159-188, 203-218

4. ✅ **packages/minibag/src/screens/ShoppingScreen.jsx**
   - Add debugging logs for aggregation
   - Lines 76-79

5. ⚠️ **packages/shared/api/sessions.js** (Optional - if API fix needed)
   - Verify catalog_item relation is populated
   - Add logging to check API response format
   - Lines 594-597

---

## Testing Plan

### Phase 1: Add Logging
1. Add all debugging logs from Steps 3-4
2. Create new session with host
3. Join as participant
4. Add items to both lists
5. Go to shopping screen
6. Check console logs:
   - Are participant items properly formatted?
   - Are item IDs strings or UUIDs?
   - Is aggregateAllItems receiving correct data?

### Phase 2: Fix Stale Closure
1. Implement useRef fix in useParticipantSync.js
2. Test same scenario
3. Verify participants array updates correctly

### Phase 3: Fix Data Transformation
1. If logs show UUID keys instead of strings, implement defensive lookup
2. Test again
3. Verify aggregated items show correct totals

### Phase 4: Cleanup
1. Remove debug logs or wrap in `if (process.env.NODE_ENV === 'development')`
2. Test full flow end-to-end

---

## Expected Results After Fix

**Shopping Screen Should Display:**
```
Record Payments
Items paid: 0/3

🥬 Tomatoes
   Total: 1.5 kg
   [Pay]

🥔 Potatoes
   Total: 2 kg
   [Pay]

🧅 Onions
   Total: 2 kg
   [Pay]
```

Where:
- Tomatoes: 0.5kg (Jaidev) + 1kg (Rujuta) = 1.5kg ✓
- Potatoes: 1kg (Jaidev) + 1kg (Rujuta) = 2kg ✓
- Onions: 2kg (Jaidev) + 0kg (Rujuta) = 2kg ✓

---

## Additional Notes

### useMemo Optimizations (All Working Correctly)

Found in `minibag-ui-prototype.tsx`:
- Line 76-79: `allItems` calculation in ShoppingScreen - ✅ Correct
- Line 484: `getTotalWeight` - ✅ Correct
- Line 440-442: `vegCategoryIds` - ✅ Correct
- Line 446-449: `vegetableItems` filtering - ✅ Correct

None of these are causing the issue.

### Browser Cache Issues

If changes don't reflect after implementing fixes:
1. Clear localStorage: `localStorage.clear()`
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Clear cookies for localhost
4. Restart dev server

---

## Priority

**HIGH PRIORITY:** Fix stale closure (Step 1) - This is the most likely cause

**MEDIUM PRIORITY:** Add debugging (Steps 3-4) - Essential for diagnosis

**LOW PRIORITY:** Fix data transformation (Step 2) - Only if logs show UUID issue

---

## Next Steps

1. Review this document
2. Confirm approach (useRef vs functional setState)
3. Implement fixes in order
4. Test with real session data
5. Verify aggregated totals are correct

---

**Document Created:** 2025-11-02
**Last Updated:** 2025-11-02
**Status:** Defensive Fix ✅ Implemented | Proper Fix ✅ Available

---

## Update: Long-Term Solution - Server-Side Aggregation Endpoints

### Background

After implementing the defensive fixes above, further investigation revealed the **root cause** of the empty items API issue:

**Problem:** Supabase's embedded relation query syntax in `getSession()` endpoint:
```javascript
.select(`
  *,
  items:participant_items(
    *,
    catalog_item:catalog_items(*)
  )
`)
.eq('session_id', session.id);
```

When a participant has NO records in `participant_items` table, Supabase returns:
```javascript
{
  id: 'participant-uuid',
  nickname: 'Eva',
  items: []  // <-- Empty array, not undefined!
}
```

This happens during:
- Session status transitions (active → shopping → completed)
- Page refreshes before DB commits complete
- WebSocket event race conditions
- Any time a participant hasn't added items yet

### The Proper Fix: Server-Side Aggregation Endpoints

**New API Endpoints Created:** (2025-11-02)

#### 1. GET `/api/sessions/:session_id/shopping-items`
Returns pre-aggregated shopping data for the shopping screen.

**Response Format:**
```javascript
{
  success: true,
  data: {
    session: {
      id: "uuid",
      session_id: "abc123",
      status: "shopping"
    },
    aggregatedItems: {
      "v001": {
        item_id: "v001",
        name: "Tomatoes",
        unit: "kg",
        price: 40,
        emoji: "🍅",
        totalQuantity: 1.5,
        participants: ["JAI", "EVA"]
      },
      "v002": { ... }
    },
    participants: [
      {
        id: "participant-uuid",
        nickname: "JAI",
        avatar_emoji: "👨",
        items_confirmed: true,
        is_creator: true,
        itemsCount: 2
      }
    ]
  }
}
```

**Implementation:** `/packages/shared/api/sessions.js` lines 648-779

**How It Works:**
1. Queries `participant_items` table directly (never returns empty!)
2. Queries all participants separately (including those without items)
3. Aggregates items by `item_id` server-side
4. Returns pre-calculated totals and participant summaries

**Benefits:**
- ✅ No empty items issue (queries source table directly)
- ✅ Server is single source of truth
- ✅ Faster client performance (no aggregation needed)
- ✅ Consistent data across all clients

#### 2. GET `/api/sessions/:session_id/bill-items`
Returns pre-aggregated bill data with payment information.

**Response Format:**
```javascript
{
  success: true,
  data: {
    session: { ... },
    participants: [
      {
        participant_id: "uuid",
        nickname: "EVA",
        avatar_emoji: "👩",
        real_name: "Evanka",
        total_cost: 67,
        items_count: 2,
        items: [
          {
            item_id: "v001",
            name: "Tomatoes",
            emoji: "🍅",
            quantity: 1.0,
            unit: "kg",
            price_per_kg: 40,
            item_cost: 40
          }
        ]
      }
    ],
    total_paid: 100,
    payments_count: 3,
    skipped_items: []
  }
}
```

**Implementation:** `/packages/shared/api/sessions.js` lines 781-971

**How It Works:**
1. Gets all participant items with catalog + participant info
2. Gets all participants (including those without items)
3. Gets all payments for the session
4. Calculates per-participant bills with item breakdowns
5. Returns complete bill data ready for display

**Benefits:**
- ✅ No empty items issue
- ✅ Pre-calculated cost splits
- ✅ Includes payment status
- ✅ Ready for bill screen display

### Migration Path

**Phase 1: ✅ Server-Side Endpoints Created**
- New endpoints available and tested
- Defensive fix remains in place as fallback

**Phase 2: Client Integration (TODO)**

1. **Update ShoppingScreen workflow:**
```javascript
// In minibag-ui-prototype.tsx or ShoppingScreen container
useEffect(() => {
  const fetchShoppingItems = async () => {
    const response = await fetch(`/api/sessions/${sessionId}/shopping-items`);
    const data = await response.json();

    // Use pre-aggregated data
    setAggregatedItems(data.aggregatedItems);
    setParticipants(data.participants);
  };

  if (currentScreen === 'shopping') {
    fetchShoppingItems();
  }
}, [currentScreen, sessionId]);
```

2. **Update BillScreen workflow:**
```javascript
useEffect(() => {
  const fetchBillItems = async () => {
    const response = await fetch(`/api/sessions/${sessionId}/bill-items`);
    const data = await response.json();

    // Use pre-calculated bills
    setParticipantBills(data.participants);
    setTotalPaid(data.total_paid);
  };

  if (currentScreen === 'bills') {
    fetchBillItems();
  }
}, [currentScreen, sessionId]);
```

3. **Remove defensive merge logic:**
Once all screens use new endpoints, remove the defensive fix from minibag-ui-prototype.tsx (lines 191-240).

**Phase 3: Testing**
- Unit tests for aggregation endpoint logic
- Integration tests for shopping screen flow
- E2E tests for full session flow
- Performance testing (compare old vs new approach)

**Phase 4: Cleanup**
- Remove old aggregation client-side code
- Remove defensive fixes
- Update documentation

### Files Modified (2025-11-02)

1. ✅ `/packages/shared/api/sessions.js`
   - Added `getShoppingItems()` function (lines 648-779)
   - Added `getBillItems()` function (lines 781-971)

2. ✅ `/packages/shared/server.js`
   - Added route: `GET /api/sessions/:session_id/shopping-items` (line 209)
   - Added route: `GET /api/sessions/:session_id/bill-items` (line 210)

3. ✅ `/packages/minibag/minibag-ui-prototype.tsx`
   - Added comprehensive documentation comments (lines 191-214)
   - Explains defensive fix, root cause, and migration path

### Expected Console Output

**Before (with defensive fix):**
```
⚠️ API returned empty items for Eva, preserving 2 existing items
⚠️ API returned empty items for Jai, preserving 3 existing items
```

**After (using new endpoints):**
```
✅ [getShoppingItems] Aggregated shopping items:
   sessionId: "abc123"
   totalUniqueItems: 5
   totalParticipants: 2
   itemsSample: [...]
```

### Success Metrics

**Completed ✅:**
- Server-side aggregation endpoints created
- Routes configured and accessible
- Defensive fix documented as fallback
- Migration path defined

**Pending 🔄:**
- Client integration with new endpoints
- Unit + integration tests
- Remove defensive fix after migration
- Performance benchmarking

**Target Goals:**
- Zero "API returned empty items" warnings in production
- < 100ms aggregation time on shopping screen
- 100% test coverage for state synchronization
- No user-reported data loss issues

---

**Document Created:** 2025-11-02
**Last Updated:** 2025-11-02 (Added Server-Side Aggregation Solution)
**Status:** Defensive Fix ✅ Implemented | Proper Fix ✅ Available | Client Migration 🔄 Pending
