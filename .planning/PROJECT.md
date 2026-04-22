# LocalLoops Source Code Protection

## What This Is

Source code protection for the LocalLoops federated platform ecosystem. LocalLoops is launching multiple coordination products (Minibag for vegetables, more coming) and needs to protect business IP during the live operation testing phase.

**Core Value:** Prevent casual copying of business logic and coordination algorithms without blocking validation and testing.

**Current State:**
- Minibag deployed and live at minibag.cc + minibag.onrender.com
- Repos: minibag-2 (frontend/backend) and sessions (SDK) currently public on GitHub
- Free tier deployment: Vercel (frontend) + Render (backend) + Supabase (database)
- Code readable via DevTools, no obfuscation, source maps disabled

**Target State:**
- "Good enough" protection for testing phase - slow down casual copying
- Upgrade path documented for when revenue validates stronger protection
- Maintain deployability and debuggability during testing

## Context

**Why Now:**
Testing live operation behavior with real users. Not worried about dev/build-time protection - need protection once deployed and publicly accessible.

**Threat Model:**
- Casual copying - Someone stumbles on code, grabs approach
- Junior competitors - Copy coordination patterns from readable code
- NOT defending against: Determined reverse engineering, enterprise theft

**Business Context:**
- LocalLoops = federated platform for local coordination products
- Minibag = first product (vegetable vendor coordination)
- More products planned using same platform patterns
- Testing phase = validate ecosystem before scaling investment

**Protection Philosophy:**
"Good enough for now" - Make it non-trivial to copy, not impossible. Upgrade when:
- Users validate the product (actual usage)
- Revenue justifies stronger protection
- Specific competitor emerges

## Requirements

### Validated

(None yet - greenfield protection implementation)

### Active

- [ ] **REPO-01**: minibag-2 and sessions repos are private on GitHub
- [ ] **OBFUS-01**: Frontend JavaScript obfuscated in production builds (Vite)
- [ ] **OBFUS-02**: Variable names mangled and unreadable in DevTools
- [ ] **OBFUS-03**: Control flow obfuscation applied to business logic
- [ ] **BACKEND-01**: Backend console logs removed in production
- [ ] **BACKEND-02**: Backend source minified (optional - nice to have)
- [ ] **DOC-01**: UPGRADE_PATH.md documents next-level protection options
- [ ] **DOC-02**: Protection decisions and trade-offs documented
- [ ] **BUILD-01**: Obfuscation integrated into Vercel build pipeline
- [ ] **BUILD-02**: Production builds succeed with obfuscation enabled
- [ ] **TEST-01**: App functions correctly with obfuscated frontend
- [ ] **PERF-01**: Obfuscation doesn't significantly impact bundle size (<10% increase)
- [ ] **DEBUG-01**: Development builds remain readable (obfuscation production-only)

### Out of Scope

- License key system - Defer until revenue validates (prevents self-hosting)
- Domain locking - Defer until validated (runtime domain checks)
- Runtime integrity checks - Defer until validated (tamper detection)
- Code signing - Defer (certificate-based verification)
- Enterprise DRM - Not needed for testing phase
- Backend obfuscation - Low ROI (not exposed to users directly)

## Technical Approach

**Frontend Obfuscation:**
- Tool: javascript-obfuscator + vite-plugin-javascript-obfuscator
- Settings: Medium strength (balance protection vs performance)
- Scope: Production builds only, dev builds untouched

**Repository Privacy:**
- GitHub free tier: Unlimited private repos
- Access: Maintain for deployment pipelines (Vercel, Render)
- Collaborators: Explicit invite only

**Backend Protection:**
- Remove console.log/debug statements in production (already partial via config)
- Keep source readable for debugging deployment issues
- Focus protection on frontend (user-facing attack surface)

**Upgrade Path (documented, not implemented):**
1. License key validation (backend API checks)
2. Domain whitelisting (reject requests from non-approved domains)
3. Runtime integrity checks (detect tampering)
4. Stronger obfuscation (increase complexity when needed)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Private repos first | Zero cost, immediate protection, reversible | Pending |
| Frontend obfuscation only | Users see frontend in DevTools, backend hidden by nature | Pending |
| Medium obfuscation strength | Balance protection vs bundle size/performance | Pending |
| Defer license keys | Don't add complexity until validated with users | Pending |
| Document upgrade path | Know next steps when growth justifies investment | Pending |

## Constraints

**Budget:** $0 for protection tools (free tier)
**Timeline:** Testing phase - need protection without blocking validation
**Performance:** Bundle size increase <10%, no noticeable runtime impact
**Debuggability:** Must be able to debug production issues
**Deployability:** Can't break Vercel/Render deployment pipelines

## Success Criteria

**Protection Effective When:**
- DevTools shows obfuscated, unreadable code
- Variable names are meaningless (a, b, c vs descriptive names)
- Control flow is confusing (hard to trace logic)
- Repos not browsable without GitHub account + access

**Validation Still Possible When:**
- Production deployment works normally
- Error stacks are traceable (error messages preserved)
- Performance metrics unchanged
- Development builds readable for debugging

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-22 after initialization*
