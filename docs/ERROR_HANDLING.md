# Error Handling Strategy

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Status:** Draft

---

## 🎯 Overview

This document defines error handling patterns, user-facing messages, and recovery strategies for the LocalLoops platform.

**Philosophy:** Errors should be helpful, actionable, and never block the user completely.

---

## 📊 Error Categories

### 1. User Errors (4xx)
Mistakes made by users that can be corrected.

### 2. System Errors (5xx)
Issues with our infrastructure or third-party services.

### 3. Network Errors
Connection issues, timeouts, offline scenarios.

### 4. Validation Errors
Input doesn't meet requirements.

---

## 🔴 Error Codes & Messages

### Session Errors

| Code | User Message | Dev Message | Action |
|------|--------------|-------------|---------|
| `SESSION_NOT_FOUND` | "This session doesn't exist. Check the link?" | "Session {id} not found in database" | Offer to create new session |
| `SESSION_EXPIRED` | "This session ended. Want to create a new one?" | "Session {id} expired at {timestamp}" | Show "Create New" button |
| `SESSION_FULL` | "This session is full (4/4). Ask host to upgrade to Pro." | "Participant limit reached for free session" | Show upgrade option |
| `SESSION_LOCKED` | "Shopping has started. Can't join now." | "Session {id} in 'shopping' status" | Show session status |

### Item Errors

| Code | User Message | Dev Message | Action |
|------|--------------|-------------|---------|
| `ITEM_NOT_FOUND` | "This item isn't available. Try another?" | "Item {id} not in catalog" | Suggest similar items |
| `CAPACITY_EXCEEDED` | "Can't add more. 10kg limit reached." | "Total weight {weight}kg > 10kg" | Show current weight |
| `INVALID_QUANTITY` | "Quantity must be 0.5kg or more" | "Quantity {qty} < minimum 0.5" | Reset to minimum |

### Order Errors

| Code | User Message | Dev Message | Action |
|------|--------------|-------------|---------|
| `ORDER_LOCKED` | "Your order is locked. Can't change now." | "Participant {id} order locked" | Show locked status |
| `ORDER_EMPTY` | "Add at least one item first" | "No items in order" | Focus on catalog |
| `NOT_HOST` | "Only the host can do this" | "User {id} is not session creator" | Hide host actions |

### Payment Errors

| Code | User Message | Dev Message | Action |
|------|--------------|-------------|---------|
| `PAYMENT_INCOMPLETE` | "Record payments for all items first" | "Unpaid items: {list}" | Highlight unpaid items |
| `INVALID_AMOUNT` | "Amount must be greater than ₹0" | "Payment amount {amt} invalid" | Clear input field |
| `PAYMENT_FAILED` | "Couldn't record payment. Try again?" | "Payment insert failed: {error}" | Retry button |

### Auth Errors

| Code | User Message | Dev Message | Action |
|------|--------------|-------------|---------|
| `INVALID_OTP` | "Incorrect code. Try again?" | "OTP mismatch for {phone}" | Resend option |
| `OTP_EXPIRED` | "Code expired. Request a new one?" | "OTP expired at {timestamp}" | Show resend |
| `RATE_LIMITED` | "Too many attempts. Wait 1 minute." | "Rate limit exceeded for {phone}" | Show countdown timer |
| `NOT_AUTHORIZED` | "Sign in to access this feature" | "Invalid/missing JWT token" | Redirect to sign-in |

### Network Errors

| Code | User Message | Dev Message | Action |
|------|--------------|-------------|---------|
| `NETWORK_ERROR` | "Connection lost. Retrying..." | "WebSocket disconnected" | Auto-retry with backoff |
| `TIMEOUT` | "Taking too long. Check your connection?" | "Request timeout after {ms}ms" | Retry button |
| `OFFLINE` | "You're offline. Changes will sync when back online." | "navigator.onLine = false" | Queue changes |

---

## 💬 User-Facing Error Messages

### Principles
1. **Be specific** - "Session full (4/4)" not "Error 403"
2. **Suggest action** - "Try again?" not just "Failed"
3. **Stay positive** - "Almost there!" not "Invalid input"
4. **Use plain language** - No technical jargon
5. **Show context** - "Can't add more. 10kg limit" not just "Limit reached"

### Template Structure
```javascript
{
  title: "Brief problem", // Session expired
  message: "What happened + action", // This session ended. Create new?
  action: "Call to action", // Create New Session
  icon: "😕" // Optional emoji
}
```

### Examples

**Good ✅**
```
Session Full (4/4)

This session hit the free tier limit. 
The host can upgrade to Pro for unlimited participants.

[Maybe Later]  [Tell Host]
```

**Bad ❌**
```
Error: MAX_PARTICIPANTS_EXCEEDED

Session participant_count = 4, limit = 4.
Contact administrator.

[OK]
```

---

## 🔧 Error Handling Patterns

### 1. Validation Errors (Immediate)
Show inline, near the input field.

```javascript
// Email validation
if (!email.includes('@')) {
  showError({
    field: 'email',
    message: 'Email needs an @ symbol',
    type: 'inline'
  });
}
```

**UI:**
```
[ email@example    ] ← red border
  ⚠️ Email needs an @ symbol
```

### 2. Action Errors (Modal)
Show modal for failed actions.

```javascript
try {
  await createSession(data);
} catch (error) {
  showErrorModal({
    title: 'Couldn't create session',
    message: error.message,
    actions: [
      { label: 'Try Again', onClick: retry },
      { label: 'Cancel', onClick: close }
    ]
  });
}
```

### 3. Network Errors (Toast/Banner)
Non-blocking notifications.

```javascript
socket.on('disconnect', () => {
  showToast({
    message: 'Connection lost. Reconnecting...',
    type: 'warning',
    duration: null // stays until reconnected
  });
});

socket.on('connect', () => {
  hideToast();
  showToast({
    message: 'Back online!',
    type: 'success',
    duration: 3000
  });
});
```

### 4. Critical Errors (Full Screen)
Block interaction until resolved.

```javascript
if (criticalError) {
  showFullScreenError({
    title: 'Something went wrong',
    message: 'We couldn't load the session. Please try refreshing.',
    icon: '🚨',
    actions: [
      { label: 'Refresh Page', onClick: () => location.reload() },
      { label: 'Go Home', onClick: () => navigate('/') }
    ]
  });
}
```

---

## 🔄 Recovery Strategies

### Auto-Retry with Backoff
```javascript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usage
await retryWithBackoff(() => api.joinSession(sessionId));
```

### Offline Queue
```javascript
class OfflineQueue {
  constructor() {
    this.queue = [];
  }

  add(action) {
    this.queue.push(action);
    localStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }

  async processQueue() {
    while (this.queue.length > 0) {
      const action = this.queue[0];
      try {
        await action.execute();
        this.queue.shift();
      } catch (error) {
        break; // Stop if any action fails
      }
    }
    localStorage.setItem('offline_queue', JSON.stringify(this.queue));
  }
}

// Usage
window.addEventListener('online', () => {
  offlineQueue.processQueue();
});
```

### Graceful Degradation
```javascript
// Try WebSocket, fallback to polling
function connectRealtime(sessionId) {
  try {
    return new WebSocketConnection(sessionId);
  } catch (error) {
    console.warn('WebSocket failed, using polling');
    return new PollingConnection(sessionId, 5000);
  }
}
```

---

## 🎨 UI Components

### Error Toast
```jsx
<Toast type="error" duration={5000}>
  <div className="flex items-center gap-3">
    <span className="text-2xl">⚠️</span>
    <div>
      <p className="font-medium">Couldn't save changes</p>
      <p className="text-sm text-gray-600">Check your connection</p>
    </div>
    <button onClick={retry}>Retry</button>
  </div>
</Toast>
```

### Error Modal
```jsx
<Modal show={showError}>
  <div className="text-center p-6">
    <span className="text-6xl mb-4">😕</span>
    <h2 className="text-2xl mb-2">Session Full</h2>
    <p className="text-gray-600 mb-6">
      This session reached the free tier limit (4 participants). 
      The host can upgrade to Pro for unlimited participants.
    </p>
    <div className="flex gap-3">
      <button onClick={close}>Maybe Later</button>
      <button onClick={tellHost} className="bg-black text-white">
        Tell Host
      </button>
    </div>
  </div>
</Modal>
```

### Inline Error
```jsx
<div className="mb-4">
  <input 
    className={`border-2 ${error ? 'border-red-500' : 'border-gray-300'}`}
    value={quantity}
    onChange={handleChange}
  />
  {error && (
    <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
      <span>⚠️</span> {error.message}
    </p>
  )}
</div>
```

---

## 📝 Logging Strategy

### What to Log
```javascript
// 1. All errors
logger.error('Session creation failed', {
  error: error.message,
  stack: error.stack,
  user_id: userId,
  session_data: data
});

// 2. Critical user actions
logger.info('Session created', {
  session_id: sessionId,
  participant_count: 1,
  session_type: 'minibag'
});

// 3. Performance issues
if (responseTime > 1000) {
  logger.warn('Slow API response', {
    endpoint: '/api/sessions',
    duration: responseTime
  });
}
```

### Log Levels
- **ERROR:** Something failed
- **WARN:** Potential issue
- **INFO:** Important events
- **DEBUG:** Detailed info (dev only)

### Log Format
```json
{
  "timestamp": "2025-10-13T15:30:00Z",
  "level": "ERROR",
  "message": "Session creation failed",
  "user_id": "u_12345",
  "session_id": "abc123",
  "error": {
    "code": "CAPACITY_EXCEEDED",
    "message": "Total weight 12kg > 10kg limit"
  },
  "context": {
    "browser": "Chrome 118",
    "platform": "Android",
    "app_version": "1.0.0"
  }
}
```

---

## 🧪 Testing Error Scenarios

### Unit Tests
```javascript
describe('Session Creation', () => {
  it('should fail when capacity exceeded', async () => {
    const data = { items: [{ id: 'v001', quantity: 15 }] };
    
    await expect(createSession(data)).rejects.toThrow('CAPACITY_EXCEEDED');
  });

  it('should show user-friendly message', () => {
    const error = new SessionError('CAPACITY_EXCEEDED');
    expect(error.userMessage).toBe("Can't add more. 10kg limit reached.");
  });
});
```

### Integration Tests
```javascript
test('Handles network failure gracefully', async () => {
  // Simulate network failure
  server.down();
  
  const result = await api.createSession(data);
  
  expect(toast.message).toBe('Connection lost. Retrying...');
  expect(result.queued).toBe(true);
});
```

---

## 📊 Monitoring

### Key Metrics
- **Error rate:** Errors per 100 requests
- **Error types:** Distribution by error code
- **Recovery rate:** Auto-retry success rate
- **User impact:** % of users seeing errors

### Alerts
```javascript
// Critical: > 5% error rate
if (errorRate > 0.05) {
  alert.send('High error rate detected', {
    current: errorRate,
    threshold: 0.05,
    time_window: '5 minutes'
  });
}

// Warning: Same error from multiple users
if (errorCount['SESSION_FULL'] > 10) {
  alert.send('Multiple SESSION_FULL errors', {
    count: 10,
    suggestion: 'Check session capacity logic'
  });
}
```

---

## ✅ Best Practices

1. **Always provide context** - Error messages should explain what happened
2. **Suggest next steps** - Tell user what they can do
3. **Log everything** - Can't debug what you don't log
4. **Fail gracefully** - Never show white screen
5. **Auto-retry smartly** - Backoff, don't hammer server
6. **Queue when offline** - Don't lose user data
7. **Monitor actively** - Catch errors before users report
8. **Test error paths** - Happy path + error path coverage

---

## 🔄 Version History

- **1.0.0** (Oct 13, 2025): Initial error handling strategy
