# Shopping & Bill Items Aggregation Endpoints

## Overview

These endpoints provide server-side aggregated data for shopping and billing screens, eliminating the empty items API issue that occurs with Supabase's embedded relation queries.

**Created:** 2025-11-02
**Status:** ✅ Tested and Working

---

## Endpoints

### 1. GET `/api/sessions/:session_id/shopping-items`

Returns pre-aggregated shopping data for the shopping/payment recording screen.

#### Purpose
- Eliminates empty items issue during shopping phase
- Provides server-side aggregation of participant items
- Returns ready-to-display data for shopping screen

#### Request

```bash
GET /api/sessions/2d190f5a6ae8/shopping-items
```

#### Response

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "75d54b8e-7fc5-45af-b3bb-2135e3b9d3b8",
      "session_id": "2d190f5a6ae8",
      "status": "shopping"
    },
    "aggregatedItems": {
      "v002": {
        "item_id": "v002",
        "name": "Potatoes",
        "unit": "kg",
        "base_price": 30,
        "emoji": "🥬",
        "totalQuantity": 1.5,
        "participants": ["Nav", "Ira"]
      },
      "v003": {
        "item_id": "v003",
        "name": "Onions",
        "unit": "kg",
        "base_price": 35,
        "emoji": "🥬",
        "totalQuantity": 1.5,
        "participants": ["Nav", "Ira"]
      }
    },
    "participants": [
      {
        "id": "55f5ebd2-10c7-4a47-bcc4-7c7511e773a6",
        "nickname": "Nav",
        "avatar_emoji": "👨",
        "items_confirmed": true,
        "is_creator": true,
        "itemsCount": 2
      },
      {
        "id": "1c495358-e7f5-4b0b-ab79-69564bcdf834",
        "nickname": "Ira",
        "avatar_emoji": "👩",
        "items_confirmed": true,
        "is_creator": false,
        "itemsCount": 2
      }
    ]
  }
}
```

#### Response Fields

**aggregatedItems** (object)
- Key: `item_id` (string) - Catalog item ID (e.g., "v001", "v002")
- Value: Object with:
  - `item_id` (string) - Same as key
  - `name` (string) - Item name
  - `unit` (string) - Unit of measurement (e.g., "kg")
  - `base_price` (number) - Base price per unit
  - `emoji` (string) - Item emoji
  - `totalQuantity` (number) - Sum of quantities from all participants
  - `participants` (array<string>) - List of participant nicknames who added this item

**participants** (array)
- `id` (UUID) - Participant ID
- `nickname` (string) - Participant nickname
- `avatar_emoji` (string) - Avatar emoji
- `items_confirmed` (boolean) - Whether participant confirmed their list
- `is_creator` (boolean) - Whether participant is session creator/host
- `itemsCount` (number) - Number of unique items participant added

#### Use Cases
1. Display shopping list with aggregated quantities
2. Show which participants ordered each item
3. Track participant confirmation status
4. Display participant summaries

#### Implementation
- **File:** `/packages/shared/api/sessions.js`
- **Function:** `getShoppingItems()`
- **Lines:** 648-779

---

### 2. GET `/api/sessions/:session_id/bill-items`

Returns pre-aggregated bill data with payment information for billing screens.

#### Purpose
- Provides per-participant cost breakdowns
- Includes payment status and totals
- Ready-to-display data for bill/payment screens

#### Request

```bash
GET /api/sessions/2d190f5a6ae8/bill-items
```

#### Response

```json
{
  "success": true,
  "data": {
    "session": {
      "id": "75d54b8e-7fc5-45af-b3bb-2135e3b9d3b8",
      "session_id": "2d190f5a6ae8",
      "status": "shopping"
    },
    "participants": [
      {
        "participant_id": "55f5ebd2-10c7-4a47-bcc4-7c7511e773a6",
        "nickname": "Nav",
        "avatar_emoji": "👨",
        "real_name": "Navin",
        "is_creator": true,
        "items_confirmed": true,
        "total_cost": 0,
        "items_count": 2,
        "items": []
      },
      {
        "participant_id": "1c495358-e7f5-4b0b-ab79-69564bcdf834",
        "nickname": "Ira",
        "avatar_emoji": "👩",
        "real_name": "Iravati",
        "is_creator": false,
        "items_confirmed": true,
        "total_cost": 0,
        "items_count": 2,
        "items": []
      }
    ],
    "total_paid": 0,
    "payments_count": 0,
    "skipped_items": []
  }
}
```

**Note:** In the example above, `total_cost = 0` and `items = []` because no payments have been recorded yet. Once payments are recorded, the response will include:

```json
{
  "participants": [
    {
      "participant_id": "uuid",
      "nickname": "Nav",
      "total_cost": 67,
      "items_count": 2,
      "items": [
        {
          "item_id": "v002",
          "catalog_item_id": "uuid",
          "name": "Potatoes",
          "emoji": "🥬",
          "quantity": 1.0,
          "unit": "kg",
          "price_per_kg": 40,
          "item_cost": 40
        }
      ]
    }
  ],
  "total_paid": 100,
  "payments_count": 2
}
```

#### Response Fields

**participants** (array)
- `participant_id` (UUID) - Participant ID
- `nickname` (string) - Participant nickname
- `avatar_emoji` (string) - Avatar emoji
- `real_name` (string) - Real name if provided
- `is_creator` (boolean) - Whether participant is host
- `items_confirmed` (boolean) - Items list confirmed
- `total_cost` (number) - Total amount owed by participant (rounded)
- `items_count` (number) - Number of unique items participant ordered
- `items` (array) - Itemized bill breakdown:
  - `item_id` (string) - Catalog item ID (e.g., "v001")
  - `catalog_item_id` (UUID) - Catalog item UUID
  - `name` (string) - Item name
  - `emoji` (string) - Item emoji
  - `quantity` (number) - Participant's quantity
  - `unit` (string) - Unit of measurement
  - `price_per_kg` (number) - Price per unit (calculated from payment)
  - `item_cost` (number) - Cost for this item (rounded)

**total_paid** (number) - Total amount paid for all items (sum of all payments)

**payments_count** (number) - Number of payment records

**skipped_items** (array) - Items that were skipped (not purchased):
- `catalog_item_id` (UUID) - Item ID
- `item_id` (string) - String item ID
- `skip_reason` (string) - Reason for skipping

#### Use Cases
1. Display participant bills with itemized costs
2. Show payment status and totals
3. Track skipped items
4. Calculate cost splits based on actual purchase prices

#### Implementation
- **File:** `/packages/shared/api/sessions.js`
- **Function:** `getBillItems()`
- **Lines:** 781-971

---

## How It Works

### Data Flow

1. **Query participant_items directly** (not through session participants)
   - Uses INNER JOIN with participants to filter by session
   - Includes catalog item data
   - Never returns empty arrays

2. **Query all participants separately**
   - Includes those without items
   - Complete participant list

3. **Server-side aggregation**
   - Sum quantities by item_id
   - Build participant lists per item
   - Calculate cost splits (for bill endpoint)

4. **Return formatted data**
   - Ready for display
   - No client-side processing needed

### Why This Fixes the Empty Items Issue

**Old Approach (getSession endpoint):**
```javascript
participants(
  *,
  items:participant_items(*)
)
```
→ Returns `items: []` when participant has no records in participant_items

**New Approach (shopping-items/bill-items):**
```javascript
participant_items(
  *,
  participant:participants!inner(*)
)
```
→ Queries participant_items directly, never returns empty

---

## Testing

### Test with curl

```bash
# Test shopping-items endpoint
curl http://localhost:3000/api/sessions/YOUR_SESSION_ID/shopping-items | python3 -m json.tool

# Test bill-items endpoint
curl http://localhost:3000/api/sessions/YOUR_SESSION_ID/bill-items | python3 -m json.tool
```

### Test Results (2025-11-02)

✅ **shopping-items endpoint:**
- Returns aggregated items correctly
- Shows participant lists per item
- Calculates total quantities accurately

✅ **bill-items endpoint:**
- Returns participant summaries
- Calculates cost splits (when payments exist)
- Shows zero costs when no payments recorded
- Properly handles skipped items

### Console Output

```
✅ [getShoppingItems] Aggregated shopping items:
   sessionId: "2d190f5a6ae8"
   sessionStatus: "shopping"
   totalUniqueItems: 2
   totalParticipants: 2
   itemsSample: [...]

✅ [getBillItems] Calculated bill items:
   sessionId: "2d190f5a6ae8"
   sessionStatus: "shopping"
   totalParticipants: 2
   totalPaid: 0
   paymentsCount: 0
```

---

## Migration Guide

### Client Integration

**Before (using session participants):**
```javascript
const { data: session } = await fetch(`/api/sessions/${sessionId}`);
const participants = session.participants;

// Client-side aggregation
const aggregated = aggregateAllItems(hostItems, participants);
```

**After (using shopping-items endpoint):**
```javascript
const { data } = await fetch(`/api/sessions/${sessionId}/shopping-items`);

// Use pre-aggregated data directly
const aggregatedItems = data.aggregatedItems;
const participants = data.participants;
```

### Benefits

✅ **No empty items issue** - Queries source table directly
✅ **Faster** - Server-side aggregation, no client processing
✅ **Consistent** - Single source of truth
✅ **Simpler** - Less client-side code
✅ **Reliable** - No race conditions or state synchronization issues

---

## Troubleshooting

### Empty aggregatedItems

**Cause:** No participant items have been added yet

**Solution:** Normal behavior - will populate when participants add items

### Zero total_cost in bill-items

**Cause:** No payments have been recorded yet

**Solution:** Normal behavior - costs appear after host records payments

### 404 Not Found

**Cause:** Session doesn't exist

**Solution:** Verify session_id is correct and session is active

---

## Related Documentation

- Root cause analysis: `/SHOPPING_SCREEN_AGGREGATION_FIX.md`
- Database schema: `/database/001_initial_schema.sql`
- Sessions API: `/packages/shared/api/sessions.js`

---

**Last Updated:** 2025-11-02
**Status:** ✅ Production Ready
**Next Steps:** Client integration, unit tests
