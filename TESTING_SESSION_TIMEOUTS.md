# Session Timeout Testing Guide

This guide helps you verify that all session timeout and lifecycle features are working correctly after the recent updates.

## Summary of Changes

1. ✅ **Session expiry standardized to 2 hours** (was inconsistent 2-4 hours)
2. ✅ **UI text updated** to show "2 hour session"
3. ✅ **localStorage cleanup** aligned to 2 hours
4. ✅ **API expiry validation** added to prevent actions on expired sessions
5. ✅ **Database maintenance** documentation created

## What Already Works (No Testing Needed)

These features were already implemented and verified:
- ✅ Participant decline button ("No thanks, maybe next time")
- ✅ 20-minute participant auto-timeout
- ✅ Checkpoint mechanism for "Start Shopping" button
- ✅ Opportunistic cleanup of abandoned sessions

## Testing Checklist

### Test 1: Verify 2-Hour Session Expiry is Set Correctly

**Goal**: Confirm new sessions are created with 2-hour expiry

**Steps**:
1. Create a new session
2. Note the `scheduled_time` displayed
3. Check the database to verify `expires_at` is exactly 2 hours after `scheduled_time`:

```sql
SELECT
  session_id,
  scheduled_time,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - scheduled_time))/3600 as hours_difference
FROM sessions
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Result**: `hours_difference` should be exactly `2.0`

---

### Test 2: Verify UI Shows "2 Hour Session"

**Goal**: Confirm the UI displays the correct timeout

**Steps**:
1. Create or open a session
2. Look for the session duration indicator (near the clock icon)

**Expected Result**: Should display "2 hour session" (not "4 hour session")

**Locations to Check**:
- Session active screen (when host views session)
- Participant view (when participant joins)

---

### Test 3: Verify Session Expiry Enforcement (Join Prevention)

**Goal**: Confirm participants cannot join expired sessions

**Steps**:
1. Create a test session with a past scheduled time OR manually update a session in the database:

```sql
-- Create a session that expired 1 hour ago
UPDATE sessions
SET
  scheduled_time = NOW() - INTERVAL '3 hours',
  expires_at = NOW() - INTERVAL '1 hour'
WHERE session_id = 'YOUR_SESSION_ID';
```

2. Try to join the session using the invite link
3. Observe the error message

**Expected Result**:
- HTTP 410 status code
- Error message: "This session has expired. Sessions are only valid for 2 hours after the scheduled time."
- Error code: `SESSION_EXPIRED`

---

### Test 4: Verify Session Expiry Flag in API Response

**Goal**: Confirm the API returns expiry status

**Steps**:
1. Use browser DevTools or curl to call the session API:

```bash
curl https://your-domain/api/sessions/YOUR_SESSION_ID
```

2. Check the response JSON for `is_session_expired` field

**Expected Result**:
- For active sessions: `"is_session_expired": false`
- For expired sessions: `"is_session_expired": true`

---

### Test 5: Verify Status Update Prevention on Expired Sessions

**Goal**: Confirm host cannot change status of expired sessions

**Steps**:
1. Create a test session and manually expire it (see Test 3)
2. Try to update the session status via API:

```bash
curl -X PATCH https://your-domain/api/sessions/YOUR_SESSION_ID/status \
  -H "Content-Type: application/json" \
  -H "x-host-token: YOUR_HOST_TOKEN" \
  -d '{"status": "shopping"}'
```

**Expected Result**:
- HTTP 410 status code
- Error message: "Cannot update expired session. Sessions expire 2 hours after scheduled time."
- Error code: `SESSION_EXPIRED`

---

### Test 6: Verify localStorage Cleanup After 2 Hours

**Goal**: Confirm browser localStorage clears sessions after 2 hours

**Steps**:
1. Create and join a session
2. Check browser localStorage (DevTools > Application > Local Storage):
   - Should see session data with timestamp
3. Manually modify the timestamp to be 2.5 hours ago:

```javascript
// In browser console:
const key = 'minibag_session'; // or your storage key
const data = JSON.parse(localStorage.getItem(key));
data.timestamp = Date.now() - (2.5 * 60 * 60 * 1000); // 2.5 hours ago
localStorage.setItem(key, JSON.stringify(data));
```

4. Refresh the page

**Expected Result**: Session data should be cleared from localStorage and user redirected to home

---

### Test 7: Verify Participant Decline Still Works

**Goal**: Confirm decline functionality is unchanged

**Steps**:
1. Create a session with expected participants set to 2-3
2. Open invite link as participant
3. Click "No thanks, maybe next time" button

**Expected Result**:
- Participant marked with `marked_not_coming: true` in database
- Host sees decline counted toward checkpoint
- User redirected to home page

---

### Test 8: Verify 20-Minute Invite Timeout Still Works

**Goal**: Confirm invite expiry is unchanged

**Steps**:
1. Create a session
2. Set expected participants to 2 or 3
3. Wait 20+ minutes OR manually update database:

```sql
UPDATE sessions
SET expected_participants_set_at = NOW() - INTERVAL '21 minutes'
WHERE session_id = 'YOUR_SESSION_ID';
```

4. Try to join using invite link

**Expected Result**:
- HTTP 410 status code
- Error message mentions "20-minute timeout"
- Error code: `INVITE_EXPIRED`

---

### Test 9: Verify Checkpoint Mechanism Still Works

**Goal**: Confirm start shopping button enables correctly

**Steps**:
1. Create session
2. Set expected participants to 2
3. Have participants join/decline until checkpoint complete
4. Verify "Start Shopping" button becomes enabled
5. Verify cannot start shopping before checkpoint complete

**Expected Result**:
- Button disabled when: `(joined + declined + timed-out) < expected`
- Button enabled when: checkpoint complete AND all joined participants confirmed items
- Clear status indicator shows progress

---

### Test 10: Manual Database Cleanup

**Goal**: Verify cleanup function works

**Steps**:
1. Create a few test sessions in 'open' status
2. Manually age them in database:

```sql
UPDATE sessions
SET created_at = NOW() - INTERVAL '25 hours'
WHERE session_id IN ('TEST_SESSION_1', 'TEST_SESSION_2');
```

3. Run cleanup function:

```sql
SELECT * FROM cleanup_expired_sessions();
```

4. Verify sessions were deleted:

```sql
SELECT session_id, status, created_at
FROM sessions
WHERE session_id IN ('TEST_SESSION_1', 'TEST_SESSION_2');
```

**Expected Result**: Test sessions should be deleted (no rows returned)

---

## Quick Smoke Test (5 Minutes)

For a quick verification that everything works:

1. ✅ Create a new session → check UI shows "2 hour session"
2. ✅ Set expected participants → verify countdown/checkpoint works
3. ✅ Have someone join and click decline → verify counted toward checkpoint
4. ✅ Check database: `expires_at - scheduled_time = 2 hours`
5. ✅ Create session, manually expire it in DB, try to join → verify rejection

## Database Queries for Verification

### Check Recent Sessions

```sql
SELECT
  session_id,
  status,
  scheduled_time,
  expires_at,
  EXTRACT(EPOCH FROM (expires_at - scheduled_time))/3600 as expiry_hours,
  created_at
FROM sessions
ORDER BY created_at DESC
LIMIT 10;
```

### Check for Expired Sessions Still Active

```sql
SELECT
  session_id,
  status,
  scheduled_time,
  expires_at,
  NOW() > expires_at as is_expired
FROM sessions
WHERE NOW() > expires_at
AND status NOT IN ('expired', 'completed', 'cancelled');
```

### Check Participant Timeout Status

```sql
SELECT
  s.session_id,
  s.expected_participants,
  s.expected_participants_set_at,
  COUNT(p.id) FILTER (WHERE p.marked_not_coming = false) as joined_count,
  COUNT(p.id) FILTER (WHERE p.marked_not_coming = true) as declined_count,
  EXTRACT(EPOCH FROM (NOW() - s.expected_participants_set_at))/60 as minutes_elapsed
FROM sessions s
LEFT JOIN participants p ON s.id = p.session_id
WHERE s.expected_participants IS NOT NULL
GROUP BY s.session_id, s.expected_participants, s.expected_participants_set_at
ORDER BY s.created_at DESC;
```

## Troubleshooting

### Issue: Sessions still showing 4-hour expiry

**Solution**:
1. Restart the application to reload the updated code
2. Check that `packages/shared/api/sessions/create.js` line 31 shows `2 * 60 * 60 * 1000`
3. Clear any cached sessions

### Issue: UI still shows "4 hour session"

**Solution**:
1. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+F5)
2. Clear browser cache
3. Verify `SessionActiveScreen.jsx` was updated correctly

### Issue: Expired sessions still accepting joins

**Solution**:
1. Check that `isSessionExpired()` function exists in `packages/shared/api/sessions.js`
2. Verify the function is being called in `joinSession()` around line 506
3. Check server logs for errors

### Issue: localStorage not clearing

**Solution**:
1. Verify `useSession.js` shows `twoHours = 2 * 60 * 60 * 1000`
2. Check browser console for JavaScript errors
3. Manually clear localStorage and test again

## Files Modified

Reference for verification:

1. `packages/shared/api/sessions/create.js` - Line 31 (2-hour expiry)
2. `packages/minibag/src/screens/SessionActiveScreen.jsx` - Lines 160, 358 (UI text)
3. `packages/minibag/src/hooks/useSession.js` - Lines 77-79 (localStorage)
4. `packages/shared/api/sessions.js` - Lines 47-50, 431, 459, 506-511, 671-677 (expiry validation)

## Success Criteria

All tests pass when:
- ✅ New sessions expire exactly 2 hours after scheduled time
- ✅ UI consistently shows "2 hour session"
- ✅ Expired sessions reject join attempts with proper error
- ✅ Expired sessions reject status updates with proper error
- ✅ API returns `is_session_expired` flag correctly
- ✅ localStorage clears after 2 hours
- ✅ Decline button still works
- ✅ 20-minute invite timeout still works
- ✅ Checkpoint mechanism still works
- ✅ Manual cleanup function works

## Next Steps After Testing

Once all tests pass:
1. Consider enabling pg_cron for automated cleanup (see DATABASE_MAINTENANCE.md)
2. Monitor production sessions for the first few days
3. Review session analytics to confirm timeout behavior is as expected
4. Update user-facing documentation about session duration
