# Bundle Monitoring Guide

**For LocalLoops Apps: Minibag, Partybag, Fitbag**

> **Philosophy:** Monitor passively, optimize actively. Build features freely, fix bloat when limits are crossed.

---

## Quick Start (5 minutes)

### Current Minibag Status ✅

```bash
npm run size
```

```
✅ Total JS Bundle:     192 KB gzipped (limit: 250 KB)
✅ Initial Load:        76 KB gzipped (limit: 100 KB)
✅ CSS Bundle:          8 KB gzipped (limit: 20 KB)
```

**Status:** Healthy - no action needed

---

## What This Does

### Automatic Warnings
- Alerts you when bundle crosses thresholds
- Shows exact size of each bundle
- Identifies which files are growing
- **Does NOT slow down development**

### When to Run

**Automatically (recommended):**
```bash
# Add to .github/workflows/ci.yml
- run: npm run build
- run: npm run size  # Fails CI if over limit
```

**Manually:**
```bash
npm run size           # Check current size
npm run size:why       # See what's taking space
```

**Frequency:**
- ✅ Every PR (automated CI)
- ✅ Before releases
- ❌ NOT during active coding

---

## Bundle Size Philosophy

### The Traffic Light System 🚦

#### 🟢 Green Zone: < 200 KB gzipped
**Action:** None - keep building features
- Fast on 3G networks
- Good Lighthouse scores
- Industry standard for e-commerce

#### 🟡 Yellow Zone: 200-300 KB gzipped
**Action:** Investigate but don't panic
- Check what grew: `npm run size:why`
- Look for low-hanging fruit
- Schedule optimization for next sprint

#### 🔴 Red Zone: > 300 KB gzipped
**Action:** Stop and optimize NOW
- Users will experience slow loads
- High bounce rates likely
- Prioritize bundle reduction

---

## Setup for New Apps (Partybag/Fitbag)

### Step 1: Install (2 minutes)
```bash
cd packages/partybag  # or fitbag
npm install -D size-limit @size-limit/file
```

### Step 2: Add to package.json

**Scripts section:**
```json
{
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why"
  }
}
```

**At end of file:**
```json
{
  "size-limit": [
    {
      "name": "Total JS Bundle (gzipped)",
      "path": "dist/assets/*.js",
      "limit": "250 KB",
      "gzip": true
    },
    {
      "name": "Initial Load",
      "path": [
        "dist/assets/index-*.js",
        "dist/assets/vendor-react-*.js"
      ],
      "limit": "100 KB",
      "gzip": true
    },
    {
      "name": "CSS Bundle",
      "path": "dist/assets/*.css",
      "limit": "20 KB",
      "gzip": true
    }
  ]
}
```

### Step 3: Test
```bash
npm run build
npm run size
```

**Expected output:**
```
✅ Total JS Bundle: XX KB gzipped (limit: 250 KB)
✅ Initial Load: XX KB gzipped (limit: 100 KB)
✅ CSS Bundle: XX KB gzipped (limit: 20 KB)
```

---

## When Limits Are Exceeded

### Example Warning:
```bash
npm run size

❌ Total JS Bundle (gzipped)
  Size limit: 250 KB
  Size:       267 KB gzipped  ← 17 KB over limit!
```

### Investigation Process

**Step 1: What grew?**
```bash
npm run size:why
# Shows breakdown of what's in the bundle
```

**Step 2: Check recent changes**
```bash
git log --oneline -10
# What was added recently?
```

**Step 3: Common culprits**

1. **New dependency added?**
   ```bash
   # Check size before installing
   # Visit: https://bundlephobia.com/package/[package-name]

   # Example:
   moment.js = 67 KB gzipped  ❌ Heavy
   date-fns = 12 KB gzipped  ✅ Lighter
   ```

2. **Route not lazy-loaded?**
   ```javascript
   // ❌ BAD
   import AdminDashboard from './AdminDashboard';

   // ✅ GOOD
   const AdminDashboard = lazy(() => import('./AdminDashboard'));
   ```

3. **Library imported incorrectly?**
   ```javascript
   // ❌ BAD - imports entire library
   import _ from 'lodash';

   // ✅ GOOD - tree-shakeable
   import { debounce } from 'lodash-es';
   ```

4. **Large asset added?**
   ```bash
   # Check image sizes
   du -sh src/assets/*

   # Optimize if needed
   # Use: squoosh.app or imageoptim
   ```

---

## Adjustment Guidelines

### When to RAISE Limits

**Valid reasons:**
- Adding critical features (charts, maps, rich editor)
- Target audience changed (now using 4G/5G)
- Competitor analysis shows 300 KB is acceptable

**How to raise:**
```json
{
  "size-limit": [
    {
      "name": "Total JS Bundle",
      "limit": "300 KB"  // ← Increased from 250 KB
    }
  ]
}
```

**Document why:**
```javascript
// In commit message:
"chore: increase bundle limit to 300 KB

Reason: Added Recharts library (110 KB) for analytics dashboard.
Users requested data visualization features.
Accepted trade-off: +50 KB for better UX."
```

### When to LOWER Limits

**Valid reasons:**
- Successfully optimized below current limit
- Want to prevent future growth
- Targeting slower networks

**How to lower:**
```json
{
  "limit": "200 KB"  // ← Decreased from 250 KB
}
```

---

## Development Workflow

### Day-to-Day Development
```bash
# 1. Build feature normally
git checkout -b feature/new-checkout-flow

# 2. Code freely, don't worry about bundle size
# (Monitor will catch issues later)

# 3. Before committing, check size
npm run build
npm run size

# If green ✅ → commit and push
# If red ❌ → see "When Limits Are Exceeded" section
```

### Pre-Release Checklist
```bash
# 1. Build production bundle
npm run build

# 2. Check sizes
npm run size

# 3. Analyze bundle composition
npm run build  # Opens stats.html in browser

# 4. If over limit, optimize before release
```

---

## Monitoring Dashboards

### Option 1: GitHub Actions (Recommended)

Create `.github/workflows/bundle-size.yml`:

```yaml
name: Bundle Size Check

on: [pull_request]

jobs:
  size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Check bundle size
        run: npm run size
```

**Result:** Every PR shows bundle size in CI

### Option 2: Manual Tracking (Low-Tech)

Keep a log file:

```bash
# After each major release
echo "$(date): $(npm run size)" >> BUNDLE_HISTORY.txt
```

---

## FAQ

### Q: Does this slow down my development?
**A:** No. It only runs when you manually type `npm run size` or in CI.

### Q: What if I need to exceed the limit temporarily?
**A:** Fine! Just document why in your commit:
```bash
git commit -m "feat: add video upload

BUNDLE: Temporarily exceeds limit by 20 KB
TODO: Optimize in follow-up PR #123"
```

### Q: Should I optimize every time I'm 1 KB over?
**A:** No. Limits have 10% grace period built in. Only optimize if >10% over.

### Q: Can I disable this for rapid prototyping?
**A:** Yes! Comment out the check in CI, but re-enable before production release.

---

## Limits Reference Table

### Recommended Limits by App Type

| App Type | Total Bundle | Initial Load | CSS |
|----------|--------------|--------------|-----|
| **Simple Landing Page** | 100 KB | 50 KB | 10 KB |
| **Basic SPA (Minibag)** | 250 KB | 100 KB | 20 KB |
| **Rich Dashboard** | 400 KB | 150 KB | 30 KB |
| **Heavy App (Google Docs)** | 800 KB | 300 KB | 50 KB |

### Minibag Current Limits

```json
{
  "Total JS Bundle": "250 KB",      // For India 3G users
  "Initial Load": "100 KB",         // Time to Interactive < 5s
  "CSS Bundle": "20 KB"             // Tailwind purged styles
}
```

**Rationale:**
- India users on 3G networks
- Competing with Swiggy/Flipkart (~150-200 KB)
- Mobile-first experience
- Fast time-to-interactive critical

---

## Copy-Paste Setup for Partybag/Fitbag

### Complete package.json addition:

```json
{
  "scripts": {
    "size": "size-limit",
    "size:why": "size-limit --why"
  },
  "devDependencies": {
    "size-limit": "^11.2.0",
    "@size-limit/file": "^11.2.0"
  },
  "size-limit": [
    {
      "name": "Total JS Bundle (gzipped)",
      "path": "dist/assets/*.js",
      "limit": "250 KB",
      "gzip": true
    },
    {
      "name": "Initial Load",
      "path": [
        "dist/assets/index-*.js",
        "dist/assets/vendor-react-*.js"
      ],
      "limit": "100 KB",
      "gzip": true
    },
    {
      "name": "CSS Bundle",
      "path": "dist/assets/*.css",
      "limit": "20 KB",
      "gzip": true
    }
  ]
}
```

### Then run:
```bash
npm install
npm run build
npm run size
```

---

## Remember

### ✅ DO:
- Monitor bundle size in CI
- Investigate when limits crossed
- Document why limits were raised
- Check bundle size before releases

### ❌ DON'T:
- Obsess over every KB
- Optimize prematurely
- Let it block feature development
- Forget to update limits as app matures

---

**Bottom Line:** Set it up once, let it watch your back, optimize when red lights flash.

**For questions:** See `/docs/MINIBAG_OPTIMIZATION_PLAN.md` for deep-dive optimization strategies.

---

**Last Updated:** November 1, 2025
**Apps Using This:** Minibag (active), Partybag (pending), Fitbag (pending)
