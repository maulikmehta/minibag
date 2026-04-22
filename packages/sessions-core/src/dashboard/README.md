# Sessions SDK Dashboard

Simple, log-style monitoring dashboard for Sessions SDK. Shows session journey health and nickname pool status.

## Features

- **Clean 5-6px milestone dots** - Minimal, professional design
- **Session journey tracking** - Created → Gathering → Checkpoint → Active → Completed
- **Participant metrics** - Expected, max, joined, declined counts
- **Solo vs Group** - Separate display for solo and group sessions
- **Nickname pool health** - Available, reserved, in-use counts
- **Real-time updates** - Auto-refresh every 5 seconds
- **Optional authentication** - Basic auth support
- **Configurable branding** - Product name, logo, colors

## Quick Start

```typescript
import { mountDashboard } from '@sessions/core';
import express from 'express';

const app = express();

// Mount dashboard (optional)
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

app.listen(3000);
// Dashboard available at: http://localhost:3000/sessions-monitor
```

## Configuration

### Basic Setup (No Auth)

```typescript
mountDashboard(app, {
  path: '/monitor'
});
```

### With Authentication

```typescript
mountDashboard(app, {
  path: '/sessions-monitor',
  auth: {
    type: 'basic',
    credentials: {
      username: 'admin',
      password: 'secure-password'
    }
  }
});
```

### With Branding

```typescript
mountDashboard(app, {
  path: '/sessions-monitor',
  branding: {
    productName: 'Minibag Sessions',
    logo: '/minibag-logo.png',
    primaryColor: '#00B87C'
  },
  refreshInterval: 3000 // 3 seconds
});
```

## What the Dashboard Shows

### Metrics Bar

- **System Health**: SDK running, database connection, WebSocket status
- **Session Metrics**: Active count, completed today, completion rate
- **Nickname Pool**: Available, reserved, in-use counts

### Sessions Table

| Column | Description |
|--------|-------------|
| Session ID | 12-character public identifier |
| Type | Group or Solo |
| Milestone | Current state (Created, Gathering, Checkpoint, Active, Completed) |
| Participants | Group: `X exp, Y max, Z joined, AD` / Solo: `Solo (1/1)` |
| Age | Time since creation |
| Status | Human-readable state (Waiting, Running, Done, etc.) |

## Milestones

- 🔵 **Created** - Session initialized, invites sent
- 🟠 **Gathering** - Waiting for participants to join/decline
- 🟡 **Checkpoint** - All expected participants ready
- 🟢 **Active** - Coordination in progress
- ✅ **Completed** - Successfully finished
- ❌ **Expired/Cancelled** - Failed or dropped

## API Endpoint

The dashboard exposes a monitoring API:

```
GET /sessions-monitor/api/monitor
```

Returns:
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
  "sessions_list": [...]
}
```

## Design Philosophy

- **Router dashboard style** - Simple, functional, no fancy visualizations
- **Major milestones only** - Focus on journey, not granular events
- **Minimal dots** - Clean 5-6px milestone indicators
- **Session coordination focus** - SDK infrastructure, not product features
- **Completion timestamp = success** - Simple success metric

## Performance

- Dashboard queries don't impact session operations
- Returns last 100 sessions or 24 hours, whichever is less
- Auto-refresh every 5 seconds (configurable)
- Lightweight: < 50KB total (HTML + CSS + JS)

## Browser Support

- Modern browsers with ES6+ support
- Chrome, Firefox, Safari, Edge
- Mobile responsive

## Security

- Optional basic authentication
- No sensitive PII exposed (nicknames only)
- Read-only access to session data
- Rate limiting recommended in production

## Examples

See `/examples/` directory for:
- Express integration
- Next.js integration
- Custom branding examples
