# Git Commit Conventions for Infrastructure Roadmap

**Version:** 1.0
**Date:** 2025-11-07
**Purpose:** Establish structured, traceable commits for the 4-week infrastructure improvements roadmap

---

## Why We Need This

**Current Problems:**
- Commits bundle multiple unrelated changes (hard to revert)
- Missing context in messages (unclear why changes were made)
- Inconsistent formatting (hard to search history)
- No connection to roadmap tasks (can't track progress)

**Goals:**
- Make every commit easily revertible
- Provide full context for future developers
- Enable quick navigation of 27 roadmap tasks
- Track progress systematically

---

## Commit Message Template

Every commit should follow this structure:

```
type(scope): short summary (max 72 chars)

[Roadmap: Week X, Day Y, Task Z]

Problem:
- What issue this addresses (include file:line if applicable)
- Why this change is needed

Solution:
- What was changed
- How it solves the problem

Testing:
- How this was verified
- Edge cases considered

References:
- Roadmap: infrastructure-improvements-roadmap.md:L___
- Related commits: <sha> (if applicable)
```

---

## Commit Types

| Type | Usage | Examples |
|------|-------|----------|
| `fix` | Bug fixes (especially the 6 critical bugs) | Memory leak, SQL injection, race conditions |
| `feat` | New features or capabilities | Logging service, error boundaries, retry logic |
| `refactor` | Code improvements without behavior change | Extract components, split God functions |
| `test` | Adding or updating tests | Unit tests, integration tests, E2E |
| `perf` | Performance improvements | Reduce re-renders, optimize queries |
| `security` | Security-related fixes | Input validation, CORS hardening |
| `chore` | Infrastructure/tooling | Install Zod, setup Vitest, add indexes |
| `docs` | Documentation only | README updates, inline comments |

---

## Scope Naming

Map scopes to roadmap components:

| Scope | Files/Areas |
|-------|-------------|
| `socket` | packages/minibag/src/services/socket.js |
| `session-api` | packages/shared/api/sessions.js (backend) |
| `transformers` | packages/minibag/src/utils/sessionTransformers.js |
| `hooks` | React hooks (useSession, useParticipantSync) |
| `validation` | Input validation, Zod schemas |
| `db` | Database indexes, migrations |
| `logging` | Logger implementation, log endpoints |
| `tests` | Test files and test infrastructure |
| `components` | React components |
| `monitoring` | Metrics, Sentry, performance tracking |

---

## Granularity Guidelines

**One commit = One logical change**

### ✅ Good Granularity

```
1. fix(socket): store both original and wrapped callbacks
2. test(socket): add tests for listener cleanup
3. docs(socket): document memory leak fix
```
*Rationale: Each commit can be reverted independently*

### ❌ Too Large

```
1. fix: fix all Week 1 Day 1 bugs
```
*Rationale: Can't revert just the socket fix without reverting everything*

### ❌ Too Small

```
1. fix(socket): add comment
2. fix(socket): add another comment
3. fix(socket): fix typo in comment
```
*Rationale: These should be part of the main fix commit*

---

## Real Examples from Roadmap

### Example 1: Critical Bug Fix

```
fix(socket): store both original and wrapped listener callbacks

[Roadmap: Week 1, Day 1, Task 1A]

Problem:
- Memory leak in socket.js:311-331
- Wrapped callbacks never cleaned up → listeners accumulate forever
- Each screen navigation adds duplicate listeners
- Memory usage grows unbounded

Solution:
- Modified on() to store both original and wrapped versions in Map
- Updated off() to find and remove the wrapped version using original
- Ensures socket.off() receives the correct callback reference

Testing:
- Navigated between screens 10+ times
- Verified memory usage stays stable (checked DevTools)
- Confirmed no duplicate event handlers firing
- Tested with React DevTools Profiler

References:
- Roadmap: infrastructure-improvements-roadmap.md:L80-L125
- Critical Issue #1 from comprehensive code review
```

### Example 2: Security Fix

```
security(session-api): add nickname validation to prevent SQL injection

[Roadmap: Week 1, Day 1, Task 1B]

Problem:
- SQL injection risk in sessions.js:486-493
- Nickname input not validated before database query
- Malicious input could manipulate queries or leak data

Solution:
- Added NICKNAME_REGEX validation (/^[a-zA-Z0-9\s]{2,20}$/)
- Returns 400 error with clear message for invalid format
- Input sanitized before any database operations

Testing:
- Valid nicknames pass: "Alice", "Bob123", "Sam Smith"
- Malicious inputs rejected: "'; DROP TABLE--", "<script>", "../../etc/passwd"
- Empty/null strings rejected with 400 error
- Tested with OWASP SQL injection test cases

References:
- Roadmap: infrastructure-improvements-roadmap.md:L128-L159
- OWASP SQL Injection Prevention Guide
- Critical Issue #2 from code review
```

### Example 3: Multi-Part Feature (2 commits)

**Commit 1:**
```
feat(logging): create frontend logger service

[Roadmap: Week 1, Day 1, Task 1C - Part 1/2]

Solution:
- Created packages/shared/utils/frontendLogger.js
- Implements log levels: debug, info, warn, error
- Generates correlation IDs for request tracing (UUID v4)
- Adds context (sessionId, participantId, timestamp)
- Includes structured metadata for aggregation

Testing:
- Unit tests for all log levels (100% coverage)
- Verified correlation ID uniqueness (1M iterations)
- Context properly attached to all log calls

References:
- Roadmap: infrastructure-improvements-roadmap.md:L162-L178
```

**Commit 2:**
```
feat(logging): add backend endpoint for frontend logs

[Roadmap: Week 1, Day 1, Task 1C - Part 2/2]

Solution:
- Created POST /api/logs endpoint
- Validates log entries with Zod schema
- Added rate limiting (100 logs/minute per client IP)
- Forwards to log aggregation service
- Returns 429 when rate limit exceeded

Testing:
- Tested rate limiting with flood of 200 logs
- Verified proper validation rejection (invalid log levels)
- Confirmed logs forwarded to aggregation service
- Load tested with 50 concurrent clients

References:
- Roadmap: infrastructure-improvements-roadmap.md:L162-L178
- Depends on: <commit-1-sha> (frontend logger)
```

### Example 4: Test Addition

```
test(transformers): add comprehensive null safety tests

[Roadmap: Week 1, Day 7]

Solution:
- Added tests for transformParticipantItems with null/undefined inputs
- Test cases: null catalog_item, invalid quantity, missing fields
- Ensures graceful degradation (no crashes, logs warnings)

Testing:
- 15 new test cases covering edge cases
- Coverage: sessionTransformers.js 45% → 82%
- All tests pass

References:
- Roadmap: infrastructure-improvements-roadmap.md:L700-L727
```

---

## Git Aliases for Roadmap Tracking

We've added these aliases to your local git config:

```bash
# View all roadmap commits
git roadmap

# View commits by week
git week1
git week2
git week3
git week4

# View critical bug fixes
git critical
```

**Usage Examples:**

```bash
# See all Week 1 progress
$ git week1

# Find specific bug fix
$ git log --grep="SQL injection"

# See all security fixes
$ git log --grep="security(" --oneline

# View commits for a specific file with roadmap context
$ git log --grep="Roadmap:" -- packages/minibag/src/services/socket.js
```

---

## Workflow for Roadmap Implementation

### Before Starting a Task

1. Read task requirements from roadmap
2. Note the Week/Day/Task identifier
3. Note relevant file locations and line numbers

### During Implementation

1. Make one logical change
2. Stage files: `git add <files>`
3. Commit with template: `git commit` (template auto-loads)
4. Fill in all sections:
   - Update type and scope
   - Add roadmap reference
   - Describe problem, solution, testing
5. Review message before saving

### After Committing

1. Push regularly to avoid conflicts
2. Reference commit SHA in related tasks
3. Update roadmap document if needed

---

## Code Review Checklist

When reviewing commits:

- [ ] Type and scope are correct
- [ ] Roadmap reference included
- [ ] Problem section explains WHY (not just what)
- [ ] Solution section is clear and complete
- [ ] Testing section shows verification
- [ ] References include line numbers
- [ ] Commit is granular (one logical change)
- [ ] No unrelated changes bundled

---

## Benefits

### For Development

- **Bisecting**: Quickly find which commit introduced a bug
- **Reverting**: Roll back specific changes without affecting others
- **Cherry-picking**: Apply fixes to other branches easily
- **Code Review**: Reviewers see clear, focused changes

### For Project Management

- **Progress Tracking**: Count commits per task/week
- **Estimation**: Learn actual time vs. estimated time
- **Reporting**: Generate progress reports from git log
- **Accountability**: See who completed which roadmap tasks

### For Future Maintenance

- **Context**: Understand WHY code changed 6 months later
- **Documentation**: Git history serves as implementation log
- **Onboarding**: New developers can read commit history to learn
- **Debugging**: Trace bugs back to specific fixes with full context

---

## Anti-Patterns to Avoid

### ❌ Vague Messages

```
fix: update code
chore: changes
refactor: improvements
```

### ❌ Missing Context

```
fix(socket): fix memory leak

Fixed it.
```

### ❌ Bundling Unrelated Changes

```
fix: fix memory leak, add validation, update tests, refactor component
```

### ❌ No Roadmap Reference

```
fix(socket): fixed the listener cleanup issue

(No mention of which roadmap task this addresses)
```

---

## When to Deviate

Sometimes you may need to deviate from this template:

**Acceptable:**
- Hotfixes (emergencies can skip full template, but add context later)
- Simple typo fixes in documentation
- Automated commits (dependency updates, generated code)

**Not Acceptable:**
- Committing any of the 27 roadmap tasks without proper documentation
- Security fixes without explanation
- Critical bug fixes without testing details

---

## Questions?

- Unclear about commit structure? Check examples above
- Unsure which scope to use? Ask in #engineering
- Need to split a commit? Use `git reset HEAD~1` and recommit
- Made a mistake? Use `git commit --amend` (before pushing)

---

## Document History

- **2025-11-07 v1.0:** Initial version created for infrastructure roadmap
- Addresses: Large commits, missing context, inconsistent format, no task linking
- Next review: After Week 1 completion
