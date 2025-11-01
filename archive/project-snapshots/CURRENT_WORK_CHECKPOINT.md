# Current Work Checkpoint - Participant Join & Checkpoint System

**Date:** October 31, 2025
**Branch:** refactor/phase3-day-7
**Status:** In Progress - Phase 1 Partially Complete

---

## Current Todo List

### ✅ Completed
- Fix host items disappearing after session creation (backend API fix)
- Add UserIdentity component for consistent name@nickname styling
- Personalize participant tracking screen with host identity
- Unify navigation patterns with numbered circles
- Refine ProgressBar line style to match vertical tracker

### 🔄 In Progress
**Phase 1: Add participant-joined WebSocket listener**
- ✅ Added listener in `minibag-ui-prototype.tsx` (line 218-250)
- ✅ Added notification in `SessionActiveScreen.jsx` (line 52-73)
- ⏸️ NOT YET TESTED - needs testing with actual participant join

### ⏳ Pending (Planned)
1. **Phase 2: Create database migrations for checkpoint fields**
2. **Phase 3: Update backend API for checkpoint support**
3. **Phase 4: Add expected participants input to SessionCreateScreen**
4. **Phase 5: Implement checkpoint logic in SessionActiveScreen**
5. **Phase 6: Add mark as not coming feature**

---

## Bug Report

### Issue
**Participant joins session but doesn't show up on host screen**

**Root Cause:**
- `participant-joined` WebSocket event wasn't being listened to in main app
- Two separate `participants` states (useSession hook vs prototype)
- State not syncing between them

**What User Wants:**
1. **Tracking:** Just count (e.g., 'expecting 3 people') - NO individual invitation tracking
2. **Blocking:** Hard block - cannot start until all respond
3. **Timeout:** Manual - host marks as 'not coming'
4. **Feedback:** Toast notification + Participant avatar appears immediately

---

## Implementation Plan Summary

### Phase 1: Critical Fix - Real-time Participant Join ⏳
**Goal:** Fix participants appearing on host screen immediately when they join

**Changes Made:**
1. ✅ `packages/minibag/minibag-ui-prototype.tsx` (line 218-250)
   - Added `handleParticipantJoined` listener
   - Updates local `participants` state when participant joins
   - Transforms participant data to frontend format

2. ✅ `packages/minibag/src/screens/SessionActiveScreen.jsx` (line 52-73)
   - Added notification listener for host only
   - Shows toast: "Maulik @ Dev joined the session"
   - Auto-dismisses after 3 seconds

**Status:** Code added but NOT tested yet

---

### Phase 2: Database Migrations 📝
**Goal:** Add checkpoint-related fields to database

**Migrations Needed:**

#### Migration 1: `00X_add_items_confirmed.sql`
```sql
ALTER TABLE participants
ADD COLUMN items_confirmed BOOLEAN DEFAULT false;
```

#### Migration 2: `00X_add_checkpoint_fields.sql`
```sql
ALTER TABLE sessions
ADD COLUMN expected_participants INTEGER DEFAULT 0,
ADD COLUMN checkpoint_complete BOOLEAN DEFAULT false;

ALTER TABLE participants
ADD COLUMN marked_not_coming BOOLEAN DEFAULT false,
ADD COLUMN marked_not_coming_at TIMESTAMPTZ;
```

**Status:** Not started

---

### Phase 3: Backend API Updates 🔧
**Goal:** Support checkpoint mechanism in API

**Files to Update:**

1. **`packages/shared/api/sessions.js`**
   - Update `createSession()` to accept `expected_participants`
   - Store in database when creating session
   - Return in response

2. **`packages/shared/api/sessions.js`**
   - Update `PATCH /api/participants/:id` endpoint
   - Accept: `marked_not_coming`, `items_confirmed`
   - Update database and return updated participant

3. **`packages/shared/websocket/handlers.js`**
   - Add new event: `participant-status-updated`
   - Emit when participant marked as not coming
   - Broadcast to all session participants

**Status:** Not started

---

### Phase 4: Session Creation UI 🎨
**Goal:** Let host set expected participant count

**File:** `packages/minibag/src/screens/SessionCreateScreen/index.jsx`

**Changes:**
- Add input field: "How many people are you inviting?"
- Number input, default 0
- Show below nickname selection, above "Start List" button
- Pass to `createSession` API call in request body

**Status:** Not started

---

### Phase 5: Checkpoint Logic 🚦
**Goal:** Block "Start Shopping" until all participants respond

**File:** `packages/minibag/src/screens/SessionActiveScreen.jsx`

**Changes:**

1. **Calculate checkpoint status:**
```javascript
const joinedCount = participants.filter(p => !p.marked_not_coming).length;
const notComingCount = participants.filter(p => p.marked_not_coming).length;
const expectedCount = session?.expected_participants || 0;
const checkpointComplete = expectedCount === 0 ||
  (joinedCount + notComingCount) >= expectedCount;
```

2. **Update "Start Shopping" button:**
```javascript
disabled={!checkpointComplete || Object.keys(allItems).length === 0}
```

3. **Update button text:**
```javascript
{checkpointComplete ? 'Start shopping' :
 `Waiting for ${expectedCount - joinedCount - notComingCount} more people`}
```

4. **Add status indicator:**
```
📊 Participants: 2 of 3 joined
⏳ Waiting for 1 more person
```

**Status:** Not started

---

### Phase 6: Mark as Not Coming 🚫
**Goal:** Let host manually mark people as "not coming"

**File:** `packages/minibag/src/screens/SessionActiveScreen.jsx`

**Changes:**
- Add "X" or "Not coming" button on each participant card (host view only)
- Call `PATCH /api/participants/:id` with `{marked_not_coming: true}`
- Listen for `participant-status-updated` WebSocket event
- Update local state immediately
- Show notification: "Jay marked as not coming"

**Status:** Not started

---

## Files Modified So Far

### This Session:
1. ✅ `packages/minibag/minibag-ui-prototype.tsx` - Added participant-joined listener
2. ✅ `packages/minibag/src/screens/SessionActiveScreen.jsx` - Added join notification
3. ✅ `packages/shared/api/sessions.js` - Fixed items in session creation response

### Previous Session:
4. ✅ `packages/minibag/src/components/UserIdentity.jsx` - NEW component
5. ✅ `packages/minibag/src/screens/ParticipantTrackingScreen.jsx` - Personalization + numbers
6. ✅ `packages/minibag/src/components/layout/ProgressBar.jsx` - Thin connecting lines
7. ✅ `packages/minibag/src/hooks/useSession.js` - Fixed join event order

---

## Next Steps (When Resuming)

### Immediate (Test Phase 1)
1. **Test participant join flow:**
   - Create new session as host
   - Join from another device/browser
   - Verify participant appears immediately on host screen
   - Verify toast notification shows "Name @ Nickname joined"

2. **If Phase 1 works, proceed to Phase 2:**
   - Create database migrations
   - Run migrations
   - Test database fields exist

### Then Continue Sequential Implementation
3. Phase 3: Backend API updates
4. Phase 4: Session creation UI
5. Phase 5: Checkpoint logic
6. Phase 6: Mark as not coming

---

## Testing Checklist (Not Yet Done)

- [ ] Participant joins → avatar appears immediately on host screen
- [ ] Toast notification shows when participant joins
- [ ] Host sets expected_participants during creation
- [ ] "Start Shopping" button disabled when waiting for people
- [ ] Button shows "Waiting for X more people" text
- [ ] Host can mark participant as "not coming"
- [ ] Checkpoint completes when all responded
- [ ] Button enables when checkpoint complete
- [ ] Works with expected_participants = 0 (no waiting)

---

## Important Notes

### Bug Context
- User shared link with participant
- Participant joined successfully (API worked)
- But didn't show up on host screen (WebSocket listener missing)
- This is THE critical bug we're fixing in Phase 1

### Design Decisions
- NO individual invitation tracking (phone numbers, etc.)
- YES expected participant count (simple number)
- HARD block on shopping until all respond
- MANUAL marking as "not coming" (no auto-timeout)

### Edge Cases to Handle
- `expected_participants = 0` → No waiting, button enabled immediately
- More participants join than expected → Checkpoint auto-complete
- Participant marked "not coming" then actually joins → Reset flag
- Sessions created before this feature → `expected_participants = 0` (backward compatible)

---

## Git Status

**Current commits (not yet committed):**
- Participant-joined listener in prototype
- Join notification in SessionActiveScreen

**Recent commits:**
```
84e0df4 fix: include participant items in session creation response
c65959f refine: match ProgressBar line style to vertical tracker
9b9a821 feat: unify navigation patterns with numbered circles
49e3bb2 feat: add UserIdentity component for consistent name@nickname styling
5275efb feat: personalize participant tracking screen with host identity
3d23362 fix: resolve host items sync, participant join updates, and improve tracking UX
```

---

## Application State

**Running:** http://localhost:5173
**Backend:** http://localhost:3000
**WebSocket:** Connected
**Database:** Supabase (development)

**Current screen when testing:**
1. Create session with items
2. Share link
3. Participant joins
4. Check if they appear on host screen (THIS IS WHAT WE'RE FIXING)

---

**Last Updated:** Oct 31, 2025 10:55 AM
**Next Action:** Test Phase 1 implementation before proceeding
