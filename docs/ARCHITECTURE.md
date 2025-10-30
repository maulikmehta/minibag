# LocalLoops Architecture

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Status:** Infrastructure Finalized

---

## 🎯 Overview

LocalLoops is a multi-product micro-coordination infrastructure built on session-type agnostic architecture. This document describes the system design, technical decisions, and architectural patterns used across all products.

---

## 🏗️ System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                          │
├─────────────────────────────────────────────────────────────┤
│  Browser (React PWA)                                        │
│  - Minibag UI (packages/minibag)                           │
│  - Partybag UI (packages/partybag) - Future                │
│  - Fitbag UI (packages/fitbag) - Future                    │
│  - Shared Components (packages/shared)                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS / WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    COORDINATION LAYER                        │
├─────────────────────────────────────────────────────────────┤
│  WebSocket Server (Node.js + Socket.io)                    │
│  - Real-time session sync                                   │
│  - Participant coordination                                 │
│  - Session-type agnostic logic                             │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Database API
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATA LAYER                              │
├─────────────────────────────────────────────────────────────┤
│  Database (Firebase/Supabase - TBD)                        │
│  - Sessions collection                                       │
│  - Participants collection                                  │
│  - Catalog items                                            │
│  - Nickname pool                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Repository Structure

### Monorepo Layout

```
localloops/
├── packages/                    # Product packages
│   ├── minibag/                # Product 1: Vegetable coordination
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   ├── utils/          # Utilities
│   │   │   └── config.js       # Environment config
│   │   ├── public/             # Static assets
│   │   └── package.json
│   │
│   ├── partybag/               # Product 2: Celebration (future)
│   ├── fitbag/                 # Product 3: Wellness (future)
│   │
│   └── shared/                 # Shared infrastructure
│       ├── components/         # Reusable UI components
│       │   ├── Avatar.jsx
│       │   ├── CategoryCircle.jsx
│       │   └── Modal.jsx
│       ├── hooks/              # Shared React hooks
│       │   ├── useSession.js
│       │   ├── useCatalog.js
│       │   └── useWebSocket.js
│       ├── utils/              # Common utilities
│       │   ├── calculations.js
│       │   └── formatting.js
│       └── design-system/      # Design tokens
│           ├── colors.js
│           ├── typography.js
│           └── spacing.js
│
├── server/                     # Backend server
│   ├── server.js              # Main WebSocket server
│   ├── sessions.js            # Session management
│   ├── participants.js        # Participant logic
│   ├── catalog.js             # Catalog operations
│   └── package.json
│
├── docs/                       # Documentation
│   ├── DEVELOPMENT.md         # Setup guide
│   ├── ARCHITECTURE.md        # This file
│   └── DEPLOYMENT.md          # Deploy guide
│
├── .cloudflared/              # Cloudflare Tunnel config
│   └── config.yml
│
├── README.md                  # Project overview
├── CHANGELOG.md               # Version history
└── package.json               # Root workspace
```

---

## 🎨 Frontend Architecture

### Technology Stack

**Core:**
- React 18 (UI library)
- Vite 5 (build tool, dev server)
- TailwindCSS (utility-first styling)

**Libraries:**
- Lucide React (icons)
- Socket.io Client (real-time sync)
- React Router (URL routing) - TBD

**State Management:**
- React Hooks (useState, useEffect, useContext)
- No Redux/MobX (keep it simple)
- WebSocket for cross-device sync

### Component Architecture

**Atomic Design Pattern:**

```
Atoms (Base components)
├── Button
├── Input
├── Avatar
└── Icon

Molecules (Simple combinations)
├── CategoryCircle
├── ItemCard
└── PaymentToggle

Organisms (Complex components)
├── ItemList
├── ParticipantList
└── PaymentModal

Templates (Page layouts)
├── SessionLayout
└── HomeLayout

Pages (Full screens)
├── HomePage
├── CreateSessionPage
├── SessionActivePage
├── ShoppingPage
└── BillPage
```

### Data Flow

**Current (v0.2.0 - localStorage):**
```
User Action → React State → localStorage → UI Update
```

**Planned (v2.0.0 - WebSocket):**
```
User Action → React State → WebSocket Emit → Server → 
  → Broadcast to all clients → UI Update
```

---

## 🔄 Backend Architecture

### WebSocket Server (Planned v2.0.0)

**Technology:**
- Node.js 18+
- Socket.io (WebSocket library)
- Express (optional API routes)

**Server Structure:**

```javascript
// server/server.js
const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

const sessions = {}; // In-memory session storage

io.on('connection', (socket) => {
  // Join session room
  socket.on('join-session', (sessionId) => {
    socket.join(sessionId);
    socket.emit('session-update', sessions[sessionId]);
  });
  
  // Update session data
  socket.on('update-session', ({ sessionId, data }) => {
    sessions[sessionId] = data;
    io.to(sessionId).emit('session-update', data);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
```

**Session Management:**

```javascript
// Session lifecycle
CREATE → OPEN → ACTIVE → SHOPPING → COMPLETED → EXPIRED

// State transitions
{
  created_at: timestamp,
  scheduled_time: timestamp,
  expires_at: timestamp,      // +2 hours after scheduled
  status: 'open'              // open, active, shopping, completed, expired
}
```

---

## 💾 Data Architecture

### Database Schema (Planned v2.0.0)

**Collections:**

```javascript
// sessions collection
{
  session_id: "abc123",              // 6-char short code
  session_type: "minibag",           // minibag, partybag, fitbag
  creator_nickname: "Raj",           // Auto-generated
  
  // Location (text only, no GPS)
  location_text: "Building A, Gate 2",
  neighborhood: "Alkapuri",          // For analytics
  
  // Timing
  scheduled_time: timestamp,
  created_at: timestamp,
  expires_at: timestamp,
  
  // Status
  status: "open",                    // open, active, shopping, completed, expired
  
  // Metadata
  title: "Vegetables - Oct 14",
  participant_count: 0,
  total_demand_value: 0,
  
  // Pro features
  is_pro: false
}

// sessions/{id}/participants subcollection
{
  participant_id: "p_12345",
  nickname: "Maya",
  avatar_emoji: "🌸",
  joined_at: timestamp,
  
  items: {
    v1: 2.0,    // item_id: quantity
    v2: 1.5
  },
  
  locked: false,
  is_creator: false
}

// catalog_items collection
{
  item_id: "v1",
  name: "Tomatoes",
  name_hi: "टमाटर",
  name_gu: "ટામેટાં",
  category_id: "vegetables",
  emoji: "🍅",
  img_url: "https://...",
  unit: "kg",
  base_price: 40,
  bulk_price: 35,
  applicable_types: ["minibag"],    // Session type filter
  popular: true,
  is_active: true,
  sort_order: 1
}

// nicknames_pool collection
{
  nickname: "Raj",
  avatar_emoji: "👑",
  is_available: true,
  currently_used_in: null,           // session_id or null
  times_used: 0,
  last_used: timestamp
}
```

### Database Choice (Decision pending v2.0.0)

**Options:**

| Feature | Firebase | Supabase | Winner |
|---------|----------|----------|--------|
| Real-time | Native | Postgres pub/sub | Firebase |
| Setup | Easy | Medium | Firebase |
| Cost (MVP) | ₹0-2000 | ₹0-1000 | Supabase |
| SQL vs NoSQL | NoSQL | SQL | Preference |
| Auth | Built-in | Built-in | Tie |

**Recommendation:** Start with Firebase for speed, can migrate later.

---

## 🔐 Security Architecture

### Authentication Strategy

**Phase 1 (v0.1.0 - v1.0.0):**
- No authentication required
- Guest mode (anonymous sessions)
- Auto-generated nicknames
- Sessions stored in localStorage

**Phase 2 (v2.0.0+):**
- Optional phone authentication (OTP)
- Link anonymous sessions to account
- Sync past runs across devices
- Enable Pro subscription

### Privacy Design

**Principles:**
1. **Anonymous by default** - No personal data required
2. **Text-only location** - No GPS tracking
3. **No payment processing** - App doesn't handle money
4. **Session expiry** - Auto-delete after completion
5. **Minimal data collection** - Only what's needed

**Data Retention:**
- Free tier: 30 days
- Pro tier: Unlimited
- Anonymous sessions: 7 days

### Security Measures

**Client-side:**
- HTTPS enforced (Cloudflare + Vercel)
- Input validation (XSS protection)
- CORS properly configured
- Environment variables for secrets

**Server-side (planned):**
- Rate limiting (prevent abuse)
- Session validation (prevent tampering)
- WebSocket authentication
- Database security rules

---

## 🌐 Network Architecture

### Development Environment

```
Mac (localhost:5173)
  ↓
Cloudflare Tunnel
  ↓
https://dev.minibag.in
  ↓
Accessible globally (mobile data, any device)
```

**Benefits:**
- Test on real devices instantly
- Share with testers anywhere
- Hot reload over internet
- Zero infrastructure costs

### Production Environment

```
GitHub (main branch)
  ↓
Vercel Build
  ↓
Vercel Edge Network (Global CDN)
  ↓
https://minibag.in
  ↓
Fast worldwide delivery
```

**Benefits:**
- Auto-deploy on git push
- Global CDN (low latency everywhere)
- Automatic SSL
- Zero configuration

### WebSocket Communication (planned)

```
Client A (Browser)
  ↓ WebSocket
Server (Node.js + Socket.io)
  ↓ Broadcast
Client B (Browser)

Flow:
1. Client A emits 'update-session'
2. Server receives, stores in memory
3. Server broadcasts to all clients in room
4. Client B receives update, updates UI
5. Latency: <100ms on good connection
```

---

## 🎭 Session-Type Agnostic Design

### Core Principle

**All products share the same coordination logic, only the catalog differs.**

### Shared Entities

```javascript
// Session structure (same for all products)
{
  session_id: string,
  session_type: "minibag" | "partybag" | "fitbag",
  participants: [],
  status: string,
  scheduled_time: timestamp
}

// Participant structure (same for all products)
{
  participant_id: string,
  nickname: string,
  items: { [item_id]: quantity }
}

// Catalog filtering (product-specific)
catalog_items.where('applicable_types', 'array-contains', session_type)
```

### Product-Specific Logic

**Only catalog items differ:**

```javascript
// Minibag catalog
{
  item_id: "v1",
  name: "Tomatoes",
  applicable_types: ["minibag"],
  unit: "kg"
}

// Partybag catalog
{
  item_id: "c1",
  name: "Birthday Cake",
  applicable_types: ["partybag"],
  unit: "piece"
}

// Fitbag catalog
{
  item_id: "f1",
  name: "Yoga Session",
  applicable_types: ["fitbag"],
  unit: "hour"
}
```

**Coordination logic is identical across all three.**

---

## 📊 Data Flow Diagrams

### Session Creation Flow

```
User (Host)
  ↓ Clicks "New run"
Create Session Screen
  ↓ Selects items
localStorage (v0.2.0) / WebSocket (v2.0.0)
  ↓ Saves session
Database
  ↓ Returns session_id
Generate Short URL
  ↓ minibag.in/abc123
Share via WhatsApp
```

### Participant Join Flow

```
User (Participant)
  ↓ Clicks WhatsApp link
Opens minibag.in/abc123
  ↓ Loads session data
Database lookup
  ↓ Auto-assigns nickname
Nickname Pool
  ↓ Shows session active screen
User adds items
  ↓ Locks order
Updates database
  ↓ Broadcasts to all
Host sees new participant
```

### Payment Split Flow

```
Host finishes shopping
  ↓ Records payments per item
Calculate price per kg
  ↓ For each participant
Calculate their cost (qty × ₹/kg)
  ↓ Generate split
Display payment summary
  ↓ Send WhatsApp link
Participant views bill
  ↓ Pays via UPI/Cash
Mark as paid
```

---

## ⚡ Performance Architecture

### Optimization Strategies

**Client-side:**
- Code splitting (lazy load screens)
- Image optimization (WebP, responsive sizes)
- Minimize bundle size (<200KB initial)
- Cache static assets (PWA)
- Debounce search inputs

**Network:**
- Cloudflare CDN (global edge)
- Vercel Edge Network (production)
- WebSocket for real-time (not polling)
- Compress responses (gzip/brotli)

**Database (planned):**
- Index frequently queried fields
- Limit query results (pagination)
- Cache catalog data (rarely changes)
- Batch writes where possible

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | <1.5s | ~0.8s |
| Time to Interactive | <3s | ~1.2s |
| Largest Contentful Paint | <2.5s | ~1s |
| WebSocket Latency | <200ms | TBD |
| Bundle Size | <200KB | ~150KB |

---

## 🔄 Scalability Architecture

### Current Limits (v0.2.0 - localStorage)

- Single device only
- No server load
- Infinite scale (client-side)
- Zero infrastructure costs

### Planned Limits (v2.0.0 - WebSocket)

**Free Tier:**
- 100 concurrent connections per server
- 1000 sessions per day
- 100GB bandwidth per month

**When to Scale:**
- Add load balancer (>100 concurrent)
- Add database replicas (>1000 reads/sec)
- Add Redis cache (>10,000 sessions)
- Use sticky sessions (WebSocket)

### Horizontal Scaling Strategy

```
Load Balancer (Nginx/Cloudflare)
  ↓
WebSocket Server 1 (Room 1-1000)
WebSocket Server 2 (Room 1001-2000)
WebSocket Server 3 (Room 2001-3000)
  ↓
Database (Firebase/Supabase)
  ↓
Cache Layer (Redis) - optional
```

---

## 🧪 Testing Architecture

### Testing Strategy

**Unit Tests:**
- Utility functions (calculations.js)
- React hooks (useSession, useCatalog)
- Component logic (no UI)

**Integration Tests:**
- API endpoints
- WebSocket events
- Database operations

**E2E Tests:**
- Critical user flows
- Multi-device coordination
- Payment split accuracy

**Manual Tests:**
- Mobile browsers (Chrome Android, Safari iOS)
- Slow networks (3G simulation)
- Multiple devices simultaneously

### Testing Tools (planned)

- **Unit:** Vitest
- **E2E:** Playwright
- **Visual:** Percy (optional)
- **Load:** Artillery (optional)

---

## 🚀 Deployment Architecture

### CI/CD Pipeline (v1.0.0)

```
Developer
  ↓ git push origin main
GitHub
  ↓ Webhook trigger
Vercel
  ↓ Build (npm run build)
  ↓ Deploy to Edge Network
  ↓ Update DNS (instant)
Production Live
```

**Build Time:** 2-3 minutes  
**Deployment:** Instant (edge network)  
**Rollback:** One-click (Vercel dashboard)

### Environment Strategy

**Development:**
- Local: localhost:5173
- Tunnel: dev.minibag.in
- Database: Development/staging DB
- No caching, hot reload

**Production:**
- URL: minibag.in
- Database: Production DB
- Full caching, optimized build
- Monitoring enabled

---

## 📈 Monitoring Architecture (planned v2.0.0)

### Metrics to Track

**Application:**
- Active sessions
- Session completion rate
- Participant join rate
- Average session size
- Payment split accuracy

**Infrastructure:**
- Server CPU/memory
- WebSocket connections
- Database read/write ops
- API response times
- Error rates

**Business:**
- Daily active users
- Session creation rate
- Free vs Pro conversion
- Revenue (MRR)

### Tools (planned)

- **Logs:** Cloudflare Logs
- **Errors:** Sentry
- **Analytics:** Plausible/Umami
- **Uptime:** UptimeRobot
- **Performance:** Vercel Analytics

---

## 🔮 Future Architecture

### Phase 2 (Partybag - Q1 2026)

- Reuse entire Minibag infrastructure
- Add celebration-specific catalog
- Possibly custom session types
- Baker dashboard (vendor portal)

### Phase 3 (Fitbag - Q2 2026)

- Reuse coordination logic again
- Add wellness service catalog
- Possibly booking system
- Trainer dashboard

### Phase 4 (Scale - Year 2)

- Mobile native apps (React Native)
- Offline-first architecture (PWA improvements)
- Push notifications
- Advanced analytics
- API for third-party integrations

---

## 📝 Architecture Decisions Log

### ADR-001: Monorepo vs Multi-repo
**Decision:** Monorepo  
**Reason:** Shared code across products, easier to maintain  
**Date:** 2025-10-12

### ADR-002: Cloudflare Tunnel vs ngrok
**Decision:** Cloudflare Tunnel  
**Reason:** Free, permanent URLs, better performance  
**Date:** 2025-10-13

### ADR-003: Vercel vs Netlify
**Decision:** Vercel  
**Reason:** Better Vite support, instant rollbacks  
**Date:** 2025-10-13

### ADR-004: localStorage vs Cloud (MVP)
**Decision:** localStorage for MVP  
**Reason:** Faster development, validates concept first  
**Date:** 2025-10-12

### ADR-005: WebSocket vs Polling
**Decision:** WebSocket (Socket.io)  
**Reason:** Real-time sync needed, better UX  
**Date:** 2025-10-13

---

**Last Updated:** October 13, 2025  
**Next Review:** After v2.0.0 (Backend Integration)  
**Maintained By:** LocalLoops Team