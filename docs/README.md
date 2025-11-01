# LocalLoops Documentation

Complete documentation for the LocalLoops ecosystem.

---

## 🎨 Design Documentation

### [Design System](design/LOCALLOOPS_DESIGN_SYSTEM.md)
**50+ pages** - Comprehensive design language for all LocalLoops apps
- Design philosophy & principles (conversational, privacy-first, behavioral fidelity)
- Visual design tokens (typography, colors, spacing, shadows)
- Component patterns (10+ components with full specifications)
- Interaction patterns (one-tap actions, progressive disclosure, real-time sync)
- Multilingual support (i18next, voice aliases, mixed language)
- Privacy-first patterns (anonymous nicknames, no phone exposure)
- Voice-first guidelines (UI, parsing, confirmation)
- Accessibility standards (WCAG 2.1 AA compliance)
- Responsive design (mobile-first, touch gestures, safe areas)

### [Future Features](design/FUTURE_FEATURES.md)
Planned features and enhancement ideas for future development

---

## 🏗️ Architecture Documentation

### [Shared Component Library](architecture/SHARED_COMPONENT_LIBRARY.md)
**40+ pages** - Component architecture and organization guide
- Package architecture (monorepo structure with 5 packages)
- Component catalog (@localloops/ui, identity, catalog, events)
- Component API standards (naming, props, composition patterns)
- Migration strategy (4-phase extraction from Minibag)
- Bundle optimization (tree-shaking, code splitting, <250KB target)
- Development workflow (local setup, publishing, documentation)
- Testing standards (unit tests, visual regression, a11y tests)

### [Core API Specification](architecture/CORE_API_SPECIFICATION.md)
**45+ pages** - API standards and endpoint specifications
- API design principles (RESTful, app-scoped, consistent responses)
- Authentication (Phase 0: session-based → Phase 1: JWT-based)
- Identity Layer API (7 endpoints: auth, profile, trust scores)
- Catalog Layer API (6 endpoints: categories, items, search)
- Events Layer API (WebSocket events + HTTP endpoints)
- Common patterns (field-level ACLs, multilingual, soft deletes)
- Error handling (10 standard error codes)
- Rate limiting (per-endpoint limits with Redis)
- Versioning strategy (backward compatibility rules)

### [Core Data Models](architecture/CORE_DATA_MODELS.md)
**50+ pages** - Database schemas and data patterns
- Database architecture (4 layers: Identity, Catalog, Events, Coordination)
- Identity Layer (3 tables: users, app_profiles, auth_sessions)
- Catalog Layer (3 tables: categories, items, aliases)
- Events Layer (2 tables: events, notifications)
- Coordination Layer (4 tables: sessions, participants, participant_items, nicknames_pool)
- Indexes & performance optimization (query patterns, partitioning)
- Data governance (privacy compliance, anonymization, audit logging)
- Migration strategy (Phase 0 → Phase 1 → Phase 2)

---

## 🛠️ Operations Documentation

### [Known Issues](operations/KNOWN_ISSUES.md)
Current bugs and technical debt tracking

### [Pre-Field Testing Improvements](operations/PRE_FIELD_TESTING_IMPROVEMENTS.md)
Critical security and optimization checklist before field testing

### [Bundle Quick Reference](operations/BUNDLE_QUICK_REFERENCE.md)
Bundle size monitoring and optimization tracking

### [Field Testing Guide](operations/FIELD_TESTING_GUIDE.md)
Testing procedures and validation criteria

---

## 🔧 Platform Infrastructure Documentation

### [Development](DEVELOPMENT.md)
Development environment setup and workflow
- Node.js, Git, VS Code setup
- Cloudflare Tunnel for dev environment
- Daily development workflow
- Debugging, testing, deployment procedures

### [Deployment](DEPLOYMENT.md)
Infrastructure deployment guide
- Cloudflare Tunnel + Vercel setup
- Domain configuration (localloops.in, minibag.in, etc.)
- Monitoring, rollback procedures
- Cost tracking

### [Database](DATABASE.md)
Database architecture and design decisions
- Supabase vs Firebase comparison
- Schema design for shared catalog & sessions
- Migration strategy
- Backup and recovery

### [Security](SECURITY.md)
Platform-wide security guidelines
- Authentication strategy (JWT, OTP)
- Privacy protection (anonymity-first)
- WebSocket security
- API security and rate limiting

### [Testing](TESTING.md)
Platform testing strategy
- Testing pyramid (unit, integration, E2E)
- Tools setup (Vitest, Jest, Playwright)
- CI/CD integration

---

## 📱 App-Specific Documentation

### Minibag (Vegetable Coordination)

**Core Documentation:**
- [Minibag README](../packages/minibag/README.md) - Product vision and overview
- [Bundle Monitoring Guide](../packages/minibag/BUNDLE_MONITORING_GUIDE.md) - Bundle optimization tracking
- [Feature Implementation Plan](../packages/minibag/FEATURE_IMPLEMENTATION_PLAN.md) - Upcoming features

**Implementation Details:**
- [API Documentation](../packages/minibag/docs/API.md) - Minibag-specific endpoints
- [Checkpoint Mechanism](../packages/minibag/docs/CHECKPOINT_MECHANISM.md) - Three-state coordination logic
- [Session Flows](../packages/minibag/docs/SESSION_FLOWS.md) - Detailed flowcharts
- [Error Handling](../packages/minibag/docs/ERROR_HANDLING.md) - Error codes and messages
- [Internationalization](../packages/minibag/docs/I18N.md) - Translation implementation
- [Image Hosting Strategy](../packages/minibag/docs/image_hosting_strategy.md) - Catalog images
- [Participant Journey](../packages/minibag/docs/participant-journey-improvements.md) - UX improvements

**UI Components:**
- [Tooltip Implementation](../packages/minibag/docs/TOOLTIP_IMPLEMENTATION.md)
- [Nickname Selection](../packages/minibag/docs/NICKNAME_SELECTION_IMPLEMENTATION.md)
- [Admin Dashboard Setup](../packages/minibag/docs/ADMIN_DASHBOARD_SETUP.md)

---

## 📚 Document Hierarchy

```
docs/
├── README.md (this file - documentation index)
│
├── Platform Infrastructure
│   ├── DEVELOPMENT.md
│   ├── DEPLOYMENT.md
│   ├── DATABASE.md
│   ├── SECURITY.md
│   └── TESTING.md
│
├── design/
│   ├── LOCALLOOPS_DESIGN_SYSTEM.md ★
│   └── FUTURE_FEATURES.md
│
├── architecture/
│   ├── SHARED_COMPONENT_LIBRARY.md ★
│   ├── CORE_API_SPECIFICATION.md ★
│   └── CORE_DATA_MODELS.md ★
│
└── operations/
    ├── KNOWN_ISSUES.md
    ├── PRE_FIELD_TESTING_IMPROVEMENTS.md
    ├── BUNDLE_QUICK_REFERENCE.md
    └── FIELD_TESTING_GUIDE.md

packages/minibag/docs/
├── API.md
├── CHECKPOINT_MECHANISM.md
├── SESSION_FLOWS.md
├── ERROR_HANDLING.md
├── I18N.md
├── image_hosting_strategy.md
├── participant-journey-improvements.md
├── TOOLTIP_IMPLEMENTATION.md
├── NICKNAME_SELECTION_IMPLEMENTATION.md
├── ADMIN_DASHBOARD_SETUP.md
└── archive/
    ├── MINIBAG_OPTIMIZATION_PLAN_2025-11-01.md
    └── sessionactivescreen-bloat-analysis.md

★ = Foundational documents (start here)
```

---

## 🚀 Getting Started with Documentation

### For New Developers
1. Start with [Design System](design/LOCALLOOPS_DESIGN_SYSTEM.md) to understand UX patterns
2. Review [Shared Component Library](architecture/SHARED_COMPONENT_LIBRARY.md) for code structure
3. Check [Known Issues](operations/KNOWN_ISSUES.md) for current limitations

### For Designers
1. [Design System](design/LOCALLOOPS_DESIGN_SYSTEM.md) - Complete visual language
2. [Future Features](design/FUTURE_FEATURES.md) - Upcoming UI/UX work

### For Backend Developers
1. [Core API Specification](architecture/CORE_API_SPECIFICATION.md) - API standards
2. [Core Data Models](architecture/CORE_DATA_MODELS.md) - Database schemas

### For Product Managers
1. [Future Features](design/FUTURE_FEATURES.md) - Roadmap ideas
2. [Pre-Field Testing Improvements](operations/PRE_FIELD_TESTING_IMPROVEMENTS.md) - Pre-launch checklist

---

## 📝 Document Maintenance

**Update Frequency:**
- **Design System:** Update when adding new components or patterns
- **Component Library:** Update when creating new shared packages
- **API Specification:** Update when adding/changing endpoints
- **Data Models:** Update when modifying database schema
- **Known Issues:** Update continuously as bugs are found/fixed
- **Future Features:** Update as ideas emerge or features are implemented

**Ownership:**
- Design docs: Design lead + Frontend developers
- Architecture docs: Tech lead + Senior developers
- Operations docs: DevOps + QA team

---

## 🔗 Related Documentation

### Root-Level Docs
- [README.md](../README.md) - Repository overview
- [QUICK_START.md](../QUICK_START.md) - 5-minute setup guide
- [SETUP_INSTRUCTIONS.md](../SETUP_INSTRUCTIONS.md) - Detailed setup
- [SETUP_DATABASE.md](../SETUP_DATABASE.md) - Database configuration
- [CHANGELOG.md](../CHANGELOG.md) - Version history

### App-Specific Docs
- [Minibag Documentation](../packages/minibag/) - Product vision, features, implementation

### Historical Docs
- [Archive](../archive/) - Session summaries and project snapshots

---

**Last Updated:** 2025-11-01
**Maintained by:** LocalLoops Core Team
