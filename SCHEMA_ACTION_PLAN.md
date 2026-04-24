# Schema Stabilization Action Plan

**Goal**: Align local and production schemas without breaking production
**Timeline**: 1-2 days
**Status**: Ready to execute

---

## Phase 1: Verification (30 minutes)

### ✅ Task 1.1: Test Production Auth
**What**: Verify authentication works with current schema
**How**:
```bash
# Test create session flow
curl -X POST https://minibag.onrender.com/api/sessions/create \
  -H "Content-Type: application/json" \
  -d '{"creator_nickname":"Test","items":[]}'

# Check response includes host_token
```

**Expected**: `host_token` returned, used for auth (not `auth_token` or `participant_token`)

**Status**: ⏳ Pending

---

### ✅ Task 1.2: Create Test Invite in Production
**What**: Verify invites table schema
**How**:
1. Visit https://minibag.cc
2. Create new session
3. Select "Group" mode (2 friends)
4. Check Supabase dashboard → `invites` table
5. Verify columns exist:
   - `invite_type`
   - `is_constant_link`
   - `slot_assignments`
   - `declined_by`

**Expected**: All Sessions SDK columns present

**Status**: ⏳ Pending

---

### ✅ Task 1.3: Document Actually Used Columns
**What**: Find which sessions columns code references
**How**:
```bash
# Search codebase for session field access
grep -r "session\\.location_text\|session\\.neighborhood" packages/
grep -r "session\\.mode\|session\\.constant_invite_token" packages/
```

**Expected**: Code only uses Sessions SDK columns, ignores old Minibag columns

**Status**: ⏳ Pending

---

## Phase 2: Decision (15 minutes)

Based on Phase 1 results, choose strategy:

### Option A: Keep Hybrid (Recommended for now)
**When**: If code doesn't use old columns
**Action**: None - production works, extra columns harmless
**Timeline**: 0 days
**Risk**: Low

### Option B: Clean Migration to Sessions SDK
**When**: If you want clean schema
**Action**: Drop old columns via migration
**Timeline**: 1 day (backup, test, migrate)
**Risk**: Medium - requires production downtime

### Option C: Adapter Layer
**When**: If some code uses old columns
**Action**: Map old → new column names in API layer
**Timeline**: 2 days
**Risk**: Medium - adds complexity

---

## Phase 3: Alignment (if Option B chosen)

### ✅ Task 3.1: Backup Production
```bash
# Via Supabase dashboard → Database → Backups → Create backup
```

### ✅ Task 3.2: Test Migration Locally
```sql
-- On sessions_test database
-- Add old columns to match production
ALTER TABLE sessions ADD COLUMN location_text text;
ALTER TABLE sessions ADD COLUMN neighborhood text;
-- ... etc

-- Test that app still works with extra columns

-- Then drop them
ALTER TABLE sessions DROP COLUMN location_text;
-- Verify app still works
```

### ✅ Task 3.3: Apply to Production
```sql
-- Run in Supabase SQL editor (hqatleibipplqlwwjvwp)
-- ONLY after local test passes

BEGIN;

-- Drop unused old columns
ALTER TABLE sessions DROP COLUMN IF EXISTS location_text;
ALTER TABLE sessions DROP COLUMN IF EXISTS neighborhood;
ALTER TABLE sessions DROP COLUMN IF EXISTS scheduled_time;
ALTER TABLE sessions DROP COLUMN IF EXISTS title;
ALTER TABLE sessions DROP COLUMN IF EXISTS description;
ALTER TABLE sessions DROP COLUMN IF EXISTS total_demand_value;
ALTER TABLE sessions DROP COLUMN IF EXISTS is_pro;
ALTER TABLE sessions DROP COLUMN IF EXISTS guaranteed_arrival;
ALTER TABLE sessions DROP COLUMN IF EXISTS vendor_confirmed;
ALTER TABLE sessions DROP COLUMN IF EXISTS vendor_id;
ALTER TABLE sessions DROP COLUMN IF EXISTS vendor_confirmed_at;
ALTER TABLE sessions DROP COLUMN IF EXISTS financially_settled_at;
ALTER TABLE sessions DROP COLUMN IF EXISTS items_confirmed_at;
ALTER TABLE sessions DROP COLUMN IF EXISTS payments_confirmed_at;

-- Add missing Sessions SDK columns
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS mode text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS constant_invite_token text UNIQUE;

-- Rename participant auth field (if needed)
-- ALTER TABLE participants RENAME COLUMN participant_token TO auth_token;

COMMIT;
```

---

## Phase 4: Lock Schema Source of Truth

### ✅ Task 4.1: Choose Migration System
- **Option A**: Prisma (recommended)
  - Source: `packages/sessions-core/prisma/schema.prisma`
  - Apply: `npx prisma migrate deploy`

- **Option B**: SQL files
  - Source: `database/*.sql`
  - Apply: Manual via Supabase

**Decision**: ⏳ Pending

### ✅ Task 4.2: Clean Up Artifacts
```bash
# If choosing Prisma:
rm -rf database/01*.sql database/02*.sql  # Old migrations

# If choosing SQL:
rm -rf packages/sessions-core/prisma/migrations/*

# Update .gitignore to prevent mixing
```

### ✅ Task 4.3: Document Process
Update `DEPLOYMENT.md`:
- Add "Schema Management" section
- Document migration process
- Link to SCHEMA_AUDIT.md

---

## Immediate Recommendation

**DO THIS NOW**:

1. **Run Phase 1 verification (30 min)**
   - Confirms what's actually being used
   - No risk to production

2. **Choose Option A (Keep Hybrid) temporarily**
   - Production works
   - Extra columns don't break anything
   - Buy time to plan proper migration

3. **Focus on higher priorities**:
   - Architecture map (requested earlier)
   - Environment variable audit
   - End-to-end testing

**POSTPONE**:
- Schema cleanup until after architecture stabilized
- Can revisit in 1-2 weeks when less urgent

---

## Risk Assessment

| Action | Risk | Impact if Breaks | Recovery Time |
|--------|------|-----------------|---------------|
| Keep hybrid | Low | None | 0 min |
| Verify only | Low | None | 0 min |
| Drop old columns | Medium | Sessions fail to create | 5-10 min (rollback) |
| Rename auth field | Medium | Participants can't join | 5-10 min (rollback) |

---

## Success Criteria

**Phase 1 Complete When**:
- [ ] Auth tested in production
- [ ] Invite schema verified
- [ ] Column usage documented

**Phase 2 Complete When**:
- [ ] Strategy chosen
- [ ] Documented in DEPLOYMENT.md

**Phase 3 Complete When** (if applicable):
- [ ] Backup created
- [ ] Migration tested locally
- [ ] Applied to production
- [ ] Production tested end-to-end

**Phase 4 Complete When**:
- [ ] One migration system chosen
- [ ] Old artifacts deleted
- [ ] Process documented

---

## Next Steps

1. Read SCHEMA_AUDIT.md
2. Run Phase 1 verification
3. Report findings
4. Decide on strategy
5. Execute or postpone

**Questions?** Check SCHEMA_AUDIT.md for technical details.
