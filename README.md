# LocalLoops

> Micro-coordination infrastructure for mobile micro-businesses in India

**Tagline:** "Aggregate demand. Coordinate arrival. Keep buying traditional."

[![Status](https://img.shields.io/badge/status-pre--launch-yellow)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## 🎯 What is LocalLoops?

LocalLoops is a demand aggregation protocol that coordinates the arrival of mobile micro-businesses (vegetable vendors, fitness instructors, bakers) to specific locations at specific times. We're not changing how people buy—we're making sellers more efficient by giving them pre-validated demand clusters.

**Core Insight:** Street vendors waste 60-70% of their time searching for customers. LocalLoops tells them where 10-15 buyers are waiting, making their routes profitable and giving buyers better prices through bulk interest.

---

## 🏗️ Architecture

### Multi-Product Ecosystem

```
LocalLoops (Parent Infrastructure)
├── Minibag      → Vegetable vendor coordination (Phase 1 - IN PROGRESS)
├── Partybag     → Baker/decorator coordination (Phase 2 - PLANNED)
└── Fitbag       → Wellness provider coordination (Phase 3 - PLANNED)
```

### Shared Infrastructure

All products use:
- Session-type agnostic coordination logic
- Unified catalog system
- Anonymous participation (nickname pool)
- Real-time multi-device sync
- Privacy-first architecture

---

## 🚀 Products

### 1. Minibag (Launching November 2025)

**Purpose:** Coordinate vegetable vendor arrivals  
**Status:** UI Complete (95%), Backend in Progress  
**URL:** https://minibag.in

**User Flow:**
1. Host creates session: "Vegetables tomorrow 6pm, Building A gate"
2. Shares link with neighbors
3. Others join and add quantities
4. Vendor sees aggregate demand, confirms arrival
5. Everyone buys normally at arrival time

[More about Minibag →](packages/minibag/README.md)

### 2. Partybag (Q1 2026)

**Purpose:** Coordinate baker/decorator arrivals  
**Status:** Planned  

**Use Case:** Birthday in apartment → 8 families want cakes → baker shows up with samples → takes orders on spot

### 3. Fitbag (Q2 2026)

**Purpose:** Coordinate wellness service providers  
**Status:** Planned

**Use Case:** Morning yoga → 10 people interested → instructor shows up at 6am → collects fees directly

---

## 🛠️ Tech Stack

**Frontend:**
- React 18 + Vite 5
- TailwindCSS (utility-first styling)
- Progressive Web App (PWA)

**Development:**
- Cloudflare Tunnel (dev.*.in URLs)
- Hot reload over internet
- Test on mobile data instantly

**Production:**
- Vercel (auto-deploy from GitHub)
- Global CDN (fast everywhere)
- Zero-configuration deployment

**Backend (In Progress):**
- Node.js + Socket.io (WebSocket server)
- Real-time coordination sync
- Firebase/Supabase (database, TBD)

---

## 📦 Repository Structure

```
localloops/
├── packages/
│   ├── minibag/              # Vegetable coordination
│   │   └── docs/             # App-specific docs
│   ├── partybag/             # Future: Celebration coordination
│   ├── fitbag/               # Future: Wellness coordination
│   └── shared/               # Shared backend (API, WebSocket)
│
├── docs/                     # Organized documentation
│   ├── design/               # Design system & UX patterns
│   ├── architecture/         # Component library, API, data models
│   └── operations/           # Known issues, testing, monitoring
│
├── archive/                  # Historical documents
│   ├── session-summaries/    # Development session notes
│   └── project-snapshots/    # Point-in-time status reports
│
├── .cloudflared/             # Cloudflare Tunnel config
│
├── README.md                 # This file
├── QUICK_START.md            # Quick start guide
├── SETUP_INSTRUCTIONS.md     # Detailed setup
├── SETUP_DATABASE.md         # Database setup
├── CHANGELOG.md              # Version history
└── package.json              # Root workspace config
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account (free)
- Vercel account (free)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/localloops.git
cd localloops

# Install dependencies
npm install

# Start development (all services)
npm run dev
```

This starts:
- Minibag frontend (http://localhost:5173)
- WebSocket server (http://localhost:8080)
- Cloudflare Tunnel (https://dev.minibag.in)

### Access URLs

**Development:**
- Local: http://localhost:5173
- Mobile: https://dev.minibag.in (accessible from anywhere)

**Production:**
- https://minibag.in (auto-deployed on git push)

---

## 📖 Documentation

### Getting Started
- **[Quick Start Guide](QUICK_START.md)** - Get up and running in 5 minutes
- **[Setup Instructions](SETUP_INSTRUCTIONS.md)** - Detailed development setup
- **[Setup Database](SETUP_DATABASE.md)** - Database configuration
- **[Changelog](CHANGELOG.md)** - Version history, breaking changes

### Design & Architecture
- **[Design System](docs/design/LOCALLOOPS_DESIGN_SYSTEM.md)** - Complete design language, UX patterns, components
- **[Shared Component Library](docs/architecture/SHARED_COMPONENT_LIBRARY.md)** - Reusable components structure
- **[Core API Specification](docs/architecture/CORE_API_SPECIFICATION.md)** - API standards and endpoints
- **[Core Data Models](docs/architecture/CORE_DATA_MODELS.md)** - Database schemas and patterns
- **[Future Features](docs/design/FUTURE_FEATURES.md)** - Planned features and ideas

### Operations & Development
- **[Known Issues](docs/operations/KNOWN_ISSUES.md)** - Current bugs and technical debt
- **[Pre-Field Testing Improvements](docs/operations/PRE_FIELD_TESTING_IMPROVEMENTS.md)** - Security & optimization checklist
- **[Bundle Quick Reference](docs/operations/BUNDLE_QUICK_REFERENCE.md)** - Bundle size monitoring
- **[Field Testing Guide](docs/operations/FIELD_TESTING_GUIDE.md)** - Testing procedures

### App-Specific Documentation
- **[Minibag Docs](packages/minibag/)** - Product vision, roadmap, features
  - [Bundle Monitoring](packages/minibag/BUNDLE_MONITORING_GUIDE.md)
  - [Feature Implementation Plan](packages/minibag/FEATURE_IMPLEMENTATION_PLAN.md)
  - [Tooltip Implementation](packages/minibag/docs/TOOLTIP_IMPLEMENTATION.md)
  - [Nickname Selection](packages/minibag/docs/NICKNAME_SELECTION_IMPLEMENTATION.md)
  - [Admin Dashboard](packages/minibag/docs/ADMIN_DASHBOARD_SETUP.md)

---

## 🎯 Development Workflow

### Daily Routine

```bash
# 1. Start Cloudflare Tunnel (leave running)
cloudflared tunnel run localloops-dev

# 2. Start dev server
npm run dev

# 3. Code on Mac, test on phone instantly
# https://dev.minibag.in updates in 1-2 seconds
```

### Deploy to Production

```bash
# Commit changes
git add .
git commit -m "Add feature"

# Push to GitHub
git push origin main

# Vercel auto-deploys (2-3 minutes)
# Live at: https://minibag.in
```

---

## 🌐 Domains

| Domain | Purpose | Status |
|--------|---------|--------|
| **localloops.in** | Parent brand, landing page | To purchase |
| **minibag.in** | Vegetable coordination | To purchase |
| **partybag.in** | Celebration coordination | To purchase |
| **fitbag.in** | Wellness coordination | To purchase |

**Cost:** ₹800/year each = ₹3,200/year total

---

## 💰 Cost Structure

### Year 1 (Development)

| Item | Monthly | Annual | Notes |
|------|---------|--------|-------|
| Domains (4) | ₹267 | ₹3,200 | Only upfront cost |
| Cloudflare Tunnel | ₹0 | ₹0 | Free forever |
| Vercel Hosting | ₹0 | ₹0 | Free tier (100GB) |
| Development | ₹0 | ₹0 | Local Mac + tunnel |
| **TOTAL** | **₹267** | **₹3,200** | |

### Scale (100-300 Users)

- Vercel Pro: ₹1,650/month (>100GB bandwidth)
- Database: ₹1,000-2,000/month
- **Total:** ₹3,000-4,000/month

**Break-even:** 80 Pro subscribers @ ₹49/month

---

## 📊 Status

### Completed ✅
- [x] Product vision & strategy
- [x] Multi-product architecture
- [x] Minibag UI prototype (95%)
- [x] Smart features (price memory, re-run, history)
- [x] Design system
- [x] Infrastructure (Cloudflare + Vercel)
- [x] Development workflow

### In Progress 🚧
- [ ] WebSocket server (Week 3-4)
- [ ] Multi-device coordination
- [ ] Backend API

### Upcoming ⏳
- [ ] Phone authentication (optional)
- [ ] WhatsApp sharing
- [ ] Session expiry logic
- [ ] Production launch (Week 6)
- [ ] First user pilot (1 neighborhood)

---

## 🎯 Roadmap

### Phase 1: Minibag Launch (Weeks 1-6)
- **Week 1-2:** UI Prototype ✅
- **Week 3-4:** Backend Integration 🚧
- **Week 5:** Session Sharing & URL Routing
- **Week 6:** Production Deploy & User Pilot

### Phase 2: Scale Minibag (Months 2-6)
- Expand to 3-5 neighborhoods
- Add Pro subscription
- Vendor dashboard
- Analytics & insights

### Phase 3: Partybag Launch (Q1 2026)
- Reuse Minibag infrastructure
- Celebration-specific catalog
- Baker/decorator partnerships

### Phase 4: Fitbag Launch (Q2 2026)
- Wellness service coordination
- Trainer/instructor onboarding
- Group session management

---

## 🤝 Contributing

Currently in private development. Will open for contributions post-launch.

**If you want to help:**
- Beta testing (Vadodara area): Contact via email
- Feature ideas: File an issue (when public)
- Translation: We need more Indian languages

---

## 🔒 Privacy & Security

### What We Collect
- Nickname (anonymous, auto-generated)
- Items & quantities
- Payment amounts (for split calculation)

### What We DON'T Collect
- No phone numbers (only OTP, discarded after)
- No email addresses
- No GPS location (text description only)
- No payment card details
- No device identifiers

### Security
- HTTPS everywhere (Cloudflare + Vercel)
- No payment processing (app doesn't handle money)
- Anonymous participation by default
- Sessions auto-expire (2 hours after scheduled time)

---

## 📞 Support

**Questions?**
- Technical: See [DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Product: See product-specific docs in `packages/`
- General: (Email/contact TBD)

**Resources:**
- [Cloudflare Docs](https://developers.cloudflare.com/)
- [Vercel Docs](https://vercel.com/docs)
- [React Docs](https://react.dev/)

---

## 📜 License

Proprietary - All rights reserved (during development)

Will consider open-source options post-validation.

---

## 👥 Team

**Founder:** (Your name)  
**Status:** Solo founder, building MVP  
**Location:** Vadodara, Gujarat, India

**Seeking:**
- Backend developer (part-time, Firebase/Node.js)
- Beta testers (Vadodara neighborhoods)
- Vendor partnerships (vegetable vendors)

---

## 🎉 Acknowledgments

**Inspired By:**
- Google Keep (minimalist note-taking)
- Instagram (intuitive interactions)
- WhatsApp (group coordination)
- Indian street vendor ecosystem

**Built With:**
- Cloudflare (free global infrastructure)
- Vercel (seamless deployment)
- React (UI framework)
- Vite (lightning-fast dev server)

---

## 📈 Success Metrics

**MVP Success (Week 6):**
- ✅ 10+ sessions completed
- ✅ 40%+ repeat usage
- ✅ Vendor reports 25%+ efficiency gain
- ✅ No critical bugs

**Product-Market Fit (Month 6):**
- ✅ 1,500+ monthly active users
- ✅ 60%+ session completion rate
- ✅ ₹50,000+ monthly revenue
- ✅ Launch in 5+ neighborhoods

**Sustainable Business (Year 1):**
- ✅ 10,000+ monthly users
- ✅ Break-even or profitable
- ✅ 200+ vendors on platform
- ✅ Strong network effects

---

## 🚀 Get Started

1. **Read the docs:** [DEVELOPMENT.md](docs/DEVELOPMENT.md)
2. **Setup infrastructure:** Cloudflare Tunnel + Vercel
3. **Start coding:** `npm run dev`
4. **Test on mobile:** https://dev.minibag.in
5. **Push to production:** `git push origin main`

---

**Built with ❤️ in India for India**

---

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Status:** Pre-Launch (Active Development)