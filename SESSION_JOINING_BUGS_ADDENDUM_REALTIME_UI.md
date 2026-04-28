# Session Joining Bugs - Addendum: Real-Time UI Updates
**Date:** 2026-04-27
**Context:** Host screen WebSocket sync, notifications, circle tabs

---

## ARCHITECTURE ANALYSIS

### Real-Time Update Flow

**Components:**
1. **WebSocket Server** (`sessions-core/src/websocket/handlers.ts`) - Broadcasts events
2. **Socket Client** (`minibag/src/services/socket.js`) - Client-side event handling
3. **useParticipantSync Hook** (`hooks/useParticipantSync.js`) - React integration
4. **SessionActiveScreen** - Host UI with tabs, notifications, participant list
5. **NotificationContext** - Toast/banner notification system

**Event Flow:**
```
Participant joins → API creates participant in DB → SDK broadcasts 'participant-joined'
                                                    ↓
                                    WebSocket broadcasts to all in room
                                                    ↓
                        Socket client receives → useParticipantSync handles
                                                    ↓
                            Updates participants state + Shows notification
                                                    ↓
                                UI re-renders: Tabs update, List updates
```

---

## BUGS FOUND IN REAL-TIME UPDATES

### BUG #17: Invite Tabs Don't Update When Participant Joins (MEDIUM)

**Location:** `components/session/InviteTabsSelector.jsx:24-223`
**Severity:** MEDIUM
**Impact:** Circle tabs don't activate/highlight when participant claims invite

**Problem:**
- Tabs show invite status from polling (line 187-200: SessionActiveScreen.jsx)
- **No WebSocket listener** to update tab state when participant joins
- Tabs only update via 3-second polling (line 199)
- Visual lag: participant joins → 0-3 seconds delay → tab updates

**Evidence:**
```jsx
// InviteTabsSelector.jsx - NO WebSocket integration
export default function InviteTabsSelector({ invites }) {
  // Receives invites as prop from polling, not WebSocket
  // MISSING: useEffect(() => { socketService.onParticipantJoined(...) })
}
```

```jsx
// SessionActiveScreen.jsx line 187-200 - Polling only
useEffect(() => {
  fetchInvites(); // Initial fetch
  const interval = setInterval(fetchInvites, 3000); // Poll every 3s
  return () => clearInterval(interval);
}, [session?.session_id, isHost]);
```

**Expected behavior:**
- Participant joins via invite link
- WebSocket broadcasts 'participant-joined' with `claimedInviteId`
- Tab immediately highlights/activates (0ms delay)

**Actual behavior:**
- Participant joins → broadcast sent
- useParticipantSync shows notification ✓
- Tabs don't update until next 3-second poll ✗

**Fix Required:**
```jsx
// InviteTabsSelector.jsx - Add WebSocket listener
useEffect(() => {
  socketService.onParticipantJoined((participant) => {
    if (participant.claimedInviteId) {
      // Find which invite was claimed
      setInvites(prev => prev.map(inv =>
        inv.id === participant.claimedInviteId
          ? { ...inv, status: 'claimed', participant }
          : inv
      ));
    }
  });

  return () => socketService.off('participant-joined', ...);
}, []);
```

---

### BUG #18: High Priority Notifications Queue But Don't Show All (MEDIUM)

**Location:** `contexts/NotificationContext.jsx:88-111`
**Severity:** MEDIUM (upgraded from LOW - this is worse than expected)
**Impact:** Rapid join notifications added to queue but only last 5 visible, earlier ones auto-dismiss before user reads

**Problem:**
- `priority: 'high'` triggers toast queue (line 88-99)
- Queue limited to MAX_NOTIFICATIONS = 5 (line 15)
- When 6th notification arrives, oldest dropped from UI (line 94-96)
- Each has 6-second auto-dismiss timer (line 102-111)
- **Race condition:** Notification #1 timer starts → Notification #6 arrives → #1 dropped from UI → timer still runs → fires on wrong notification

**Evidence:**
```javascript
// NotificationContext.jsx line 88-99
} else {
  // Show in toast for high/critical priority
  setNotifications(prev => {
    const updated = [...prev, notification];

    // Keep only the most recent MAX_NOTIFICATIONS
    if (updated.length > MAX_NOTIFICATIONS) {
      return updated.slice(-MAX_NOTIFICATIONS); // DROPS oldest notification
    }
    return updated;
  });

  // Timer still references dropped notification ID
  if (duration > 0) {
    const timerId = setTimeout(() => {
      removeNotification(id); // May try to remove already-dropped notification
    }, duration);
  }
}
```

```jsx
// useParticipantSync.js line 37-40
onShowNotification(`${displayName} declined the invitation`, 6000, 'high');
onShowNotification(`${displayName} joined the session`, 6000, 'high');
// Both use priority 'high' → both go to toast queue
```

**Scenario - 6 participants join rapidly:**
1. Notifications 1-5: "Alice joined", "Bob joined", ... (all visible in queue)
2. Notification 6: "Frank joined" arrives
3. Notification 1 ("Alice joined") dropped from UI immediately
4. But timer for Notification 1 still running
5. After 6 seconds, timer fires `removeNotification(notification-1-id)`
6. No-op (already removed), but caused unnecessary state update

**Worse scenario - elderly user needs time:**
- MAX_NOTIFICATIONS = 5 chosen for elderly users (line 13)
- But dropping notifications after 5 defeats purpose
- Elderly user reading notification #1 → notification #6 arrives → #1 disappears mid-read

**Fix Required:**
```javascript
// Option 1: Don't drop notifications, let them auto-dismiss naturally
setNotifications(prev => [...prev, notification]); // No MAX limit
// Risk: Too many toasts on screen

// Option 2: Clear timer when notification dropped
if (updated.length > MAX_NOTIFICATIONS) {
  const dropped = updated.shift(); // Get dropped notification
  const timer = timersRef.current.toasts.get(dropped.id);
  if (timer) {
    clearTimeout(timer); // Clear its timer
    timersRef.current.toasts.delete(dropped.id);
  }
  return updated;
}

// Option 3: Batch rapid notifications
// If 3+ notifications within 2 seconds, show "3 participants joined"
```

---

### BUG #19: WebSocket Reconnect Doesn't Re-sync Participants (HIGH)

**Location:** `services/socket.js:34-43` + `hooks/useParticipantSync.js`
**Severity:** HIGH
**Impact:** Lost connection → rejoin room → missing participants who joined during disconnect

**Problem:**
- Socket disconnects (network issue, server restart, etc.)
- Auto-reconnects and rejoins room (socket.js line 38-42)
- **Does NOT fetch missed participants** from API
- Host sees stale participant list until page refresh

**Evidence:**
```javascript
// socket.js line 34-43
this.socket.on('connect', () => {
  this.connected = true;

  // Rejoin session if we were in one
  if (this.currentSessionId) {
    this.joinSessionRoom(this.currentSessionId); // Rejoins room
    // MISSING: Fetch missed participants from API
  }
});
```

**Scenario:**
1. Host screen active with 2 participants
2. Network drops → WebSocket disconnects
3. During disconnect: Participant C joins
4. Network returns → WebSocket reconnects → rejoins room
5. Future joins broadcast to host ✓
6. **Participant C never shows** (joined during disconnect window) ✗

**Fix Required:**
```javascript
// socket.js - Add re-sync on reconnect
this.socket.on('connect', () => {
  this.connected = true;

  if (this.currentSessionId) {
    this.joinSessionRoom(this.currentSessionId);

    // Trigger re-sync event for hooks to fetch latest state
    this.socket.emit('request-sync', { sessionId: this.currentSessionId });
  }
});
```

```jsx
// useParticipantSync.js - Handle reconnect sync
useEffect(() => {
  const handleReconnect = async () => {
    // Fetch latest participants after reconnect
    const response = await fetch(`/api/sessions/${session.session_id}/participants`);
    const data = await response.json();
    onUpdateParticipants(data.participants);
  };

  socketService.on('connect', handleReconnect);
  return () => socketService.off('connect', handleReconnect);
}, [session?.session_id]);
```

---

### BUG #20: Participant List Update Doesn't Trigger Tab Recalculation (MEDIUM)

**Location:** `SessionActiveScreen.jsx:187-200` + `InviteTabsSelector.jsx`
**Severity:** MEDIUM
**Impact:** Tabs show outdated "waiting for X" count after participant joins

**Problem:**
- Participants update via WebSocket ✓
- Tabs receive `invites` prop from polling (3s delay) ✗
- **Tabs don't recalculate** based on live participants count
- Shows "Waiting for 2 friends" when only 1 left

**Evidence:**
```jsx
// SessionActiveScreen.jsx - Passes invites from polling
<InviteTabsSelector
  invites={invites}  // From 3-second poll, not live participants
  expectedCount={expectedCount}
/>
```

**Expected:**
- 3 invites sent, 2 joined
- Tab shows: "Invite 1: ✓ Claimed, Invite 2: ✓ Claimed, Invite 3: Pending"

**Actual:**
- 3-second polling delay before tabs update
- Meanwhile participants list already shows 2 joined
- UI inconsistency: List shows 2, Tabs show "generating..."

**Fix:**
- Derive tab state from live participants, not polling
- Match participant.claimedInviteId to invite.id in real-time

---

### BUG #21: No Visual Feedback for Declined Invites (MEDIUM)

**Location:** `useParticipantSync.js:36-37` + `InviteTabsSelector.jsx`
**Severity:** MEDIUM
**Impact:** Host sees notification but tabs don't show "declined" state

**Problem:**
- User declines invite → `marked_not_coming: true` in DB
- WebSocket broadcasts participant-joined with `marked_not_coming: true`
- Notification shows: "Alice @ BEAR declined" ✓
- **Tabs still show "Pending"** (should show "Declined") ✗

**Evidence:**
```jsx
// useParticipantSync.js line 36-37 - Notification works
if (participant.marked_not_coming) {
  onShowNotification(`${displayName} declined the invitation`, 6000, 'high');
}
// BUT: Tabs never updated to show declined state
```

**Missing UI:**
```jsx
// InviteTabsSelector.jsx - Should show:
{invite.participant?.marked_not_coming && (
  <div className="declined-badge">Declined ❌</div>
)}
```

**Fix Required:**
- Add `status: 'declined'` visual state to invite cards
- Match participant.claimedInviteId + check marked_not_coming
- Show red badge or strikethrough on declined tabs

---

### BUG #22: Checkpoint Complete Notification Fires Multiple Times (LOW)

**Location:** `SessionActiveScreen.jsx:93-113`
**Severity:** LOW
**Impact:** "All friends joined" notification shown multiple times

**Problem:**
- Checkpoint complete logic uses ref guard (line 97)
- Guard resets when `checkpointComplete` becomes false (line 110-112)
- **Edge case:** Last participant confirms → checkpoint true → notification shown
- Participant unchecks item → checkpoint false → guard resets
- Participant rechecks → checkpoint true again → **duplicate notification**

**Evidence:**
```jsx
// SessionActiveScreen.jsx line 109-112
} else if (!checkpointComplete) {
  // Reset guard when checkpoint becomes incomplete
  hasShownCheckpointComplete.current = false; // BUG: Too aggressive
}
```

**Scenario:**
1. All 3 participants join + confirm → "3 friends joined! Ready to start" ✓
2. Participant unchecks item → checkpoint false → guard resets
3. Participant rechecks item → checkpoint true → "3 friends joined!" again ✗

**Fix:**
- Only reset guard if participant count decreases (someone leaves)
- Track checkpoint by unique key: `${joinedCount}-${timestamp}`
- Don't reset guard on confirmation changes

---

## SUMMARY TABLE

| Bug | Severity | Component | User Impact | Fix Complexity |
|-----|----------|-----------|-------------|----------------|
| #17 | MEDIUM | InviteTabsSelector | 0-3s lag in tab updates | Easy (add WebSocket listener) |
| #18 | MEDIUM | NotificationContext | Notifications dropped from queue, timer leak | Medium (clear timers on drop) |
| #19 | HIGH | Socket reconnect | Missing participants after disconnect | Medium (add re-sync on connect) |
| #20 | MEDIUM | Tab state calc | Tabs show stale waiting count | Medium (derive from live state) |
| #21 | MEDIUM | Declined visual | No declined indicator on tabs | Easy (add declined badge) |
| #22 | LOW | Checkpoint notification | Duplicate success notifications | Easy (improve guard logic) |

---

## ARCHITECTURAL ISSUES

### Issue 1: Mixed Polling + WebSocket Strategy

**Current approach:**
- Participants: WebSocket real-time ✓
- Invites: 3-second polling ✗
- Session status: Both polling + WebSocket

**Problem:**
- Inconsistent update timing
- Unnecessary API calls (polling when WebSocket available)
- Race conditions between poll results and WebSocket events

**Recommendation:**
- Use WebSocket for ALL real-time updates
- Polling only as fallback when WebSocket unavailable
- Single source of truth per data type

### Issue 2: No Offline State Management

**Current:**
- WebSocket disconnects → UI shows stale data
- No visual indication of offline state
- User actions queue nowhere → lost on reconnect

**Missing:**
- "Reconnecting..." banner when socket.connected = false
- Queue user actions during offline (optimistic UI)
- Replay queued actions on reconnect

### Issue 3: No WebSocket Event Deduplication

**Current:**
- Multiple tabs open → all receive same broadcast
- Each tab triggers notification
- User sees 3x "Alice joined" (one per tab)

**Missing:**
- Event deduplication by participantId + timestamp
- Single notification across all tabs (use localStorage coordination)
- OR: Disable notifications in background tabs

---

## TESTING RECOMMENDATIONS

### Test Case 1: Rapid Joins (3 users in 5 seconds)
```
1. Open host screen
2. 3 participants join simultaneously
3. Expected: All 3 notifications visible (queued/stacked)
4. Expected: All 3 tabs update within 100ms
5. Actual: Only last notification visible (BUG #18)
6. Actual: Tabs lag 0-3s (BUG #17)
```

### Test Case 2: Network Disconnect During Join
```
1. Host screen active with 2 participants
2. Disable network (airplane mode)
3. Participant 3 joins (API succeeds, broadcast queued)
4. Re-enable network after 30 seconds
5. Expected: Participant 3 appears immediately on reconnect
6. Actual: Participant 3 never appears until page refresh (BUG #19)
```

### Test Case 3: Decline Then Rejoin
```
1. Send invite to user
2. User clicks "Decline" → notification shown ✓
3. Expected: Tab shows "Declined" state
4. Actual: Tab shows "Pending" (BUG #21)
5. User clicks invite link again to rejoin
6. Expected: New participant record created, tab shows "Claimed"
7. Actual: Tab state unpredictable (polling delay)
```

---

## FIX PRIORITY

### P1 (Fix in Next Sprint)
- **BUG #19**: WebSocket reconnect re-sync (HIGH) - data loss risk
- **BUG #17**: Real-time tab updates (MEDIUM) - core UX issue

### P2 (Fix Within Month)
- **BUG #20**: Tab state calculation (MEDIUM) - UI consistency
- **BUG #21**: Declined visual feedback (MEDIUM) - workflow clarity

### P3 (Nice to Have)
- **BUG #18**: Notification queuing (LOW) - edge case
- **BUG #22**: Duplicate checkpoint notification (LOW) - minor annoyance

---

## PRODUCTION MONITORING

### Metrics to Add:
1. **WebSocket reconnect rate** - Track disconnect → reconnect frequency
2. **Notification queue depth** - Alert if > 5 queued notifications
3. **Tab update lag** - Time from broadcast to UI update
4. **Missed participant sync** - Count of participants fetched on reconnect vs expected

### Logs to Add:
```javascript
// On reconnect
console.log('[Reconnect] Missed events during disconnect:', {
  disconnectDuration: now - lastDisconnectTime,
  participantsBefore: participantCountBeforeDisconnect,
  participantsAfter: participantCountAfterReconnect,
  missed: participantsAfter - participantsBefore
});
```

---

**Generated:** 2026-04-27
**Total Bugs Found:** 22 (across 3 addendum documents)
- CRITICAL: 8
- HIGH: 5
- MEDIUM: 7 (BUG #18 upgraded from LOW)
- LOW: 2
