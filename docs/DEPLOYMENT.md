# Deployment Guide

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**Infrastructure:** Cloudflare Tunnel (dev) + Vercel (prod)

---

## 🎯 Overview

This guide covers deploying LocalLoops products from development to production. We use a two-tier deployment strategy:
- **Development:** Cloudflare Tunnel for testing
- **Production:** Vercel for live deployment

---

## 📋 Prerequisites

Before deploying, ensure you have:

- [ ] Domains purchased (on Cloudflare Registrar)
- [ ] Cloudflare account (free)
- [ ] Vercel account (free)
- [ ] GitHub repository (for auto-deploy)
- [ ] Git installed locally
- [ ] Node.js 18+ installed

---

## 🌐 Domain Setup

### Step 1: Purchase Domains

**Go to:** https://www.cloudflare.com/products/registrar/

**Purchase:**
- `localloops.in` (₹800/year)
- `minibag.in` (₹800/year)
- `partybag.in` (₹800/year) - optional now
- `fitbag.in` (₹800/year) - optional now

**Total:** ₹3,200/year for all 4

### Step 2: Verify DNS Setup

Domains should auto-configure with Cloudflare DNS:

```bash
# Check DNS propagation
dig minibag.in

# Should show Cloudflare nameservers
```

**Wait:** 5-10 minutes for DNS propagation

---

## 🔷 Development Deployment (Cloudflare Tunnel)

### Installation

```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Verify installation
cloudflared --version
```

### Authentication

```bash
# Login to Cloudflare
cloudflared tunnel login

# Opens browser, select your account
# Authorize cloudflared
```

### Create Tunnel

```bash
# Create tunnel
cloudflared tunnel create localloops-dev

# Output example:
# Tunnel credentials written to: /Users/you/.cloudflared/abc-123-def.json
# Created tunnel localloops-dev with id abc-123-def-456

# Save the tunnel ID!
```

### Configure DNS

```bash
# Route subdomains to tunnel
cloudflared tunnel route dns localloops-dev dev.minibag.in
cloudflared tunnel route dns localloops-dev dev-ws.minibag.in
cloudflared tunnel route dns localloops-dev dev.localloops.in

# Verify routes
cloudflared tunnel list
```

### Configure Ingress

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: abc-123-def-456  # Your tunnel ID
credentials-file: /Users/YOUR_USERNAME/.cloudflared/abc-123-def-456.json

ingress:
  # Minibag frontend
  - hostname: dev.minibag.in
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true
  
  # WebSocket server
  - hostname: dev-ws.minibag.in
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true
  
  # LocalLoops parent site
  - hostname: dev.localloops.in
    service: http://localhost:5176
    originRequest:
      noTLSVerify: true
  
  # Catch-all (required)
  - service: http_status:404
```

### Start Tunnel

```bash
# Start tunnel (keep running)
cloudflared tunnel run localloops-dev

# Should see:
# Registered tunnel connection
# Serving https://dev.minibag.in
```

### Test Deployment

```bash
# Terminal 1: Tunnel
cloudflared tunnel run localloops-dev

# Terminal 2: Dev server
cd packages/minibag
npm run dev

# Access from anywhere:
# https://dev.minibag.in
```

### Auto-start on Boot (Optional)

Create launch agent for macOS:

```bash
# Create plist file
nano ~/Library/LaunchAgents/com.localloops.tunnel.plist
```

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.localloops.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/cloudflared</string>
        <string>tunnel</string>
        <string>run</string>
        <string>localloops-dev</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

```bash
# Load agent
launchctl load ~/Library/LaunchAgents/com.localloops.tunnel.plist

# Tunnel now starts automatically on boot
```

---

## 🚀 Production Deployment (Vercel)

### Installation

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login
```

### GitHub Setup

```bash
# Initialize git (if not already)
git init
git add .
git commit -m "Initial commit"

# Create GitHub repository
# Go to github.com → New Repository → localloops

# Push to GitHub
git remote add origin git@github.com:yourusername/localloops.git
git branch -M main
git push -u origin main
```

### Create Vercel Projects

#### Minibag Project

```bash
# Navigate to Minibag
cd packages/minibag

# Link to Vercel
vercel link

# Follow prompts:
# → Set up and deploy? No
# → Link to existing project? No
# → Project name: minibag
# → Directory: packages/minibag
```

#### LocalLoops Parent Project

```bash
# Navigate to root
cd ../..

# Link to Vercel
vercel link

# Follow prompts:
# → Project name: localloops
# → Directory: . (root)
```

### Configure Vercel Projects

**For each project, configure via Vercel Dashboard:**

https://vercel.com/dashboard

#### Minibag Configuration

**1. Go to Project Settings:**
- Select "minibag" project
- Settings → General

**2. Build & Development:**
```
Framework Preset: Vite
Root Directory: packages/minibag
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**3. Environment Variables:**

Settings → Environment Variables → Add

```bash
# Production
VITE_WS_URL=https://ws.minibag.in
VITE_API_URL=https://api.minibag.in
VITE_ENV=production
```

```bash
# Preview (optional)
VITE_WS_URL=https://preview-ws.minibag.in
VITE_API_URL=https://preview-api.minibag.in
VITE_ENV=preview
```

**4. Domains:**

Settings → Domains → Add Domain

- Add: `minibag.in`
- Add: `www.minibag.in` (redirect to minibag.in)

**5. Git Integration:**

Settings → Git

- Production Branch: `main`
- Enable: Auto-deploy on push

### Manual Deployment Test

```bash
# Test production build locally
cd packages/minibag
npm run build
npm run preview

# Deploy to Vercel (manual)
vercel --prod

# Follow prompts, should deploy to minibag.in
```

### Auto-Deployment Setup

**Create GitHub Action** (optional, Vercel auto-deploys by default):

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build Minibag
        run: |
          cd packages/minibag
          npm run build
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./packages/minibag
```

**Add secrets to GitHub:**

GitHub repo → Settings → Secrets → New repository secret

- `VERCEL_TOKEN` (from https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` (from Vercel project settings)
- `VERCEL_PROJECT_ID` (from Vercel project settings)

---

## 🔄 Deployment Workflow

### Daily Development

```bash
# Morning: Start tunnel
cloudflared tunnel run localloops-dev

# Start dev server
npm run dev

# Code all day, test at https://dev.minibag.in
```

### Deploy to Production

```bash
# 1. Commit changes
git add .
git commit -m "Add price memory feature"

# 2. Push to GitHub
git push origin main

# 3. Vercel auto-deploys (2-3 minutes)
# Watch: https://vercel.com/dashboard

# 4. Verify deployment
curl https://minibag.in
# Should return HTML

# 5. Test on mobile
# Open https://minibag.in on phone
```

### Rollback (If needed)

**Via Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Select "minibag" project
3. Deployments tab
4. Find previous working deployment
5. Click "..." → "Promote to Production"
6. Instant rollback

**Via CLI:**

```bash
# List deployments
vercel ls

# Promote specific deployment
vercel promote <deployment-url>
```

---

## 🧪 Testing Deployments

### Development Testing

```bash
# Check tunnel status
cloudflared tunnel info localloops-dev

# Test dev URL
curl https://dev.minibag.in
# Should return HTML

# Test from mobile
# Open https://dev.minibag.in
# Should load app
```

### Production Testing

```bash
# Test production URL
curl https://minibag.in
# Should return HTML

# Check SSL
curl -I https://minibag.in
# Should show: HTTP/2 200

# Check headers
curl -I https://minibag.in | grep -i cloudflare
# Should show Cloudflare headers

# Performance test
curl -o /dev/null -s -w "%{time_total}\n" https://minibag.in
# Should be <2 seconds
```

### Smoke Tests

**After each deployment, verify:**

- [ ] Homepage loads
- [ ] Can create session
- [ ] Can add items
- [ ] Can navigate all screens
- [ ] Mobile layout works
- [ ] No console errors
- [ ] Images load
- [ ] Fonts load

---

## 🐛 Troubleshooting

### Cloudflare Tunnel Issues

**Problem:** Tunnel won't start

```bash
# Check if tunnel exists
cloudflared tunnel list

# Check tunnel info
cloudflared tunnel info localloops-dev

# Delete and recreate if needed
cloudflared tunnel delete localloops-dev
cloudflared tunnel create localloops-dev
```

**Problem:** DNS not resolving

```bash
# Check DNS records
dig dev.minibag.in

# Re-add DNS route
cloudflared tunnel route dns localloops-dev dev.minibag.in

# Wait 2-5 minutes for propagation
```

**Problem:** 502 Bad Gateway

```bash
# Check if local server is running
curl http://localhost:5173

# Check tunnel logs
cloudflared tunnel run localloops-dev
# Look for connection errors
```

### Vercel Deployment Issues

**Problem:** Build fails

```bash
# Check build locally first
npm run build

# If succeeds locally, check Vercel logs:
# Vercel Dashboard → Project → Deployments → Failed Build → Logs

# Common issues:
# - Missing environment variables
# - Wrong build command
# - Wrong output directory
```

**Problem:** Domain not connecting

```bash
# Check Vercel domain status
# Vercel Dashboard → Settings → Domains

# Should show:
# minibag.in → Valid Configuration

# If not, click "Refresh"
# Check Cloudflare DNS has correct records
```

**Problem:** Environment variables not working

```bash
# Verify in Vercel Dashboard:
# Settings → Environment Variables

# Check variable names match code:
# VITE_WS_URL (not WS_URL)

# Redeploy after adding variables:
vercel --prod
```

---

## 📊 Monitoring Deployments

### Vercel Analytics

**Enable in Dashboard:**
- Go to Project → Analytics
- Enable Web Analytics (free)

**Metrics tracked:**
- Page views
- Unique visitors
- Top pages
- Performance scores

### Uptime Monitoring

**Use UptimeRobot (free):**

1. Go to https://uptimerobot.com
2. Add New Monitor
3. Type: HTTPS
4. URL: https://minibag.in
5. Interval: 5 minutes
6. Alert: Email when down

### Error Tracking (Optional)

**Sentry setup:**

```bash
# Install Sentry
npm install @sentry/react @sentry/vite-plugin

# Configure in vite.config.js
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default {
  plugins: [
    sentryVitePlugin({
      org: "localloops",
      project: "minibag"
    })
  ]
}

# Initialize in App.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://...@sentry.io/...",
  environment: import.meta.env.VITE_ENV
});
```

---

## 💰 Cost Tracking

### Current Costs (v1.0.0)

| Service | Cost | Notes |
|---------|------|-------|
| Domains | ₹3,200/year | One-time annual |
| Cloudflare Tunnel | ₹0 | Free forever |
| Vercel (Free tier) | ₹0 | 100GB bandwidth |
| **Total** | **₹3,200/year** | |

### Scaling Costs (100-300 users)

| Service | Cost | When to Upgrade |
|---------|------|----------------|
| Vercel Pro | ₹1,650/month | >100GB bandwidth |
| Database | ₹1,000-2,000/month | When adding backend |
| Sentry | ₹2,200/month | For error tracking |
| **Total** | **₹5,000-6,000/month** | |

### Budget Alerts

**Set up in Vercel:**
- Settings → Usage → Set alerts
- Alert at 80GB (before limit)
- Alert at ₹1,000/month

---

## 🔐 Security Checklist

### Before Production Deploy

- [ ] Environment variables set (no secrets in code)
- [ ] HTTPS enforced (Vercel does this automatically)
- [ ] CORS configured properly
- [ ] Input validation on client
- [ ] No console.logs with sensitive data
- [ ] Error messages don't leak info
- [ ] Rate limiting considered (future)

### Post-Deploy

- [ ] SSL certificate valid (check browser)
- [ ] Security headers present (check curl -I)
- [ ] No exposed .env files
- [ ] No debug mode in production

---

## 📋 Deployment Checklist

### Pre-Deployment

- [ ] All tests passing locally
- [ ] No console errors
- [ ] Mobile responsive verified
- [ ] Environment variables configured
- [ ] Build succeeds locally
- [ ] Git committed and pushed

### Deployment

- [ ] Push to GitHub
- [ ] Vercel auto-deploys
- [ ] Check deployment logs
- [ ] Wait for "Deployment Ready"
- [ ] Note deployment URL

### Post-Deployment

- [ ] Homepage loads (https://minibag.in)
- [ ] Smoke tests pass (see above)
- [ ] Mobile test (phone browser)
- [ ] Slow network test (3G simulation)
- [ ] Check Vercel Analytics
- [ ] Monitor for errors (first hour)

### If Issues

- [ ] Check Vercel logs
- [ ] Rollback to previous version
- [ ] Fix locally
- [ ] Redeploy

---

## 🎯 Deployment Strategy

### Environments

**Development:**
- URL: https://dev.minibag.in
- Purpose: Daily development, testing
- Updates: Instant (hot reload)
- Users: Developers, internal testers

**Production:**
- URL: https://minibag.in
- Purpose: Real users
- Updates: On git push (2-3 min)
- Users: Public

**Preview (Optional):**
- URL: https://preview-abc123.vercel.app
- Purpose: Feature testing before merge
- Updates: On pull request
- Users: Reviewers

### Deployment Frequency

**Current (Pre-launch):**
- Deploy: Multiple times per day
- Strategy: Move fast, fix bugs quickly
- Risk: Low (no real users yet)

**Post-Launch:**
- Deploy: 1-2 times per day
- Strategy: Batch changes, test thoroughly
- Risk: Medium (real users affected)

**Stable (Month 6+):**
- Deploy: 1-2 times per week
- Strategy: Careful releases, staged rollout
- Risk: High (many users, reputation)

---

## 🚀 Advanced Deployment

### Preview Deployments

**Vercel creates preview for each pull request:**

1. Create feature branch
2. Make changes
3. Push branch
4. Create PR on GitHub
5. Vercel auto-deploys preview
6. Test at preview URL
7. Merge if good
8. Auto-deploys to production

### Staged Rollouts (Future)

**Vercel Pro feature:**

1. Deploy to 10% of users
2. Monitor for errors
3. Increase to 50%
4. Monitor again
5. Deploy to 100%

### Blue-Green Deployment (Future)

**For zero-downtime updates:**

1. Deploy new version (green)
2. Keep old version (blue)
3. Switch traffic to green
4. Monitor for issues
5. Rollback to blue if needed

---

## 📞 Support

**Issues with deployment?**

- Cloudflare Tunnel: https://developers.cloudflare.com/
- Vercel: https://vercel.com/docs
- GitHub Actions: https://docs.github.com/en/actions

**Internal docs:**
- Setup: DEVELOPMENT.md
- Architecture: ARCHITECTURE.md

---

**Last Updated:** October 13, 2025  
**Next Review:** After first production deployment  
**Maintained By:** LocalLoops Team