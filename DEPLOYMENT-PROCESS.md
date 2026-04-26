# Deployment Process for Minibag

## Architecture
- **Frontend**: Vercel → https://minibag.cc
- **Backend**: Render → https://minibag.onrender.com
- **Database**: Supabase (cvseopmdpooznqojlads + fykardgnopddfrqatdig for Sessions SDK)

## Root Cause Analysis

### Why Local Works But Production Fails
1. **Local**: Vite proxy routes `/api` → `localhost:3000`, same-origin, no CORS
2. **Production**: Vercel (minibag.cc) → Render (minibag.onrender.com), cross-origin, needs CORS

### Current CORS Error
```
Access to fetch at 'https://minibag.onrender.com/api/sessions/{id}/join'
from origin 'https://minibag.cc' has been blocked by CORS policy
```

### Backend CORS Logic (server.js:120-177)
```javascript
// Production mode allows:
if (process.env.NODE_ENV === 'production') {
  origins.push('https://minibag.cc');
  origins.push('https://www.minibag.cc');
}

// Plus FRONTEND_URL if set and validated:
if (process.env.FRONTEND_URL) {
  // Must be HTTPS in production
  // Must be trusted domain (minibag.cc, localhost, etc.)
  origins.push(process.env.FRONTEND_URL);
}
```

## Critical Environment Variables

### Render (Backend)
```bash
# CRITICAL - must be set
NODE_ENV=production
FRONTEND_URL=https://minibag.cc

# Database
SUPABASE_URL=<from .env>
SUPABASE_ANON_KEY=<from .env>
SUPABASE_SERVICE_KEY=<from .env>

# Sessions SDK Database
DATABASE_URL=<from .env.production>

# Sessions SDK
USE_SESSIONS_SDK=true
DUAL_WRITE_MODE=false
ENABLE_GROUP_MODE=true

# Security
JWT_SECRET=<from .env>
ENCRYPTION_KEY=<from .env>

# Sentry (optional but recommended)
SENTRY_DSN=https://22b216a4f3bc22d3df39fdc9195c3714@o4510294893133824.ingest.us.sentry.io/4510302617796608
SENTRY_ENVIRONMENT=production
```

### Vercel (Frontend)
```bash
# API Connection
VITE_API_URL=https://minibag.onrender.com
VITE_WS_URL=wss://minibag.onrender.com

# Database (read-only from frontend)
VITE_SUPABASE_URL=https://cvseopmdpooznqojlads.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_qtmjDp0WJBWWZhsp0T2eFw_0ZR_gdsu

# Sentry (optional)
VITE_SENTRY_DSN=https://e0122c2c06f771c53cc71b64a2814411@o4510294893133824.ingest.us.sentry.io/4510302611505152
VITE_SENTRY_ENVIRONMENT=production

# Build
NODE_ENV=production
```

## Deployment Process (Step-by-Step)

### Step 1: Verify Environment Variables

#### Check Render
```bash
# Login to Render dashboard
# Navigate to: minibag backend service → Environment
# Verify all variables from "Render (Backend)" section above exist
# CRITICAL: Ensure FRONTEND_URL=https://minibag.cc
# CRITICAL: Ensure NODE_ENV=production
```

#### Check Vercel
```bash
# Login to Vercel dashboard
# Navigate to: minibag project → Settings → Environment Variables
# Verify all variables from "Vercel (Frontend)" section above exist
# CRITICAL: Ensure VITE_API_URL=https://minibag.onrender.com
```

### Step 2: Test Backend Health

Before deploying frontend, verify backend is working:

```bash
# 1. Check health endpoint
curl https://minibag.onrender.com/health

# 2. Check CORS headers (from your machine)
curl -I -X OPTIONS https://minibag.onrender.com/api/sessions/nickname-options \
  -H "Origin: https://minibag.cc" \
  -H "Access-Control-Request-Method: GET"

# Expected response should include:
# Access-Control-Allow-Origin: https://minibag.cc
# Access-Control-Allow-Credentials: true
```

### Step 3: Deploy Backend First

```bash
# 1. Commit changes (if any)
git add .
git commit -m "fix: configure CORS for production deployment"

# 2. Push to trigger Render deployment
git push origin master

# 3. Wait for Render deployment to complete
# 4. Check logs for CORS configuration
# Look for: "CORS: Added FRONTEND_URL to allowed origins"
```

### Step 4: Deploy Frontend

```bash
# Only deploy frontend AFTER backend is verified working

# Vercel auto-deploys on git push
# Or trigger manual deployment from Vercel dashboard
```

### Step 5: Verify Production

```bash
# 1. Open https://minibag.cc in incognito window
# 2. Open DevTools → Console
# 3. Create a session
# 4. Check for CORS errors (should be none)
# 5. Try joining session from another incognito window
```

## Debugging Guide

### If CORS Errors Persist

1. **Check Backend Logs on Render**
   ```
   Look for:
   - "CORS: Added FRONTEND_URL to allowed origins" ✅
   - "CORS: FRONTEND_URL rejected - untrusted domain" ❌
   - "CORS: Invalid FRONTEND_URL format" ❌
   ```

2. **Verify Environment Variables**
   ```bash
   # From Render shell (if available)
   echo $NODE_ENV
   echo $FRONTEND_URL

   # Or check /health/ready endpoint response
   curl https://minibag.onrender.com/health/ready
   ```

3. **Check Browser Network Tab**
   - Request URL should be: `https://minibag.onrender.com/api/...`
   - Request Headers should include: `Origin: https://minibag.cc`
   - Response Headers should include: `Access-Control-Allow-Origin: https://minibag.cc`
   - If missing, backend CORS is not configured correctly

### If Sessions SDK Fails

1. **Check DATABASE_URL is set on Render**
   - Must point to Supabase PostgreSQL (fykardgnopddfrqatdig)
   - Must include `?pgbouncer=true` suffix

2. **Check Prisma Schema is Generated**
   - Render build should run: `npx prisma generate`
   - Check build logs for Prisma generation

### If WebSocket Fails

1. **Check VITE_WS_URL on Vercel**
   - Must be: `wss://minibag.onrender.com` (note: wss not ws)

2. **Check Socket.IO CORS on Backend**
   - Should match Express CORS (server.js:69-85)
   - Allowed origins should include minibag.cc

## Rollback Process

If production is broken:

```bash
# 1. Revert to last working commit
git log --oneline  # Find last working commit
git revert <commit-hash>
git push origin master

# 2. Or rollback on Render/Vercel dashboard
# Render: Deployments → Select previous deployment → Redeploy
# Vercel: Deployments → Select previous deployment → Promote to Production
```

## Pre-Deployment Checklist

Before every deploy:

- [ ] Run tests locally: `npm run test`
- [ ] Test local build: `npm run build && npm run preview`
- [ ] Verify .env.production has correct values
- [ ] Check no console errors in local production build
- [ ] Verify CORS env vars are set on Render
- [ ] Deploy backend first, verify /health endpoint
- [ ] Deploy frontend second, test in incognito
- [ ] Monitor Sentry for errors in first 10 minutes

## Common Mistakes

1. ❌ Deploying frontend and backend simultaneously
   - ✅ Deploy backend first, verify, then deploy frontend

2. ❌ Missing FRONTEND_URL on Render
   - ✅ Must be set to `https://minibag.cc` in production

3. ❌ Using http:// instead of https:// in production env vars
   - ✅ All production URLs must be https:// or wss://

4. ❌ Not setting NODE_ENV=production on Render
   - ✅ CORS logic depends on NODE_ENV === 'production'

5. ❌ Forgetting to rebuild frontend after changing VITE_API_URL
   - ✅ Vite embeds env vars at build time, must rebuild to apply changes

## Success Criteria

Deployment is successful when:

1. ✅ No CORS errors in browser console
2. ✅ Can create session on minibag.cc
3. ✅ Can join session from second browser/incognito
4. ✅ WebSocket connects successfully (check Network tab)
5. ✅ Real-time updates work (add item, see on other client)
6. ✅ No errors in Sentry dashboard
7. ✅ Backend health check returns 200: https://minibag.onrender.com/health/ready

## Next Steps After Successful Deployment

1. Monitor Sentry for errors
2. Check Render metrics for crashes/restarts
3. Test all critical flows (create, join, shop, bill)
4. Document any issues in GitHub Issues
5. Create rollback plan for next deployment
