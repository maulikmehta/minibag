# SessionActiveScreen.jsx - Bloat Analysis & Refactoring Plan

**Analysis Date**: October 31, 2025
**Current Status**: SIGNIFICANTLY BLOATED ⚠️
**File Size**: 896 lines
**Recommendation**: Refactor Required

---

## Executive Summary

SessionActiveScreen.jsx has grown to **896 lines** (4x the average screen size of 150-250 lines) by combining two distinct use cases:
1. **Host collaboration flow** (invite friends, manage participants, set expectations)
2. **Participant item selection flow** (view catalog, select items)

The file exhibits **10+ distinct responsibilities**, has **37 props** (excessive coupling), and contains **duplicated rendering logic** for host vs participant views. This analysis recommends a **hybrid refactoring approach** to extract reusable hooks and components while maintaining the dual-view structure.

---

## 1. Size & Complexity Metrics

### File Size Comparison

| Screen File | Lines of Code | Relative Size |
|-------------|--------------|---------------|
| **SessionActiveScreen.jsx** | **896** | **4x (Baseline)** |
| ParticipantTrackingScreen.jsx | 252 | 28% |
| PaymentSplitScreen.jsx | 252 | 28% |
| ShoppingScreen.jsx | 227 | 25% |
| HomeScreen.jsx | 152 | 17% |
| ParticipantBillScreen.jsx | 144 | 16% |

**Finding**: SessionActiveScreen is **3.5-4x larger** than comparable screen files.

### Complexity Indicators

- **Props received**: 37 (excessive coupling)
- **useState hooks**: 3
- **useEffect hooks**: 5 (complex side effect management)
- **useMemo hooks**: 2
- **Event handlers**: 2 local + numerous inline handlers
- **Conditional render branches**: 2 major (participant vs host) + dozens of minor

---

## 2. Distinct Responsibilities (10+)

### A. Participant Management (~200 lines)
**Lines**: 42-154, 248-280, 312-365, 567-619

- WebSocket participant join notifications
- Real-time participant status updates (marked as not coming)
- Participant list display with avatars
- Host marking participants as not coming

### B. Expected Participants System (~150 lines)
**Lines**: 45-98, 179-199, 709-813

- Expected participant count selection (0-3)
- Optimistic UI updates with API sync
- Local state management
- API calls to PATCH `/expected`

### C. Checkpoint Logic (~50 lines)
**Lines**: 179-199, 862-892

- Wait for N participants to join/respond
- 20-minute auto-timeout tracking
- "Go solo" mode (0 expected)
- Calculate responded vs waiting count
- Button enable/disable logic

### D. Item Management - Participant View (~150 lines)
**Lines**: 214-245, 375-495

- View host's item catalog (read-only participant list)
- Add/remove items from participant's list
- Quantity adjustment with kg input
- Weight limit enforcement (10kg max)
- Direct item selection interface

### E. Item Management - Host View (~80 lines)
**Lines**: 156-168, 621-687

- View all participant items
- Avatar switching to see different participant lists
- "Add items" button for host
- Participant item display with quantities

### F. WebSocket Real-time Updates (~60 lines)
**Lines**: 99-154

- Socket connection management
- Participant join events
- Status update events
- Notification triggers

### G. Session Sharing & Invites (~80 lines)
**Lines**: 698-856

- WhatsApp share button
- Copy invite link functionality
- Session code display
- Invite button state management (disabled when full)

### H. Dual UI Rendering (~610 lines total)
**Lines**: 283-509 (participant), 512-896 (host)

- **Participant view**: Simplified, locked to own items (226 lines)
- **Host view**: Full collaboration features (384 lines)
- **Massive code duplication** in avatar rendering, item display, session info

### I. Progress Tracking (~30 lines)
**Lines**: 176-177, 540-547, 862-873

- Confirmed participants count
- Progress bar navigation
- Checkpoint completion status display

### J. Notifications & UI State (~40 lines)
**Lines**: 42-63, 525-537

- Toast notifications
- Auto-dismiss timer (3 seconds)
- Success messages for participant actions

---

## 3. Critical Code Structure Issues

### Issue #1: Dual Rendering Pattern
**Lines**: 283-509 vs 512-896

Two completely separate render trees based on `isHost` condition:
- **Participant view**: 226 lines (lines 283-509)
- **Host view**: 384 lines (lines 512-896)

**Problem**: Significant code duplication in:
- Avatar rendering (lines 318-364 vs 572-618)
- Item display logic
- Session info display
- Navigation patterns

**Impact**: Changes must be made in two places, increasing maintenance burden and bug risk.

---

### Issue #2: Excessive Props Coupling (37 props!)

```javascript
export default function SessionActiveScreen({
  session, currentParticipant, hostItems, participants,
  selectedParticipant, onSelectedParticipantChange,
  showSessionMenu, onShowSessionMenuChange,
  onNavigateBack, onNavigateToHostCreate, onNavigateToParticipantAddItems,
  onNavigateToShopping, onNavigateToTracking, onNavigateToStep,
  onEndSession, onUpdateParticipants,
  items, getItemName, getItemSubtitles, getTotalWeight,
  handleShare, handleLanguageChange, onHelpClick, onLogoClick
})
```

**Problem**: Indicates component is doing too much and has unclear boundaries.

**Impact**: High coupling makes the component:
- Difficult to test in isolation
- Hard to reuse
- Fragile to changes in parent components

---

### Issue #3: Mixed Concerns

The file combines:
- **UI rendering** (participant/host views)
- **Business logic** (checkpoint calculations, timeout tracking)
- **Network operations** (WebSocket events, API calls)
- **State management** (local state + optimistic updates)
- **Real-time synchronization** (participant join/status)
- **User notifications** (toast messages)

**Problem**: Violates Single Responsibility Principle.

**Impact**: Hard to test, debug, and maintain.

---

### Issue #4: Deep Nesting & Conditional Complexity

Examples:
- **Lines 644-664**: Nested IIFE for "Mark as Not Coming" button logic
- **Lines 709-813**: Complex expected participants input with inline async handlers
- **Lines 329-363**: Participant slot mapping with multiple nested conditions

**Problem**: Difficult to test and reason about.

---

### Issue #5: Duplicated Avatar Rendering Logic

Participant view (lines 318-364) and host view (lines 572-618) render almost identical avatar circles with only slight variations.

**Problem**: DRY principle violation.

**Impact**: Changes to avatar display must be synchronized manually.

---

## 4. Refactoring Options

### Option A: Split into Separate Screen Components

**Structure**:
```
packages/minibag/src/screens/
├── SessionActiveScreen.jsx (DELETED)
├── HostCollaborationScreen.jsx (384 lines) - Host view
└── ParticipantItemSelectionScreen.jsx (226 lines) - Participant view

packages/minibag/src/components/session/
├── ExpectedParticipantsInput.jsx (NEW - 120 lines)
├── CheckpointStatus.jsx (NEW - 80 lines)
├── SessionInviteControls.jsx (NEW - 100 lines)
└── ParticipantNotifications.jsx (NEW - 60 lines)

packages/minibag/src/hooks/
├── useParticipantSync.js (NEW - 80 lines)
├── useExpectedParticipants.js (NEW - 60 lines)
└── useSessionNotifications.js (NEW - 40 lines)
```

**Pros**:
- Clear separation of host vs participant flows
- Each screen has focused responsibility
- Easier to test and maintain
- Better code organization

**Cons**:
- Requires routing changes
- More files to navigate
- Potential code duplication if shared logic not extracted properly

---

### Option B: Keep Single File, Extract Logic to Hooks

**Structure**:
```
packages/minibag/src/hooks/
├── useParticipantSync.js (NEW - 80 lines)
├── useExpectedParticipants.js (NEW - 60 lines)
└── useItemManagement.js (NEW - 40 lines)
```

**Result**: Reduces file to ~700 lines

**Pros**:
- Simpler approach
- No routing changes
- Logic reusability through hooks

**Cons**:
- Still has dual rendering issue
- File remains large
- Mixed concerns not fully addressed

---

### Option C: Hybrid Approach ⭐ **RECOMMENDED**

**Phase 1** - Extract hooks and components:

**Hooks to create**:
1. `useParticipantSync.js` (~80 lines)
   - WebSocket participant join/status events
   - Returns: `{ notification, updateParticipantStatus }`

2. `useExpectedParticipants.js` (~60 lines)
   - Checkpoint system logic (expected count, timeout, completion)
   - Returns: `{ expectedCount, setExpectedCount, checkpointComplete, waitingCount, autoTimedOutCount, isInviteExpired }`

3. `useSessionNotifications.js` (~40 lines)
   - Toast notification management
   - Returns: `{ notification, showNotification }`

**Components to extract**:
1. `ExpectedParticipantsInput.jsx` (~120 lines)
   - "How many friends joining?" section (lines 709-813)
   - Props: `sessionId`, `expectedCount`, `onChange`

2. `SessionInviteControls.jsx` (~100 lines)
   - WhatsApp share + copy link buttons (lines 815-856)
   - Props: `session`, `participantCount`, `onShare`, `disabled`

3. `CheckpointStatus.jsx` (~80 lines)
   - Bottom footer with waiting/ready status
   - Props: `checkpointComplete`, `waitingCount`, `hasConfirmedParticipants`, `onStartShopping`

4. `SessionParticipantList.jsx` (~80 lines)
   - Shared avatar rendering for both views
   - Props: `participants`, `host`, `selected`, `onSelect`, `readOnly`, `maxSlots`

**Result**: 896 lines → ~580 lines (**35% reduction**)

**Pros**:
- Significant improvement without major architectural changes
- Low risk - extract incrementally, test each step
- Reusable hooks and components
- Maintains current navigation flow
- Easier to test extracted logic

**Cons**:
- Still has dual rendering in one file
- May require Phase 2 if file remains unwieldy

---

### Phase 2 (Future) - Consider full split if needed

If after Phase 1 the file still feels too complex:
- Split into separate `HostCollaborationScreen.jsx` and `ParticipantItemSelectionScreen.jsx`
- Update routing to diverge earlier
- Could reduce main files to 300-400 lines each

---

## 5. Recommended Implementation Plan

### Step 1: Extract Hooks (Week 1)

**1.1 Create `useParticipantSync.js`**
- **Location**: `packages/minibag/src/hooks/useParticipantSync.js`
- **Lines to extract**: 99-154 (WebSocket logic)
- **Returns**: `{ notification, updateParticipantStatus }`
- **Test**: Participant join/leave events, status updates

**1.2 Create `useExpectedParticipants.js`**
- **Location**: `packages/minibag/src/hooks/useExpectedParticipants.js`
- **Lines to extract**: 45-98, 179-199
- **Returns**: `{ expectedCount, setExpectedCount, checkpointComplete, waitingCount, autoTimedOutCount, isInviteExpired }`
- **Test**: Checkpoint scenarios, timeout behavior

**1.3 Create `useSessionNotifications.js`**
- **Location**: `packages/minibag/src/hooks/useSessionNotifications.js`
- **Lines to extract**: 42-63
- **Returns**: `{ notification, showNotification }`
- **Test**: Auto-dismiss, notification display

---

### Step 2: Extract Components (Week 2)

**2.1 Create `ExpectedParticipantsInput.jsx`**
- **Location**: `packages/minibag/src/components/session/ExpectedParticipantsInput.jsx`
- **Lines to extract**: 709-813
- **Props**: `{ sessionId, expectedCount, onChange, disabled }`
- **Features**: +/- buttons, input field, API integration
- **Test**: Increment/decrement, API calls, validation

**2.2 Create `SessionInviteControls.jsx`**
- **Location**: `packages/minibag/src/components/session/SessionInviteControls.jsx`
- **Lines to extract**: 815-856
- **Props**: `{ session, participantCount, onShare, disabled }`
- **Features**: WhatsApp share, copy link, disabled states
- **Test**: Share functionality, copy to clipboard

**2.3 Create `CheckpointStatus.jsx`**
- **Location**: `packages/minibag/src/components/session/CheckpointStatus.jsx`
- **Lines to extract**: 862-892
- **Props**: `{ checkpointComplete, waitingCount, hasConfirmedParticipants, autoTimedOutCount, isInviteExpired, onStartShopping, disabled }`
- **Features**: Status message, start shopping button
- **Test**: Different checkpoint states, timeout display

---

### Step 3: Deduplicate Avatar Rendering (Week 3)

**3.1 Create `SessionParticipantList.jsx`**
- **Location**: `packages/minibag/src/components/session/SessionParticipantList.jsx`
- **Lines to consolidate**: 318-364 + 572-618
- **Props**: `{ participants, host, selected, onSelect, readOnly, maxSlots }`
- **Features**: Host slot, participant slots, empty slots, selection
- **Test**: Different participant counts, selection behavior, read-only mode

---

### Step 4: Update SessionActiveScreen.jsx

**4.1 Replace extracted code with hooks**
```javascript
// Before: 150+ lines of state/effect logic
const [localExpectedCount, setLocalExpectedCount] = useState(...)
useEffect(() => { /* timeout check */ }, [...])
useEffect(() => { /* sync count */ }, [...])
// ... etc

// After: ~10 lines
const { notification } = useSessionNotifications()
const { updateParticipantStatus } = useParticipantSync(session, currentParticipant, onUpdateParticipants)
const {
  expectedCount,
  setExpectedCount,
  checkpointComplete,
  waitingCount,
  autoTimedOutCount,
  isInviteExpired
} = useExpectedParticipants(session)
```

**4.2 Replace inline components**
```javascript
// Before: 100+ lines of JSX
<div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
  <div className="flex items-center justify-between">
    {/* ... complex input logic ... */}
  </div>
</div>

// After: Single component
<ExpectedParticipantsInput
  sessionId={session?.session_id}
  expectedCount={expectedCount}
  onChange={setExpectedCount}
/>
```

**4.3 Clean up imports**
- Remove unused state/effect imports
- Add new hook imports
- Add new component imports

---

### Step 5: Testing Strategy

**Unit Tests**:
- Test each hook independently
- Test each component with different prop combinations
- Mock API calls and WebSocket events

**Integration Tests**:
- Test SessionActiveScreen with extracted hooks/components
- Verify participant join flow
- Verify checkpoint logic
- Verify timeout behavior

**Manual Testing**:
- Test host flow: create session → set expectations → invite → wait/go solo
- Test participant flow: join → select items → confirm
- Test edge cases: timeout, full session, network errors

---

## 6. Expected Outcomes

### After Phase 1 (Hybrid Approach)

**File Size**: 896 → ~580 lines (35% reduction)

**Benefits**:
- ✅ Clearer separation of concerns
- ✅ Reusable hooks for other screens
- ✅ Testable business logic in isolation
- ✅ Smaller, more focused components
- ✅ Easier to understand and maintain
- ✅ Reduced cognitive load

**Remaining Issues**:
- ⚠️ Still has dual rendering (host/participant views in one file)
- ⚠️ File may still be larger than ideal

---

### If Phase 2 Needed (Full Split)

**File Sizes**:
- `HostCollaborationScreen.jsx`: ~350 lines
- `ParticipantItemSelectionScreen.jsx`: ~200 lines
- Shared hooks/components: ~400 lines total

**Additional Benefits**:
- ✅ Complete separation of host/participant flows
- ✅ Each screen has single, focused responsibility
- ✅ Easier to optimize each view independently
- ✅ Better code organization

---

## 7. Risk Assessment

### Low Risk Items
- Extracting hooks (isolated logic, easy to test)
- Extracting self-contained components (clear interfaces)

### Medium Risk Items
- Updating SessionActiveScreen to use extracted code (requires careful integration)
- Ensuring WebSocket events still work correctly

### High Risk Items
- Full screen split (requires routing changes, navigation updates)
- Breaking changes to parent components (37 props!)

**Mitigation**:
- Start with Phase 1 (low/medium risk)
- Comprehensive testing at each step
- Only proceed to Phase 2 if Phase 1 results are insufficient

---

## 8. Success Criteria

### Phase 1 Success Metrics
- ✅ File reduced to <600 lines
- ✅ All extracted hooks have >80% test coverage
- ✅ All extracted components have >80% test coverage
- ✅ No regression in existing functionality
- ✅ Performance maintained or improved
- ✅ Code review approval from team

### Phase 2 Success Metrics (if needed)
- ✅ Each screen file <400 lines
- ✅ Clear routing separation
- ✅ No code duplication between screens
- ✅ Navigation flows work correctly

---

## 9. Conclusion

SessionActiveScreen.jsx exhibits significant bloat (896 lines, 37 props, 10+ responsibilities) that warrants refactoring. The **Hybrid Approach (Option C)** provides a pragmatic path forward with:

1. **Low risk**: Incremental extraction, testable at each step
2. **High value**: 35% size reduction, improved maintainability
3. **Flexibility**: Can proceed to Phase 2 if needed

**Recommended Action**: Begin Phase 1 extraction when development bandwidth allows. Estimated effort: 2-3 weeks.

---

## Appendix: Code Samples

### Sample Hook: useExpectedParticipants.js

```javascript
import { useState, useEffect } from 'react';

export function useExpectedParticipants(session) {
  const [localExpectedCount, setLocalExpectedCount] = useState(
    session?.expected_participants !== undefined && session?.expected_participants !== null
      ? session.expected_participants
      : null
  );
  const [isInviteExpired, setIsInviteExpired] = useState(false);

  // Sync with session data
  useEffect(() => {
    setLocalExpectedCount(
      session?.expected_participants !== undefined && session?.expected_participants !== null
        ? session.expected_participants
        : null
    );
  }, [session?.expected_participants]);

  // Check for invite timeout every 30 seconds
  useEffect(() => {
    const checkTimeout = () => {
      if (!session?.expected_participants_set_at) {
        setIsInviteExpired(false);
        return;
      }
      const TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
      const elapsed = new Date() - new Date(session.expected_participants_set_at);
      setIsInviteExpired(elapsed >= TIMEOUT_MS);
    };

    checkTimeout();
    const interval = setInterval(checkTimeout, 30000);
    return () => clearInterval(interval);
  }, [session?.expected_participants_set_at]);

  // Calculate checkpoint metrics
  const joinedCount = participants.filter(p => !p.marked_not_coming).length;
  const notComingCount = participants.filter(p => p.marked_not_coming).length;
  const autoTimedOutCount = isInviteExpired && localExpectedCount > 0
    ? Math.max(0, localExpectedCount - joinedCount - notComingCount)
    : 0;

  const checkpointComplete = localExpectedCount === null
    ? false
    : localExpectedCount === 0
      ? true
      : (joinedCount + notComingCount + autoTimedOutCount) >= localExpectedCount;

  const waitingCount = localExpectedCount !== null && localExpectedCount > 0 && !isInviteExpired
    ? localExpectedCount - joinedCount - notComingCount
    : 0;

  return {
    expectedCount: localExpectedCount,
    setExpectedCount: setLocalExpectedCount,
    checkpointComplete,
    waitingCount,
    autoTimedOutCount,
    isInviteExpired
  };
}
```

---

**Document Version**: 1.0
**Last Updated**: October 31, 2025
**Author**: Claude Code Analysis
**Status**: Approved for Phase 1 Implementation
