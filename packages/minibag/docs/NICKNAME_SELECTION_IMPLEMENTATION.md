# Nickname Selection Feature - Implementation Summary
**Date:** October 26, 2025
**Status:** Backend Complete ✅ | Frontend In Progress ⏳

---

## 🎯 Feature Overview

Allow users to choose from 2 nickname options (1 male / 1 female) when they:
1. **Create a session** (host)
2. **Join a session** (participant)

This enables:
- Privacy: Real name stored separately from public nickname
- Choice: Users select which nickname they prefer
- Tracking: Differentiate between real names and display names
- Gender inclusivity: Offer both options, user decides

---

## ✅ Backend Implementation (COMPLETED)

### 1. Database Changes
**File:** `database/007_add_real_name_to_participants.sql`

- Added `real_name` TEXT column to `participants` table
- Nullable to support existing records and anonymous mode
- Stores user's actual name separately from public nickname

**Migration needed:** Run this SQL in Supabase SQL Editor

---

### 2. API Functions Added
**File:** `packages/shared/api/sessions.js`

#### `getTwoNicknameOptions()`
- Fetches 1 male + 1 female nickname from `nicknames_pool`
- Returns array of 2 options with: `{id, nickname, avatar_emoji, gender}`
- Falls back to FALLBACK_NAMES if pool is empty

#### `markNicknameAsUsed(nicknameId, sessionId)`
- Marks selected nickname as unavailable
- Updates `currently_used_in`, `times_used`, `last_used`
- Skips if fallback was used (no ID)

#### Updated: `createSession()`
**New parameters:**
- `real_name` - User's actual name (optional)
- `selected_nickname_id` - ID of selected nickname from pool
- `selected_nickname` - The 3-letter name (e.g., "RAJ")
- `selected_avatar_emoji` - The emoji (e.g., "👨")

**Behavior:**
- If nickname selected: Use it + mark as used
- Else: Fallback to auto-assign (backward compatible)

#### Updated: `joinSession()`
Same parameters and behavior as `createSession()`

---

### 3. New API Endpoint
**Route:** `GET /api/sessions/nickname-options`
**File:** `packages/shared/server.js` (line 63)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-123",
      "nickname": "RAJ",
      "avatar_emoji": "👨",
      "gender": "male"
    },
    {
      "id": "uuid-456",
      "nickname": "RIA",
      "avatar_emoji": "👩",
      "gender": "female"
    }
  ]
}
```

**Usage:** Call this when showing nickname selection UI

---

## ⏳ Frontend Implementation (TODO)

### 1. For Participants Joining (via Link)

**Current Flow:**
1. User clicks join link
2. Sees "join" screen
3. Enters their name
4. Joins session

**New Flow:**
1. User clicks join link
2. Sees "join" screen
3. Enters their **real name** (e.g., "Maulik Patel")
4. **NEW:** Sees 2 nickname options (RAJ / RIA)
5. Selects one
6. Joins session with selected nickname

**UI Location:** `packages/minibag/minibag-ui-prototype.tsx`
**Screen:** `currentScreen === 'join'` (around line 293)

**Implementation Steps:**
- Add state: `nicknameOptions`, `selectedNickname`
- Fetch options: `GET /api/sessions/nickname-options`
- Show 2 cards/buttons with nickname + emoji
- On select: Highlight selected option
- On join: Send `real_name`, `selected_nickname`, etc. to API

---

### 2. For Host Creating Session

**Current Flow:**
1. Host adds items to catalog
2. Clicks "Create session"
3. Session created, host auto-assigned nickname

**New Flow:**
1. Host adds items to catalog
2. Clicks "Create session"
3. **NEW:** Modal appears with:
   - Input: "Your name" (optional)
   - 2 nickname options (RAJ / RIA)
4. Selects one
5. Session created with selected nickname

**UI Location:** `packages/minibag/minibag-ui-prototype.tsx`
**Trigger:** When clicking "Create session" button (line 710)

**Implementation Steps:**
- Add state: `showNicknameModal`, `nicknameOptions`, `selectedNickname`, `hostRealName`
- On "Create session" click: Fetch options & show modal
- Modal UI: Name input + 2 nickname cards
- On confirm: Call `createSession` with all parameters

---

## 📝 Implementation Notes

### Nickname Selection UI Design
```jsx
<div className="grid grid-cols-2 gap-4">
  {nicknameOptions.map(option => (
    <button
      key={option.id}
      onClick={() => setSelectedNickname(option)}
      className={`p-4 border-2 rounded-lg ${
        selectedNickname?.id === option.id
          ? 'border-green-600 bg-green-50'
          : 'border-gray-300'
      }`}
    >
      <div className="text-4xl mb-2">{option.avatar_emoji}</div>
      <div className="text-xl font-bold">{option.nickname}</div>
    </button>
  ))}
</div>
```

### API Call Example
```javascript
// Fetch options
const response = await fetch('/api/sessions/nickname-options');
const { data: options } = await response.json();

// Join with selected nickname
await fetch(`/api/sessions/${sessionId}/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    real_name: 'Maulik Patel',
    selected_nickname_id: options[0].id,
    selected_nickname: options[0].nickname,
    selected_avatar_emoji: options[0].avatar_emoji
  })
});
```

---

## 🧪 Testing Plan

### Backend Testing (via curl/Postman)
1. Test `GET /api/sessions/nickname-options` - returns 2 options
2. Test create session with nickname selection
3. Test join session with nickname selection
4. Verify `real_name` stored in database
5. Verify nickname marked as used in pool

### Frontend Testing
1. Create session → select nickname → verify shows on screen
2. Join session → enter name + select nickname → verify shows correctly
3. Test with multiple users → ensure different nicknames
4. Test pool exhaustion → fallback works
5. Test backward compatibility → old flow still works

---

## 🎨 UI/UX Considerations

1. **Name Input Clarity:**
   - Label: "Your name (private)" or "What should we call you?"
   - Placeholder: "Enter your name"
   - Help text: "Only visible to you"

2. **Nickname Selection:**
   - Label: "Choose your shopping buddy name"
   - Help text: "This will appear on bags and lists"
   - Visual feedback: Selected option highlighted

3. **Mobile-First:**
   - Large tap targets (min 48px)
   - Clear visual hierarchy
   - Works on small screens

4. **Error Handling:**
   - If API fails: Show fallback/retry
   - If pool empty: Auto-assign with message
   - Network timeout: Graceful degradation

---

## 🔄 Migration Strategy

### Existing Users/Sessions
- No breaking changes
- Old flow (auto-assign) still works
- `real_name` is nullable
- Existing participants have no `real_name` (NULL)

### Rollout Plan
1. Deploy backend changes ✅
2. Run database migration ⏳
3. Deploy frontend changes ⏳
4. Monitor for errors
5. Gradual rollout to all users

---

## 📚 Files Modified

### Backend
- ✅ `database/007_add_real_name_to_participants.sql`
- ✅ `packages/shared/api/sessions.js`
- ✅ `packages/shared/server.js`

### Frontend (TODO)
- ⏳ `packages/minibag/minibag-ui-prototype.tsx`

---

## 🚀 Next Steps

1. **Run Database Migration** - Apply `007_add_real_name_to_participants.sql` in Supabase
2. **Implement Join Flow UI** - Add nickname selection to join screen
3. **Implement Create Flow UI** - Add nickname modal for host
4. **Test End-to-End** - Full user flow with real data
5. **Deploy & Monitor** - Watch for errors, gather feedback

---

**Status:** Backend ready, awaiting frontend implementation and database migration.
**Estimated Frontend Work:** 2-3 hours
