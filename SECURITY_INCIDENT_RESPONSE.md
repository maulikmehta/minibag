# Security Incident Response: Exposed Service Role Key

**Date**: 2026-04-24
**Severity**: CRITICAL
**Status**: Mitigation in progress

---

## Incident Summary

GitGuardian detected Supabase Service Role JWT exposed in GitHub repository `maulikmehta/minibag`.

**Exposed Key**: `hqatleibipplqlwwjvwp` project service role key
**Commit**: `18ac4e4` (and possibly earlier commits)
**File**: `.env.production`
**Risk**: Full administrative access to Supabase database

---

## Immediate Actions (DO NOW)

### ✅ Step 1: Rotate Service Role Key (5 minutes)

**CRITICAL - Do this first before anything else**

1. Go to Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/hqatleibipplqlwwjvwp/settings/api
   ```

2. Scroll to "Service Role Key" section

3. Click **"Reset Service Role Key"** → Confirm

4. Copy the NEW service role key

5. Update local `.env.production`:
   ```bash
   # Open .env.production and replace old key with new one
   SUPABASE_SERVICE_KEY=<NEW_KEY_HERE>
   ```

6. Update Render environment variables:
   - Go to: https://dashboard.render.com/web/srv-xxxxx/env
   - Find `SUPABASE_SERVICE_KEY`
   - Update with new key
   - Click "Save Changes"

**Result**: Old key is now REVOKED and cannot be used.

---

### ✅ Step 2: Remove from Git (DONE ✅)

- [x] Removed `.env.production` from git tracking
- [x] Added `.env.production` to `.gitignore`
- [x] Created `.env.production.example` as template
- [x] Committed changes (commit `cc2200c`)

---

### ⏳ Step 3: Push Changes (DO NOW)

```bash
git push origin main
```

**Warning**: Old commits still contain the exposed key in history. See Step 4 for cleanup.

---

### 🔄 Step 4: Clean Git History (RECOMMENDED)

**Option A: Use BFG Repo-Cleaner (Easier)**

```bash
# Install BFG
brew install bfg  # macOS
# or download from: https://rtyley.github.io/bfg-repo-cleaner/

# Create backup
cd /Users/maulik/llcode
cp -r minibag-2 minibag-2-backup

# Clean history
cd minibag-2
bfg --delete-files .env.production

# Force push (WARNING: Rewrites history)
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push origin --force --all
```

**Option B: Use git filter-branch (Manual)**

```bash
# Backup first
cd /Users/maulik/llcode
cp -r minibag-2 minibag-2-backup

cd minibag-2

# Remove file from all commits
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env.production' \
  --prune-empty --tag-name-filter cat -- --all

# Force push
git push origin --force --all
```

**Option C: GitHub Secret Scanning (If private repo)**

If repository is private, GitHub will automatically invalidate the exposed secret.
Check: https://github.com/maulikmehta/minibag/security/secret-scanning

---

## Verification Steps

### ✅ Verify Key Rotation

```bash
# Test with OLD key (should fail)
curl https://hqatleibipplqlwwjvwp.supabase.co/rest/v1/sessions \
  -H "apikey: <OLD_SERVICE_KEY>" \
  -H "Authorization: Bearer <OLD_SERVICE_KEY>"

# Expected: 401 Unauthorized

# Test with NEW key (should work)
curl https://hqatleibipplqlwwjvwp.supabase.co/rest/v1/sessions \
  -H "apikey: <NEW_SERVICE_KEY>" \
  -H "Authorization: Bearer <NEW_SERVICE_KEY>"

# Expected: 200 OK with data
```

### ✅ Verify Git Cleanup

```bash
# Check if .env.production exists in history
git log --all --full-history -- .env.production

# If empty = cleaned ✅
# If shows commits = still in history ⚠️
```

### ✅ Verify Production Still Works

```bash
# Check backend health
curl https://minibag.onrender.com/health

# Create test session
curl -X POST https://minibag.onrender.com/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{"creator_nickname":"Test","items":[]}'

# Expected: Success response
```

---

## Prevention Measures

### ✅ Added to .gitignore

```
.env.production
.env.local
.env*.local
*.key
*.pem
```

### 🔄 TODO: Set up pre-commit hooks

```bash
# Install pre-commit
npm install --save-dev @commitlint/cli husky

# Add hook to detect secrets
npx husky add .husky/pre-commit "npx secretlint"
```

### 🔄 TODO: Environment variable management

**For production deployments:**
- Use Vercel/Render environment variable UI (never commit)
- Use `.env.example` files as templates
- Document all required env vars in README

---

## Impact Assessment

### 🔴 Critical: Database Access

**What was exposed:**
- Full read/write access to Supabase database
- Ability to bypass Row Level Security (RLS)
- Access to all tables: sessions, participants, invites, nicknames_pool

**Who could have accessed:**
- Anyone with access to public GitHub repo (if public)
- Anyone who cloned/forked the repo
- Automated bots scanning for secrets

### 🟡 Medium: Data at Risk

**Tables affected:**
- `sessions`: ~100-1000 sessions (estimated)
- `participants`: Nicknames, real names (if provided)
- `invites`: Invite tokens
- `nicknames_pool`: 4-letter nickname pool

**PII exposure risk**: LOW
- No payment data stored
- No email/phone numbers
- Only nicknames and optional first names

### 🟢 Low: Actual Exploitation

**Evidence of compromise:**
- GitGuardian alert triggered (automated scan)
- No unusual database activity detected (check Supabase logs)
- No user reports of unauthorized access

---

## Timeline

| Time | Event |
|------|-------|
| Unknown | `.env.production` committed with service key (commit 18ac4e4) |
| 2026-04-24 11:XX | GitGuardian alert received |
| 2026-04-24 11:XX | Incident investigation started |
| 2026-04-24 11:XX | `.env.production` removed from git (commit cc2200c) |
| ⏳ Pending | Service role key rotated in Supabase |
| ⏳ Pending | Git history cleaned |
| ⏳ Pending | Production verified working |

---

## Lessons Learned

1. **Never commit .env files with production secrets**
   - Use `.env.example` as template
   - Add all `.env*` files to .gitignore

2. **Use environment variable UI for deployments**
   - Vercel: Project Settings → Environment Variables
   - Render: Dashboard → Environment → Environment Variables

3. **Enable secret scanning**
   - GitHub: Enable secret scanning in repo settings
   - Use pre-commit hooks (secretlint, trufflehog)

4. **Rotate keys regularly**
   - Service role keys: Every 90 days
   - API keys: Every 180 days
   - Document rotation process

---

## References

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [GitHub Secret Scanning](https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning)
- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)

---

**Next Review**: After key rotation complete
**Owner**: Maulik
**Status**: In Progress
