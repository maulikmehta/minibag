# Notification System Test Plan

**Date:** November 1, 2025
**Status:** In Progress
**Tester:** Development Team
**Environment:** Local Development (npm run dev)

---

## Test Objectives

1. Validate notification system works correctly across all scenarios
2. Ensure production-ready quality before user testing
3. Document any bugs or issues found
4. Verify accessibility and mobile responsiveness

---

## Test Environment Setup

### Prerequisites
- [ ] Development server running (`npm run dev`)
- [ ] Browser DevTools open (Console + Network tabs)
- [ ] Mobile device or responsive mode for mobile testing
- [ ] Screen reader available (optional for accessibility testing)

### Test URLs
- Local: `http://localhost:5173`
- Test session creation and participant flows

---

## Test Cases

### 1. Notification Queue Behavior

**Test ID:** NT-001
**Priority:** High
**Objective:** Verify queue limits to 3 notifications and handles overflow

#### Test Steps:
1. Start dev server
2. Navigate to SessionActiveScreen
3. Trigger 5+ notifications rapidly (have multiple participants join quickly OR manually trigger notifications)
4. Observe notification behavior

#### Expected Results:
- [ ] Maximum 3 notifications visible at any time
- [ ] Older notifications dismissed when queue full
- [ ] FIFO order maintained (first in, first out)
- [ ] No UI lag or performance issues
- [ ] Notifications stack vertically without overlap

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 2. Notification Types - Success

**Test ID:** NT-002
**Priority:** High
**Objective:** Verify success notifications display correctly

#### Test Steps:
1. Trigger success notification (e.g., participant joins session)
2. Observe notification appearance

#### Expected Results:
- [ ] Green background (`bg-green-500`)
- [ ] White text
- [ ] CheckCircle icon visible
- [ ] Success message clear and readable
- [ ] Slide-down animation smooth

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 3. Notification Types - Error

**Test ID:** NT-003
**Priority:** High
**Objective:** Verify error notifications display correctly

#### Test Steps:
1. Trigger error notification (e.g., disconnect network, make API call)
2. Observe notification appearance

#### Expected Results:
- [ ] Red background (`bg-red-500`)
- [ ] White text
- [ ] XCircle icon visible
- [ ] Error message user-friendly (not technical)
- [ ] `role="alert"` for screen readers
- [ ] Auto-dismisses after 3 seconds

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 4. Notification Types - Warning

**Test ID:** NT-004
**Priority:** Medium
**Objective:** Verify warning notifications display correctly

#### Test Steps:
1. Manually trigger warning notification (use browser console if needed)
2. Observe notification appearance

#### Expected Results:
- [ ] Yellow background (`bg-yellow-500`)
- [ ] Dark gray text (`text-gray-900`)
- [ ] AlertTriangle icon visible
- [ ] Warning message clear
- [ ] `role="alert"` for screen readers

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 5. Notification Types - Info

**Test ID:** NT-005
**Priority:** Medium
**Objective:** Verify info notifications display correctly

#### Test Steps:
1. Manually trigger info notification
2. Observe notification appearance

#### Expected Results:
- [ ] Blue background (`bg-blue-500`)
- [ ] White text
- [ ] Info icon visible
- [ ] Info message clear
- [ ] `role="status"` for screen readers

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 6. Auto-Dismiss Timing

**Test ID:** NT-006
**Priority:** High
**Objective:** Verify notifications auto-dismiss after 3 seconds

#### Test Steps:
1. Trigger single notification
2. Start timer
3. Observe when notification disappears
4. Repeat 3 times for consistency

#### Expected Results:
- [ ] Notification visible for 3 seconds (±200ms)
- [ ] Fade-out animation smooth
- [ ] Notification removed from DOM after dismiss
- [ ] Consistent timing across all notification types

#### Actual Results:
```
Test 1: ___ seconds
Test 2: ___ seconds
Test 3: ___ seconds
Average: ___ seconds
```

#### Status: ⏳ Pending

---

### 7. Manual Dismiss - Click

**Test ID:** NT-007
**Priority:** High
**Objective:** Verify clicking X button dismisses notification

#### Test Steps:
1. Trigger notification
2. Click X button before auto-dismiss
3. Verify notification removed

#### Expected Results:
- [ ] X button visible and clickable
- [ ] Notification dismissed immediately on click
- [ ] Fade-out animation plays
- [ ] No errors in console

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 8. Manual Dismiss - Escape Key

**Test ID:** NT-008
**Priority:** Medium
**Objective:** Verify Escape key dismisses all notifications

#### Test Steps:
1. Trigger 3 notifications
2. Press Escape key
3. Verify all notifications dismissed

#### Expected Results:
- [ ] All notifications dismissed on single Escape press
- [ ] Works regardless of focus state
- [ ] No errors in console

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 9. Cross-Screen Consistency

**Test ID:** NT-009
**Priority:** High
**Objective:** Verify notifications visible on all screens

#### Test Steps:
1. Navigate to HomeScreen
2. Trigger notification (manually if needed)
3. Verify notification appears
4. Repeat for: SessionCreateScreen, SessionActiveScreen, ShoppingScreen, PaymentSplitScreen

#### Expected Results:
- [ ] Notifications appear on HomeScreen
- [ ] Notifications appear on SessionCreateScreen
- [ ] Notifications appear on SessionActiveScreen
- [ ] Notifications appear on ShoppingScreen
- [ ] Notifications appear on PaymentSplitScreen
- [ ] Position consistent (top-center, fixed)
- [ ] Z-index correct (above all content)

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 10. API Error Notifications

**Test ID:** NT-010
**Priority:** High
**Objective:** Verify API errors show user-friendly notifications

#### Test Steps:
1. **Network Error Test:**
   - Disconnect network
   - Make API call (e.g., create session)
   - Reconnect network

2. **Server Error Test:**
   - Use DevTools to simulate 500 error
   - OR temporarily break API endpoint

3. **404 Error Test:**
   - Try to load non-existent session

#### Expected Results:

**Network Error:**
- [ ] Notification shows: "No internet connection. Please check your network."
- [ ] Red error notification
- [ ] No technical jargon

**Server Error (500):**
- [ ] Notification shows: "Something went wrong on our end. Please try again."
- [ ] Red error notification
- [ ] User-friendly message

**404 Error:**
- [ ] Notification shows: "Resource not found. The link may be expired."
- [ ] Red error notification
- [ ] Helpful guidance

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 11. Participant Join Notifications

**Test ID:** NT-011
**Priority:** High
**Objective:** Verify real participant actions trigger notifications

#### Test Steps:
1. Host creates session
2. Open session link in incognito window (as participant)
3. Join session as participant
4. Add items to list
5. Submit list
6. Observe notifications in host window

#### Expected Results:
- [ ] Host sees "Participant joined the session" notification
- [ ] Host sees "Participant submitted the list" notification
- [ ] Notifications include participant nickname
- [ ] Identity reveal format correct (if real name provided)
- [ ] Green success notifications

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 12. Mobile Responsiveness

**Test ID:** NT-012
**Priority:** High
**Objective:** Verify notifications work on mobile devices

#### Test Steps:
1. Open app in mobile view (DevTools responsive mode OR actual device)
2. Trigger notifications
3. Test on different screen sizes: 375px, 414px, 768px

#### Expected Results:
- [ ] Notification width: 90% of screen, max 400px
- [ ] Text readable on small screens
- [ ] Touch targets large enough (X button)
- [ ] No horizontal overflow
- [ ] Animations smooth on mobile
- [ ] Position correct (top-center)

#### Actual Results:
```
Screen 375px: [Pass/Fail]
Screen 414px: [Pass/Fail]
Screen 768px: [Pass/Fail]
```

#### Status: ⏳ Pending

---

### 13. Accessibility - Keyboard Navigation

**Test ID:** NT-013
**Priority:** Medium
**Objective:** Verify keyboard users can interact with notifications

#### Test Steps:
1. Trigger notification
2. Use Tab key to navigate
3. Press Escape to dismiss
4. Test with multiple notifications

#### Expected Results:
- [ ] Can focus on X button with Tab
- [ ] Enter/Space dismisses focused notification
- [ ] Escape dismisses all notifications
- [ ] Focus visible indicator on X button
- [ ] No keyboard traps

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 14. Accessibility - Screen Reader (Optional)

**Test ID:** NT-014
**Priority:** Low
**Objective:** Verify screen reader announces notifications

#### Test Steps:
1. Enable screen reader (VoiceOver on Mac, NVDA on Windows)
2. Trigger success notification
3. Trigger error notification
4. Listen for announcements

#### Expected Results:
- [ ] Success/info notifications: `role="status"`, `aria-live="polite"`
- [ ] Error/warning notifications: `role="alert"`, `aria-live="assertive"`
- [ ] Notification content read aloud
- [ ] Dismissed notifications not announced again

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending (Optional)

---

### 15. Edge Case - Rapid Notifications

**Test ID:** NT-015
**Priority:** Medium
**Objective:** Verify system handles rapid notification triggers

#### Test Steps:
1. Trigger 10+ notifications in quick succession (<1 second apart)
2. Observe behavior

#### Expected Results:
- [ ] No crashes or errors
- [ ] Queue maintains max 3 visible
- [ ] Older notifications dismissed properly
- [ ] No memory leaks (check DevTools Memory tab)
- [ ] Performance remains smooth

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 16. Edge Case - Offline/Online Transitions

**Test ID:** NT-016
**Priority:** Medium
**Objective:** Verify notifications during network state changes

#### Test Steps:
1. Start with online state
2. Trigger notification (success)
3. Go offline
4. Trigger API call (should fail)
5. Go back online
6. Trigger notification (success)

#### Expected Results:
- [ ] Online notifications work normally
- [ ] Offline API calls show network error notification
- [ ] Online notifications work after reconnection
- [ ] No stale notifications from offline state

#### Actual Results:
```
[To be filled during testing]
```

#### Status: ⏳ Pending

---

### 17. Animation Smoothness

**Test ID:** NT-017
**Priority:** Medium
**Objective:** Verify animations are smooth without jank

#### Test Steps:
1. Trigger notification
2. Observe slide-down animation
3. Observe fade-out animation
4. Record FPS in DevTools Performance tab

#### Expected Results:
- [ ] Slide-down animation smooth (60 FPS)
- [ ] Fade-out animation smooth
- [ ] No visual stuttering
- [ ] CSS transitions use GPU acceleration
- [ ] No layout thrashing

#### Actual Results:
```
FPS during animation: ___ fps
Smoothness rating: [Excellent/Good/Fair/Poor]
```

#### Status: ⏳ Pending

---

### 18. Bundle Size Verification

**Test ID:** NT-018
**Priority:** High
**Objective:** Verify notification system doesn't bloat bundle

#### Test Steps:
1. Run `npm run build`
2. Check bundle size in output
3. Compare to baseline (192 KB before notifications)

#### Expected Results:
- [ ] Total bundle size < 250 KB
- [ ] Notification system adds < 10 KB
- [ ] No unexpected dependencies bundled
- [ ] Tree-shaking working correctly

#### Actual Results:
```
Bundle size before: 192 KB
Bundle size after: ___ KB
Increase: ___ KB
Status: [Pass/Fail]
```

#### Status: ⏳ Pending

---

## Test Summary

### Defects Found

| ID | Severity | Description | Status |
|----|----------|-------------|--------|
| - | - | - | - |

### Test Coverage

| Category | Total Tests | Passed | Failed | Skipped |
|----------|-------------|--------|--------|---------|
| Queue Behavior | 1 | - | - | - |
| Notification Types | 4 | - | - | - |
| Dismiss Functionality | 2 | - | - | - |
| Cross-Screen | 1 | - | - | - |
| API Errors | 1 | - | - | - |
| Real User Flows | 1 | - | - | - |
| Mobile | 1 | - | - | - |
| Accessibility | 2 | - | - | - |
| Edge Cases | 2 | - | - | - |
| Performance | 2 | - | - | - |
| **TOTAL** | **18** | **-** | **-** | **-** |

---

## Recommendations

### Critical Issues (Must Fix Before Production)
```
[To be filled after testing]
```

### Non-Critical Issues (Nice to Have)
```
[To be filled after testing]
```

### Performance Optimizations
```
[To be filled after testing]
```

---

## Sign-Off

**Tested By:** ___________________
**Date:** ___________________
**Overall Status:** [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS

**Notes:**
```
[Final comments and observations]
```

---

## Next Steps

- [ ] Fix any critical bugs found
- [ ] Document test results in IMPLEMENTATION_STATUS.md
- [ ] Prepare for Phase 4 (Skip Items UI) when backend ready
- [ ] Consider additional automated tests if needed
