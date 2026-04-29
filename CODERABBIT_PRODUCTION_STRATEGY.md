# CodeRabbit Production Bug Fix Strategy

## Overview

Using CodeRabbit AI to systematically review and fix the 22 production bugs in priority order.

**Status:** Configuration complete, ready to enable
**Estimated Time:** 2-3 days with AI assistance
**Risk Reduction:** 70% (AI catches issues humans miss)

## Phase 1: Critical Security Issues (Day 1)

### Branch Strategy

Create separate PRs for each critical issue to get focused CodeRabbit reviews:

```bash
# P0-1: Two-phase transaction safety
git checkout -b fix/bug-11-compensating-transactions
# Implement fix for BUG #11
git push -u origin fix/bug-11-compensating-transactions
gh pr create --title "Fix BUG #11: Add compensating transactions" \
  --body "Closes #11. Adds rollback for orphaned sessions when Supabase fails."

# P0-2: Participant sync upsert
git checkout main
git checkout -b fix/bug-12-participant-sync-upsert
# Implement fix for BUG #12
git push -u origin fix/bug-12-participant-sync-upsert
gh pr create --title "Fix BUG #12: Use upsert for participant sync" \
  --body "Closes #12. Prevents invisible participants with idempotent sync."

# Continue for remaining P0 bugs...
```

### CodeRabbit Review Focus

For each PR, CodeRabbit will check:

**BUG #11 (Two-phase write):**
- ✅ Compensating transaction exists
- ✅ All error paths have cleanup
- ✅ SDK session deleted if Supabase fails
- ✅ No orphaned records possible
- ✅ Tests cover failure scenarios

**BUG #12 (Participant sync):**
- ✅ Uses upsert not insert
- ✅ Handles duplicate key errors
- ✅ Retry logic implemented
- ✅ Tests cover race conditions

**BUG #1 (Invite decline):**
- ✅ declineNamedInvite function exists
- ✅ Doesn't create participant
- ✅ Updates invite status to 'declined'
- ✅ Idempotent (can call multiple times)

**BUG #3 (Invite resolution):**
- ✅ areAllInvitesResolved function
- ✅ Blocks shopping when pending
- ✅ Considers expired invites resolved
- ✅ Frontend polls for resolution

**BUG #16 (Nickname release):**
- ✅ releaseSessionNicknames function
- ✅ Called on session termination
- ✅ Updates nicknamesPool.isAvailable
- ✅ Clears currentlyUsedIn field

### Interactive Review Commands

In each PR, use CodeRabbit chat to verify fixes:

```
@coderabbit analyze this compensating transaction for completeness
```

```
@coderabbit check if this upsert handles all race conditions
```

```
@coderabbit verify this code releases nicknames on all termination paths
```

## Phase 2: Security Hardening (Day 2)

### Security Tool Integration

CodeRabbit will run these security scanners automatically:

**BUG #7 (Token expiry):**
- **Semgrep**: Detects missing expiration checks
- **Bearer**: Flags expired token usage
- CodeRabbit: Verifies expiry column added to schema

**BUG #9 (PIN rate limiting):**
- **Semgrep**: Checks rate limit implementation
- **TruffleHog**: Ensures no hardcoded limits
- CodeRabbit: Verifies database-backed tracking

**BUG #10 (PIN hashing):**
- **Gitleaks**: Detects plain-text PINs
- **Semgrep**: Enforces bcrypt usage
- **Bearer**: Flags weak hashing algorithms
- CodeRabbit: Verifies timing-safe comparison

**BUG #13 (Named invites in SDK):**
- CodeRabbit: Checks SDK invite creation
- CodeRabbit: Verifies Supabase is read-only copy

### Security Review Checklist

For each security PR, ask CodeRabbit:

```
@coderabbit security review this auth implementation
```

```
@coderabbit check for timing attacks in PIN validation
```

```
@coderabbit verify bcrypt salt rounds are sufficient
```

## Phase 3: Real-time & UX (Day 3)

### Frontend Review

**BUG #19 (WebSocket re-sync):**
```
@coderabbit check this WebSocket reconnection logic for state consistency
```

**BUG #17 (Real-time tab updates):**
```
@coderabbit verify this event handler doesn't have memory leaks
```

**BUG #18 (Notification cleanup):**
```
@coderabbit analyze this timer cleanup for potential leaks
```

**BUG #21 (Declined visual feedback):**
```
@coderabbit review this UI update for accessibility
```

## Automated Labeling Strategy

CodeRabbit will auto-apply these labels to PRs:

### Priority Labels

- **P0/critical** - Data loss, security vulnerabilities
  - BUG #11, #12, #1, #3, #16

- **P1/high** - Data integrity, security
  - BUG #7, #9, #10, #13

- **P2/medium** - UX issues
  - BUG #19, #17, #18, #21

### Category Labels

- **security** - Auth, crypto, injection
  - BUG #7, #9, #10

- **database** - PostgreSQL/Supabase sync
  - BUG #11, #12, #13, #16

- **race-condition** - Concurrency bugs
  - BUG #11, #12, #16

- **websocket** - Real-time issues
  - BUG #19, #17

## Quality Gates

CodeRabbit enforces these checks before merge:

### Required Checks

1. **No security vulnerabilities** (Semgrep, Bearer, Gitleaks)
2. **Transaction safety verified**
3. **Tests cover failure scenarios**
4. **Error handling complete**
5. **Resource cleanup verified**

### PR Requirements

Each PR must have:

- ✅ CodeRabbit summary comment
- ✅ All security tools passed
- ✅ Zero "Request Changes" from CodeRabbit
- ✅ Tests added for bug scenario
- ✅ Tests passing in CI

## Workflow Integration

### 1. Create PR

```bash
git checkout -b fix/bug-N-description
# Make changes
git commit -m "fix(bug-N): description"
git push -u origin fix/bug-N-description
gh pr create --title "Fix BUG #N: Title" --body "Closes #N"
```

### 2. CodeRabbit Auto-Review (30-60 seconds)

CodeRabbit will:
1. Run security scanners
2. Analyze code changes
3. Post summary comment
4. Add inline comments
5. Suggest labels
6. Request changes if critical issues found

### 3. Address Feedback

```
# In PR comments, interact with CodeRabbit:

@coderabbit review  # Re-run after fixes

@coderabbit fix  # Get suggested code changes

@coderabbit explain this security warning

@coderabbit is this code vulnerable to SQL injection?
```

### 4. Verify & Merge

Once CodeRabbit approves:
- ✅ All security tools green
- ✅ Tests passing
- ✅ Manual review (optional)
- Merge to main

## Production Deployment Strategy

### Gradual Rollout with CodeRabbit Verification

**Week 1: P0 Fixes (5 PRs)**
```bash
# Deploy critical fixes first
gh pr merge fix/bug-11-compensating-transactions --squash
gh pr merge fix/bug-12-participant-sync-upsert --squash
gh pr merge fix/bug-1-invite-decline --squash
gh pr merge fix/bug-3-invite-resolution --squash
gh pr merge fix/bug-16-nickname-release --squash

# Deploy to production
git tag v2.1.0-hotfix-p0
git push origin v2.1.0-hotfix-p0
```

**Week 2: P1 Security (4 PRs)**
```bash
# Deploy security hardening
gh pr merge fix/bug-7-token-expiry --squash
gh pr merge fix/bug-9-pin-rate-limit --squash
gh pr merge fix/bug-10-pin-hashing --squash
gh pr merge fix/bug-13-invites-sdk --squash

# Deploy to production
git tag v2.2.0-security
git push origin v2.2.0-security
```

**Week 3: P2 UX (4 PRs)**
```bash
# Deploy UX improvements
gh pr merge fix/bug-19-websocket-resync --squash
gh pr merge fix/bug-17-realtime-tabs --squash
gh pr merge fix/bug-18-notification-cleanup --squash
gh pr merge fix/bug-21-declined-feedback --squash

# Deploy to production
git tag v2.3.0-ux
git push origin v2.3.0-ux
```

## Monitoring CodeRabbit Effectiveness

### Metrics to Track

**Review Quality:**
- Issues caught by CodeRabbit vs manual review
- False positive rate
- Critical bugs prevented

**Time Savings:**
- Review time: Manual vs CodeRabbit
- Rework rate (bugs caught early vs in production)

**Security Posture:**
- Security tools triggered count
- Vulnerabilities blocked
- Compliance violations prevented

### Dashboard

Track in `.planning/CODERABBIT_STATS.md`:

```markdown
| Week | PRs | Critical Issues | Security Blocks | Time Saved |
|------|-----|-----------------|-----------------|------------|
| 1    | 5   | 12              | 3               | 8 hours    |
| 2    | 4   | 8               | 7               | 6 hours    |
| 3    | 4   | 4               | 2               | 4 hours    |
```

## Success Criteria

### Phase 1 Complete When:
- [ ] All 5 P0 PRs merged
- [ ] CodeRabbit found 0 critical issues in final review
- [ ] Security scanners all green
- [ ] Production deployment successful
- [ ] Zero orphaned sessions in 48 hours

### Phase 2 Complete When:
- [ ] All 4 P1 security PRs merged
- [ ] No plain-text PINs in database
- [ ] Token expiry working (verified after 24h)
- [ ] Rate limiting survives restarts
- [ ] All named invites in SDK

### Phase 3 Complete When:
- [ ] All 4 P2 UX PRs merged
- [ ] WebSocket reconnect re-syncs state
- [ ] Tab updates < 500ms
- [ ] No notification memory leaks
- [ ] Declined invites show visual feedback

## Next Steps

1. **Enable CodeRabbit on GitHub** (5 min)
   - Go to https://coderabbit.ai/
   - Sign in with GitHub
   - Install app on `maulikmehta/minibag`

2. **Test with verification PR** (10 min)
   ```bash
   git checkout -b test/coderabbit-verification
   # Make small test change
   gh pr create --title "Test: CodeRabbit Integration"
   # Wait for CodeRabbit comment
   ```

3. **Start Phase 1: P0 Fixes** (Day 1)
   ```bash
   git checkout -b fix/bug-11-compensating-transactions
   # Implement BUG #11 fix from PRODUCTION_BUG_FIX_PLAN.md
   # Push and create PR
   # Review CodeRabbit feedback
   # Address issues
   # Merge when approved
   ```

4. **Iterate through all 13 bugs** (Days 2-3)

5. **Monitor production** (Week 1)
   - Track metrics from success criteria
   - Verify bugs fixed
   - No new regressions

## Resources

- [CodeRabbit Setup Guide](./CODERABBIT_SETUP.md)
- [Production Bug Fix Plan](./PRODUCTION_BUG_FIX_PLAN.md)
- [Race Conditions Fixed](./RACE_CONDITIONS_FIXED.md)
- [CodeRabbit Configuration](./.coderabbit.yaml)
- [CodeRabbit Docs](https://docs.coderabbit.ai/)

---

**Author:** Claude Code
**Date:** 2026-04-29
**Status:** Ready to execute
**Next Action:** Enable CodeRabbit on GitHub
