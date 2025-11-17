# Bundle Monitoring - Quick Reference Card

> **Keep this open while coding** 📌

---

## Daily Commands

```bash
# Check current bundle size
npm run size

# See what's taking space
npm run size:why

# Full bundle analysis (opens browser)
npm run build  # View dist/stats.html
```

---

## Traffic Light System 🚦

| Status | Size | Action |
|--------|------|--------|
| 🟢 **GREEN** | < 200 KB | Keep building features |
| 🟡 **YELLOW** | 200-300 KB | Investigate next sprint |
| 🔴 **RED** | > 300 KB | Stop & optimize now |

**Current Status:** 🟢 **192 KB** (healthy)

---

## Before Adding Dependencies

### Check size first:
1. Visit: `bundlephobia.com/package/[package-name]`
2. Look at "Minified + Gzipped" size

### Decision Matrix:

| Size | Action |
|------|--------|
| < 10 KB | ✅ Install freely |
| 10-50 KB | ⚠️ Consider alternatives |
| 50-100 KB | 🔴 Only if critical |
| > 100 KB | 🚨 Find lighter alternative |

### Common Alternatives:

```bash
# Heavy → Light alternatives
moment.js (67 KB)      → date-fns (12 KB)      ✅
lodash (71 KB)         → lodash-es (tree-shake) ✅
recharts (110 KB)      → chart.js (61 KB)      ✅
axios (14 KB)          → fetch (built-in)      ✅
react-icons (100 KB+)  → lucide-react (2 KB)   ✅
```

---

## Code Patterns to Prevent Bloat

### ✅ DO THIS:

```javascript
// Lazy load heavy routes
const AdminDashboard = lazy(() => import('./AdminDashboard'));

// Named imports (tree-shakeable)
import { debounce } from 'lodash-es';

// Conditional loading
if (userIsAdmin) {
  const charts = await import('chart.js');
}
```

### ❌ NOT THIS:

```javascript
// All routes in main bundle
import AdminDashboard from './AdminDashboard';

// Imports entire library
import _ from 'lodash';
import * as Icons from 'lucide-react';

// Always loaded even if unused
import 'chart.js';
import 'recharts';
```

---

## When You See 🔴 RED

### 1. What changed?
```bash
git diff HEAD~5 package.json
# Did we add new dependencies?
```

### 2. What's heavy?
```bash
npm run size:why
# Top 3 heaviest chunks?
```

### 3. Quick wins:
- [ ] Lazy load new routes?
- [ ] Remove unused dependencies?
- [ ] Check for duplicate libraries?
- [ ] Tree-shake imports correctly?

### 4. Can't reduce?
Document and accept:
```bash
git commit -m "feat: add feature X

Bundle increased to 280 KB (+30 KB over limit)
Reason: Added critical charts library
Trade-off: Better UX worth 30 KB cost
```

---

## Monitoring Checklist

### Every PR:
- [ ] CI runs `npm run size` automatically
- [ ] If 🔴 RED, fix before merging

### Every Release:
- [ ] Run `npm run size` manually
- [ ] Check bundle didn't grow >10%
- [ ] Update CHANGELOG if limits changed

### Every Quarter:
- [ ] Review bundle composition
- [ ] Remove unused dependencies
- [ ] Update to lighter alternatives

---

## Setup for New Apps (30 sec)

```bash
# 1. Install
npm install -D size-limit @size-limit/file

# 2. Copy config from Minibag
# See: packages/minibag/package.json
# Copy "scripts" and "size-limit" sections

# 3. Test
npm run build
npm run size
```

---

## Emergency: "Bundle is 500 KB, release is tomorrow!"

### Immediate actions (2 hours):

**1. Lazy load everything non-critical (30 min)**
```javascript
const Admin = lazy(() => import('./screens/Admin'));
const Settings = lazy(() => import('./screens/Settings'));
const Analytics = lazy(() => import('./screens/Analytics'));
```

**2. Remove unused deps (15 min)**
```bash
npm install -g depcheck
depcheck
npm uninstall [unused-packages]
```

**3. Enable compression (15 min)**
```javascript
// vite.config.js
build: {
  minify: 'terser',
  terserOptions: {
    compress: { drop_console: true }
  }
}
```

**4. Split vendors (30 min)**
```javascript
// vite.config.js - already done for Minibag ✅
manualChunks: {
  'vendor-react': ['react', 'react-dom'],
  'vendor-charts': ['chart.js'],
  // etc.
}
```

**5. Check images (30 min)**
```bash
# Compress images > 100 KB
# Use: squoosh.app
```

---

## Remember

### The Golden Rule:
> **Monitor passively, optimize actively**

Don't optimize until:
1. ✅ Bundle > 250 KB (yellow zone)
2. ✅ Users complaining about speed
3. ✅ Before major release

Until then: **build features freely** 🚀

---

## Who to Ask

**Bundle questions:** See `/packages/minibag/BUNDLE_MONITORING_GUIDE.md`

**Optimization help:** See `/docs/MINIBAG_OPTIMIZATION_PLAN.md`

**Quick check:** `npm run size`

---

**Last Updated:** November 1, 2025
**Current Status:** 🟢 Minibag 192 KB | ⚪ Partybag not set up | ⚪ Fitbag not set up
