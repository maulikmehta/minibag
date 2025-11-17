# Development Guide

**Last Updated:** October 13, 2025  
**Version:** 1.0.0  
**For:** LocalLoops Platform (Minibag, Partybag, Fitbag)

---

## 🎯 Overview

This guide covers the complete development workflow for LocalLoops products, from initial setup to daily development and testing.

**Development Strategy:**
- **Local development:** Fast iteration with hot reload
- **Global testing:** Test on any device via Cloudflare Tunnel
- **Production deployment:** Auto-deploy via Vercel

---

## 📋 Prerequisites

Before you start, ensure you have:

### **Required Software**
- [ ] **Node.js 18+** - [Download](https://nodejs.org/)
- [ ] **npm** or **yarn** - Comes with Node.js
- [ ] **Git** - [Download](https://git-scm.com/)
- [ ] **Code editor** - VS Code recommended

### **Required Accounts**
- [ ] **GitHub account** - For version control
- [ ] **Cloudflare account** - For development tunnel (free)
- [ ] **Vercel account** - For production deployment (free)

### **Optional Tools**
- [ ] **VS Code extensions:**
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - GitLens
- [ ] **Browser extensions:**
  - React Developer Tools
  - Lighthouse (for performance testing)

---

## 🚀 Initial Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/localloops.git
cd localloops

# Verify structure
ls -la
# Should see: packages/, docs/, CHANGELOG.md, README.md, etc.
```

### Step 2: Install Dependencies

```bash
# Install all dependencies (root + all packages)
npm install

# This installs:
# - Root workspace dependencies
# - Minibag dependencies
# - Shared package dependencies
# - Development tools
```

**Expected output:**
```
added 847 packages in 45s
```

### Step 3: Verify Installation

```bash
# Check Node version
node --version
# Should be v18.0.0 or higher

# Check npm version
npm --version
# Should be v9.0.0 or higher

# Verify workspace structure
npm run --workspaces ls
# Should list: minibag, shared
```

---

## 🔧 Environment Configuration

### Create Environment Files

#### **1. Root Environment (.env)**
```bash
# Create at project root
touch .env
```

Add to `.env`:
```bash
# Development mode
NODE_ENV=development

# WebSocket server (future)
WS_PORT=8080
WS_URL=ws://localhost:8080

# API server (future)
API_PORT=3000
API_URL=http://localhost:3000
```

#### **2. Minibag Environment (.env.development)**
```bash
# Create in packages/minibag/
cd packages/minibag
touch .env.development
```

Add to `.env.development`:
```bash
# Vite development server
VITE_PORT=5173

# WebSocket URL (for real-time sync - future)
VITE_WS_URL=ws://localhost:8080

# API URL (for backend calls - future)
VITE_API_URL=http://localhost:3000

# Environment
VITE_ENV=development

# Feature flags
VITE_ENABLE_WEBSOCKET=false
VITE_ENABLE_AUTH=false
```

#### **3. Minibag Production Environment (.env.production)**
```bash
# Create in packages/minibag/
touch .env.production
```

Add to `.env.production`:
```bash
# Production WebSocket
VITE_WS_URL=wss://ws.minibag.in

# Production API
VITE_API_URL=https://api.minibag.in

# Environment
VITE_ENV=production

# Feature flags
VITE_ENABLE_WEBSOCKET=true
VITE_ENABLE_AUTH=true
```

### Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_WS_URL` | WebSocket server URL | `ws://localhost:8080` |
| `VITE_API_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_ENV` | Environment name | `development` |
| `VITE_ENABLE_WEBSOCKET` | Enable real-time sync | `false` (MVP) |
| `VITE_ENABLE_AUTH` | Enable authentication | `false` (MVP) |

**Note:** All environment variables for Vite must be prefixed with `VITE_` to be accessible in the app.

---

## 🌐 Cloudflare Tunnel Setup (Development)

Cloudflare Tunnel allows you to:
- Access your local dev server from any device
- Test on mobile data (not just WiFi)
- Share with testers anywhere
- Use HTTPS in development

### Installation

```bash
# macOS (Homebrew)
brew install cloudflare/cloudflare/cloudflared

# macOS (Direct)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz | tar xz
sudo mv cloudflared /usr/local/bin/

# Linux
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Verify installation
cloudflared --version
```

### Authentication

```bash
# Login to Cloudflare
cloudflared tunnel login

# This will:
# 1. Open browser
# 2. Ask you to select your account
# 3. Authorize cloudflared
# 4. Save credentials locally
```

### Create Development Tunnel

```bash
# Create tunnel named "localloops-dev"
cloudflared tunnel create localloops-dev

# Output example:
# Tunnel credentials written to: 
# /Users/you/.cloudflared/abc-123-def-456.json
# 
# Created tunnel localloops-dev with id: abc-123-def-456
```

**Important:** Save the tunnel ID! You'll need it for configuration.

### Configure DNS Routes

```bash
# Route dev subdomain to tunnel
cloudflared tunnel route dns localloops-dev dev.minibag.in

# Verify route
cloudflared tunnel list
# Should show: localloops-dev with status HEALTHY
```

### Create Tunnel Configuration

Create `~/.cloudflared/config.yml`:

```yaml
# Replace with your tunnel ID
tunnel: abc-123-def-456
credentials-file: /Users/YOUR_USERNAME/.cloudflared/abc-123-def-456.json

ingress:
  # Minibag frontend
  - hostname: dev.minibag.in
    service: http://localhost:5173
    originRequest:
      noTLSVerify: true
      connectTimeout: 30s
      noHappyEyeballs: false
  
  # WebSocket server (future)
  - hostname: dev-ws.minibag.in
    service: http://localhost:8080
    originRequest:
      noTLSVerify: true
  
  # LocalLoops admin dashboard (future)
  - hostname: dev.localloops.in
    service: http://localhost:5176
    originRequest:
      noTLSVerify: true
  
  # Catch-all rule (required)
  - service: http_status:404
```

**Configuration notes:**
- `tunnel`: Your unique tunnel ID
- `credentials-file`: Path to tunnel credentials (update username)
- `hostname`: Public URL (must own domain)
- `service`: Local development server URL
- `noTLSVerify`: Allow self-signed certs in dev

### Test Tunnel

```bash
# Terminal 1: Start tunnel
cloudflared tunnel run localloops-dev

# Should see:
# INF Connection registered connIndex=0
# INF Connection registered connIndex=1
# ...

# Terminal 2: Start dev server
cd packages/minibag
npm run dev

# Terminal 1 (tunnel) should show:
# Registered tunnel connection
# Serving https://dev.minibag.in

# Test from any device:
# Open: https://dev.minibag.in
```

### Auto-Start Tunnel on Boot (Optional)

Create launch agent for macOS:

```bash
# Create plist file
nano ~/Library/LaunchAgents/com.localloops.tunnel.plist
```

Add content:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
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
    
    <key>StandardOutPath</key>
    <string>/tmp/cloudflared.log</string>
    
    <key>StandardErrorPath</key>
    <string>/tmp/cloudflared-error.log</string>
</dict>
</plist>
```

Load the agent:
```bash
# Load agent
launchctl load ~/Library/LaunchAgents/com.localloops.tunnel.plist

# Verify it's running
launchctl list | grep localloops

# Check logs
tail -f /tmp/cloudflared.log
```

Now the tunnel starts automatically when you boot your Mac!

---

## 💻 Daily Development Workflow

### Morning Routine

```bash
# 1. Start Cloudflare Tunnel (if not auto-starting)
cloudflared tunnel run localloops-dev
# Leave this terminal open

# 2. Open new terminal, start dev server
cd localloops/packages/minibag
npm run dev

# Output:
# VITE v5.x.x  ready in xxx ms
# 
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
# ➜  press h to show help
```

### Development URLs

**Local (same machine):**
- Frontend: http://localhost:5173
- Fast, hot reload instantly

**Tunnel (any device):**
- Frontend: https://dev.minibag.in
- Accessible from anywhere (mobile data, other WiFi)
- Hot reload in 1-2 seconds

### Making Changes

```bash
# Edit files in packages/minibag/src/
# Example: Edit App.jsx

# Vite automatically detects changes
# Browser reloads instantly (HMR - Hot Module Replacement)
```

**Hot Module Replacement (HMR):**
- CSS changes: Instant update, no reload
- React components: Fast refresh, state preserved
- Config changes: Full reload required

### Testing on Mobile

```bash
# Ensure tunnel is running
# On phone browser, open:
https://dev.minibag.in

# Test:
# - Touch interactions
# - Mobile keyboard
# - Screen sizes
# - 3G/4G performance
# - Mobile Safari vs Chrome
```

### Viewing Logs

```bash
# Terminal with dev server shows:
# - Build logs
# - Console.log output
# - Errors/warnings
# - HTTP requests

# To filter logs:
npm run dev 2>&1 | grep ERROR
```

---

## 🧪 Testing Workflow

### Manual Testing Checklist

**Every feature change:**
- [ ] Test on desktop browser (Chrome)
- [ ] Test on mobile browser (Safari iOS, Chrome Android)
- [ ] Test on slow network (Chrome DevTools → Network → Slow 3G)
- [ ] Check console for errors
- [ ] Verify responsive layout (320px to 1920px)

**Before committing:**
- [ ] No console errors
- [ ] All features work as expected
- [ ] Mobile layout correct
- [ ] No ESLint warnings
- [ ] Code formatted (Prettier)

### Browser Testing

```bash
# Open in multiple browsers
# Chrome (primary)
open -a "Google Chrome" http://localhost:5173

# Safari (iOS testing)
open -a Safari http://localhost:5173

# Firefox (cross-browser check)
open -a Firefox http://localhost:5173
```

### Mobile Device Testing

**Option 1: Tunnel URL**
```
Phone → Browser → https://dev.minibag.in
Fast, works on mobile data
```

**Option 2: Local Network (same WiFi)**
```bash
# Start with --host flag
npm run dev -- --host

# Output shows:
# ➜  Network: http://192.168.1.x:5173/

# On phone:
http://192.168.1.x:5173
```

### Network Simulation

**Chrome DevTools:**
```
1. Open DevTools (F12)
2. Network tab
3. Throttling dropdown
4. Select: Slow 3G
5. Test app performance
```

**Common issues on slow networks:**
- Images load slowly → Optimize images
- Large JavaScript bundles → Code splitting
- Many HTTP requests → Bundle properly

---

## 🐛 Debugging

### Common Issues & Solutions

#### **Issue: Port already in use**
```bash
# Error: Port 5173 is already in use

# Solution 1: Kill process
lsof -ti:5173 | xargs kill -9

# Solution 2: Use different port
npm run dev -- --port 5174
```

#### **Issue: Hot reload not working**
```bash
# Symptoms: Changes don't reflect in browser

# Solutions:
# 1. Hard refresh browser (Cmd+Shift+R)
# 2. Clear browser cache
# 3. Restart dev server
# 4. Check file watcher limits (Linux):
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

#### **Issue: Tunnel not connecting**
```bash
# Check tunnel status
cloudflared tunnel list

# Restart tunnel
pkill cloudflared
cloudflared tunnel run localloops-dev

# Check tunnel logs
tail -f /tmp/cloudflared.log
```

#### **Issue: Environment variables not loading**
```bash
# Symptoms: Config values are undefined

# Solutions:
# 1. Verify .env file exists
ls -la packages/minibag/.env.development

# 2. Check variable names start with VITE_
cat packages/minibag/.env.development | grep VITE_

# 3. Restart dev server (env loaded on startup)
# Stop server (Ctrl+C)
npm run dev

# 4. Verify in code:
console.log(import.meta.env.VITE_WS_URL)
```

#### **Issue: Module not found**
```bash
# Error: Cannot find module 'xyz'

# Solution 1: Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Solution 2: Clear npm cache
npm cache clean --force
npm install

# Solution 3: Check import path
# Ensure relative paths are correct:
import Component from './Component' // correct
import Component from 'Component'   // wrong (unless aliased)
```

### Debug Mode

Enable verbose logging:

```bash
# Add to .env.development
VITE_DEBUG=true

# In code, use conditional logs:
if (import.meta.env.VITE_DEBUG) {
  console.log('Debug info:', data);
}
```

### Browser DevTools

**Console tab:**
- View console.log output
- See errors and warnings
- Test JavaScript expressions

**Network tab:**
- Monitor HTTP requests
- Check response times
- Verify API calls

**React DevTools:**
- Inspect component tree
- View component props/state
- Profile performance

---

## 📦 Building for Production

### Local Production Build

```bash
# Navigate to package
cd packages/minibag

# Build production bundle
npm run build

# Output:
# dist/
# ├── index.html
# ├── assets/
# │   ├── index-abc123.js
# │   └── index-def456.css

# Preview production build locally
npm run preview

# Opens: http://localhost:4173
```

### Build Verification

```bash
# Check bundle size
du -sh dist/

# Should be < 500KB for initial load

# Analyze bundle
npm run build -- --mode analyze
# Opens bundle visualization
```

---

## 🔄 Git Workflow

### Daily Commits

```bash
# Check status
git status

# Stage changes
git add .

# Commit with descriptive message
git commit -m "Add price memory feature to Minibag"

# Push to GitHub
git push origin main
```

### Commit Message Convention

```
Format: <type>: <description>

Types:
- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style (formatting, no logic change)
- refactor: Code refactoring
- test: Add tests
- chore: Build/tooling changes

Examples:
feat: add price memory to shopping screen
fix: resolve avatar circle cutoff on mobile
docs: update DEVELOPMENT.md with tunnel setup
style: format code with Prettier
refactor: extract payment modal to separate component
```

### Branch Strategy

**Current (pre-launch):**
```
main → Development and production
```

**Post-launch (future):**
```
main → Production only
develop → Active development
feature/* → New features
hotfix/* → Urgent fixes
```

---

## 🚀 Deployment Preview

### Vercel Preview Deployments

Vercel automatically creates preview deployments for:
- Every git push
- Every pull request

**Preview URL format:**
```
https://minibag-preview-abc123.vercel.app
```

**Test preview:**
```bash
# Push to GitHub
git push origin feature-branch

# Vercel builds automatically (2-3 min)
# Check email for preview URL
# Or visit: https://vercel.com/dashboard
```

---

## 📊 Performance Monitoring

### Lighthouse Audit

```bash
# In Chrome DevTools
# 1. Open DevTools (F12)
# 2. Lighthouse tab
# 3. Click "Generate report"

# Target scores:
# Performance: > 90
# Accessibility: > 95
# Best Practices: > 90
# SEO: > 90
```

### Bundle Size Monitoring

```bash
# Check bundle size after build
npm run build
ls -lh dist/assets/

# Keep JavaScript < 200KB
# Keep CSS < 50KB
```

---

## 🛠️ Development Tools

### Recommended VS Code Extensions

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "eamodio.gitlens",
    "dsznajder.es7-react-js-snippets"
  ]
}
```

### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.css": "tailwindcss"
  },
  "tailwindCSS.experimental.classRegex": [
    ["clsx\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

### Useful npm Scripts

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Format code
npm run format

# Type check (if using TypeScript)
npm run type-check
```

---

## 📝 Code Style Guidelines

### File Naming

```
Components: PascalCase
  - Button.jsx
  - PaymentModal.jsx

Utilities: camelCase
  - calculations.js
  - formatters.js

Constants: UPPER_SNAKE_CASE
  - API_URL.js
  - CATEGORIES.js
```

### Component Structure

```jsx
// 1. Imports
import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

// 2. Constants
const MAX_QUANTITY = 10;

// 3. Component
export default function ItemCard({ item, onUpdate }) {
  // 4. State
  const [quantity, setQuantity] = useState(0);
  
  // 5. Handlers
  const handleIncrement = () => {
    if (quantity < MAX_QUANTITY) {
      setQuantity(q => q + 1);
      onUpdate(item.id, quantity + 1);
    }
  };
  
  // 6. Render
  return (
    <div className="flex items-center gap-4">
      {/* Component JSX */}
    </div>
  );
}
```

### Tailwind CSS Guidelines

```jsx
// ✅ Good: Utility classes
<div className="flex items-center gap-4 p-6 bg-white rounded-lg">

// ❌ Bad: Inline styles
<div style={{ display: 'flex', padding: '24px' }}>

// ✅ Good: Conditional classes
<div className={`px-4 py-2 ${isActive ? 'bg-black text-white' : 'bg-white text-black'}`}>

// ✅ Good: Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

---

## 🔐 Security Best Practices

### Environment Variables

```bash
# ✅ Never commit .env files
echo ".env*" >> .gitignore

# ✅ Use environment variables for secrets
VITE_API_KEY=abc123

# ❌ Never hardcode secrets
const API_KEY = "abc123"; // Wrong!
```

### API Keys

```bash
# Store in .env (not committed)
VITE_CLOUDFLARE_API_KEY=xxx
VITE_VERCEL_TOKEN=yyy

# Access in code
const apiKey = import.meta.env.VITE_CLOUDFLARE_API_KEY;
```

---

## 📞 Getting Help

### Documentation

- **Project docs:** `/docs/` folder
- **React docs:** https://react.dev
- **Vite docs:** https://vitejs.dev
- **Tailwind docs:** https://tailwindcss.com
- **Cloudflare Tunnel:** https://developers.cloudflare.com/cloudflare-one/connections/connect-apps

### Common Questions

**Q: How do I test on my phone?**
A: Use Cloudflare Tunnel → https://dev.minibag.in

**Q: Hot reload isn't working?**
A: Restart dev server, hard refresh browser

**Q: How do I deploy to production?**
A: Just `git push origin main` → Vercel auto-deploys

**Q: Where are build files?**
A: `packages/minibag/dist/` after `npm run build`

**Q: How do I add a new package?**
A: See `/docs/ARCHITECTURE.md` for monorepo structure

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Start everything
npm run dev

# Build production
npm run build

# Start tunnel
cloudflared tunnel run localloops-dev

# Git workflow
git add .
git commit -m "message"
git push origin main
```

### Important URLs

| URL | Purpose |
|-----|---------|
| http://localhost:5173 | Local dev server |
| https://dev.minibag.in | Tunnel (any device) |
| https://minibag.in | Production |
| https://vercel.com/dashboard | Deployment status |

### Important Files

| File | Purpose |
|------|---------|
| `.env.development` | Dev environment config |
| `vite.config.js` | Vite configuration |
| `package.json` | Dependencies and scripts |
| `~/.cloudflared/config.yml` | Tunnel configuration |

---

## ✅ Development Checklist

**Daily:**
- [ ] Start Cloudflare Tunnel
- [ ] Start dev server
- [ ] Test on desktop
- [ ] Test on mobile (via tunnel)
- [ ] Commit changes regularly

**Before Pushing:**
- [ ] No console errors
- [ ] Code formatted
- [ ] Features work as expected
- [ ] Mobile responsive
- [ ] Good commit message

**Before Deploying:**
- [ ] Run production build locally
- [ ] Test production build
- [ ] Check bundle size
- [ ] Update CHANGELOG.md
- [ ] Create git tag (if version bump)

---

**Last Updated:** October 13, 2025  
**Next Review:** After backend integration  
**Maintained By:** LocalLoops Team