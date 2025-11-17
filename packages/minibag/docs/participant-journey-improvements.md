# Participant Journey Improvements - Implementation Plans

**Date:** October 31, 2025
**Branch:** refactor/phase3-day-7
**Status:** Planning phase - Not yet implemented

---

## 1. Participant Courier-Style Tracking Journey

### Problem Statement
Currently, after a participant clicks "Confirm my list", they have no visibility into the shopping progress. They fall into a "black hole" until they receive a WhatsApp link to pay. The ShoppingScreen and PaymentSplitScreen are redundant/invisible to participants.

### Proposed Solution
Replace the current participant journey with a courier tracking-style screen that shows real-time progress after list submission.

### New Participant Flow
```
JoinSession → SessionActive (select items) → [Confirm my list]
  → ParticipantTrackingScreen → [View Bill] → ParticipantBillScreen
```

### Key Decisions
- **Post-confirmation view:** Navigate to dedicated ParticipantTrackingScreen
- **Tracking steps:**
  1. ✓ List submitted to host
  2. ⏳ Host is shopping now
  3. ⏳ Shopping complete - ready to pay
- **Item editing:** Locked - cannot edit once confirmed
- **Payment flow:** Tracking screen with 'View Bill' button (in-app, no WhatsApp needed)

### Implementation Requirements

#### A. Create ParticipantTrackingScreen Component
- Courier-style 3-step progress tracker
- Read-only summary of participant's selected items
- Total weight and item count display
- "View Bill" button (appears when status = 'completed')
- Package tracking-style UI (stepper/timeline)

#### B. Session Status Management
- Utilize existing `updateSessionStatus(sessionId, status)` API
- Track statuses: `'active'` → `'shopping'` → `'completed'`
- Status triggers:
  - Host clicks "Start Shopping" button → status = 'shopping'
  - Host finishes PaymentSplitScreen → status = 'completed'

#### C. Real-time Status Sync (WebSocket)
- Add new event: `'session-status-updated'`
- Broadcast to all participants when host changes status
- Participants update tracking UI in real-time

#### D. Lock Items After Confirmation
- Add `items_confirmed: true` field to participant record
- Set when "Confirm my list" clicked
- Prevent navigation back to SessionActiveScreen
- Host sees confirmation status for each participant

#### E. Navigation Changes
- SessionActiveScreen: "Confirm my list" → ParticipantTrackingScreen
- ParticipantTrackingScreen: "View Bill" → ParticipantBillScreen
- Remove participant access to ShoppingScreen/PaymentSplitScreen

#### F. Host Side Improvements
- Add "Start Shopping" button in SessionActiveScreen
- Show which participants have confirmed lists (visual indicator)
- Only allow shopping when ≥1 participant confirmed
- Auto-update session status on screen transitions

### Files to Create/Modify

**New Files:**
- `packages/minibag/src/screens/ParticipantTrackingScreen.jsx`

**Modified Files:**
- `packages/minibag/src/screens/SessionActiveScreen.jsx` - Add confirmation tracking, navigation change
- `packages/minibag/src/screens/ShoppingScreen.jsx` - Update session status on entry
- `packages/minibag/src/screens/PaymentSplitScreen.jsx` - Update status on completion
- `packages/minibag/minibag-ui-prototype.tsx` - Add tracking screen to navigation
- `packages/minibag/src/services/api.js` - Add participant confirmation methods
- `packages/minibag/src/services/socket.js` - Listen for session-status-updated
- `packages/shared/websocket/handlers.js` - Add session status broadcasting
- `packages/shared/api/participants.js` - Add confirmation field support

### Benefits
✓ Eliminates confusion after list submission
✓ Reduces reliance on external WhatsApp notifications
✓ Provides transparency and status visibility
✓ Locks items to prevent accidental changes
✓ Creates cohesive in-app experience for participants

---

## 2. Context-Aware Identity Reveal

### Problem Statement
Participants see only nicknames (e.g., "Jay", "Ria") in avatar circles. Real names are collected but never displayed. Both host and participants need a way to recall "who is who" without cluttering the UI.

### Current State
- **Data collected:** `real_name` field exists in database and is captured during join/create
- **Currently displayed:** Only `nickname` shown in UI
- **Not displayed:** `real_name`, phone numbers, contact info
- **Database field:** `real_name` (TEXT) added via migration 007_add_real_name_to_participants.sql

### Proposed Solution
Subtle identity reveal via long-press gesture on avatars, plus join/submission notifications showing "RealName @ Nickname" format. Foundation for future context-aware reveal at payment phase.

### Key Decisions
- **Timing:** Long press reveals first name anytime; full context-aware reveal at payment phase (future)
- **Format:** "RealName @ Nickname" in notifications, first name only in popup
- **Phone numbers:** No - stick with real names only
- **Display:** Non-intrusive, opt-in via long press

### Implementation Requirements

#### A. Long Press Popup on Avatar Circles

**ParticipantAvatar.jsx modifications:**
- Add touch event handlers: `onTouchStart`, `onTouchEnd`, `onContextMenu`
- Add mouse event handlers for desktop: `onMouseDown`, `onMouseUp`
- Implement long press detection (500ms threshold)
- Show tooltip/popup with first name extracted from `real_name`
- **Popup content:** "Maulik" (extracted from "Maulik Patel")
- **Styling:** Small floating card above avatar, dark background, white text
- **Dismissal:** Auto-hide on release or after 2 seconds
- **Works for:** All avatar views (host viewing participants, participants viewing others)

#### B. Extract First Name Utility

**Add to `utils/sessionTransformers.js`:**
```javascript
/**
 * Extracts first name from full name
 * @param {string} real_name - Full name (e.g., "Maulik Patel")
 * @returns {string} First name (e.g., "Maulik")
 */
export function extractFirstName(real_name) {
  if (!real_name) return null;
  return real_name.split(' ')[0];
}
```

**Handles:**
- "Maulik Patel" → "Maulik"
- "Maulik" → "Maulik" (single names)
- undefined/null → null (fallback to nickname)

#### C. Join/Submission Notifications

**SessionActiveScreen.jsx modifications:**

**1. Participant Join Notification:**
- Format: "Maulik @ Jay joined the session"
- Trigger: WebSocket `participant-joined` event
- Auto-dismiss after 3 seconds
- Toast/banner at top of screen
- Shows to host only

**2. List Submission Notification (Host View):**
- Format: "Maulik @ Jay submitted the list"
- Trigger: WebSocket `participant-items-updated` with `items_confirmed: true`
- Green checkmark badge on participant avatar
- Auto-dismiss after 3 seconds
- Shows to host only

**3. Participant Confirmation (Participant View):**
- After clicking "Confirm my list"
- Show: "Your list submitted to host"
- Before navigating to ParticipantTrackingScreen
- Shows to participant only

#### D. WebSocket Event Enhancements

**Modify `packages/shared/websocket/handlers.js`:**
- Add `items_confirmed` flag to `participant-items-updated` event payload
- Include `real_name` in participant data broadcast (currently only nickname)
- Ensure all necessary data available for frontend notifications

**Event payload example:**
```javascript
{
  type: 'participant-items-updated',
  participant: {
    id: 'uuid',
    nickname: 'Jay',
    real_name: 'Maulik Patel',
    items_confirmed: true,
    items: { ... }
  }
}
```

#### E. Visual Feedback for Confirmed Participants

**SessionActiveScreen.jsx - Host View:**
- Add small green checkmark badge on participant avatars who confirmed
- Update ParticipantAvatar to accept `isConfirmed` prop
- Show checkmark overlay on avatar circle (top-right corner)
- Helps host track who has submitted their lists

**ParticipantAvatar.jsx props:**
```javascript
<ParticipantAvatar
  displayText="JA"
  label="Jay"
  isConfirmed={true}  // New prop
  realName="Maulik Patel"  // New prop for long press
  // ... other props
/>
```

#### F. Foundation for Context-Aware Reveal (Future)

**Prepare utility function in `utils/sessionTransformers.js`:**
```javascript
/**
 * Get display name based on context
 * @param {Object} participant - Participant object
 * @param {string} context - Display context ('default', 'payment', etc.)
 * @param {boolean} showRealNames - Global toggle for showing real names
 * @returns {string} Formatted display name
 */
export function getDisplayName(participant, context = 'default', showRealNames = false) {
  const firstName = extractFirstName(participant.real_name);
  const nickname = participant.nickname;

  if (context === 'payment' || showRealNames) {
    return firstName ? `${firstName} (${nickname})` : nickname;
  }

  return nickname;
}
```

**Usage in payment screens (future):**
- PaymentSplitScreen: "Maulik (Jay) owes ₹150"
- ParticipantBillScreen: "Bill for Maulik (Jay)"
- Can add host toggle button: "Show Real Names" / "Show Nicknames"

### UX Flow Examples

#### Scenario 1: Host checking who "Jay" is
1. Host sees avatar circle with "JA" and label "Jay"
2. Host long-presses on Jay's avatar (touch) or holds mouse down (desktop)
3. After 500ms, popup appears above avatar: "Maulik"
4. Host releases, popup fades out after 2 seconds
5. Host now knows Jay = Maulik

#### Scenario 2: Participant joins
1. Maulik (nickname: Jay) joins session
2. Host sees toast notification at top: "Maulik @ Jay joined the session"
3. Jay's avatar appears in participant slots with "JA" initials
4. Notification auto-dismisses after 3 seconds

#### Scenario 3: Participant submits list
1. Maulik clicks "Confirm my list" button
2. Maulik sees confirmation: "Your list submitted to host"
3. Maulik navigates to ParticipantTrackingScreen
4. Host sees notification: "Maulik @ Jay submitted the list"
5. Green checkmark badge appears on Jay's avatar circle (host view)
6. Notification auto-dismisses after 3 seconds

#### Scenario 4: Future payment phase (not implemented yet)
1. Host moves to PaymentSplitScreen
2. List shows: "Maulik (Jay) owes ₹150", "Priya (Ria) owes ₹200"
3. Participant receives bill: "Bill for Maulik (Jay)"
4. Real names revealed in payment context automatically

### Files to Modify

**Modified Files:**
- `packages/minibag/src/components/session/ParticipantAvatar.jsx` - Add long press gesture & popup
- `packages/minibag/src/screens/SessionActiveScreen.jsx` - Add notifications, confirmed status
- `packages/minibag/src/utils/sessionTransformers.js` - Add extractFirstName and getDisplayName utilities
- `packages/minibag/src/services/socket.js` - Handle new event data
- `packages/shared/websocket/handlers.js` - Include real_name in broadcasts

**Optional (for future context-aware reveal):**
- `packages/minibag/src/screens/PaymentSplitScreen.jsx` - Use getDisplayName for payment phase
- `packages/minibag/src/screens/ParticipantBillScreen.jsx` - Show real name in bill

### Technical Details

#### Long Press Implementation
```javascript
// In ParticipantAvatar.jsx
const [showPopup, setShowPopup] = useState(false);
const pressTimer = useRef(null);

const handlePressStart = (e) => {
  pressTimer.current = setTimeout(() => {
    setShowPopup(true);
  }, 500);
};

const handlePressEnd = () => {
  clearTimeout(pressTimer.current);
  setTimeout(() => setShowPopup(false), 2000);
};
```

#### Notification System
- Use existing toast/notification component if available
- Position: Top of screen, center aligned
- Duration: 3 seconds
- Style: Green background for confirmations, blue for info
- Format: Icon + "RealName @ Nickname" + action text

#### Data Privacy Considerations
- Real names stored securely in database
- Only transmitted to session participants (not public)
- Long press prevents accidental reveal
- No persistent display unless user explicitly requests
- Future: Could add privacy settings (host can hide real names)

### Benefits
✓ Non-intrusive identity reveal (opt-in via long press)
✓ Helps recall "who is who" without cluttering UI
✓ Join/submission notifications provide context
✓ Green checkmarks help host track submission status
✓ Lays foundation for payment-phase identity reveal
✓ Works on both mobile (touch) and desktop (mouse hold)
✓ Respects privacy with opt-in gesture

---

## Implementation Priority

### Phase 1: Identity Reveal (Simpler - Recommended First)
- **Estimated effort:** 2-3 hours
- **Complexity:** Low - UI enhancements only
- **Dependencies:** None
- **Impact:** Immediate usability improvement

**Tasks:**
1. Add extractFirstName utility
2. Implement long press in ParticipantAvatar
3. Add join/submission notifications
4. Add confirmation checkmark badges
5. Update WebSocket handlers

### Phase 2: Tracking Journey (More Complex)
- **Estimated effort:** 6-8 hours
- **Complexity:** Medium - New screen + backend changes
- **Dependencies:** Session status API (already exists)
- **Impact:** Major UX improvement

**Tasks:**
1. Create ParticipantTrackingScreen component
2. Implement session status management
3. Add WebSocket session-status-updated event
4. Add items_confirmed field to participants
5. Update host view with "Start Shopping" button
6. Modify navigation flow
7. Update PaymentSplitScreen to set completion status

---

## Testing Checklist

### Identity Reveal Testing
- [ ] Long press on avatar shows first name popup (mobile)
- [ ] Mouse hold on avatar shows popup (desktop)
- [ ] Popup auto-dismisses after release
- [ ] Join notification appears when participant joins
- [ ] Submission notification appears when participant confirms
- [ ] Green checkmark shows on confirmed participant avatars
- [ ] Popup extracts first name correctly ("Maulik Patel" → "Maulik")
- [ ] Handles single names gracefully
- [ ] Falls back to nickname if real_name is null

### Tracking Journey Testing
- [ ] Participant navigates to tracking screen after confirmation
- [ ] Tracking screen shows 3 steps correctly
- [ ] Step 1 (submitted) auto-checked on load
- [ ] Step 2 (shopping) updates when host starts shopping
- [ ] Step 3 (complete) updates when shopping finishes
- [ ] "View Bill" button appears only when status = completed
- [ ] Items locked after confirmation (cannot navigate back)
- [ ] Host sees which participants have confirmed
- [ ] "Start Shopping" button only enabled when ≥1 confirmed
- [ ] WebSocket updates propagate in real-time
- [ ] localStorage persistence works if page refreshed

---

## Future Enhancements (Not in Scope)

### Additional Identity Features
- Phone number collection and display
- "Reveal All" button for host
- Per-participant privacy settings
- Email addresses for digital receipts

### Additional Tracking Features
- Estimated completion time
- Push notifications (web push API)
- Order modification requests
- Live shopping updates (item-by-item)

### Payment Integration
- Real UPI payment integration
- Payment confirmation via API
- Automatic payment reconciliation
- Split payment tracking

---

## Notes
- Both features are designed to be independent and can be implemented separately
- Identity reveal provides immediate value with minimal complexity
- Tracking journey requires more backend coordination
- Both features lay groundwork for future enhancements
- Real names are already collected - just need to display them strategically

---

**Document Version:** 1.0
**Last Updated:** October 31, 2025
**Author:** Documented during planning session
