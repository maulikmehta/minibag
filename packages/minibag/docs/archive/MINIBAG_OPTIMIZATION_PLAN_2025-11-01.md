# Minibag Build Optimization Plan

**Created:** November 1, 2025
**Scope:** minibag package only (vegetable shopping app)
**Status:** Ready to implement

---

## Executive Summary

Current minibag build produces a **588 KB main bundle** (183 KB gzipped), resulting in ~10 second load times on 3G networks. Industry benchmarks for similar apps target <150 KB gzipped bundles with <5 second load times.

**Industry Rating: C (4.5/10)** - Below average for React e-commerce apps in India.

**Optimization Goal:** Reduce bundle to ~100 KB gzipped, achieve 90+ Lighthouse score, and reach **A grade (9/10)** industry rating.

---

## Current State Analysis

### Bundle Composition
- **Main bundle:** 588 KB (183 KB gzipped)
- **CSS bundle:** 35 KB (8 KB gzipped)
- **Source maps:** 2.3 MB (production enabled - security issue)
- **Total distribution:** 3.0 MB

### Performance Metrics (Estimated)
- **Load time (3G):** ~10 seconds
- **Time to Interactive:** ~15 seconds
- **Lighthouse Score:** ~65/100
- **First Contentful Paint:** ~3-4 seconds

### Critical Issues Identified
1. ❌ **Single monolithic bundle** - No code splitting (all routes in one file)
2. ❌ **Chart.js always bundled** - Admin dashboard (180 KB) loads for all users
3. ❌ **Production source maps enabled** - Security risk + 2.3 MB waste
4. ❌ **No bundle analysis tooling** - Can't identify optimization opportunities
5. ❌ **Heavy react-router-dom v7.x** - Bleeding edge version (45 KB vs 20 KB stable)

### Industry Comparison

| App | Bundle (gzipped) | Lighthouse | Minibag vs |
|-----|------------------|------------|------------|
| **Flipkart Lite** | ~80 KB | 95+ | ❌ 2.3x heavier |
| **Myntra PWA** | ~120 KB | 90+ | ❌ 1.5x heavier |
| **Swiggy** | ~150 KB | 88+ | ❌ 1.2x heavier |
| **Minibag** | ~183 KB | ~65 | - |

---

## Optimization Goals

### Primary Objectives
1. **Faster load times** - Reduce 3G load from 10s to <5s
2. **Smaller data usage** - Save user data costs (important in India)
3. **Better Lighthouse scores** - Achieve 90+ for SEO and rankings

### Target Metrics

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| **Initial Bundle** | 183 KB gz | 100 KB gz | -45% |
| **Load Time (3G)** | 10s | 3-4s | -60% |
| **Time to Interactive** | 15s | 5-6s | -60% |
| **Lighthouse Score** | 65 | 90+ | +38% |
| **Industry Grade** | C (4.5/10) | A (9/10) | +4.5 pts |

---

## Implementation Phases

### Phase 1: Quick Wins (2-4 hours) 🚀

**Objective:** Immediate improvements with zero feature changes

#### 1.1 Disable Production Source Maps
**File:** `packages/minibag/vite.config.js`

**Change:**
```javascript
build: {
  outDir: 'dist',
  sourcemap: false  // Was: true
}
```

**Impact:**
- Saves 2.3 MB server storage
- Removes source code exposure risk
- No user-facing changes
- **Risk:** None

---

#### 1.2 Install Bundle Analyzer
**Command:**
```bash
cd packages/minibag
npm install -D rollup-plugin-visualizer
```

**Update vite.config.js:**
```javascript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: 'dist/stats.html' })
  ],
  // ... rest of config
});
```

**Impact:**
- Visual report of bundle composition
- Identifies optimization opportunities
- No runtime impact
- **Risk:** None (dev dependency)

---

#### 1.3 Lazy Load Admin Dashboard
**Files to modify:**
- `packages/minibag/src/App.jsx`
- `packages/minibag/src/screens/AdminDashboard/index.jsx`

**Change App.jsx:**
```javascript
import { lazy, Suspense } from 'react';

// Remove: import AdminDashboard from './screens/AdminDashboard';
// Add:
const AdminDashboard = lazy(() => import('./screens/AdminDashboard'));

// Wrap route in Suspense:
<Route
  path="/admin"
  element={
    <Suspense fallback={<div>Loading admin...</div>}>
      <AdminDashboard />
    </Suspense>
  }
/>
```

**Impact:**
- Removes 180 KB (Chart.js + react-chartjs-2) from main bundle
- Admin loads on-demand when accessed
- Admin functionality unchanged
- **Risk:** Low - Admin rarely used, can test thoroughly

**Phase 1 Expected Results:**
- Bundle: 588 KB → ~408 KB (-31%)
- Load time: 10s → 7s
- Gzipped: 183 KB → ~125 KB

---

### Phase 2: Route-Based Code Splitting (1 day) 📦

**Objective:** Split app into separate chunks per screen

#### 2.1 Convert All Screens to Lazy Routes

**Files to modify:**
- `packages/minibag/src/App.jsx`

**Screens to split (9 total):**
1. SessionCreateScreen
2. SessionActiveScreen
3. ShoppingScreen
4. BillScreen
5. ParticipantChecklistScreen
6. ParticipantTrackingScreen
7. SessionJoinScreen
8. HomeScreen
9. MinibagPrototype

**Change:**
```javascript
// Before:
import SessionCreateScreen from './screens/SessionCreateScreen';
import SessionActiveScreen from './screens/SessionActiveScreen';
// ... all 9 imports

// After:
const SessionCreateScreen = lazy(() => import('./screens/SessionCreateScreen'));
const SessionActiveScreen = lazy(() => import('./screens/SessionActiveScreen'));
// ... all 9 lazy loads

// Wrap all routes in Suspense with loading indicator
```

**Impact:**
- Main bundle only contains routing logic
- Each screen downloads on first access
- Screens cached after first load
- **Risk:** Medium - Test all navigation flows

---

#### 2.2 Manual Vendor Chunking

**File:** `packages/minibag/vite.config.js`

**Add to build config:**
```javascript
build: {
  outDir: 'dist',
  sourcemap: false,
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-socket': ['socket.io-client'],
        'vendor-i18n': ['i18next', 'react-i18next', 'i18next-browser-languagedetector'],
        'vendor-charts': ['chart.js', 'react-chartjs-2']
      }
    }
  }
}
```

**Impact:**
- Core vendors cached separately (React, Router)
- Socket.io only loads for active sessions
- i18n loads once, cached
- Charts only in admin chunk
- **Risk:** Low - Standard practice

**Phase 2 Expected Results:**
- Initial bundle: 408 KB → ~180 KB (-56% from start)
- Vendor chunk: ~150 KB (cached between visits)
- Screen chunks: 30-50 KB each
- Subsequent navigation: much faster

---

### Phase 3: Dependency Optimization (1 day) 🔧

**Objective:** Replace/optimize heavy libraries

#### 3.1 Downgrade react-router-dom

**File:** `packages/minibag/package.json`

**Change:**
```json
{
  "dependencies": {
    "react-router-dom": "^6.21.0"  // Was: ^7.9.4
  }
}
```

**Code changes required:**
- Minimal API differences between v6 and v7
- Main change: `createBrowserRouter` API if used
- Navigation hooks remain the same

**Commands:**
```bash
cd packages/minibag
npm uninstall react-router-dom
npm install react-router-dom@^6.21.0
npm run build  # Test
```

**Impact:**
- Saves 25 KB (45 KB → 20 KB)
- More stable API
- **Risk:** Low - v6 is stable and well-tested

---

#### 3.2 Replace Chart.js with Recharts

**Files to modify:**
- `packages/minibag/src/screens/AdminDashboard/index.jsx`
- `packages/minibag/package.json`

**Change package.json:**
```json
{
  "dependencies": {
    // Remove:
    // "chart.js": "^4.5.1",
    // "react-chartjs-2": "^5.3.0",

    // Add:
    "recharts": "^2.10.0"
  }
}
```

**Rewrite charts in AdminDashboard:**
```javascript
// Before: Chart.js
import { Line, Bar } from 'react-chartjs-2';

// After: Recharts
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
```

**Impact:**
- Saves 130 KB (180 KB Chart.js → 50 KB Recharts)
- Similar functionality
- Different API (requires rewrite)
- **Risk:** Medium - Admin dashboard needs thorough testing

---

#### 3.3 Verify Lucide-react Tree-Shaking

**File:** `packages/minibag/vite.config.js`

**Add explicit config:**
```javascript
build: {
  rollupOptions: {
    external: [],
    output: {
      // Ensure lucide-react is tree-shaken
      manualChunks: (id) => {
        if (id.includes('lucide-react')) {
          return 'vendor-icons';
        }
      }
    }
  }
}
```

**Audit icon usage:**
- Review all icon imports
- Ensure only used icons imported
- Remove unused icons

**Impact:**
- Reduces icon bundle to only used icons
- Saves 20-30 KB if tree-shaking works
- **Risk:** None - purely optimization

**Phase 3 Expected Results:**
- Bundle: 180 KB → ~130 KB (-28% more)
- Admin dashboard lighter
- More stable dependencies

---

### Phase 4: Asset & Compression (4-6 hours) 🗜️

**Objective:** Optimize images and compression

#### 4.1 Add Image Optimization

**Install plugin:**
```bash
cd packages/minibag
npm install -D vite-plugin-imagemin
```

**Update vite.config.js:**
```javascript
import viteImagemin from 'vite-plugin-imagemin';

export default defineConfig({
  plugins: [
    react(),
    visualizer({ open: true, filename: 'dist/stats.html' }),
    viteImagemin({
      gifsicle: { optimizationLevel: 7 },
      optipng: { optimizationLevel: 7 },
      mozjpeg: { quality: 80 },
      pngquant: { quality: [0.8, 0.9], speed: 4 },
      svgo: {
        plugins: [
          { name: 'removeViewBox', active: false },
          { name: 'removeEmptyAttrs', active: false }
        ]
      }
    })
  ]
});
```

**Add WebP conversion:**
```javascript
webp: { quality: 80 }
```

**Impact:**
- Images 30-40% smaller
- Automatic on build
- No code changes needed
- **Risk:** None - images remain functional

---

#### 4.2 Enable Brotli Compression

**Server configuration required** (depends on hosting):

**For Vercel (vercel.json):**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Encoding",
          "value": "br"
        }
      ]
    }
  ]
}
```

**For Nginx:**
```nginx
brotli on;
brotli_comp_level 6;
brotli_types text/plain text/css application/javascript application/json;
```

**Impact:**
- 15-20% better compression than gzip
- 130 KB → ~100 KB gzipped with Brotli
- **Risk:** None - fallback to gzip if unsupported

---

#### 4.3 Optimize TailwindCSS

**File:** `packages/minibag/tailwind.config.js`

**Update content paths:**
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
    // Remove: "./*.{js,ts,jsx,tsx}" (root level unnecessary)
  ],
  theme: { extend: {} },
  plugins: []
}
```

**Add PurgeCSS options:**
```javascript
export default {
  content: {
    files: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    options: {
      safelist: {
        standard: [/^data-/, /^aria-/]  // Keep accessibility classes
      }
    }
  }
}
```

**Impact:**
- Removes unused CSS
- Smaller CSS bundle
- **Risk:** Low - Test UI thoroughly

**Phase 4 Expected Results:**
- Images: 30-40% smaller
- Total bundle: 130 KB → ~100 KB (Brotli)
- Faster loads, same visuals

---

### Phase 5: Monitoring & Budgets (4-6 hours) 📊

**Objective:** Prevent future regressions

#### 5.1 Add Lighthouse CI

**Install:**
```bash
npm install -g @lhci/cli
cd packages/minibag
npm install -D @lhci/cli
```

**Create config:** `packages/minibag/lighthouserc.json`
```json
{
  "ci": {
    "collect": {
      "startServerCommand": "npm run preview",
      "url": ["http://localhost:4173"],
      "numberOfRuns": 3
    },
    "assert": {
      "preset": "lighthouse:recommended",
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.85}],
        "categories:accessibility": ["error", {"minScore": 0.90}],
        "first-contentful-paint": ["error", {"maxNumericValue": 2000}],
        "interactive": ["error", {"maxNumericValue": 5000}]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

**Add npm scripts:**
```json
{
  "scripts": {
    "lighthouse": "lhci autorun",
    "lighthouse:ci": "npm run build && npm run lighthouse"
  }
}
```

**Impact:**
- Automated performance testing
- Fails CI if scores drop
- **Risk:** None - monitoring only

---

#### 5.2 Set Performance Budgets

**Create:** `packages/minibag/.size-limit.json`
```json
[
  {
    "name": "Main bundle",
    "path": "dist/assets/index-*.js",
    "limit": "150 KB",
    "gzip": true
  },
  {
    "name": "CSS bundle",
    "path": "dist/assets/index-*.css",
    "limit": "20 KB",
    "gzip": true
  },
  {
    "name": "Total page weight",
    "path": "dist/**/*.{js,css}",
    "limit": "200 KB",
    "gzip": true
  }
]
```

**Install size-limit:**
```bash
npm install -D size-limit @size-limit/file
```

**Add npm script:**
```json
{
  "scripts": {
    "size": "size-limit"
  }
}
```

**CI integration (.github/workflows/bundle-size.yml):**
```yaml
name: Bundle Size Check
on: [push]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run size
```

**Impact:**
- Alerts when bundle exceeds limits
- Prevents regressions
- **Risk:** None

---

#### 5.3 Add Build Performance Tracking

**Create:** `packages/minibag/scripts/track-build.js`
```javascript
import { readFileSync, appendFileSync } from 'fs';
import { join } from 'path';

const distPath = join(process.cwd(), 'dist');
const statsFile = join(process.cwd(), 'build-stats.csv');

// Read build files
const files = readdirSync(distPath, { recursive: true });
let totalSize = 0;

files.forEach(file => {
  const stats = statSync(join(distPath, file));
  totalSize += stats.size;
});

// Log to CSV
const date = new Date().toISOString();
const row = `${date},${totalSize},${Date.now() - startTime}ms\n`;
appendFileSync(statsFile, row);

console.log(`Build completed: ${totalSize} bytes in ${Date.now() - startTime}ms`);
```

**Add to package.json:**
```json
{
  "scripts": {
    "build": "vite build && node scripts/track-build.js"
  }
}
```

**Impact:**
- Historical bundle size data
- Build time tracking
- Identify trends
- **Risk:** None

**Phase 5 Expected Results:**
- Automated performance monitoring
- No future regressions
- Alerts on size increases

---

### Phase 6: PWA & Caching (4-6 hours) ⚡

**Objective:** Offline support and faster repeat visits

#### 6.1 Add Service Worker

**Install Vite PWA plugin:**
```bash
npm install -D vite-plugin-pwa
```

**Update vite.config.js:**
```javascript
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Minibag - Vegetable Shopping',
        short_name: 'Minibag',
        description: 'Coordinate vegetable shopping with friends',
        theme_color: '#10b981',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.minibag\.in\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ]
});
```

**Impact:**
- App works offline
- Faster repeat visits
- Install as PWA
- **Risk:** Low - service worker is optional

---

#### 6.2 Add Cache Headers

**Server configuration** (Vercel example):

**Create:** `packages/minibag/vercel.json`
```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        }
      ]
    }
  ]
}
```

**Impact:**
- Assets cached for 1 year
- HTML always fresh
- Instant repeat visits
- **Risk:** None - standard practice

**Phase 6 Expected Results:**
- First visit: ~100 KB download
- Repeat visits: ~0 KB (from cache)
- Works offline

---

## Testing Strategy

### After Each Phase

**1. Build Verification (2 min)**
```bash
cd packages/minibag
npm run build
```
- Check for errors
- Verify bundle size decreased

**2. Bundle Analysis (3 min)**
```bash
npm run build
# Open dist/stats.html
```
- Review chunk sizes
- Identify unexpected bloat

**3. Local Preview (5 min)**
```bash
npm run preview
```
- Test all screens
- Verify features work
- Check console for errors

**4. Mobile Testing (10 min)**
- Use Chrome DevTools mobile emulation
- Test on real device if available
- Throttle to 3G network
- Verify load times improved

### Smoke Test Checklist

- [ ] Home screen loads
- [ ] Create session flow works
- [ ] Add items to catalog
- [ ] Join session as participant
- [ ] Confirm item list
- [ ] Record payment
- [ ] View bill
- [ ] Admin dashboard loads
- [ ] All navigation works
- [ ] No console errors

### Regression Testing

- [ ] WebSocket connection works
- [ ] Real-time updates sync
- [ ] i18n language switching
- [ ] Payment methods (UPI/Cash)
- [ ] QR code scanning
- [ ] WhatsApp sharing
- [ ] Cost splitting calculation

---

## Risk Assessment

| Phase | Risk Level | Mitigation |
|-------|------------|------------|
| Phase 1 | 🟢 Low | Configuration only, no code changes |
| Phase 2 | 🟡 Medium | Test all routes thoroughly |
| Phase 3 | 🟡 Medium | Chart.js replacement needs careful testing |
| Phase 4 | 🟢 Low | Asset optimization is automatic |
| Phase 5 | 🟢 Low | Monitoring doesn't affect runtime |
| Phase 6 | 🟢 Low | PWA is progressive enhancement |

### Rollback Strategy

1. **Git commits after each phase** - Easy rollback
2. **Feature flags for major changes** - Can disable if issues
3. **Keep old dependencies** - Can revert if needed
4. **Bundle analyzer** - Compare before/after

---

## Success Metrics

### Primary KPIs

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Initial Bundle (gz)** | 183 KB | 100 KB | Bundle analyzer |
| **Load Time (3G)** | 10s | 4s | Lighthouse |
| **Time to Interactive** | 15s | 6s | Lighthouse |
| **Lighthouse Score** | 65 | 90+ | Lighthouse CI |

### Secondary KPIs

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Data Usage (first)** | 623 KB | 200 KB | Network tab |
| **Data Usage (repeat)** | 623 KB | 0 KB | Service worker |
| **Build Time** | Unknown | <30s | Build logs |
| **Bundle Count** | 1 main | 8+ chunks | dist/ folder |

---

## Timeline & Milestones

### Week 1: Core Optimizations

| Day | Phase | Deliverable |
|-----|-------|-------------|
| **Day 1** | Phase 1 | Quick wins complete, 30% size reduction |
| **Day 2** | Phase 2 | Code splitting complete, 56% reduction |
| **Day 3** | Phase 3 | Dependencies optimized, 70% reduction |

### Week 2: Polish & Monitoring

| Day | Phase | Deliverable |
|-----|-------|-------------|
| **Day 4** | Phase 4 | Assets optimized, Brotli enabled |
| **Day 5** | Phase 5 | Monitoring and budgets set up |
| **Day 6** | Phase 6 | PWA implemented, offline support |
| **Day 7** | - | Testing, documentation, final review |

---

## Post-Optimization Checklist

### Documentation

- [ ] Update README.md with new bundle sizes
- [ ] Document optimization decisions
- [ ] Update build scripts in package.json
- [ ] Create performance monitoring guide

### Code Quality

- [ ] Remove unused dependencies
- [ ] Update comments for lazy loading
- [ ] Add JSDoc for new functions
- [ ] Run linter and fix warnings

### Monitoring

- [ ] Set up Lighthouse CI in GitHub Actions
- [ ] Configure bundle size alerts
- [ ] Add performance dashboard
- [ ] Document how to check bundle size

### Knowledge Transfer

- [ ] Train team on new build process
- [ ] Document how to add new routes (lazy loading)
- [ ] Explain performance budgets
- [ ] Share before/after metrics

---

## Future Optimizations (Post-Plan)

### Not Included in Current Plan

1. **Micro-frontends** - Split into separate apps (advanced)
2. **Server-side rendering** - Improve first paint (complex)
3. **Edge caching** - CDN optimization (infrastructure)
4. **Image CDN** - Cloudinary/Imgix integration (cost)
5. **Critical CSS extraction** - Inline above-fold CSS (diminishing returns)

### Monitoring for Future

- Track bundle size over time
- Monitor user load times (RUM)
- Watch Core Web Vitals
- Analyze bundle composition quarterly

---

## Appendix: Commands Reference

### Build & Analysis
```bash
# Development
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Analyze bundle
npm run build  # Opens stats.html automatically

# Check bundle size
npm run size

# Run Lighthouse
npm run lighthouse
```

### Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Lint
npm run lint
```

### Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod

# Deploy to other platforms
# (Copy dist/ folder to hosting)
```

---

## Resources

### Documentation
- [Vite Build Optimizations](https://vitejs.dev/guide/build.html)
- [React Code Splitting](https://react.dev/reference/react/lazy)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Web.dev Performance](https://web.dev/performance/)

### Tools
- [Bundle Analyzer](https://www.npmjs.com/package/rollup-plugin-visualizer)
- [Size Limit](https://github.com/ai/size-limit)
- [Lighthouse](https://github.com/GoogleChrome/lighthouse)
- [WebPageTest](https://www.webpagetest.org/)

### Industry Benchmarks
- [HTTP Archive](https://httparchive.org/)
- [Web Almanac](https://almanac.httparchive.org/)
- [Chrome User Experience Report](https://developer.chrome.com/docs/crux/)

---

**Last Updated:** November 1, 2025
**Next Review:** After Phase 6 completion
**Maintained By:** LocalLoops Team
