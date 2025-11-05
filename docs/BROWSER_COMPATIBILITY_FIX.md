# Browser Compatibility Fix - Nov 5, 2025

## Issue: "ReferenceError: process is not defined"

### Problem
The frontend app was crashing on load with the error:
```
ReferenceError: process is not defined
  at logger.js:18:10
```

### Root Cause
The issue occurred due to improper dependency chain:
1. Frontend code imported `packages/minibag/src/services/api.js`
2. `api.js` imported `packages/shared/utils/retry.js`
3. `retry.js` imported `packages/shared/utils/logger.js`
4. `logger.js` used `process.env` which doesn't exist in browser environments
5. Vite bundled all of this into the frontend, causing the crash

### Solution
**Removed logger dependency from retry.js** (commit: caf2995)

Changed `packages/shared/utils/retry.js`:
- Removed: `import logger from './logger.js'`
- Replaced logger calls with `console.warn()` for browser compatibility

```javascript
// Before
logger.warn({ attempt, maxAttempts, error: error.message, delay },
  `Retrying operation after ${delay}ms`);

// After
console.warn(
  `[RETRY] Attempt ${attempt + 1}/${maxAttempts} failed: ${error.message}. Retrying after ${delay}ms`
);
```

### Why This Works
- `retry.js` is now safe to use in both Node.js and browser environments
- No Node.js-specific APIs (like `process.env`) are used
- Console APIs work in both environments

### Testing
1. ✅ Localhost: http://localhost:5173/app - works
2. ✅ Production: https://minibag.cc - works after cache purge

## Related Fix: Cloudflared Auto-Update

### Problem
Cloudflared was auto-updating from version 2022.8.0 (macOS 10.15.7 compatible) to 2025.10.1 (requires newer macOS), causing the tunnel to crash.

### Solution
Added `--no-autoupdate` flag to `start-tunnel-production.sh`:
```bash
./cloudflared tunnel --no-autoupdate run --token <token>
```

### Recovery Steps (if auto-update happens again)
1. Restore original binary: `git checkout cloudflared`
2. Restart tunnel: `./start-tunnel-production.sh`
3. Verify version: Should show `2022.8.0` in logs

## Prevention

### For Browser Compatibility Issues
- ❌ Never import server-only utilities (like logger.js) in shared code used by frontend
- ✅ Keep shared utilities browser-compatible (no `process`, `fs`, Node.js APIs)
- ✅ Use environment checks: `typeof window !== 'undefined'` if needed

### For Cloudflared Auto-Update Issues
- ✅ Always use `--no-autoupdate` flag in production scripts
- ✅ Keep cloudflared binary in git for easy recovery
- ✅ Test tunnel after any cloudflared updates

## Files Changed
- `packages/shared/utils/retry.js` - Removed logger dependency
- `start-tunnel-production.sh` - Added --no-autoupdate flag

## Commit
```
caf2995 - fix(browser): remove logger dependency from retry.js for browser compatibility
```
