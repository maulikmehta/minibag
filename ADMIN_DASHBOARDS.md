# Admin Dashboards - Minibag Production

Two separate admin/monitoring dashboards for different purposes.

---

## 1. Sessions SDK Dashboard

**Purpose**: Monitor Sessions SDK infrastructure (session lifecycle, participant flow, nickname pool)

**URL**: https://minibag.onrender.com/sessions-monitor

**Authentication**: None (development mode)

**Technology**:
- Backend: Sessions SDK dashboard module (`@sessions/core`)
- Frontend: Single-page HTML dashboard with auto-refresh
- Mounted dynamically in server.js

### Features

#### Metrics Overview
- **System Health**: SDK running, database connected, WebSocket status
- **Active Sessions**: Real-time count of open/active sessions
- **Completed Today**: Sessions that reached completion
- **Completion Rate**: Percentage of sessions successfully completed
- **Nickname Pool**: Available, reserved, in-use counts

#### Sessions Table (Tabular View)

| Column | Description | Example |
|--------|-------------|---------|
| Session ID | 12-character identifier | `3a1b11e67687` |
| Type | Solo or Group | Group |
| Milestone | Journey stage (dots) | 🟢 Active |
| Participants | Group: `X exp, Y max, Z joined, AD` | `2 exp, 4 max, 3 joined, 1D` |
| | Solo: `Solo (1/1)` | - |
| Age | Time since creation | 12m |
| Status | Human-readable state | Running |

#### Session Milestones (Journey Tracking)

- 🔵 **Created** - Session initialized, invites sent
- 🟠 **Gathering** - Waiting for participants to join/decline
- 🟡 **Checkpoint** - All expected participants ready
- 🟢 **Active** - Coordination in progress
- ✅ **Completed** - Successfully finished
- ❌ **Expired/Cancelled** - Failed or dropped

#### Auto-Refresh
- Updates every 5 seconds
- Shows last 100 sessions or 24 hours
- Lightweight queries (no impact on operations)

### API Endpoint

**Monitoring Data API**:
```bash
GET /sessions-monitor/api/monitor
```

**Response**:
```json
{
  "status": {
    "sdk_running": true,
    "database_connected": true,
    "websocket_connected": true
  },
  "sessions": {
    "active_count": 12,
    "completed_today": 99,
    "completion_rate": 78
  },
  "nickname_pool": {
    "available": 4821,
    "reserved": 12,
    "in_use": 167
  },
  "sessions_list": [
    {
      "session_id": "3a1b11e67687",
      "milestone": "active",
      "is_solo": false,
      "expected_participants": 2,
      "max_participants": 4,
      "participants_joined": 3,
      "participants_declined": 1,
      "created_at": "2026-04-22T10:00:00Z",
      "completed_at": null,
      "age_minutes": 12
    }
  ]
}
```

### Configuration (server.js)

```javascript
if (USE_SESSIONS_SDK) {
  const { mountDashboard } = await import('@sessions/core');
  await mountDashboard(app, {
    path: '/sessions-monitor',
    branding: {
      productName: 'Minibag Sessions',
      primaryColor: '#00B87C'
    }
  });
}
```

### Production Access

```bash
# View dashboard in browser
https://minibag.onrender.com/sessions-monitor

# Fetch metrics via API (for monitoring tools)
curl https://minibag.onrender.com/sessions-monitor/api/monitor
```

**Security Note**: Currently no authentication. Add basic auth for production:

```javascript
mountDashboard(app, {
  path: '/sessions-monitor',
  auth: {
    type: 'basic',
    credentials: {
      username: 'admin',
      password: process.env.DASHBOARD_PASSWORD
    }
  }
});
```

---

## 2. LocalLoops Admin Dashboard

**Purpose**: Platform-wide analytics for LocalLoops data monetization (business metrics, revenue, market intelligence)

**URL**: Not currently deployed to production

**File Location**: `packages/minibag/public/localloops-admin-dashboard.html`

**Authentication**: API endpoints protected by `adminAuth` middleware (Bearer token)

**Technology**:
- Frontend: Static HTML + Tailwind CSS + Chart.js
- Backend: 5 API endpoints in `packages/shared/api/analytics.js`

### Features

#### Overview Metrics
- Total sessions (all time)
- Active sessions (current)
- Completed sessions
- Total participants
- Unique users
- Monthly Recurring Revenue (MRR from subscriptions)
- Active subscriptions count
- Weekly sessions (last 7 days)
- Completion rate percentage

#### Sessions by Type
- Minibag sessions count
- PartyBag sessions count
- FitBag sessions count

#### Weekly Session Trends
- Chart showing session creation over last 8 weeks
- Broken down by session type (minibag, partybag, fitbag)

#### Revenue Analytics
- MRR breakdown by product type
- Total monthly revenue
- Revenue percentages by product

#### Recent Sessions
- Last 10 sessions with details
- Participant counts
- Session status

#### Session Completions
- Solo vs group breakdown
- Financially settled count
- Average session duration (minutes)
- Transaction volume metrics (total grocery spending, NOT LocalLoops revenue)
- UPI/Cash breakdown
- Items purchased count

#### Market Intelligence Tab
- Data products pricing
- Category velocity metrics
- Geographic insights (future)

### API Endpoints

All endpoints require `Authorization: Bearer <ADMIN_PASSWORD>` header.

#### 1. Overview Analytics
```bash
GET /api/analytics/overview
Authorization: Bearer <ADMIN_PASSWORD>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalSessions": 1247,
      "activeSessions": 23,
      "completedSessions": 1189,
      "totalParticipants": 4821,
      "uniqueUsers": 2103,
      "monthlyRevenue": 15200,
      "activeSubscriptions": 152,
      "weeklySessions": 89,
      "completionRate": 95
    },
    "sessionsByType": {
      "minibag": 1100,
      "partybag": 120,
      "fitbag": 27
    }
  }
}
```

#### 2. Weekly Session Trends
```bash
GET /api/analytics/sessions/weekly
Authorization: Bearer <ADMIN_PASSWORD>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "weeks": [
      {
        "week": "2026-W14",
        "minibag": 120,
        "partybag": 15,
        "fitbag": 3
      }
    ],
    "labels": ["Week 1", "Week 2", ...]
  }
}
```

#### 3. Revenue Analytics
```bash
GET /api/analytics/revenue
Authorization: Bearer <ADMIN_PASSWORD>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "revenue": {
      "minibag": 12000,
      "partybag": 2500,
      "fitbag": 700,
      "total": 15200
    },
    "percentages": {
      "minibag": 79,
      "partybag": 16,
      "fitbag": 5
    }
  }
}
```

#### 4. Recent Sessions
```bash
GET /api/analytics/sessions/recent?limit=10
Authorization: Bearer <ADMIN_PASSWORD>
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "session_id": "3a1b11e67687",
      "session_type": "minibag",
      "status": "completed",
      "created_at": "2026-04-22T10:00:00Z",
      "completed_at": "2026-04-22T10:25:00Z",
      "participants": { "count": 3 }
    }
  ]
}
```

#### 5. Session Completions
```bash
GET /api/analytics/sessions/completions?start_date=2026-04-01&end_date=2026-04-30&session_type=minibag
Authorization: Bearer <ADMIN_PASSWORD>
```

**Query Parameters**:
- `start_date` (optional): ISO date
- `end_date` (optional): ISO date
- `session_type` (optional): minibag, partybag, or fitbag

**Response**:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalCompleted": 1189,
      "soloSessions": 892,
      "groupSessions": 297,
      "financiallySettled": 1150,
      "avgDurationMinutes": 18
    },
    "transactionMetrics": {
      "totalVolume": 1247000,
      "upiAmount": 890000,
      "cashAmount": 357000,
      "itemsPurchased": 4821
    },
    "byType": {
      "minibag": {
        "count": 1100,
        "solo": 820,
        "group": 280
      }
    }
  }
}
```

### Authentication

**Middleware**: `adminAuth` (packages/shared/middleware/adminAuth.js)

**Environment Variable**: `ADMIN_PASSWORD`

**Usage**:
```bash
# Set in Render dashboard
ADMIN_PASSWORD=your-secure-password

# API calls
curl -H "Authorization: Bearer your-secure-password" \
  https://minibag.onrender.com/api/analytics/overview
```

**Security**:
- All endpoints protected
- Failed attempts logged with IP
- Returns 401 (no header) or 403 (invalid password)

### Deployment Status

**Current**: ❌ Not deployed

**Reason**: Static HTML file not served by backend

**To Deploy**:

1. **Option A: Serve as static file**
   ```javascript
   // In server.js
   app.get('/admin', adminAuth, (req, res) => {
     res.sendFile(resolve(__dirname, '../minibag/public/localloops-admin-dashboard.html'));
   });
   ```

2. **Option B: Deploy to Vercel**
   - Upload HTML to Vercel static site
   - Configure API_URL env var: `https://minibag.onrender.com`
   - Add ADMIN_PASSWORD prompt in frontend
   - Frontend makes authenticated API calls

3. **Option C: Embed in React app**
   - Convert to React component
   - Use existing minibag frontend
   - Add admin route: `/admin/dashboard`

### Production Access (After Deployment)

```bash
# Option A: Backend route
https://minibag.onrender.com/admin
# Auth: Backend validates session/token

# Option B: Vercel static site
https://localloops-admin.vercel.app
# Auth: Frontend prompts for password, sends to API

# Option C: React app route
https://minibag.cc/admin/dashboard
# Auth: Frontend routing + API calls
```

---

## Comparison

| Feature | Sessions SDK Dashboard | LocalLoops Admin Dashboard |
|---------|----------------------|---------------------------|
| **Purpose** | Session infrastructure monitoring | Business analytics & revenue |
| **Focus** | Real-time session lifecycle | Historical trends & metrics |
| **Data Source** | Supabase localloops (sessions DB) | Supabase minibag-test (app DB) |
| **Authentication** | None (dev mode) | Bearer token (adminAuth) |
| **Deployment** | ✅ Live at `/sessions-monitor` | ❌ Not deployed |
| **Auto-Refresh** | Yes (5 seconds) | No (manual via API) |
| **Audience** | Engineers, DevOps | Business, Product, Strategy |
| **Metrics** | SDK health, session flow, nickname pool | Revenue, users, transactions, market intel |
| **Tables** | Active sessions (last 24h) | Recent sessions (last 10) |

---

## Deployment Checklist

### Sessions SDK Dashboard ✅
- [x] Module imported from `@sessions/core`
- [x] Mounted at `/sessions-monitor`
- [x] Branding configured (Minibag Sessions)
- [x] Live in production
- [ ] Add authentication (recommended)
- [ ] Configure refresh interval
- [ ] Add rate limiting

### LocalLoops Admin Dashboard ❌
- [ ] Choose deployment option (A/B/C)
- [ ] Implement static file serving or embed
- [ ] Test API endpoints with authentication
- [ ] Configure CORS if separate domain
- [ ] Set ADMIN_PASSWORD in Render
- [ ] Deploy HTML dashboard
- [ ] Test end-to-end flow
- [ ] Document access instructions

---

## Security Recommendations

### Sessions SDK Dashboard
1. **Add basic auth** before public access
2. **Rate limit** the `/sessions-monitor/api/monitor` endpoint
3. **IP whitelist** for production monitoring tools
4. **Disable in production** if not needed (set `USE_SESSIONS_SDK=false` temporarily)

### LocalLoops Admin Dashboard
1. ✅ Already has Bearer token auth
2. **Rotate ADMIN_PASSWORD** regularly
3. **Use HTTPS only** (already enabled on Render)
4. **Add request logging** for audit trail
5. **Implement session timeout** if using cookies
6. **Add 2FA** for high-value operations (future)

---

## Monitoring & Alerts

### Sessions SDK Dashboard
- Monitor `/sessions-monitor/api/monitor` for:
  - `database_connected: false` → alert
  - `websocket_connected: false` → alert
  - `completion_rate < 50` → warning

### LocalLoops Admin Dashboard
- Monitor analytics APIs for:
  - `activeSubscriptions` drop > 10% → alert
  - `completionRate < 70%` → warning
  - `monthlyRevenue` drop > 15% → alert

**Suggested Tool**: UptimeRobot, Cronitor, or Datadog

---

## Access Instructions (After Deployment)

### For Engineers (Sessions SDK)
```bash
# View session infrastructure health
https://minibag.onrender.com/sessions-monitor

# Query via API (for scripts/monitoring)
curl https://minibag.onrender.com/sessions-monitor/api/monitor | jq
```

### For Business Team (LocalLoops Admin)
```bash
# Get admin password from team lead
ADMIN_PASSWORD=<ask-team-lead>

# Access dashboard (once deployed)
https://minibag.onrender.com/admin
# Or: https://localloops-admin.vercel.app

# Query specific metrics via API
curl -H "Authorization: Bearer $ADMIN_PASSWORD" \
  https://minibag.onrender.com/api/analytics/overview | jq
```

---

**Last Updated**: 2026-04-22
**Maintained By**: Development Team
**Next Review**: After LocalLoops dashboard deployment
