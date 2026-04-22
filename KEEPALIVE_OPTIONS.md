# Keep-Alive Solutions for Minibag Deployment

## Problem

**Render Free Tier**: Service spins down after 15 minutes of inactivity
- Cold start: 30-60 seconds on first request
- Impact: Poor user experience for first visitor after idle period

**Supabase**: Database connections may time out during long idle periods
- Pooler closes idle connections
- First query after idle may be slower

## Solutions Implemented

### 1. Render Health Check (Built-in)

**File**: `render.yaml`
```yaml
healthCheckPath: /health/ready
```

**What it does**:
- Render pings `/health/ready` every 60 seconds
- This endpoint queries Supabase: `SELECT id FROM sessions LIMIT 1`
- Keeps both backend and database connections active

**Limitations**:
- Only runs when service is already awake
- Doesn't prevent initial spin-down

### 2. GitHub Actions Cron (External Ping)

**File**: `.github/workflows/keepalive.yml`

**Schedule**: Every 10 minutes (cron: `*/10 * * * *`)

**What it does**:
```bash
curl https://minibag.onrender.com/health/ready
```

**Benefits**:
- Prevents Render spin-down (pings every 10 min, spin-down at 15 min)
- Keeps Supabase connection warm
- Free (uses GitHub Actions minutes)
- Automatic, no manual intervention

**Limitations**:
- Uses ~150 GitHub Actions minutes/day (~4,500/month)
- Free tier: 2,000 minutes/month (sufficient)
- Won't run if repository is private and free tier exhausted

**Manual trigger**:
```bash
# Go to: https://github.com/<username>/minibag-2/actions
# Select "Keep Services Alive"
# Click "Run workflow"
```

## Alternative Options

### Option A: UptimeRobot (Recommended for Production)

**Service**: https://uptimerobot.com
**Plan**: Free (50 monitors, 5-min intervals)

**Setup**:
1. Create account at UptimeRobot
2. Add new monitor:
   - Type: HTTP(s)
   - URL: `https://minibag.onrender.com/health/ready`
   - Interval: 5 minutes
   - Alert: Email on downtime

**Benefits**:
- More reliable than GitHub Actions
- Downtime alerts included
- Status page available
- Independent of GitHub repository

**Cost**: $0 (free tier sufficient)

### Option B: Cron-Job.org

**Service**: https://cron-job.org
**Plan**: Free (unlimited jobs, 1-min intervals)

**Setup**:
1. Create account
2. Add new cron job:
   - URL: `https://minibag.onrender.com/health/ready`
   - Schedule: Every 10 minutes
   - Method: GET

**Benefits**:
- Simpler than UptimeRobot
- More frequent pings allowed (1-min intervals)
- No monitor limits

**Limitations**:
- Less feature-rich
- No built-in status pages

### Option C: Render Paid Plan (Production)

**Plan**: Starter ($7/month)

**Benefits**:
- Service never spins down
- No cold starts
- Always-on availability
- No external pings needed

**Recommendation**: Upgrade to paid plan once validated with users.

## Cost Comparison

| Solution | Cost | Reliability | Setup Time |
|----------|------|-------------|------------|
| GitHub Actions (current) | $0 | Good | 5 min (done) |
| UptimeRobot | $0 | Excellent | 10 min |
| Cron-Job.org | $0 | Excellent | 5 min |
| Render Starter | $7/mo | Perfect | 2 min |

## Testing Keep-Alive

### Test GitHub Actions Workflow

```bash
# Check workflow runs
gh workflow list
gh run list --workflow=keepalive.yml --limit 10

# View latest run logs
gh run view --log

# Manually trigger workflow
gh workflow run keepalive.yml
```

### Test Backend Response

```bash
# Check health endpoint
curl -i https://minibag.onrender.com/health/ready

# Expected response:
# HTTP/1.1 200 OK
# {
#   "server": "ok",
#   "database": "ok",
#   "websocket": "ok",
#   "timestamp": "2026-04-22T..."
# }

# Test with timeout
curl --max-time 5 https://minibag.onrender.com/health/ready
```

### Monitor Cold Starts

```bash
# Wait 20 minutes (let service spin down)
# Then ping and measure response time
time curl https://minibag.onrender.com/health/ready

# Cold start: ~30-60 seconds
# Warm service: <1 second
```

## Troubleshooting

### GitHub Actions Not Running

**Check workflow status**:
```bash
cd /Users/maulik/llcode/minibag-2
gh workflow view keepalive.yml
```

**Common issues**:
1. Workflow disabled (check `.github/workflows/keepalive.yml` presence)
2. Repository archived (workflows stop)
3. Actions disabled in repo settings

**Fix**:
```bash
# Enable workflow
gh workflow enable keepalive.yml

# Check repository settings
# Go to: Settings → Actions → General
# Ensure "Allow all actions" is selected
```

### Health Check Failing

**Check backend logs**:
```bash
# Render dashboard → minibag-backend → Logs
```

**Common causes**:
1. Supabase connection error (check env vars)
2. Database timeout (increase query timeout)
3. Service restarting (temporary, auto-recovers)

**Verify endpoint manually**:
```bash
curl -v https://minibag.onrender.com/health/ready 2>&1 | grep -E "HTTP|database"
```

### Supabase Still Pausing

**Note**: Supabase free tier doesn't actually "pause" databases. If experiencing issues:

1. **Check connection pooling**:
   - Supabase has connection limits (free tier: 60 connections)
   - Backend should use connection pooling

2. **Verify keep-alive frequency**:
   - Current: Every 10 minutes via GitHub Actions
   - Increase if needed (every 5 minutes)

3. **Check backend connection config**:
   ```javascript
   // packages/shared/db/supabase.js
   // Ensure persistent connection settings
   ```

## Recommended Setup

**For MVP/Testing** (current):
- ✓ GitHub Actions keep-alive (free, automated)
- ✓ Render health check at `/health/ready`
- Monitor for 7 days to validate effectiveness

**For Production**:
1. Upgrade Render to Starter plan ($7/month)
2. Add UptimeRobot for monitoring + alerts
3. Remove GitHub Actions keep-alive (no longer needed)

## Next Steps

1. **Monitor GitHub Actions runs** for next 24 hours
2. **Check Render logs** for health check activity
3. **Test cold start behavior** after 20+ minutes idle
4. **Consider UptimeRobot** if more reliability needed
5. **Upgrade to paid plan** once user-validated
