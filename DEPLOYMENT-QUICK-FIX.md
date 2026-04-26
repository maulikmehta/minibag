# Quick Fix for CORS Errors in Production

## TL;DR - The Problem

Frontend (Vercel/minibag.cc) can't call backend (Render) because backend CORS is rejecting requests.

## Root Cause

Backend's CORS config requires `FRONTEND_URL` environment variable on Render.

**File**: `packages/shared/server.js:132`
```javascript
if (process.env.FRONTEND_URL) {
  origins.push(process.env.FRONTEND_URL);
}
```

## Quick Fix (5 minutes)

### 1. Set Environment Variable on Render

**Render Dashboard** → **minibag backend service** → **Environment** → Add/Update:

```
FRONTEND_URL=https://minibag.cc
NODE_ENV=production
```

### 2. Redeploy Backend

Render auto-redeploys when you save environment variables.

### 3. Check Logs

In Render logs, look for:
```
CORS Configuration {
  environment: 'production',
  allowedOrigins: [ 'https://minibag.cc', 'https://www.minibag.cc' ],
  frontendUrl: 'https://minibag.cc'
}
```

### 4. Test

```bash
# Should return CORS headers
curl -I https://minibag.onrender.com/api/sessions/nickname-options \
  -H "Origin: https://minibag.cc"

# Look for:
# access-control-allow-origin: https://minibag.cc
```

### 5. Verify in Browser

Open https://minibag.cc → DevTools → Console → Should have no CORS errors

## Complete Environment Variables Checklist

### Render (Backend) - ALL must be set

```bash
NODE_ENV=production
FRONTEND_URL=https://minibag.cc

# Database (copy from .env file)
SUPABASE_URL=<from .env>
SUPABASE_ANON_KEY=<from .env>
SUPABASE_SERVICE_KEY=<from .env>

# Sessions SDK
DATABASE_URL=<from .env.production>
USE_SESSIONS_SDK=true
DUAL_WRITE_MODE=false
ENABLE_GROUP_MODE=true

# Security (copy from .env file)
JWT_SECRET=<from .env>
ENCRYPTION_KEY=<from .env>
```

### Vercel (Frontend) - Verify these are set

```bash
NODE_ENV=production
VITE_API_URL=https://minibag.onrender.com
VITE_WS_URL=wss://minibag.onrender.com
VITE_SUPABASE_URL=<from .env.production>
VITE_SUPABASE_ANON_KEY=<from .env.production>
```

## Deployment Order (CRITICAL)

**NEVER deploy both at once. Always:**

1. ✅ Deploy backend first (Render)
2. ✅ Verify backend health
3. ✅ Deploy frontend (Vercel)
4. ✅ Test in production

## If Still Not Working

Run verification script:
```bash
cd /Users/maulik/llcode/minibag-2
./verify-deployment-config.sh
```

Check detailed guide: `DEPLOYMENT-PROCESS.md`
