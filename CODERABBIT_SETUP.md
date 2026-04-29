# CodeRabbit Setup Guide

## What is CodeRabbit?

CodeRabbit is an AI-powered code review tool that automatically reviews pull requests, catches bugs, enforces coding standards, and provides security analysis.

## Configuration

We've configured CodeRabbit specifically for MiniBag-2 production issues:

### Focus Areas

1. **Security** (CRITICAL)
   - PIN hashing (bcrypt required)
   - Auth token expiration
   - Rate limiting persistence
   - SQL injection prevention

2. **Data Integrity** (CRITICAL)
   - Transaction safety
   - Compensating transactions
   - PostgreSQL ↔ Supabase sync
   - Orphaned record prevention

3. **Race Conditions** (HIGH)
   - Concurrent slot claiming
   - Nickname pool management
   - Participant join races
   - FOR UPDATE locks

4. **Real-time Sync** (MEDIUM)
   - WebSocket reconnection
   - State re-sync after disconnect
   - Memory leak prevention
   - Event handler cleanup

### Path-Specific Rules

- `packages/sessions-core/src/**/*.ts` - PostgreSQL SDK (strictest checks)
- `packages/shared/adapters/**/*.js` - Database sync logic
- `packages/minibag/src/**/*.{jsx,js}` - Frontend real-time UI
- `packages/shared/api/**/*.js` - API endpoints

### Security Tools Enabled

- ✅ **Semgrep** - Security patterns (error level)
- ✅ **TruffleHog** - Secrets detection (error level)
- ✅ **Bearer** - SQL injection & XSS (error level)
- ✅ **Gitleaks** - Credential leaks (error level)
- ✅ **Trivy** - Vulnerability scanning (warning level)
- ✅ **ESLint** - Code quality (warning level)

## Setup Steps

### 1. Enable CodeRabbit on GitHub

1. Go to [CodeRabbit.ai](https://coderabbit.ai/)
2. Click **Sign in with GitHub**
3. Authorize CodeRabbit for your account
4. Select repositories:
   - ✅ `maulikmehta/minibag`
5. Install the GitHub App

### 2. Verify Configuration

The `.coderabbit.yaml` file in this repo will be automatically detected. Verify:

```bash
# Check config file exists
ls -la .coderabbit.yaml

# View configuration
cat .coderabbit.yaml
```

### 3. Test with a PR

Create a test PR to verify CodeRabbit is working:

```bash
git checkout -b test/coderabbit-verification
echo "// Test change" >> packages/sessions-core/src/test.ts
git add .
git commit -m "test: verify CodeRabbit integration"
git push -u origin test/coderabbit-verification
gh pr create --title "Test: CodeRabbit Verification" --body "Testing AI code review"
```

CodeRabbit should comment within 30-60 seconds.

### 4. Review Production Bugs

CodeRabbit is configured to focus on the 22 production bugs documented in `PRODUCTION_BUG_FIX_PLAN.md`:

**P0 Deployment Blockers (5 bugs):**
- BUG #11: Two-phase write without transaction
- BUG #12: Participant sync failure
- BUG #1: Named invite decline broken
- BUG #3: No invite resolution check
- BUG #16: Admin delete doesn't release nicknames

**P1 Security & Data Integrity (4 bugs):**
- BUG #7: Auth tokens never expire
- BUG #9: PIN rate limiting in memory
- BUG #13: Named invites not in SDK
- BUG #10: PIN stored as plain text

## Using CodeRabbit

### On Pull Requests

CodeRabbit will:
1. Review code automatically when PR is opened
2. Post summary comment with findings
3. Add inline comments on specific issues
4. Suggest labels (security, P0, database, etc.)
5. Flag critical issues as "Request Changes"

### Chat Commands

In PR comments, you can interact with CodeRabbit:

- `@coderabbit review` - Re-run full review
- `@coderabbit pause` - Pause reviews on this PR
- `@coderabbit resume` - Resume reviews
- `@coderabbit summary` - Generate high-level summary
- `@coderabbit fix` - Suggest code fixes for issues

### Custom Reviews

Request specific analysis:

```
@coderabbit analyze this function for race conditions
```

```
@coderabbit check if this code has SQL injection vulnerabilities
```

```
@coderabbit verify this transaction has proper rollback
```

## Priority Issue Detection

CodeRabbit is configured to auto-label:

- **security** - Auth, crypto, injection issues
- **P0/critical** - Data loss or security vulnerabilities
- **P1/high** - Race conditions, sync failures
- **P2/medium** - UX issues
- **database** - PostgreSQL/Supabase sync
- **race-condition** - Concurrency bugs

## Next Steps

1. **Install CodeRabbit** on GitHub (5 min)
2. **Create PR for production bug fixes** using CodeRabbit review
3. **Address critical security issues first** (BUG #7, #9, #10)
4. **Verify fixes with CodeRabbit** before merge
5. **Use CodeRabbit chat** for specific analysis

## Troubleshooting

### CodeRabbit Not Commenting

Check:
- GitHub App installed for repo
- PR not marked as draft/WIP
- `.coderabbit.yaml` is valid YAML
- CodeRabbit has repo access

### Too Many False Positives

Adjust in `.coderabbit.yaml`:
```yaml
reviews:
  profile: "chill"  # Change from "assertive"
```

### Ignore Specific Files

Add to `.coderabbit.yaml`:
```yaml
reviews:
  path_filters:
    - "!**/test-file.js"
```

## Resources

- [CodeRabbit Docs](https://docs.coderabbit.ai/)
- [Production Bug Fix Plan](./PRODUCTION_BUG_FIX_PLAN.md)
- [Race Conditions Fixed](./RACE_CONDITIONS_FIXED.md)
- [Production Migration Guide](./PRODUCTION_MIGRATION_GUIDE.md)

---

**Last Updated:** 2026-04-29
**Status:** Ready to enable on GitHub
