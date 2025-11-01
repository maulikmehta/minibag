# Cleanup & Documentation Roadmap
## Post-Checkpoint Milestone Implementation

**Created:** 2025-11-01
**Status:** Pending Implementation
**Milestone:** Checkpoint Mechanism & Host Token Authentication

---

## Overview

After completing major fixes to the checkpoint mechanism and host token authentication system, comprehensive cleanup and documentation is required. This document outlines all tasks needed to bring the codebase to production-ready state.

**Estimated Total Time:** 5-7 hours

---

## Phase 1: Code Cleanup (30 minutes)

### 1.1 Remove Debug Console.log Statements

**Total to remove: 21 statements**

#### File: `packages/minibag/src/services/api.js`
- **Line 158:** `console.log('updateSessionStatus called:', { sessionId, status, hostToken: hostToken ? 'present' : 'missing' });`
  - **Reason:** Debug log added during host token implementation

#### File: `packages/minibag/src/screens/SessionCreateScreen/index.jsx`
- **Line 173:** `console.log('✅ Session created:', result);`
  - **Reason:** Debug log for session creation

#### File: `packages/shared/websocket/handlers.js`
Remove the following debug logs (11 total):
- **Line 14:** `console.log('Client connected:', socket.id);`
- **Line 23:** `console.log(\`Client ${socket.id} joined session ${sessionId}\`);`
- **Line 34:** `console.log(\`Client ${socket.id} left session ${sessionId}\`);`
- **Line 45:** `console.log(\`Participant joined session ${sessionId}:\`, participant);`
- **Line 56:** `console.log(\`Participant left session ${sessionId}:\`, participantId);`
- **Line 66-67:** `console.log(\`Participant ${participantId} updated items in session ${sessionId} (confirmed: ${metadata?.items_confirmed})\`);`
- **Line 86:** `console.log(\`Participant ${participant.id} status updated in session ${sessionId}\`);`
- **Line 98:** `console.log(\`Session ${sessionId} status updated to: ${status}\`);`
- **Line 119:** `console.log(\`Payment recorded in session ${sessionId}:\`, payment);`
- **Line 129:** `console.log(\`Payment edited in session ${sessionId}:\`, payment);`
- **Line 137:** `console.log('Client disconnected:', socket.id);`

#### File: `packages/minibag/src/services/socket.js`
Remove the following debug logs (6 total):
- **Line 24:** `console.log('Socket already connected');`
- **Line 36:** `console.log('✅ WebSocket connected:', this.socket.id);`
- **Line 46:** `console.log('❌ WebSocket disconnected:', reason);`
- **Line 80:** `console.log(\`🚪 Joining session room: ${sessionId}\`);`
- **Line 91:** `console.log(\`🚪 Leaving session room: ${this.currentSessionId}\`);`

#### File: `packages/shared/api/sessions.js`
- **Line 681:** `console.log(\`Released ${nicknamesUsed.length} nicknames from session ${session_id}\`);`

**Note:** Keep all `console.error()` and `console.warn()` statements (18 total) - these are legitimate error handling.

---

### 1.2 Delete Old Backup Files

**Location:** `/packages/minibag/RESTORE_POINTS/`

**Files to delete (13 total, ~320KB):**

```bash
cd packages/minibag/RESTORE_POINTS
rm 2025-10-24_*.tsx.bak
rm 2025-10-25_*.tsx.bak
rm *.meta.txt
rm 2025-10-24_post-merge.tsx.bak
rm checklist_screen_snippet.txt
```

**Keep:** `README.md` (explains the restore system)

---

### 1.3 Clean Test Database

**Script:** `/packages/shared/clean-db.js`

**Command:**
```bash
cd packages/shared
node clean-db.js
```

**What it cleans:**
- All test sessions
- All participants
- All participant_items
- Resets nicknames_pool (marks all as available)

**Warning:** This removes ALL data. Run only in development environment.

---

## Phase 2: Documentation Updates (2-3 hours)

### 2.1 Update API.md (HIGH PRIORITY)

**File:** `/docs/API.md`
**Last Updated:** October 13, 2025 (18 days old)

**Changes needed:**

#### Section: Session Creation (lines 39-65)
Add `expected_participants` field:
```markdown
### Create Session

**Event:** `create-session`

**Payload:**
- `location_text` (string): Location description
- `scheduled_time` (string): ISO 8601 timestamp
- `selected_nickname` (string, optional): Chosen nickname
- `selected_avatar_emoji` (string, optional): Chosen emoji
- `real_name` (string, optional): User's real name
- `expected_participants` (integer, optional): Number of participants expected (0 for solo, 1-3 for group, null if not set)
- `items` (array, optional): Initial items to add

**Response:**
- `session` (object): Created session with `host_token`
- `participant` (object): Creator's participant record with `items_confirmed: true`
- `host_token` (string): Authentication token for host operations
```

#### Section: Update Session Status (lines 138-145)
Add host token requirement:
```markdown
### Update Session Status

**Endpoint:** `PUT /api/sessions/:session_id/status`

**Headers:**
- `X-Host-Token` (required): Host authentication token

**Body:**
- `status` (string): New status (open, active, shopping, completed, expired, cancelled)

**Response:**
- Updated session object

**Errors:**
- `401 Unauthorized`: Host token missing
- `403 Forbidden`: Invalid host token or session not found
- `400 Bad Request`: Invalid status value
```

#### New Section: Checkpoint & Confirmation System
Add after session management section:
```markdown
## Checkpoint & Confirmation System

### Overview
The checkpoint system ensures all participants are coordinated before shopping begins.

### Three-State Logic

1. **Not Set** (`expected_participants: null`)
   - Default state after session creation
   - Start shopping button disabled
   - Host must set expected count

2. **Solo Mode** (`expected_participants: 0`)
   - Host shopping alone
   - Checkpoint bypassed
   - Start shopping enabled immediately

3. **Group Mode** (`expected_participants: 1-3`)
   - Waiting for participants
   - Checkpoint validates: all expected responded + all joined confirmed
   - 20-minute auto-timeout for unfilled slots

### Participant Confirmation

**Endpoint:** `PUT /api/participants/:participant_id/status`

**Body:**
- `items_confirmed` (boolean): Participant has confirmed their list

**Flow:**
1. Participant adds items to list
2. Clicks "Confirm my list"
3. Backend sets `items_confirmed: true`
4. WebSocket broadcasts to host
5. Participant locked from editing items
6. Navigates to tracking screen

### Decline Invitation

**Endpoint:** `PUT /api/participants/:participant_id/status`

**Body:**
- `marked_not_coming` (boolean): Participant declined invitation

**Effect:**
- Participant excluded from checkpoint validation
- Checkpoint progresses if other slots filled
```

#### New Section: Host Token Authentication
```markdown
## Host Token Authentication

### Purpose
Protects host-only operations from unauthorized access.

### Token Generation
- Generated during session creation (`crypto.randomBytes(32)`)
- Stored in `sessions.host_token` (unique, indexed)
- Returned to frontend in session creation response

### Token Storage
- Frontend: `localStorage.setItem(\`host_token_${sessionId}\`, token)`
- Cleared when session ends or user leaves

### Protected Endpoints
- `PUT /api/sessions/:session_id/status` - Update session status
- Future: Edit session details, end session early

### Security Considerations
- Token is 256-bit random value
- Not exposed in URLs or logs
- Invalidated when session completes
- Per-session (not reusable across sessions)
```

---

### 2.2 Update DATABASE.md (HIGH PRIORITY)

**File:** `/docs/DATABASE.md`
**Last Updated:** October 13, 2025

**Changes needed:**

#### Section: sessions table (lines 140-184)
Add new fields:
```markdown
### sessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| ... existing fields ... |
| expected_participants | INTEGER | NULL | Number of participants expected (0=solo, 1-3=group, NULL=not set) |
| checkpoint_complete | BOOLEAN | DEFAULT false | Whether participant checkpoint is complete |
| host_token | TEXT | UNIQUE, NOT NULL | Authentication token for host operations |
```

#### Section: participants table (lines 194-221)
Add new fields:
```markdown
### participants

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| ... existing fields ... |
| items_confirmed | BOOLEAN | DEFAULT false | Whether participant confirmed their item list |
| marked_not_coming | BOOLEAN | DEFAULT false | Whether participant declined invitation |
| auto_timed_out | BOOLEAN | DEFAULT false | Whether participant slot auto-timed out (20 min) |
| invite_timeout_at | TIMESTAMPTZ | NULL | When invite expires (20 min after join) |
```

#### New Section: Checkpoint Mechanism
```markdown
## Checkpoint Mechanism

The checkpoint system coordinates participants before shopping.

### Database Fields

**sessions.expected_participants:**
- `NULL`: Host hasn't set expected count (button disabled)
- `0`: Solo mode (bypass checkpoint)
- `1-3`: Group mode (validate checkpoint)

**sessions.checkpoint_complete:**
- Calculated from: `(joinedCount + notComingCount + autoTimedOutCount) >= expectedCount`
- Updated in real-time as participants respond

**participants.items_confirmed:**
- `false`: Participant still editing items
- `true`: Participant confirmed list (locked from editing)

**participants.marked_not_coming:**
- `true`: Participant declined invitation
- Excluded from checkpoint validation

**participants.auto_timed_out:**
- `true`: 20 minutes passed without response
- Counted toward checkpoint completion
```

---

### 2.3 Update ARCHITECTURE.md (HIGH PRIORITY)

**File:** `/docs/ARCHITECTURE.md`
**Last Updated:** October 13, 2025

**Changes needed:**

#### Section: Session Management (lines 220-233)
Add checkpoint states:
```markdown
### Session States with Checkpoint

1. **open** - Session created, accepting participants
   - `expected_participants` may be null (not set)
   - Host can set expected count (0-3)

2. **active** - Participants joining and adding items
   - Checkpoint validates participant readiness
   - Three states: not set, solo, group

3. **shopping** - Host recording payments
   - Requires checkpoint complete (in group mode)
   - Requires host token authentication

4. **completed** - All payments recorded
   - Nicknames released back to pool
```

#### Section: Data Architecture (lines 237-333)
Add checkpoint fields explanation:
```markdown
### Checkpoint Fields

**Purpose:** Coordinate participants before shopping

**Key Fields:**
- `sessions.expected_participants` - Target participant count
- `sessions.checkpoint_complete` - Whether ready to shop
- `sessions.host_token` - Host authentication
- `participants.items_confirmed` - Individual readiness
- `participants.marked_not_coming` - Declined invitation
```

#### Section: Security Architecture (lines 332-375)
Add host token authentication:
```markdown
### Host Token Authentication

**Threat Model:**
- Unauthorized users updating session status
- Malicious status changes during active session

**Protection:**
- 256-bit random token generated per session
- Stored in database and localStorage
- Required for host-only operations
- Validated before state-changing operations

**Implementation:**
```javascript
// Backend validation
const host_token = req.headers['x-host-token'];
const session = await supabase
  .from('sessions')
  .select()
  .eq('session_id', session_id)
  .eq('host_token', host_token)
  .single();

if (!session) {
  return res.status(403).json({ error: 'Invalid host token' });
}
```

**Recovery:**
- If token lost, session cannot be modified
- Participants can still view and track
- New session required for shopping
```

---

## Phase 3: New Documentation (3-4 hours)

### 3.1 Create CHECKPOINT_MECHANISM.md

**File:** `/docs/CHECKPOINT_MECHANISM.md`

**Content outline:**

```markdown
# Checkpoint Mechanism

## Overview
Comprehensive guide to the participant coordination system.

## Three-State Logic

### State 1: Not Set (expected_participants = null)
- Initial state after session creation
- Host hasn't decided solo vs group
- Start shopping button disabled
- Prompt: "Set how many friends joining above"

### State 2: Solo Mode (expected_participants = 0)
- Host shopping alone
- Checkpoint bypassed
- No participant validation needed
- Start shopping enabled immediately

### State 3: Group Mode (expected_participants = 1-3)
- Collaborative shopping
- Checkpoint validates readiness
- Requires all expected participants to respond
- Requires all joined participants to confirm

## Checkpoint Validation

### Formula
```javascript
checkpointComplete = (joinedCount + notComingCount + autoTimedOutCount) >= expectedCount
```

### Components
1. **joinedCount** - Participants who joined and confirmed
2. **notComingCount** - Participants who declined
3. **autoTimedOutCount** - Unfilled slots after 20 minutes

## 20-Minute Auto-Timeout

### Purpose
Prevent indefinite waiting for unresponsive invitees

### Implementation
- Timer starts when expected_participants set
- After 20 minutes, unfilled slots count as "timed out"
- Checkpoint completes if: joined + declined + timed out >= expected

### Frontend Display
"Invite timeout: 2 slots unfilled after 20 minutes"

## Participant Confirmation

### Requirements
- Must have added at least one item
- Cannot be marked as "not coming"
- Confirmation irreversible (items locked)

### Frontend Flow
1. Participant adds items
2. Clicks "Confirm my list" button
3. API: PUT /api/participants/:id/status { items_confirmed: true }
4. WebSocket broadcasts to host
5. Navigate to ParticipantTrackingScreen
6. Items locked from editing

### Host Flow
1. Host adds items in SessionCreateScreen
2. Clicks "Start List" button
3. API: POST /api/sessions { items_confirmed: true } (set during creation)
4. Navigate to SessionActiveScreen
5. Already confirmed (no separate button)

## Edge Cases

### Case 1: Participant joins after checkpoint complete
- Allowed to join
- Cannot add items (too late)
- Session already in shopping state

### Case 2: All participants decline
- Checkpoint completes (all responded)
- Host can proceed to shopping alone
- Effectively becomes solo mode

### Case 3: Host changes expected count
- Checkpoint recalculated
- May become incomplete if count increased
- Cannot decrease below current joined count

### Case 4: Participant wants to undo confirmation
- Not supported in current implementation
- Would require "Unconfirm" feature
- Risk: session may have started shopping

## API Reference

### Set Expected Participants
```
PATCH /api/sessions/:session_id/expected
Body: { expected_participants: 0-3 }
```

### Confirm Participant
```
PUT /api/participants/:participant_id/status
Body: { items_confirmed: true }
```

### Decline Invitation
```
PUT /api/participants/:participant_id/status
Body: { marked_not_coming: true }
```

## Frontend Components

### CheckpointStatus.jsx
- Displays checkpoint progress
- Shows waiting count or confirmation count
- Enables/disables "Start Shopping" button
- Shows helpful tooltips

### useExpectedParticipants.js
- Calculates checkpoint state
- Tracks auto-timeout
- Provides checkpoint validation

### SessionActiveScreen.jsx
- Renders checkpoint UI
- Validates before starting shopping
- Handles participant confirmation display

## Database Schema

```sql
-- sessions table
expected_participants INTEGER NULL,
checkpoint_complete BOOLEAN DEFAULT false,

-- participants table
items_confirmed BOOLEAN DEFAULT false,
marked_not_coming BOOLEAN DEFAULT false,
auto_timed_out BOOLEAN DEFAULT false,
invite_timeout_at TIMESTAMPTZ NULL
```
```

---

### 3.2 Create SESSION_FLOWS.md

**File:** `/docs/SESSION_FLOWS.md`

**Content outline:**

```markdown
# Session Flows

Complete flowcharts for all session scenarios.

## Flow 1: Session Creation (Solo Mode)

```
┌─────────────────────────────────────────┐
│ HomeScreen                              │
│ User clicks "New List"                  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionCreateScreen (Step 1)            │
│ - Add items from catalog                │
│ - Enter location, scheduled time        │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Start List")
┌─────────────────────────────────────────┐
│ Name/Nickname Modal                     │
│ - Enter real name (optional)            │
│ - Select nickname from options          │
└─────────────┬───────────────────────────┘
              │
              ▼ (Submit)
┌─────────────────────────────────────────┐
│ API: POST /api/sessions                 │
│ - Creates session                       │
│ - Creates host participant              │
│ - Sets items_confirmed: true            │
│ - Returns host_token                    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Frontend: Store host_token              │
│ localStorage.setItem(                   │
│   `host_token_${sessionId}`, token      │
│ )                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Step 2)            │
│ - Shows host items                      │
│ - expected_participants: null           │
│ - "Start Shopping" disabled             │
└─────────────┬───────────────────────────┘
              │
              ▼ (Select "0 - Go solo")
┌─────────────────────────────────────────┐
│ Checkpoint bypassed                     │
│ - Solo mode active                      │
│ - "Start Shopping" enabled              │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Start Shopping")
┌─────────────────────────────────────────┐
│ API: PUT /api/sessions/:id/status       │
│ Headers: X-Host-Token                   │
│ Body: { status: 'shopping' }            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ShoppingScreen                          │
│ - Record payments                       │
│ - Complete shopping                     │
└─────────────────────────────────────────┘
```

## Flow 2: Session Creation (Group Mode)

[Similar flowchart for group mode with participant joins and confirmations]

## Flow 3: Participant Join & Confirm

[Flowchart showing participant joining, adding items, and confirming]

## Flow 4: Participant Decline

[Flowchart showing participant declining invitation]

## Flow 5: Auto-Timeout

[Flowchart showing 20-minute timeout triggering]

## State Diagram

[State machine diagram showing session state transitions]
```

---

### 3.3 Update CHANGELOG.md

**File:** `/CHANGELOG.md`

**Add to Unreleased section:**

```markdown
## [Unreleased] - 2025-11-01

### Added
- **Checkpoint mechanism** for participant coordination before shopping
- **Three-state expected participants logic:**
  - Not set (null): Host must choose solo or group
  - Solo mode (0): Bypass checkpoint, shop immediately
  - Group mode (1-3): Validate all participants ready
- **20-minute auto-timeout** for invite links
  - Unfilled slots automatically count as "timed out"
  - Checkpoint completes if expected count met via timeout
- **Participant confirmation requirement:**
  - Participants must confirm their item list before shopping
  - Items locked after confirmation (cannot edit)
  - Navigate to tracking screen after confirmation
- **Host token authentication:**
  - Secure token for host-only operations
  - Required for session status updates
  - 256-bit random value per session
- **Decline functionality** for invited participants
  - Participants can mark themselves as "not coming"
  - Excluded from checkpoint validation
  - Allows checkpoint to progress with fewer participants

### Changed
- **Start shopping now requires validation:**
  - Checkpoint 1: All expected participants responded (joined/declined/timed out)
  - Checkpoint 2: All joined participants confirmed their lists
  - Checkpoint 3: Aggregated list has items
- **Solo mode (0 expected participants):**
  - Bypasses checkpoint validation
  - No confirmation required
  - Immediate access to shopping
- **Session status updates:**
  - Now require `X-Host-Token` header
  - Protected from unauthorized access
  - Return 403 Forbidden if token invalid
- **Host confirmation timing:**
  - Host confirms when clicking "Start List" (not "Start Shopping")
  - `items_confirmed` set to true during session creation
  - No separate confirmation button for host

### Fixed
- **Participant items real-time sync:**
  - Changed from delete-then-insert to upsert pattern
  - Prevents race conditions during rapid updates
  - WebSocket broadcasts include items_confirmed status
- **Host confirmation at "Start List" click:**
  - Previously required separate confirmation
  - Now automatic during session creation
  - Prevents host from being stuck at checkpoint
- **Content-Type header preservation:**
  - Fixed header merging in apiFetch function
  - Preserves application/json when adding custom headers
  - Prevents validation errors from text/plain content type
- **Checkpoint validation accuracy:**
  - Only checks joined participants (not host, not declined)
  - Correctly excludes auto-timed out slots
  - Properly aggregates confirmation status

### Technical
- Added `sessions.expected_participants` column (INTEGER, default NULL)
- Added `sessions.checkpoint_complete` column (BOOLEAN, default false)
- Added `sessions.host_token` column (TEXT, unique, not null)
- Added `participants.items_confirmed` column (BOOLEAN, default false)
- Added `participants.marked_not_coming` column (BOOLEAN, default false)
- Added `participants.auto_timed_out` column (BOOLEAN, default false)
- Added `participants.invite_timeout_at` column (TIMESTAMPTZ, nullable)
- Database migrations: 008, 009, 010, 011

### Security
- Host token authentication prevents unauthorized session control
- Token generated with crypto.randomBytes(32)
- Stored separately in localStorage per session
- Cleared when session ends or user leaves
```

---

### 3.4 Update/Delete CURRENT_WORK_CHECKPOINT.md

**File:** `/CURRENT_WORK_CHECKPOINT.md`

**Options:**

1. **DELETE** - Work is complete, file no longer needed
2. **UPDATE** - Mark as complete and archive

**Recommended: UPDATE with completion status:**

```markdown
# Current Work Checkpoint

**Status:** ✅ COMPLETED
**Completion Date:** 2025-11-01
**Final Commit:** 5c7e0be

## Summary

All checkpoint mechanism and host token authentication work has been completed and committed.

## Completed Features

✅ Checkpoint mechanism (3-state logic)
✅ Host token authentication
✅ Participant confirmation flow
✅ 20-minute auto-timeout
✅ Decline functionality
✅ Real-time sync fixes
✅ Solo mode bypass

## Final State

- All tests passing
- Database migrations complete
- Frontend/backend integration working
- WebSocket real-time updates functional

## Next Steps

See `/docs/CLEANUP_AND_DOCUMENTATION_ROADMAP.md` for cleanup tasks.

---

**Archive Note:** This file can be deleted or moved to `/docs/archive/` for historical reference.
```

---

## Execution Order

### Step-by-Step Implementation

1. **Code Cleanup (30 min)**
   ```bash
   # Remove debug logs from 5 files
   # Delete 13 backup files
   # Run database cleanup script
   ```

2. **Update Existing Documentation (2-3 hours)**
   ```bash
   # Edit API.md (add 3 sections)
   # Edit DATABASE.md (add 7 fields)
   # Edit ARCHITECTURE.md (add 2 sections)
   ```

3. **Create New Documentation (3-4 hours)**
   ```bash
   # Create CHECKPOINT_MECHANISM.md
   # Create SESSION_FLOWS.md
   # Update CHANGELOG.md
   # Update CURRENT_WORK_CHECKPOINT.md
   ```

4. **Final Commit**
   ```bash
   git add .
   git commit -m "docs: comprehensive cleanup and documentation after checkpoint milestone

   - Remove 21 debug console.log statements
   - Delete 13 old backup files
   - Clean test database (sessions, participants, items)
   - Update API.md with checkpoint and host token docs
   - Update DATABASE.md with new schema fields
   - Update ARCHITECTURE.md with checkpoint architecture
   - Create CHECKPOINT_MECHANISM.md (complete guide)
   - Create SESSION_FLOWS.md (flowcharts)
   - Update CHANGELOG.md with feature release notes
   - Mark CURRENT_WORK_CHECKPOINT.md as complete

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude <noreply@anthropic.com>"
   ```

---

## Checklist

### Code Cleanup
- [ ] Remove 21 console.log statements
- [ ] Delete 13 backup files
- [ ] Run database cleanup script
- [ ] Verify no compilation errors

### Documentation Updates
- [ ] Update API.md (3 sections)
- [ ] Update DATABASE.md (7 fields)
- [ ] Update ARCHITECTURE.md (2 sections)

### New Documentation
- [ ] Create CHECKPOINT_MECHANISM.md
- [ ] Create SESSION_FLOWS.md
- [ ] Update CHANGELOG.md
- [ ] Update CURRENT_WORK_CHECKPOINT.md

### Final Steps
- [ ] Review all changes
- [ ] Commit with descriptive message
- [ ] Verify documentation renders correctly
- [ ] Share with team for review

---

## Notes

- All line numbers are approximate and may shift during implementation
- Keep error logging (`console.error`, `console.warn`) - only remove debug logs
- Database cleanup script removes ALL data - use only in development
- Documentation should use present tense, active voice
- Flowcharts can be ASCII art or mermaid diagrams
- Consider adding screenshots to SESSION_FLOWS.md

---

**End of Roadmap**
