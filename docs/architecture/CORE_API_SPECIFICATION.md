# Core Infrastructure API Specification

**Version:** 1.0
**Last Updated:** 2025-11-01
**Status:** Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [API Design Principles](#api-design-principles)
3. [Authentication](#authentication)
4. [Identity Layer API](#identity-layer-api)
5. [Catalog Layer API](#catalog-layer-api)
6. [Events Layer API](#events-layer-api)
7. [Common Patterns](#common-patterns)
8. [Error Handling](#error-handling)
9. [Rate Limiting](#rate-limiting)
10. [Versioning Strategy](#versioning-strategy)

---

## Overview

### Purpose

The LocalLoops Core Infrastructure provides **3 essential API layers** that all apps (Minibag, StreetHawk, Fitbag, Partybag) will consume:

1. **Identity Layer:** User authentication, profiles, cross-app identity
2. **Catalog Layer:** Item catalog, categories, multilingual search
3. **Events Layer:** Real-time events, notifications, coordination

### Architecture

```
┌─────────────────────────────────────────────┐
│  Apps (Minibag, StreetHawk, etc.)          │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Core Infrastructure API                    │
│  ┌─────────────┬─────────────┬────────────┐│
│  │  Identity   │  Catalog    │  Events    ││
│  │  Layer      │  Layer      │  Layer     ││
│  └─────────────┴─────────────┴────────────┘│
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│  Database (Supabase PostgreSQL)             │
└─────────────────────────────────────────────┘
```

### Base URL

**Development:** `http://localhost:3000/api`
**Production:** `https://api.localloops.in/api`

---

## API Design Principles

### 1. RESTful Conventions

**Resource Naming:**
- Plural nouns: `/users`, `/items`, `/sessions`
- Kebab-case: `/catalog-categories`, `/user-profiles`
- No verbs: `/create-user` ❌ → `/users` ✅

**HTTP Methods:**
- `GET` - Read resources
- `POST` - Create resources
- `PUT/PATCH` - Update resources
- `DELETE` - Delete resources

---

### 2. App-Scoped Requests

**Every API request includes the app identifier:**

**Header-Based (Preferred):**
```http
GET /api/catalog/items
X-App-ID: minibag
X-App-Secret: <app_secret>
Authorization: Bearer <jwt_token>
```

**Query Parameter (Fallback):**
```http
GET /api/catalog/items?app_id=minibag
```

**Why:** Enables app-specific filtering (e.g., items available only in Minibag vs StreetHawk)

---

### 3. Consistent Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-11-01T10:30:00Z",
    "requestId": "abc123"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "ITEM_NOT_FOUND",
    "message": "Item with ID 123 not found",
    "details": { ... }
  },
  "meta": {
    "timestamp": "2025-11-01T10:30:00Z",
    "requestId": "abc123"
  }
}
```

---

### 4. Pagination

**Request:**
```http
GET /api/catalog/items?page=2&limit=20
```

**Response:**
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 145,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  }
}
```

**Defaults:**
- `limit`: 50 (max: 100)
- `page`: 1

---

## Authentication

### Overview

**Authentication Flow:**
1. User enters phone number
2. Backend sends OTP via MSG91
3. User enters OTP
4. Backend verifies OTP → Issues JWT token
5. Client includes JWT in all subsequent requests

### Phase 0: Session-Based (Current)

**No persistent authentication yet.** Users identified by:
- Session host: `host_token` (stored in localStorage)
- Session participants: `participant_id` (stored in localStorage)

**Future:** Migrate to JWT-based auth (see Phase 1 below)

---

### Phase 1: JWT-Based Auth (Future)

#### POST /api/auth/otp/send

**Send OTP to phone number**

**Request:**
```json
{
  "phone": "+919876543210",
  "app_id": "minibag"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "otpSent": true,
    "expiresIn": 300,
    "masked_phone": "+91*****3210"
  }
}
```

**Business Logic:**
- Generate 6-digit OTP
- Send via MSG91
- Store in database with 5-minute expiry
- Rate limit: Max 3 OTPs per phone per hour

---

#### POST /api/auth/otp/verify

**Verify OTP and create/login user**

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456",
  "app_id": "minibag"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "phone": "+919876543210",
      "displayName": null,
      "createdAt": "2025-11-01T10:00:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 2592000,
    "appProfile": {
      "app_id": "minibag",
      "app_role": "user",
      "preferences": {}
    }
  }
}
```

**JWT Payload:**
```json
{
  "userId": "usr_abc123",
  "appId": "minibag",
  "appRole": "user",
  "iat": 1730462400,
  "exp": 1733054400
}
```

**Business Logic:**
- Verify OTP (check expiry, max 3 attempts)
- If user doesn't exist, create new user
- If user exists, update `last_login_at`
- Create `app_profile` if doesn't exist
- Issue JWT token (30-day expiry)

---

#### POST /api/auth/refresh

**Refresh JWT token**

**Request:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 2592000
  }
}
```

---

#### POST /api/auth/logout

**Invalidate JWT token (blacklist)**

**Request:**
```http
POST /api/auth/logout
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Logged out successfully"
  }
}
```

---

## Identity Layer API

### GET /api/identity/me

**Get current user profile**

**Request:**
```http
GET /api/identity/me
Authorization: Bearer <jwt_token>
X-App-ID: minibag
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_abc123",
      "phone": "+919876543210",
      "displayName": "Maulik Patel",
      "displayNameLocal": {
        "en": "Maulik Patel",
        "gu": "માઉલિક પટેલ",
        "hi": "मौलिक पटेल"
      },
      "trustScore": 0.85,
      "verifiedFlags": {
        "phone": true,
        "email": false
      },
      "createdAt": "2025-11-01T10:00:00Z",
      "lastLoginAt": "2025-11-01T12:00:00Z"
    },
    "appProfile": {
      "app_id": "minibag",
      "app_role": "user",
      "preferences": {
        "language": "en",
        "notifications": true
      },
      "stats": {
        "sessionsCreated": 12,
        "sessionsJoined": 45,
        "completionRate": 0.92
      }
    }
  }
}
```

---

### PATCH /api/identity/me

**Update user profile**

**Request:**
```http
PATCH /api/identity/me
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "displayName": "Maulik Patel",
  "displayNameLocal": {
    "gu": "માઉલિક પટેલ",
    "hi": "मौलिक पटेल"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": { ... }
  }
}
```

**Allowed Fields:**
- `displayName` (string, max 50 chars)
- `displayNameLocal` (object, optional)

**Protected Fields (cannot update):**
- `phone`, `id`, `trustScore`, `verifiedFlags`

---

### GET /api/identity/app-profile

**Get app-specific profile**

**Request:**
```http
GET /api/identity/app-profile?app_id=minibag
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "app_id": "minibag",
    "app_role": "user",
    "preferences": {
      "language": "en",
      "notifications": true,
      "defaultNeighborhood": "nbh_123"
    },
    "stats": {
      "sessionsCreated": 12,
      "sessionsJoined": 45,
      "completionRate": 0.92,
      "avgResponseTime": 120
    }
  }
}
```

---

### PATCH /api/identity/app-profile

**Update app-specific preferences**

**Request:**
```http
PATCH /api/identity/app-profile
Authorization: Bearer <jwt_token>
X-App-ID: minibag
Content-Type: application/json

{
  "preferences": {
    "language": "gu",
    "notifications": false,
    "defaultNeighborhood": "nbh_456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "app_id": "minibag",
    "app_role": "user",
    "preferences": { ... }
  }
}
```

---

### GET /api/identity/trust-score

**Get trust score for current user or neighborhood**

**Request (User):**
```http
GET /api/identity/trust-score
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "usr_abc123",
    "trustScore": 0.85,
    "components": {
      "completionRate": 0.92,
      "onTimeRate": 0.87,
      "paymentRate": 0.96,
      "reportedIssues": 0
    },
    "sessionsCompleted": 42,
    "lastUpdated": "2025-11-01T12:00:00Z"
  }
}
```

**Request (Neighborhood):**
```http
GET /api/identity/trust-score?neighborhood_id=nbh_123
```

**Response:**
```json
{
  "success": true,
  "data": {
    "neighborhoodId": "nbh_123",
    "avgTrustScore": 0.78,
    "activeSessions": 45,
    "totalSessions": 230,
    "topHosts": [
      {
        "userId": "usr_abc123",
        "displayName": "Maulik",
        "trustScore": 0.92,
        "sessionsHosted": 25
      }
    ]
  }
}
```

---

## Catalog Layer API

### GET /api/catalog/categories

**Get all active categories**

**Request:**
```http
GET /api/catalog/categories?app_id=minibag&language=en
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "cat_veggies",
      "name": "Veggies",
      "nameLocal": {
        "en": "Veggies",
        "gu": "શાકભાજી",
        "hi": "सब्जियां"
      },
      "emoji": "🥬",
      "color": "bg-green-100",
      "icon": "vegetable",
      "sortOrder": 1,
      "itemCount": 45,
      "isActive": true,
      "applicableTypes": ["minibag", "streethawk"]
    },
    {
      "id": "cat_staples",
      "name": "Staples",
      "nameLocal": {
        "en": "Staples",
        "gu": "અનાજ",
        "hi": "अनाज"
      },
      "emoji": "🌾",
      "color": "bg-yellow-100",
      "icon": "grain",
      "sortOrder": 2,
      "itemCount": 28,
      "isActive": true,
      "applicableTypes": ["minibag"]
    }
  ]
}
```

**Query Parameters:**
- `app_id` (required): Filter categories by app
- `language` (optional): Return name in specific language (default: en)

---

### GET /api/catalog/items

**Get all active items**

**Request:**
```http
GET /api/catalog/items?app_id=minibag&category_id=cat_veggies&language=en&page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "item_tomatoes",
      "itemId": "tomatoes",
      "name": "Tomatoes",
      "nameLocal": {
        "en": "Tomatoes",
        "gu": "ટામેટાં",
        "hi": "टमाटर"
      },
      "aliases": {
        "en": ["tomato", "tamatar"],
        "gu": ["ટામેટું", "ટમેટા"],
        "hi": ["टमाटर", "tamatar", "tameta"]
      },
      "categoryId": "cat_veggies",
      "category": {
        "id": "cat_veggies",
        "name": "Veggies",
        "emoji": "🥬",
        "color": "bg-green-100"
      },
      "unit": "kg",
      "defaultQuantity": 0.5,
      "minQuantity": 0.25,
      "maxQuantity": 10,
      "priceRange": {
        "min": 20,
        "max": 40,
        "currency": "INR"
      },
      "seasonality": "High",
      "repeatCycle": "Weekly",
      "ecosystemFit": ["minibag", "streethawk"],
      "thumbnailUrl": "https://cdn.localloops.in/items/tomatoes.jpg",
      "isActive": true,
      "sortOrder": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 145,
    "totalPages": 3
  }
}
```

**Query Parameters:**
- `app_id` (required): Filter items by app
- `category_id` (optional): Filter by category
- `language` (optional): Return names/aliases in specific language
- `search` (optional): Search by name or alias
- `seasonality` (optional): Filter by seasonality (High, Medium, Low)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50, max: 100)

---

### GET /api/catalog/items/:item_id

**Get specific item details**

**Request:**
```http
GET /api/catalog/items/tomatoes?language=en
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item_tomatoes",
    "itemId": "tomatoes",
    "name": "Tomatoes",
    "nameLocal": { ... },
    "aliases": { ... },
    "category": { ... },
    "unit": "kg",
    "defaultQuantity": 0.5,
    "priceRange": { ... },
    "seasonality": "High",
    "repeatCycle": "Weekly",
    "description": {
      "en": "Fresh red tomatoes, locally sourced",
      "gu": "તાજા લાલ ટામેટા, સ્થાનિક રીતે મેળવેલા",
      "hi": "ताजा लाल टमाटर, स्थानीय रूप से प्राप्त"
    },
    "storageLife": "3-5 days",
    "nutritionInfo": {
      "calories": 18,
      "protein": 0.9,
      "carbs": 3.9
    },
    "isActive": true
  }
}
```

---

### GET /api/catalog/search

**Search items by name or alias (with fuzzy matching)**

**Request:**
```http
GET /api/catalog/search?q=tamatar&language=hi&app_id=minibag&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "tamatar",
    "results": [
      {
        "id": "item_tomatoes",
        "name": "Tomatoes",
        "nameLocal": {
          "hi": "टमाटर"
        },
        "matchType": "alias",
        "matchedAlias": "tamatar",
        "category": { ... },
        "thumbnailUrl": "...",
        "relevanceScore": 0.95
      }
    ],
    "total": 1
  }
}
```

**Query Parameters:**
- `q` (required): Search query
- `language` (required): Language for search
- `app_id` (required): Filter by app
- `limit` (optional): Max results (default: 10, max: 50)

**Matching Logic:**
1. Exact name match (highest priority)
2. Exact alias match
3. Starts with name/alias
4. Contains name/alias
5. Fuzzy match (Levenshtein distance < 2)

---

### POST /api/catalog/items (Admin Only)

**Create new catalog item**

**Request:**
```http
POST /api/catalog/items
Authorization: Bearer <admin_jwt_token>
X-App-ID: core
Content-Type: application/json

{
  "itemId": "green_chili",
  "name": "Green Chili",
  "nameLocal": {
    "gu": "લીલા મરચા",
    "hi": "हरी मिर्च"
  },
  "aliases": {
    "en": ["chili", "mirchi", "green chilli"],
    "gu": ["મરચું", "લીલું મરચું"],
    "hi": ["मिर्च", "हरा मिर्च", "mirchi"]
  },
  "categoryId": "cat_veggies",
  "unit": "kg",
  "defaultQuantity": 0.25,
  "ecosystemFit": ["minibag", "streethawk"],
  "seasonality": "High",
  "repeatCycle": "Weekly"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "item_green_chili",
    "itemId": "green_chili",
    "name": "Green Chili",
    "nameLocal": { ... },
    "createdAt": "2025-11-01T12:00:00Z"
  }
}
```

---

## Events Layer API

### Real-Time Events (WebSocket)

**Connection:**
```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:3000', {
  auth: {
    token: '<jwt_token>',
    app_id: 'minibag'
  }
});
```

**Event Types:**

#### Session Events

**Event:** `session-created`
```javascript
socket.on('session-created', (data) => {
  console.log(data);
  // {
  //   sessionId: 'abcd1234',
  //   hostId: 'usr_abc123',
  //   neighborhoodId: 'nbh_123',
  //   scheduledTime: '2025-11-01T14:00:00Z',
  //   status: 'active'
  // }
});
```

**Event:** `participant-joined`
```javascript
socket.on('participant-joined', (data) => {
  console.log(data);
  // {
  //   sessionId: 'abcd1234',
  //   participantId: 'prt_xyz789',
  //   nickname: 'Dev',
  //   realName: 'Maulik',
  //   joinedAt: '2025-11-01T13:30:00Z'
  // }
});
```

**Event:** `participant-left`
```javascript
socket.on('participant-left', (data) => {
  console.log(data);
  // {
  //   sessionId: 'abcd1234',
  //   participantId: 'prt_xyz789',
  //   reason: 'user_left' | 'kicked' | 'timeout'
  // }
});
```

**Event:** `participant-items-updated`
```javascript
socket.on('participant-items-updated', (data) => {
  console.log(data);
  // {
  //   sessionId: 'abcd1234',
  //   participantId: 'prt_xyz789',
  //   items: [
  //     { itemId: 'tomatoes', quantity: 2 },
  //     { itemId: 'onions', quantity: 1.5 }
  //   ]
  // }
});
```

**Event:** `session-status-updated`
```javascript
socket.on('session-status-updated', (data) => {
  console.log(data);
  // {
  //   sessionId: 'abcd1234',
  //   status: 'active' | 'shopping' | 'payment' | 'completed' | 'cancelled',
  //   updatedBy: 'usr_abc123',
  //   updatedAt: '2025-11-01T14:00:00Z'
  // }
});
```

---

#### Vendor Events (StreetHawk)

**Event:** `vendor-search-request`
```javascript
socket.on('vendor-search-request', (data) => {
  console.log(data);
  // {
  //   sessionId: 'abcd1234',
  //   neighborhoodId: 'nbh_123',
  //   categoryId: 'cat_veggies',
  //   scheduledTime: '2025-11-01T14:00:00Z',
  //   urgency: 'high' | 'medium' | 'low',
  //   itemCount: 12,
  //   estimatedValue: 500
  // }
});
```

**Event:** `vendor-confirmed`
```javascript
socket.on('vendor-confirmed', (data) => {
  console.log(data);
  // {
  //   sessionId: 'abcd1234',
  //   vendorId: 'vnd_123',
  //   vendorName: 'Fresh Veggies Store',
  //   eta: '2025-11-01T14:15:00Z',
  //   confirmedAt: '2025-11-01T13:45:00Z'
  // }
});
```

---

### POST /api/events/emit

**Emit custom event (for app-to-app communication)**

**Request:**
```http
POST /api/events/emit
Authorization: Bearer <jwt_token>
X-App-ID: minibag
Content-Type: application/json

{
  "eventType": "session-created",
  "data": {
    "sessionId": "abcd1234",
    "hostId": "usr_abc123",
    "neighborhoodId": "nbh_123"
  },
  "targetApp": "streethawk",
  "targetUsers": ["usr_vendor_123"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "eventId": "evt_abc123",
    "emittedAt": "2025-11-01T13:30:00Z",
    "targetCount": 1
  }
}
```

---

### GET /api/events/history

**Get event history for session or user**

**Request:**
```http
GET /api/events/history?session_id=abcd1234&limit=50
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "eventId": "evt_123",
      "eventType": "session-created",
      "sessionId": "abcd1234",
      "userId": "usr_abc123",
      "data": { ... },
      "createdAt": "2025-11-01T13:00:00Z"
    },
    {
      "eventId": "evt_124",
      "eventType": "participant-joined",
      "sessionId": "abcd1234",
      "userId": "usr_xyz789",
      "data": { ... },
      "createdAt": "2025-11-01T13:05:00Z"
    }
  ],
  "pagination": { ... }
}
```

---

### Notifications API

#### POST /api/notifications/send

**Send notification to user(s)**

**Request:**
```http
POST /api/notifications/send
Authorization: Bearer <admin_jwt_token>
X-App-ID: minibag
Content-Type: application/json

{
  "targetUsers": ["usr_abc123", "usr_xyz789"],
  "type": "info",
  "title": "Session starting soon",
  "message": "Your shopping session starts in 15 minutes",
  "actionUrl": "/sessions/abcd1234",
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "notificationId": "ntf_abc123",
    "sentTo": 2,
    "failedTo": 0,
    "sentAt": "2025-11-01T13:45:00Z"
  }
}
```

---

#### GET /api/notifications

**Get user notifications**

**Request:**
```http
GET /api/notifications?unread_only=true&limit=20
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "ntf_123",
      "type": "info",
      "title": "Session starting soon",
      "message": "Your shopping session starts in 15 minutes",
      "actionUrl": "/sessions/abcd1234",
      "priority": "high",
      "isRead": false,
      "createdAt": "2025-11-01T13:45:00Z"
    }
  ],
  "unreadCount": 3,
  "pagination": { ... }
}
```

---

#### PATCH /api/notifications/:id/read

**Mark notification as read**

**Request:**
```http
PATCH /api/notifications/ntf_123/read
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "ntf_123",
    "isRead": true,
    "readAt": "2025-11-01T14:00:00Z"
  }
}
```

---

## Common Patterns

### Field-Level ACLs

**Concept:** Different apps see different fields

**Example:**
```json
// Minibag sees:
{
  "item": {
    "id": "item_tomatoes",
    "name": "Tomatoes",
    "priceRange": { ... }
  }
}

// StreetHawk sees (additional vendor fields):
{
  "item": {
    "id": "item_tomatoes",
    "name": "Tomatoes",
    "priceRange": { ... },
    "wholesalePrice": 15,
    "supplierInfo": { ... },
    "demandForecast": { ... }
  }
}
```

**Implementation:** Backend checks `X-App-ID` header and filters response

---

### Multilingual Content

**Pattern:** All text fields have corresponding `*Local` field

**Example:**
```json
{
  "name": "Tomatoes",
  "nameLocal": {
    "en": "Tomatoes",
    "gu": "ટામેટાં",
    "hi": "टमाटर"
  }
}
```

**Client-Side Usage:**
```javascript
const language = i18n.language; // 'en', 'gu', 'hi'
const displayName = item.nameLocal[language] || item.name;
```

---

### Soft Deletes

**Pattern:** Never hard-delete data, use `is_active` flag

**Database:**
```sql
UPDATE catalog_items
SET is_active = false, deleted_at = NOW()
WHERE id = 'item_123';
```

**API:**
- `GET /api/catalog/items` → Only returns `is_active = true`
- `GET /api/catalog/items?include_deleted=true` → Returns all (admin only)

---

## Error Handling

### Standard Error Codes

| Code | HTTP Status | Description | Example |
|------|-------------|-------------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT token | No Authorization header |
| `FORBIDDEN` | 403 | Insufficient permissions | User not admin |
| `NOT_FOUND` | 404 | Resource not found | Item ID doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request data | Missing required field |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | >100 requests/minute |
| `INTERNAL_ERROR` | 500 | Server error | Database connection failed |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable | Maintenance mode |

---

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": {
      "field": "phone",
      "issue": "Phone number must start with +91",
      "provided": "+1234567890"
    }
  },
  "meta": {
    "timestamp": "2025-11-01T14:00:00Z",
    "requestId": "req_abc123"
  }
}
```

---

### Client-Side Error Handling

```javascript
async function fetchItems() {
  try {
    const response = await fetch('/api/catalog/items', {
      headers: {
        'X-App-ID': 'minibag',
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      // Handle error
      if (result.error.code === 'UNAUTHORIZED') {
        // Redirect to login
        redirectToLogin();
      } else if (result.error.code === 'NOT_FOUND') {
        // Show empty state
        showEmptyState();
      } else {
        // Show generic error
        showError(result.error.message);
      }
      return;
    }

    // Success
    return result.data;
  } catch (error) {
    // Network error
    showError('Connection failed. Please check your internet.');
  }
}
```

---

## Rate Limiting

### Per-Endpoint Limits

| Endpoint | Limit | Window | Throttle Behavior |
|----------|-------|--------|-------------------|
| `POST /api/auth/otp/send` | 3 requests | 1 hour | Reject with 429 |
| `POST /api/auth/otp/verify` | 5 requests | 5 minutes | Reject with 429 |
| `GET /api/catalog/*` | 100 requests | 1 minute | Reject with 429 |
| `POST /api/events/emit` | 50 requests | 1 minute | Queue excess |
| `GET /api/*` (general) | 200 requests | 1 minute | Reject with 429 |

---

### Rate Limit Headers

**Response Headers:**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1730463600
```

**When Exceeded:**
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 45

{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again in 45 seconds.",
    "details": {
      "limit": 100,
      "window": "1 minute",
      "retryAfter": 45
    }
  }
}
```

---

### Implementation

**Using Redis:**
```javascript
import redis from 'redis';
const client = redis.createClient();

async function rateLimit(userId, endpoint, limit, windowSec) {
  const key = `ratelimit:${endpoint}:${userId}`;
  const current = await client.incr(key);

  if (current === 1) {
    await client.expire(key, windowSec);
  }

  if (current > limit) {
    const ttl = await client.ttl(key);
    throw new RateLimitError(limit, windowSec, ttl);
  }

  return {
    limit,
    remaining: limit - current,
    reset: Date.now() + (windowSec * 1000)
  };
}
```

---

## Versioning Strategy

### URL Versioning (Not Implemented Yet)

**Future:** When breaking changes needed
```http
GET /api/v2/catalog/items
```

**Current:** No versioning (v1 implicit)
```http
GET /api/catalog/items
```

---

### Backward Compatibility

**Rules:**
- ✅ Adding new fields: OK
- ✅ Adding new optional parameters: OK
- ✅ Adding new endpoints: OK
- ❌ Removing fields: Requires new version
- ❌ Changing field types: Requires new version
- ❌ Renaming fields: Requires new version

**Deprecation Process:**
1. Announce deprecation 3 months in advance
2. Add `Deprecated` header to responses
3. Log warnings when deprecated endpoint is used
4. Remove after 6 months

---

## Migration from Current State

### Phase 0 → Phase 1 Migration

**Current (Phase 0):**
- Session-based identity (host_token, participant_id in localStorage)
- No JWT authentication
- No cross-session user identity

**Target (Phase 1):**
- JWT-based authentication
- Persistent user accounts
- Cross-app identity

**Migration Steps:**

1. **Implement JWT auth endpoints** (parallel to existing)
   - `POST /api/auth/otp/send`
   - `POST /api/auth/otp/verify`
   - `POST /api/auth/refresh`

2. **Add optional JWT support** to existing endpoints
   - Accept both `host_token` (old) and `Authorization: Bearer` (new)
   - Gradually migrate users to JWT

3. **Link existing sessions to user accounts**
   - When user logs in, associate past sessions with their user ID
   - Migrate `host_token` → `user_id` in database

4. **Deprecate session-based auth**
   - After 80% migration, require JWT for new sessions
   - After 95% migration, remove `host_token` support

---

## Related Documents

- [LocalLoops Design System](./LOCALLOOPS_DESIGN_SYSTEM.md)
- [Shared Component Library Structure](./SHARED_COMPONENT_LIBRARY.md)
- [Core Data Models](./CORE_DATA_MODELS.md)

---

**Maintained by:** LocalLoops Core Team
**Questions?** Open an issue in the repository
