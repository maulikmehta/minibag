# Minibag Deployment Guide

Complete deployment guide for Minibag (LocalLoops) infrastructure.

## Architecture Overview

```
┌─────────────────┐         ┌──────────────────┐
│  minibag.cc     │ ◄─────► │  Backend Server  │
│  (Vercel)       │         │  (Render.com)    │
│  React Frontend │         │  Node.js + WS    │
└─────────────────┘         └──────────────────┘
                                     │
                                     ▼
                            ┌──────────────────┐
                            │    Supabase      │
                            │    PostgreSQL    │
                            └──────────────────┘
```

**Frontend**: React PWA (packages/minibag) → Vercel
**Backend**: Node.js + Socket.io (packages/shared) → Render.com
**Database**: Supabase PostgreSQL

---

## Prerequisites

### 1. GitHub Repository
- ✅ Repository: https://github.com/maulikmehta/minibag
- ✅ Branch: `main`

### 2. Accounts Required
- [ ] Vercel account (free tier)
- [ ] Render.com account (free tier)
- [ ] Supabase account (free tier)
- [ ] Razorpay account (production payments)
- [ ] SMS provider account (for OTP)

### 3. Domain Setup
- [ ] Domain: minibag.cc
- [ ] DNS configured to point to Vercel

---

## Part 1: Frontend Deployment (Vercel)

### Step 1: Connect Repository

1. Go to https://vercel.com/new
2. Import project: `maulikmehta/minibag`
3. Framework preset: **Vite**

### Step 2: Configure Build Settings

**Build Command:**
```bash
cd packages/minibag && npm run build
```

**Output Directory:**
```
packages/minibag/dist
```

**Install Command:**
```bash
npm install
```

**Root Directory:**
```
./
```

### Step 3: Environment Variables

Add these in Vercel dashboard:

```env
# Backend URLs (will update after Render deployment)
VITE_API_URL=https://your-backend-url.onrender.com
VITE_WS_URL=https://your-backend-url.onrender.com

# Node environment
NODE_ENV=production
```

### Step 4: Domain Configuration

1. Go to **Settings** → **Domains**
2. Add custom domain: `minibag.cc`
3. Configure DNS:
   - Type: `A`
   - Name: `@`
   - Value: (Vercel provides IP)
   - TTL: `Auto`

4. Add www redirect:
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`

### Step 5: Deploy

- Push to `main` branch
- Vercel auto-deploys (2-3 minutes)
- Check: https://minibag.cc

---

## Part 2: Backend Deployment (Render.com)

### Step 1: Create Web Service

1. Go to https://dashboard.render.com/
2. Click **New** → **Web Service**
3. Connect GitHub repository: `maulikmehta/minibag`
4. Select branch: `main`

### Step 2: Configure Service

**Name:** `minibag-backend`
**Region:** Singapore (closest to India)
**Branch:** `main`
**Root Directory:** `./`

**Build Command:**
```bash
cd packages/shared && npm install
```

**Start Command:**
```bash
cd packages/shared && npm start
```

**Plan:** Free (upgradable later)

### Step 3: Environment Variables

Add these in Render dashboard:

#### Required - Database
```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key
```

#### Required - Security
```env
JWT_SECRET=generate_random_64_char_string
ENCRYPTION_KEY=generate_32_byte_hex_string
ADMIN_PASSWORD=secure_admin_password
```

Generate secrets:
```bash
# JWT Secret (64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Encryption Key (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### Required - Payments
```env
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

#### Required - SMS/OTP
```env
SMS_API_KEY=your_sms_api_key
SMS_API_URL=https://api.your-sms-provider.com
```

#### Required - App Config
```env
NODE_ENV=production
PORT=3000
WEBSOCKET_PORT=3001
API_PORT=3000
FRONTEND_URL=https://minibag.cc
```

#### Feature Flags
```env
USE_SESSIONS_SDK=false
DUAL_WRITE_MODE=false
ENABLE_GROUP_MODE=true
```

### Step 4: Health Check

Render auto-configures health check:
- Path: `/health`
- Response: `{"status":"healthy","timestamp":"..."}`

### Step 5: Deploy

- Click **Create Web Service**
- Wait 5-10 minutes for first deployment
- Check logs for errors
- Note the backend URL: `https://minibag-backend-xxxxx.onrender.com`

### Step 6: Update Frontend URLs

Go back to Vercel:
1. **Settings** → **Environment Variables**
2. Update:
   ```env
   VITE_API_URL=https://minibag-backend-xxxxx.onrender.com
   VITE_WS_URL=https://minibag-backend-xxxxx.onrender.com
   ```
3. Redeploy frontend

---

## Part 3: Database Setup (Supabase)

### Step 1: Create Project

1. Go to https://supabase.com
2. Create new project
3. Region: **Southeast Asia (Singapore)**
4. Note credentials

### Step 2: Run Migrations

Execute SQL from `database/migrations/` in Supabase SQL editor:
```bash
# Check migration files
ls database/migrations/
```

Run in order:
1. `001_create_sessions.sql`
2. `002_create_participants.sql`
3. `003_create_items.sql`
4. (continue with all migration files)

### Step 3: Enable Row Level Security (RLS)

Enable RLS on all tables:
```sql
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
-- (repeat for all tables)
```

### Step 4: Create Policies

See `database/policies.sql` for complete RLS policies.

### Step 5: Update Environment Variables

Copy Supabase credentials to Render.com environment variables.

---

## Part 4: Verification

### Frontend Check
```bash
curl https://minibag.cc
# Should return HTML
```

### Backend Check
```bash
curl https://minibag-backend-xxxxx.onrender.com/health
# Response: {"status":"healthy","timestamp":"..."}
```

### WebSocket Check
```bash
# Use browser console at minibag.cc
const socket = io();
socket.on('connect', () => console.log('Connected'));
```

### Database Check
```bash
# In Supabase SQL editor
SELECT COUNT(*) FROM sessions;
```

---

## Part 5: Post-Deployment

### 1. Enable CORS

Backend already configured for:
- https://minibag.cc
- https://www.minibag.cc

### 2. SSL/HTTPS

Both Vercel and Render provide free SSL certificates automatically.

### 3. Monitoring

**Vercel:**
- Analytics: Built-in
- Logs: Dashboard → Project → Logs

**Render:**
- Logs: Dashboard → Service → Logs
- Metrics: Dashboard → Service → Metrics

**Supabase:**
- Logs: Dashboard → Logs
- Database: Dashboard → Database

### 4. Error Tracking

Backend uses Sentry (optional):
```env
SENTRY_DSN=your_sentry_dsn
```

---

## Troubleshooting

### Frontend Issues

**Build Fails:**
```bash
# Check locally first
cd packages/minibag
npm install
npm run build
```

**Environment Variables Not Working:**
- Prefix must be `VITE_`
- Redeploy after changing env vars

### Backend Issues

**Connection Refused:**
- Check Render logs
- Verify PORT environment variable
- Check health endpoint

**Database Connection Failed:**
- Verify Supabase credentials
- Check IP allowlist (Render IPs)
- Test connection from Render shell

**WebSocket Not Connecting:**
- Check CORS origins in server.js
- Verify FRONTEND_URL env var
- Check browser console for errors

### Database Issues

**Migrations Failed:**
- Run migrations in order
- Check for syntax errors
- Verify table dependencies

---

## Rollback Procedure

### Frontend
1. Vercel Dashboard → Deployments
2. Select previous deployment
3. Click **Promote to Production**

### Backend
1. Render Dashboard → Service → Deploys
2. Select previous deploy
3. Click **Deploy**

### Database
Keep migration backups:
```sql
-- Backup before migration
pg_dump > backup_$(date +%Y%m%d).sql
```

---

## Performance Optimization

### Frontend (Vercel)
- Edge caching enabled (automatic)
- Asset compression (automatic)
- Image optimization (automatic)

### Backend (Render)
- Use **Starter** plan ($7/month) for:
  - Faster cold starts
  - More memory (512MB)
  - Better CPU

### Database (Supabase)
- **Pro** plan ($25/month) for:
  - Dedicated resources
  - Point-in-time recovery
  - Better connection pooling

---

## Cost Breakdown

### Free Tier (Development/MVP)
- Vercel: $0/month (100GB bandwidth)
- Render: $0/month (750 hours)
- Supabase: $0/month (500MB database, 1GB bandwidth)
- **Total: $0/month**

### Production (100-300 users)
- Vercel Pro: $20/month (1TB bandwidth)
- Render Starter: $7/month (always-on)
- Supabase Pro: $25/month (8GB database)
- Domain: ₹800/year (~$10/year)
- **Total: ~$53/month**

---

## Continuous Deployment

### Auto-Deploy (Enabled)
- Push to `main` → Auto-deploy to production
- Push to `develop` → Deploy to staging (optional)

### Manual Deploy
```bash
# Trigger Vercel deploy
vercel --prod

# Trigger Render deploy
git commit --allow-empty -m "Trigger deploy"
git push origin main
```

---

## Security Checklist

- [ ] Environment variables set correctly
- [ ] HTTPS enabled (automatic)
- [ ] CORS configured properly
- [ ] Database RLS policies enabled
- [ ] Secrets not committed to git
- [ ] Admin password changed from default
- [ ] Rate limiting configured
- [ ] Input validation enabled

---

## Support

**Documentation:**
- Vercel: https://vercel.com/docs
- Render: https://render.com/docs
- Supabase: https://supabase.com/docs

**Issues:**
- GitHub: https://github.com/maulikmehta/minibag/issues

---

**Last Updated:** 2026-04-21
**Status:** Production Ready
