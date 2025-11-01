# Checkpoint Mechanism

**Created:** November 1, 2025
**Version:** 1.0.0
**Status:** Implemented

---

## Overview

The checkpoint mechanism is a coordination system that ensures all participants are ready before the host begins shopping. It prevents the host from starting too early and ensures everyone has confirmed their item lists.

**Key Benefits:**
- Prevents incomplete lists
- Coordinates multiple participants
- Handles non-responsive invitees
- Enables solo shopping mode

---

## Three-State Logic

The checkpoint system operates in three distinct states based on `expected_participants`.

### State 1: Not Set (`expected_participants = null`)

**Initial state after session creation**

- Host hasn't decided solo vs group
- Start shopping button disabled
- Prompt: "Set how many friends joining above"

**Behavior:**
- Session created with `expected_participants: null`
- Checkpoint validation skipped
- UI shows selection dropdown (0-3)

**Transition:**
- Host selects expected count → State 2 or 3

---

### State 2: Solo Mode (`expected_participants = 0`)

**Host shopping alone**

- Checkpoint bypassed completely
- No participant validation needed
- Start shopping enabled immediately

**Behavior:**
- `checkpoint_complete` ignored
- No confirmation requirements
- Direct access to shopping phase

**Use Case:**
- Host shops for only themselves
- No coordination needed
- Fastest path to shopping

**Transition:**
- Click "Start Shopping" → Shopping phase

---

### State 3: Group Mode (`expected_participants = 1-3`)

**Collaborative shopping with participants**

- Checkpoint validates readiness
- Requires all expected participants to respond
- Requires all joined participants to confirm

**Behavior:**
- Wait for `joinedCount + notComingCount + autoTimedOutCount >= expectedCount`
- Wait for all joined participants to confirm lists
- 20-minute auto-timeout for unfilled slots

**Use Case:**
- Host + friends shopping together
- Coordination required
- Ensures complete lists before shopping

**Transition:**
- All checkpoints met → Shopping enabled

---

## Checkpoint Validation

### Formula

```javascript
checkpointComplete = (joinedCount + notComingCount + autoTimedOutCount) >= expectedCount
                     && allJoinedParticipantsConfirmed
```

### Components

#### 1. **joinedCount**
- Participants who joined and confirmed
- Excludes: host, declined, timed out
- Must have `items_confirmed: true`

#### 2. **notComingCount**
- Participants who declined invitation
- `marked_not_coming: true`
- Counted toward checkpoint completion

#### 3. **autoTimedOutCount**
- Unfilled slots after 20 minutes
- `auto_timed_out: true`
- Allows progress despite non-responses

### Validation Query

```sql
-- Backend validation
SELECT
  s.*,
  (
    SELECT COUNT(*)
    FROM participants
    WHERE session_id = s.id
      AND items_confirmed = true
      AND is_creator = false
  ) as joined_confirmed_count,
  (
    SELECT COUNT(*)
    FROM participants
    WHERE session_id = s.id
      AND marked_not_coming = true
  ) as not_coming_count,
  s.expected_participants
FROM sessions s
WHERE s.session_id = $1;

-- Checkpoint met when:
-- (joined_confirmed_count + not_coming_count) >= expected_participants
```

---

## 20-Minute Auto-Timeout

### Purpose
Prevent indefinite waiting for unresponsive invitees.

### Implementation

**Timer starts when:**
- Host sets `expected_participants > 0`
- Session moves to "waiting for participants" state

**After 20 minutes:**
- Unfilled slots marked as `auto_timed_out: true`
- Checkpoint progresses if: `joined + declined + timed out >= expected`

**Frontend Logic:**
```javascript
// useExpectedParticipants.js
const timeoutThreshold = 20 * 60 * 1000; // 20 minutes
const elapsedTime = Date.now() - new Date(session.created_at).getTime();

if (elapsedTime > timeoutThreshold) {
  const unfilledSlots = expectedParticipants - (joined + notComing);
  autoTimedOutCount = Math.max(0, unfilledSlots);
}
```

**UI Display:**
```
⏱ Invite timeout: 2 slots unfilled after 20 minutes
```

---

## Participant Confirmation

### Requirements

**To confirm list, participant must:**
1. Have added at least one item
2. Not be marked as "not coming"
3. Confirmation is irreversible (items locked)

### Frontend Flow

#### Participant Flow

1. **Join session** (scan QR code)
2. **Add items** from catalog
3. **Click "Confirm my list"** button
4. **API call:** `PUT /api/participants/:id/status { items_confirmed: true }`
5. **WebSocket broadcast** to host
6. **Navigate to ParticipantTrackingScreen**
7. **Items locked** from editing

#### Host Flow

1. **Add items** in SessionCreateScreen
2. **Click "Start List"** button
3. **API call:** `POST /api/sessions` (with `items_confirmed: true` set during creation)
4. **Navigate to SessionActiveScreen**
5. **Already confirmed** (no separate confirmation button)

**Key Difference:**
- Host confirms when clicking "Start List" (session creation)
- Participants confirm separately after joining

---

## Edge Cases

### Case 1: Participant joins after checkpoint complete

**Scenario:** Session already in shopping state, new participant scans QR code

**Behavior:**
- Allowed to join
- Cannot add items (too late)
- Can only view tracking screen

**Implementation:**
```javascript
if (session.status === 'shopping') {
  // Show read-only tracking view
  return <ParticipantTrackingScreen readOnly />;
}
```

---

### Case 2: All participants decline

**Scenario:** Host expects 3, all 3 decline invitation

**Behavior:**
- Checkpoint completes (all responded)
- Host can proceed to shopping alone
- Effectively becomes solo mode

**Implementation:**
```javascript
const allDeclined = notComingCount === expectedParticipants;
if (allDeclined && allDeclined > 0) {
  // Enable shopping, show message
  return "All participants declined. You can shop alone.";
}
```

---

### Case 3: Host changes expected count

**Scenario:** Host sets expected=3, then changes to expected=2

**Behavior:**
- Checkpoint recalculated
- May become complete if new count lower
- May become incomplete if new count higher

**Constraints:**
- Cannot decrease below current joined count
- If 2 already joined, cannot set expected=1

**Implementation:**
```javascript
const minExpected = activeParticipants.length;
if (newExpected < minExpected) {
  throw new Error(`Cannot set below ${minExpected} (current participants)`);
}
```

---

### Case 4: Participant wants to undo confirmation

**Scenario:** Participant confirmed but wants to edit list

**Current Behavior:**
- Not supported in current implementation
- Would require "Unconfirm" feature

**Risk:**
- Session may have started shopping
- Host may have left session active screen

**Future Feature:**
```javascript
// Potential implementation
function unconfirmList(participantId) {
  if (session.status === 'shopping') {
    throw new Error('Cannot unconfirm: shopping already started');
  }

  await updateParticipantStatus(participantId, {
    items_confirmed: false
  });
}
```

---

## API Reference

### Set Expected Participants

**Endpoint:** `PATCH /api/sessions/:session_id/expected`

**Body:**
```json
{
  "expected_participants": 2
}
```

**Validation:**
- Value must be 0-3 or null
- Cannot be less than current joined count

**Response:**
```json
{
  "success": true,
  "data": {
    "session_id": "abc123",
    "expected_participants": 2,
    "checkpoint_complete": false
  }
}
```

---

### Confirm Participant

**Endpoint:** `PUT /api/participants/:participant_id/status`

**Body:**
```json
{
  "items_confirmed": true
}
```

**Validation:**
- Participant must have items
- Cannot confirm if `marked_not_coming: true`
- Irreversible (no unconfirm)

**Response:**
```json
{
  "success": true,
  "data": {
    "participant_id": "p_12345",
    "items_confirmed": true,
    "locked": true
  }
}
```

---

### Decline Invitation

**Endpoint:** `PUT /api/participants/:participant_id/status`

**Body:**
```json
{
  "marked_not_coming": true
}
```

**Effect:**
- Participant excluded from checkpoint validation
- Checkpoint progresses if other slots filled
- Cannot be undone (permanent decline)

**Response:**
```json
{
  "success": true,
  "data": {
    "participant_id": "p_12345",
    "marked_not_coming": true
  }
}
```

---

## Frontend Components

### CheckpointStatus.jsx

**Purpose:** Display checkpoint progress and enable/disable shopping button

**Props:**
```javascript
{
  session: Object,           // Session data
  participants: Array,       // All participants
  onStartShopping: Function  // Shopping start handler
}
```

**States:**
- Not set: Show "Set expected count" prompt
- Solo: Show "Ready to shop" + enabled button
- Group: Show "Waiting for X more" or "All ready" + enabled/disabled button

**Example:**
```jsx
<CheckpointStatus
  session={session}
  participants={participants}
  onStartShopping={handleStartShopping}
/>
```

---

### useExpectedParticipants.js

**Purpose:** Calculate checkpoint state and validation

**Returns:**
```javascript
{
  expectedParticipants: number | null,
  checkpointComplete: boolean,
  joinedCount: number,
  notComingCount: number,
  autoTimedOutCount: number,
  waitingCount: number,
  canStartShopping: boolean
}
```

**Usage:**
```javascript
const checkpoint = useExpectedParticipants(session, participants);

if (checkpoint.canStartShopping) {
  // Enable shopping button
}
```

---

### SessionActiveScreen.jsx

**Checkpoint UI Integration:**

```jsx
{/* Expected participants selector */}
<ExpectedParticipantsSelector
  value={session.expected_participants}
  onChange={handleExpectedChange}
/>

{/* Checkpoint status display */}
<CheckpointStatus
  session={session}
  participants={participants}
  onStartShopping={handleStartShopping}
/>

{/* Participants list with confirmation status */}
<ParticipantsList
  participants={participants}
  showConfirmationStatus={true}
/>
```

---

## Database Schema

### sessions table

```sql
CREATE TABLE sessions (
  -- ... other fields

  -- Checkpoint mechanism
  expected_participants INTEGER DEFAULT NULL,
  checkpoint_complete BOOLEAN DEFAULT false,
  host_token TEXT UNIQUE NOT NULL,

  CONSTRAINT valid_expected_participants
    CHECK (expected_participants BETWEEN 0 AND 3 OR expected_participants IS NULL)
);
```

### participants table

```sql
CREATE TABLE participants (
  -- ... other fields

  -- Checkpoint mechanism
  items_confirmed BOOLEAN DEFAULT false,
  marked_not_coming BOOLEAN DEFAULT false,
  auto_timed_out BOOLEAN DEFAULT false,
  invite_timeout_at TIMESTAMPTZ
);
```

---

## Testing Checklist

### Solo Mode Tests

- [ ] Create session, set expected=0, should enable shopping immediately
- [ ] No participants required
- [ ] Shopping button enabled without confirmation

### Group Mode Tests

- [ ] Create session, set expected=2
- [ ] 1 participant joins, shopping disabled
- [ ] 1 participant confirms, shopping disabled (waiting for 1 more)
- [ ] 2 participants confirm, shopping enabled
- [ ] All participants decline, shopping enabled (solo fallback)

### Timeout Tests

- [ ] Set expected=3, wait 20 minutes
- [ ] 1 joined + 2 timed out = checkpoint met
- [ ] Shopping enabled after timeout

### Edge Case Tests

- [ ] Participant joins after shopping started (read-only)
- [ ] Host changes expected count (recalculation)
- [ ] Cannot set expected below joined count

---

## Performance Considerations

### Real-time Updates

**WebSocket broadcasts:**
- Participant confirmation → Broadcast to all in session
- Expected count change → Broadcast to all
- Status change → Broadcast to all

**Optimization:**
```javascript
// Debounce checkpoint calculations
const debouncedCheckpoint = debounce(calculateCheckpoint, 300);
```

### Database Queries

**Avoid N+1 queries:**
```sql
-- Good: Single query with aggregation
SELECT s.*, COUNT(p.id) as participant_count
FROM sessions s
LEFT JOIN participants p ON s.id = p.session_id
WHERE s.session_id = $1
GROUP BY s.id;

-- Bad: Multiple queries
SELECT * FROM sessions WHERE session_id = $1;
SELECT COUNT(*) FROM participants WHERE session_id = ...;
```

---

## Future Enhancements

### Planned Features

1. **Unconfirm functionality**
   - Allow participants to edit after confirmation
   - Requires checkpoint to not be shopping state

2. **Custom timeout duration**
   - Pro feature: Set custom timeout (10-60 minutes)
   - Default: 20 minutes

3. **Partial confirmation**
   - Allow shopping with partial list
   - "Continue with X out of Y confirmed"

4. **Reminder notifications**
   - Notify unconfirmed participants at 15 minutes
   - Web push or WhatsApp

---

## Troubleshooting

### Shopping button stays disabled

**Diagnosis:**
1. Check `expected_participants`: Is it null? (must set)
2. Check joined count: Have all expected joined?
3. Check confirmation: Have all joined confirmed?
4. Check auto-timeout: Has 20 minutes passed?

**Solution:**
```javascript
// Debug checkpoint state
console.log({
  expected: session.expected_participants,
  joined: joinedConfirmedCount,
  notComing: notComingCount,
  timedOut: autoTimedOutCount,
  checkpointMet: (joined + notComing + timedOut) >= expected
});
```

---

### Participant can't confirm

**Common Issues:**
1. No items added (must have at least 1)
2. Already marked as "not coming"
3. Session already in shopping state

**Solution:**
- Check `participant.items` is not empty
- Check `participant.marked_not_coming` is false
- Check `session.status` is 'active'

---

## References

- [API.md](./API.md) - API endpoints for checkpoint operations
- [DATABASE.md](./DATABASE.md) - Database schema details
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [SESSION_FLOWS.md](./SESSION_FLOWS.md) - Complete session flowcharts

---

**Last Updated:** November 1, 2025
**Maintained By:** LocalLoops Team
