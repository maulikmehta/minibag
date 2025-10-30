# API Documentation

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Base URL:** `https://api.minibag.in` (Production) | `http://localhost:3000` (Development)

---

## 🎯 Overview

LocalLoops uses a **hybrid API approach**:
- **Primary:** WebSocket (Socket.io) for real-time session coordination
- **Secondary:** REST API for catalog, authentication, static data

---

## 🔌 WebSocket API

### Connection Setup

```javascript
import { io } from 'socket.io-client';

const socket = io('https://ws.minibag.in', {
  auth: {
    token: userToken // Optional for authenticated users
  },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

### Event Reference

#### **Client → Server Events**

##### `create-session`
Creates a new coordination session.

```javascript
socket.emit('create-session', {
  session_type: 'minibag', // Required: minibag, partybag, fitbag
  location_text: 'Building A, Gate 2',
  scheduled_time: '2025-10-14T18:00:00Z',
  creator_nickname: 'Raj', // Optional, auto-generated if missing
  items: [
    { item_id: 'v001', quantity: 2, unit: 'kg' }
  ],
  is_pro: false
});

// Response
socket.on('session-created', (data) => {
  console.log(data);
  // {
  //   success: true,
  //   session_id: 'abc123',
  //   short_url: 'minibag.in/abc123',
  //   creator_nickname: 'Raj',
  //   expires_at: '2025-10-14T20:00:00Z'
  // }
});
```

##### `join-session`
Join an existing session as participant.

```javascript
socket.emit('join-session', {
  session_id: 'abc123',
  nickname: 'Maya' // Optional, auto-generated
});

socket.on('session-joined', (data) => {
  // {
  //   participant_id: 'p_12345',
  //   nickname: 'Maya',
  //   session: { ...sessionData }
  // }
});
```

##### `add-item`
Add item to participant's order.

```javascript
socket.emit('add-item', {
  session_id: 'abc123',
  participant_id: 'p_12345',
  item_id: 'v001',
  quantity: 2.5,
  unit: 'kg',
  notes: 'Extra ripe please'
});

socket.on('item-added', (data) => {
  // { success: true, item: {...} }
});
```

##### `update-item`
Update item quantity.

```javascript
socket.emit('update-item', {
  session_id: 'abc123',
  item_id: 'item_uuid',
  quantity: 3.0
});
```

##### `remove-item`
Remove item from order.

```javascript
socket.emit('remove-item', {
  session_id: 'abc123',
  item_id: 'item_uuid'
});
```

##### `lock-order`
Lock participant's order (no more changes).

```javascript
socket.emit('lock-order', {
  session_id: 'abc123',
  participant_id: 'p_12345'
});

socket.on('order-locked', (data) => {
  // { success: true, participant_id: 'p_12345' }
});
```

##### `start-shopping`
Host starts shopping (changes session status).

```javascript
socket.emit('start-shopping', {
  session_id: 'abc123'
});
```

##### `record-payment`
Record payment for item (host only).

```javascript
socket.emit('record-payment', {
  session_id: 'abc123',
  item_id: 'v001',
  amount: 120,
  method: 'upi', // upi or cash
  vendor_name: 'Ramesh Vegetables'
});
```

##### `complete-shopping`
Mark shopping as complete, calculate splits.

```javascript
socket.emit('complete-shopping', {
  session_id: 'abc123'
});

socket.on('shopping-completed', (data) => {
  // {
  //   total_spent: 420,
  //   host_cost: 145,
  //   participant_bills: [
  //     { participant_id: 'p_12345', amount: 145, items: [...] }
  //   ]
  // }
});
```

##### `leave-session`
Leave session (participant).

```javascript
socket.emit('leave-session', {
  session_id: 'abc123',
  participant_id: 'p_12345'
});
```

---

#### **Server → Client Events**

##### `session-updated`
Broadcast whenever session data changes.

```javascript
socket.on('session-updated', (session) => {
  // Full session object with updated data
  console.log('Participants:', session.participant_count);
  console.log('Total weight:', session.total_demand_value);
});
```

##### `participant-joined`
New participant joined.

```javascript
socket.on('participant-joined', (data) => {
  // { nickname: 'Amit', participant_id: 'p_67890', joined_at: '...' }
});
```

##### `participant-left`
Participant left session.

```javascript
socket.on('participant-left', (data) => {
  // { participant_id: 'p_67890', nickname: 'Amit' }
});
```

##### `item-updated`
Item quantity/details changed.

```javascript
socket.on('item-updated', (data) => {
  // { participant_id: 'p_12345', item: {...} }
});
```

##### `status-changed`
Session status changed (open → shopping → completed).

```javascript
socket.on('status-changed', (data) => {
  // { session_id: 'abc123', old_status: 'open', new_status: 'shopping' }
});
```

##### `error`
Error occurred.

```javascript
socket.on('error', (error) => {
  // { code: 'SESSION_FULL', message: 'This session is full (4/4 participants)' }
});
```

---

## 🌐 REST API

### Authentication

```javascript
// Get auth token (phone OTP)
POST /api/auth/send-otp
{
  "phone": "+919876543210"
}

// Response: { success: true, expires_in: 600 }

POST /api/auth/verify-otp
{
  "phone": "+919876543210",
  "otp": "123456"
}

// Response: { success: true, token: "jwt_token_here", user: {...} }
```

### Catalog API

#### Get Catalog Items
```javascript
GET /api/catalog/items?session_type=minibag&category_id=vegetables

// Response:
{
  success: true,
  session_type: "minibag",
  items: [
    {
      id: "v001",
      name: "Tomatoes",
      name_gu: "ટામેટાં",
      name_hi: "टमाटर",
      thumbnail_url: "/img/vegetables/tomatoes.jpg",
      unit: "kg",
      base_price: 40,
      bulk_price: 35,
      category_id: "vegetables",
      popular: true
    }
  ],
  categories: [...]
}
```

#### Search Catalog
```javascript
GET /api/catalog/search?session_type=minibag&query=tomato

// Same response format as items
```

#### Get Featured Items
```javascript
GET /api/catalog/featured?session_type=minibag&limit=8

// Returns popular items only
```

### Session API (REST - for non-real-time operations)

#### Get Session Details
```javascript
GET /api/sessions/:sessionId

// Response:
{
  success: true,
  session: {
    session_id: "abc123",
    status: "open",
    participant_count: 3,
    total_demand_value: 450,
    expires_at: "2025-10-14T20:00:00Z",
    ...
  }
}
```

#### Get Past Sessions (authenticated)
```javascript
GET /api/sessions/my-sessions?limit=20&offset=0

// Response:
{
  success: true,
  sessions: [...],
  total: 45,
  has_more: true
}
```

### User API (authenticated)

#### Get Profile
```javascript
GET /api/users/profile

// Response:
{
  success: true,
  user: {
    user_id: "u_12345",
    phone: "+919876543210",
    is_pro: false,
    sessions_created: 12,
    total_saved: 2400,
    joined_at: "2025-09-01T00:00:00Z"
  }
}
```

#### Upgrade to Pro
```javascript
POST /api/users/upgrade-pro
{
  "payment_id": "razorpay_payment_id"
}

// Response:
{
  success: true,
  subscription: {
    status: "active",
    expires_at: "2025-11-13T00:00:00Z"
  }
}
```

---

## 🔒 Authentication

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Token Format
```javascript
{
  user_id: "u_12345",
  phone: "+919876543210",
  is_pro: false,
  iat: 1697203200,
  exp: 1697289600
}
```

---

## 📊 Response Formats

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "SESSION_FULL",
    "message": "This session is full (4/4 participants)",
    "details": { ... }
  }
}
```

---

## ⚠️ Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `SESSION_NOT_FOUND` | 404 | Session doesn't exist |
| `SESSION_EXPIRED` | 410 | Session has expired |
| `SESSION_FULL` | 403 | Max participants reached (free tier) |
| `INVALID_SESSION_TYPE` | 400 | Invalid session type provided |
| `INVALID_ITEM` | 400 | Item not in catalog |
| `CAPACITY_EXCEEDED` | 400 | Exceeds bag capacity (10kg) |
| `NOT_AUTHORIZED` | 401 | Invalid or missing token |
| `NOT_SESSION_HOST` | 403 | Only host can perform this action |
| `ORDER_LOCKED` | 400 | Can't modify locked order |
| `INVALID_PAYMENT_METHOD` | 400 | Payment method must be 'upi' or 'cash' |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVER_ERROR` | 500 | Internal server error |

---

## 🔥 Rate Limiting

### Limits
- **WebSocket connections:** 1 per user per session
- **REST API:** 60 requests/minute per IP (free), 300/minute (Pro)
- **Session creation:** 5/hour per user (free), 20/hour (Pro)

### Headers
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1697203800
```

---

## 🧪 Testing Endpoints

### Health Check
```javascript
GET /api/health

// Response:
{
  status: "ok",
  timestamp: "2025-10-13T15:30:00Z",
  version: "1.0.0"
}
```

### Test Session Creation (development only)
```javascript
POST /api/test/create-session
{
  "preset": "vegetables_3_participants"
}

// Returns fully populated test session
```

---

## 📱 Client Implementation Example

```javascript
class MinibagAPI {
  constructor() {
    this.socket = null;
    this.token = localStorage.getItem('auth_token');
  }

  connect() {
    this.socket = io('https://ws.minibag.in', {
      auth: { token: this.token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
    });

    this.socket.on('session-updated', (session) => {
      // Update UI
    });

    this.socket.on('error', (error) => {
      // Handle error
    });
  }

  createSession(data) {
    return new Promise((resolve, reject) => {
      this.socket.emit('create-session', data);
      
      this.socket.once('session-created', resolve);
      this.socket.once('error', reject);
    });
  }

  async getCatalog(sessionType) {
    const response = await fetch(
      `/api/catalog/items?session_type=${sessionType}`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    return response.json();
  }
}

// Usage
const api = new MinibagAPI();
api.connect();

const session = await api.createSession({
  session_type: 'minibag',
  location_text: 'Building A',
  scheduled_time: new Date().toISOString()
});
```

---

## 🔄 Version History

- **1.0.0** (Oct 13, 2025): Initial API documentation
