# Changelog

All notable changes to the LocalLoops ecosystem will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2025-10-13

### 🎯 INFRASTRUCTURE FINALIZED

**Breaking Changes:**
- Finalized tech stack: Cloudflare Tunnel (dev) + Vercel (prod)
- Development URLs now use custom domains (dev.*.in)
- Environment variables now required

### Added

**Infrastructure:**
- Cloudflare Tunnel configuration for all products
- Vercel auto-deployment pipeline
- Multi-product domain strategy (4 domains)
- Unified NPM workspace setup
- Environment-based configuration

**Documentation:**
- `docs/DEVELOPMENT.md` - Complete infrastructure setup guide
- Domain strategy and cost breakdown
- Daily development workflow
- Multi-device testing strategy

**Developer Experience:**
- One-command start: `npm run dev`
- Hot reload over internet (test on mobile data)
- Instant sharing with testers (dev URLs)
- Auto-deploy on git push

### Changed

**Development Workflow:**
- From: Local-only testing (same WiFi required)
- To: Global testing (mobile data, any location)
- From: Manual deployment
- To: Auto-deployment (git push → live)

**Cost Structure:**
- Year 1: ₹3,200 (domains only)
- Development: ₹0/month (Cloudflare free)
- Production: ₹0/month (Vercel free tier)

### Decisions Locked

**Tech Stack:**
- ✅ Frontend: React + Vite + Tailwind
- ✅ Dev Tunnel: Cloudflare Tunnel
- ✅ Production: Vercel
- ✅ Backend: Node.js + Socket.io (WebSocket)
- ⏳ Database: Firebase/Supabase (decide in v2.0.0)

**Domains:**
- localloops.in - Parent brand
- minibag.in - Vegetable coordination
- partybag.in - Celebration coordination (future)
- fitbag.in - Wellness coordination (future)

---

## [0.2.0] - 2025-10-12

### Minibag: Smart Features Update

### Added

- **Price Memory:** Shows last paid price for each item
- **Quick Re-run:** One-tap to reuse previous shopping list
- **Past Runs:** Searchable history with stats (runs, spending, people helped)
- **Sign-up Prompts:** Smart triggers after sessions 2 & 3
- **Multilingual:** Full Gujarati and Hindi support (items + WhatsApp messages)

**UI Enhancements:**
- Instagram-style avatar circles with gradient selection
- Category circles (Instagram highlights pattern)
- Language selector modal for WhatsApp sharing
- Payment modal with price memory hints
- Past runs full-screen overlay with search

### Fixed

- Avatar circle cutoff on mobile scroll
- Category circle spacing inconsistencies
- Sign-up modal using browser alerts (now proper modals)
- Shopping screen payment tracking truncation

---

## [0.1.0] - 2025-10-12

### 🚀 Initial Release - Minibag Prototype

### Added

**Core Features:**
- 6 screens: Home, Create Session, Active Session, Shopping, Split, Bill
- Anonymous participation (auto-generated nicknames)
- Item-level payment tracking (not session-level)
- Payment split calculation
- Multi-participant coordination UI

**Design System:**
- Google Keep-inspired minimalism
- High contrast for daylight readability (Indian sunlight)
- Large touch targets (elderly-friendly)
- Mobile-first (320px-448px optimized)

**Documentation:**
- Product vision and strategy (minibag-dev-doc.md)
- User flow documentation
- Technical architecture plan
- Design system guide

### Decisions Made

**Product Strategy:**
- Start with Minibag (vegetables)
- Build reusable infrastructure for future products
- Multi-product architecture (minibag, partybag, fitbag)

**Technical Approach:**
- Progressive Web App (PWA)
- Guest mode first (no forced sign-up)
- localStorage for MVP (cloud sync in Phase 2)
- Session-based coordination (not marketplace)

**Business Model:**
- Free: 4 participants, 10kg limit, 20min window
- Pro: ₹49/month (unlimited participants, guarantees)

---

## Product Status

### Minibag
- **Version:** 0.2.0
- **Status:** UI Complete (95%), Backend Pending
- **Launch:** Week 6 (Early November 2025)

### Partybag
- **Version:** 0.0.0 (Not started)
- **Status:** Planned for Q1 2026

### Fitbag
- **Version:** 0.0.0 (Not started)
- **Status:** Planned for Q2 2026

---

## Roadmap

### Week 3-4: Backend Foundation (v2.0.0)
- [ ] WebSocket server (Node.js + Socket.io)
- [ ] Real-time multi-device sync
- [ ] Replace localStorage with cloud sync

### Week 5: Session Sharing (v2.1.0)
- [ ] URL routing (React Router)
- [ ] WhatsApp share integration
- [ ] Session expiry logic

### Week 6: Launch Prep (v3.0.0)
- [ ] Production deployment (minibag.in)
- [ ] Error handling & loading states
- [ ] Catalog expansion (30+ items)
- [ ] First user pilot

---

## Known Issues

**Current (v1.0.0):**
1. No multi-device sync (localStorage only)
2. Cloudflare Tunnel requires Mac running
3. No backend (client-side calculations only)
4. Limited catalog (9 items, need 30+)
5. No error handling
6. No loading states

**Fix Timeline:**
- Issues 1-3: Week 3-4 (WebSocket + cloud sync)
- Issue 4: Week 6 (catalog expansion)
- Issues 5-6: Week 5 (error handling)

---

## Migration Notes

### Upgrading to v1.0.0

**Required Actions:**
1. Purchase domains (localloops.in, minibag.in)
2. Setup Cloudflare Tunnel (see docs/DEVELOPMENT.md)
3. Create .env files (templates in docs/)
4. Configure Vercel projects
5. Update any hardcoded URLs to use environment variables

**Breaking Changes:**
- Development URLs changed from `localhost` to `dev.*.in`
- Environment variables now required for API/WebSocket URLs
- Manual `vercel --prod` deprecated (use git push)

---

## Links

- **Documentation:** docs/DEVELOPMENT.md
- **Minibag Docs:** packages/minibag/minibag-dev-doc.md
- **Repository:** (Private during development)

---

**Maintained By:** LocalLoops Team  
**Last Updated:** October 13, 2025