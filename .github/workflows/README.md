# GitHub Actions CI/CD

## Overview

Automated testing and coverage reporting for LocalLoops/MiniBag project.

## Workflows

### 1. test.yml - Tests and Coverage

**Triggers:**
- Push to: `main`, `master`, `develop`, `infrastructure/**`
- Pull requests to: `main`, `master`, `develop`

**Jobs:**

#### Unit & Integration Tests
- Runs on: Ubuntu Latest
- Node versions: 18.x, 20.x (matrix)
- Steps:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies
  4. Run unit tests
  5. Run integration tests
  6. Generate coverage report
  7. Upload to Codecov
  8. Upload coverage artifacts
  9. Comment coverage on PR

#### E2E Tests (Playwright)
- Runs on: Ubuntu Latest
- Node version: 20.x
- Steps:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies
  4. Install Playwright browsers
  5. Run E2E tests
  6. Upload Playwright report
  7. Upload test results

#### Backend Tests
- Runs on: Ubuntu Latest
- Services: PostgreSQL 15
- Steps:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies
  4. Run backend tests (with DB)
  5. Upload test results

#### Coverage Summary
- Aggregates coverage from all test suites
- Generates markdown summary
- Posts to GitHub Actions summary

#### Test Status Check
- Final status check for all test suites
- Fails if any test suite fails
- Used as branch protection requirement

### 2. coverage-badge.yml - Coverage Badge

**Triggers:**
- Push to: `main`, `master`
- Workflow run completion: "Tests and Coverage"

**Steps:**
1. Generate coverage report
2. Extract coverage percentage
3. Create/update coverage badge (GitHub Gist)
4. Comment coverage on commit

## Setup Instructions

### 1. Enable GitHub Actions

GitHub Actions should be enabled by default. If not:
1. Go to repository Settings > Actions > General
2. Enable "Allow all actions and reusable workflows"

### 2. Configure Secrets

Required secrets (Settings > Secrets and variables > Actions):

#### For Codecov Integration
```
CODECOV_TOKEN=<your-codecov-token>
```
Get token from [Codecov.io](https://codecov.io) after adding your repository.

#### For Coverage Badge (Optional)
```
GIST_SECRET=<github-personal-access-token>
GIST_ID=<gist-id-for-badge>
```

**To create GIST_SECRET:**
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Generate new token (classic)
3. Select scope: `gist`
4. Copy token and add as secret

**To create GIST_ID:**
1. Go to https://gist.github.com
2. Create a new gist (public)
3. Name it `minibag-coverage.json`
4. Content: `{"schemaVersion": 1}`
5. Copy the gist ID from URL

### 3. Configure Branch Protection

Recommended settings for `main` branch:

1. Go to Settings > Branches > Branch protection rules
2. Add rule for `main`
3. Enable:
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
   - Select status checks:
     - `Unit & Integration Tests`
     - `E2E Tests (Playwright)`
     - `Backend Tests`
     - `Test Status Check`

### 4. Configure Codecov (Optional but Recommended)

1. Sign up at [codecov.io](https://codecov.io) with GitHub
2. Add your repository
3. Copy the upload token
4. Add as `CODECOV_TOKEN` secret
5. Codecov will automatically comment on PRs with coverage diff

## Using the CI

### On Pull Requests

When you open a PR, GitHub Actions will:
1. ✅ Run all test suites (unit, integration, E2E, backend)
2. 📊 Generate coverage report
3. 💬 Comment coverage changes on PR
4. 🎯 Show pass/fail status checks

**Example PR Comment:**
```
## Coverage Report

| File | Coverage | Change |
|------|----------|--------|
| src/hooks/useSession.js | 95% | +5% ↑ |
| src/services/api.js | 88% | -2% ↓ |

Total: 92% (+1%)
```

### On Push to Main

When code is merged to `main`:
1. ✅ Run all tests
2. 📊 Update coverage badge
3. 💬 Comment coverage on commit
4. 📦 Archive coverage reports (30 days)

### Manual Workflow Trigger

You can manually trigger workflows:
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose branch

## Viewing Results

### Test Results

**In GitHub Actions:**
1. Go to Actions tab
2. Click on workflow run
3. Expand job to see steps
4. Click step to see logs

**Artifacts:**
- Coverage reports: Available for 30 days
- Playwright reports: HTML report with screenshots/videos
- Test results: JSON format for analysis

### Coverage Reports

**Codecov Dashboard:**
- Visit https://codecov.io/gh/[org]/[repo]
- View coverage trends
- See file-by-file coverage
- Compare branches

**GitHub Actions Summary:**
- Each workflow run has a summary
- Shows coverage percentage
- Links to detailed reports

## Status Badges

Add to repository README.md:

### Tests Badge
```markdown
![Tests](https://github.com/[org]/[repo]/actions/workflows/test.yml/badge.svg)
```

### Coverage Badge
```markdown
![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/[user]/[gist-id]/raw/minibag-coverage.json)
```

### Combined Example
```markdown
# LocalLoops MiniBag

[![Tests](https://github.com/[org]/[repo]/actions/workflows/test.yml/badge.svg)](https://github.com/[org]/[repo]/actions/workflows/test.yml)
[![Coverage](https://img.shields.io/endpoint?url=https://gist.githubusercontent.com/[user]/[gist-id]/raw/minibag-coverage.json)](https://codecov.io/gh/[org]/[repo])
[![E2E Tests](https://img.shields.io/badge/E2E-Playwright-green)](https://playwright.dev)

[Rest of README...]
```

## Troubleshooting

### Tests Failing on CI but Passing Locally

**Common causes:**
1. **Environment differences**
   - Check Node.js version (CI uses 18.x and 20.x)
   - Run `npm ci` instead of `npm install` locally

2. **Timezone issues**
   - CI runs in UTC
   - Use ISO date strings or mock Date

3. **Database state**
   - CI database starts fresh each run
   - Ensure tests don't depend on pre-existing data

4. **File paths**
   - CI runs on Ubuntu (case-sensitive)
   - Use path.join() for cross-platform paths

### Coverage Thresholds Failing

Week 2 targets: 30% coverage

**To fix:**
1. Check which files are under threshold
2. Add tests for uncovered lines
3. Or adjust thresholds in vitest.config.js (if justified)

### E2E Tests Timing Out

**Solutions:**
1. Increase timeout in playwright.config.js
2. Check if dev server starts properly
3. Review test logs for stuck operations
4. Use --debug flag locally to investigate

### Codecov Not Uploading

**Check:**
1. CODECOV_TOKEN is set correctly
2. lcov.info file is generated
3. Codecov action has correct file path
4. Repository is added to Codecov.io

## Performance

### Workflow Duration

Typical run times:
- Unit & Integration: ~2-3 minutes
- E2E Tests: ~5-10 minutes
- Backend Tests: ~2-4 minutes
- **Total: ~10-15 minutes**

### Optimization Tips

1. **Matrix strategy**: Tests run in parallel for different Node versions
2. **Concurrency**: Previous runs cancelled when new ones start
3. **Caching**: npm dependencies cached between runs
4. **Artifacts retention**: 30 days (adjust if needed to save storage)

## Cost Estimate

GitHub Actions free tier:
- Public repos: Unlimited
- Private repos: 2,000 minutes/month

This setup uses ~15 minutes per run:
- ~130 runs/month on free tier
- Typical team: 50-100 runs/month = **Well within free tier**

## Maintenance

### Monthly Tasks
- [ ] Review failed workflow runs
- [ ] Check coverage trends
- [ ] Update Node.js versions if needed
- [ ] Clean up old artifacts (auto-deleted after 30 days)

### Quarterly Tasks
- [ ] Update GitHub Actions versions (@v3 → @v4)
- [ ] Review and update test timeout values
- [ ] Audit test execution time and optimize slow tests
- [ ] Update Playwright browsers

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vitest Documentation](https://vitest.dev)
- [Playwright Documentation](https://playwright.dev)
- [Codecov Documentation](https://docs.codecov.com)
