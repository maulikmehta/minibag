# Restore Points - Minibag
**Automated Snapshot System**

This directory contains backup files and restoration guides for experimental features.

---

## ✅ Automated Tools (Implemented Oct 24, 2025)

### 📸 `snapshot.sh` - Create Restore Points
**Usage:**
```bash
cd /Users/maulik/llcode/localloops/packages/minibag
./snapshot.sh "description of change"
```

**What it does:**
- Backs up `minibag-ui-prototype.tsx`
- Creates timestamped snapshot: `YYYY-MM-DD_description.tsx.bak`
- Generates metadata file with date, time, description
- Shows file size and location
- Provides restore instructions

**Example:**
```bash
./snapshot.sh "add-dark-mode"
# Creates: 2025-10-25_add-dark-mode.tsx.bak
# Creates: 2025-10-25_add-dark-mode.meta.txt
```

---

### 🔄 `restore.sh` - Restore from Snapshots
**Usage:**

**Interactive mode (recommended):**
```bash
./restore.sh
# Shows numbered list of snapshots
# Select by number or name
```

**Direct mode:**
```bash
./restore.sh "2025-10-25_add-dark-mode"
# Restores specific snapshot
```

**What it does:**
- Lists all available snapshots with metadata
- Shows descriptions and file sizes
- Confirms before restoring
- Creates safety backup of current file
- Restores selected snapshot

**Safety:**
- Always creates `pre-restore-YYYYMMDD-HHMMSS.tsx.bak` before overwriting
- Requires explicit confirmation ("yes")
- Shows what will be restored

---

## Purpose

When implementing experimental features (not part of core development plan):
1. **Before:** `./snapshot.sh "description"`
2. **Implement:** Make your changes
3. **Test:** Verify functionality
4. **Document:** Update `EXPERIMENTAL_FEATURES.md` (optional)
5. **Rollback:** `./restore.sh` if needed

---

## Structure

```
RESTORE_POINTS/
├── README.md                                # This file
├── snapshot.sh                              # ✅ Automated snapshot tool
├── restore.sh                               # ✅ Automated restore tool
│
├── [DATE]_[description].tsx.bak             # Full file backups
├── [DATE]_[description].meta.txt            # Metadata (date, time, desc)
│
├── pre-restore-[TIMESTAMP].tsx.bak          # Safety backups before restore
└── checklist_screen_snippet.txt             # Legacy code snippets
```

---

## Available Restore Points

### October 24, 2025

**1. Post-Merge Backup**
- File: `2025-10-24_post-merge.tsx.bak`
- Description: Checklist-payment merge implementation
- Snippet: `checklist_screen_snippet.txt` (removed code)

**2. Add Landing Page**
- File: `2025-10-24_add-landing-page.tsx.bak`
- Metadata: `2025-10-24_add-landing-page.meta.txt`
- Created: Oct 24, 23:23

**3. LocalLoops Landing + Bag Icon**
- File: `2025-10-24_localloops-landing-and-bag-icon.tsx.bak`
- Metadata: `2025-10-24_localloops-landing-and-bag-icon.meta.txt`
- Created: Oct 24, 23:28

**4. Fix Navigation Hierarchy**
- File: `2025-10-24_fix-navigation-hierarchy.tsx.bak`
- Metadata: `2025-10-24_fix-navigation-hierarchy.meta.txt`
- Created: Oct 24, 23:35

---

## Quick Start

### Create a Snapshot Before Experimenting

```bash
cd packages/minibag

# Create snapshot
./snapshot.sh "add-voice-search"

# Make your changes to minibag-ui-prototype.tsx
# ... edit files ...

# Test
npm run dev

# If something breaks, restore
./restore.sh
# Select snapshot from list
```

---

## Examples

### Scenario 1: Testing New Feature
```bash
# Before implementing
./snapshot.sh "test-new-gradient-colors"

# Implement feature
# ... make changes ...

# Test - looks good! Keep it.
# (No restore needed)
```

### Scenario 2: Rollback Failed Experiment
```bash
# Before implementing
./snapshot.sh "complex-animation-experiment"

# Implement feature
# ... make changes ...

# Test - performance issues!
./restore.sh
# Select: 2025-10-25_complex-animation-experiment
# Type: yes

# Back to working state
```

### Scenario 3: Compare Changes
```bash
# Create snapshot
./snapshot.sh "before-refactor"

# Make changes
# ...

# Want to see diff
diff RESTORE_POINTS/2025-10-25_before-refactor.tsx.bak minibag-ui-prototype.tsx
```

---

## Best Practices

### ✅ Do's
- **Always snapshot before experiments** - Safety first
- **Use descriptive names** - "add-dark-mode" not "test1"
- **Snapshot before risky changes** - Refactors, merges, deletions
- **Test restores occasionally** - Verify backups work
- **Archive old snapshots** - Move to `ARCHIVE/` subfolder after 30 days

### ❌ Don'ts
- **Don't rely on git alone** - Snapshots are faster for quick rollbacks
- **Don't use spaces in names** - Use hyphens instead
- **Don't skip metadata** - Future you will thank you
- **Don't delete working snapshots** - Disk is cheap, time is not

---

## Maintenance

### Archiving Old Snapshots
```bash
# After 30 days or feature is stable
mkdir -p RESTORE_POINTS/ARCHIVE
mv RESTORE_POINTS/2025-10-*.bak RESTORE_POINTS/ARCHIVE/
mv RESTORE_POINTS/2025-10-*.meta.txt RESTORE_POINTS/ARCHIVE/
```

### Cleaning Up
```bash
# List snapshots by size
ls -lhS RESTORE_POINTS/*.bak

# Remove specific snapshot (if really sure)
rm RESTORE_POINTS/2025-10-24_test.tsx.bak
rm RESTORE_POINTS/2025-10-24_test.meta.txt
```

---

## Advanced Usage

### Create Snapshot with Timestamp
```bash
# Snapshot includes time automatically
./snapshot.sh "fix-critical-bug"
# Creates: 2025-10-25_fix-critical-bug.tsx.bak (with time in metadata)
```

### Restore Specific Snapshot Directly
```bash
# Skip interactive menu
./restore.sh "2025-10-25_add-dark-mode"
```

### Manual Restore (No Script)
```bash
# If scripts aren't available
cp RESTORE_POINTS/2025-10-25_snapshot-name.tsx.bak minibag-ui-prototype.tsx
```

---

## Troubleshooting

### "Snapshot not found"
- Check you're in `packages/minibag/` directory
- Verify snapshot exists: `ls RESTORE_POINTS/`
- Use exact snapshot name (copy from `./restore.sh` list)

### "Permission denied"
```bash
# Make scripts executable
chmod +x snapshot.sh restore.sh
```

### "No snapshots found"
- You haven't created any yet
- Run: `./snapshot.sh "initial-state"` to create first snapshot

---

## Integration with Git

**Restore points complement Git (not replace):**

| Scenario | Use |
|----------|-----|
| **Quick experiment rollback** | Restore points ✅ (instant) |
| **Version history** | Git ✅ (full history) |
| **Share with team** | Git ✅ (push to remote) |
| **Local safety net** | Restore points ✅ (no commits) |
| **Before risky refactor** | Both! (snapshot + git branch) |

**Workflow:**
```bash
# Before experimental feature
git checkout -b feature/voice-search   # Git branch
./snapshot.sh "before-voice-search"    # Restore point

# Make changes...

# If good:
git add .
git commit -m "Add voice search"
git checkout main && git merge feature/voice-search

# If bad:
./restore.sh  # Quick rollback
git checkout main && git branch -D feature/voice-search
```

---

## Statistics

**Current Snapshots:** 4 (as of Oct 25, 2025)
**Total Size:** ~172KB (43KB × 4)
**Oldest Snapshot:** Oct 24, 23:10 (post-merge)
**Newest Snapshot:** Oct 24, 23:35 (fix navigation)

---

## Future Enhancements

**Completed:**
- [x] Create `snapshot.sh` script ✅ (Oct 24)
- [x] Create `restore.sh` script ✅ (Oct 24)
- [x] Automated backup creation ✅
- [x] Interactive restore menu ✅
- [x] Metadata tracking ✅

**Planned:**
- [ ] Add git-style diffing between snapshots
- [ ] Implement snapshot compression (gzip)
- [ ] Auto-archive snapshots > 30 days old
- [ ] Visual snapshot timeline
- [ ] Snapshot tags/labels

---

**Last Updated:** October 25, 2025
**Scripts:** `snapshot.sh`, `restore.sh`
**Status:** ✅ Fully Automated

🔄 **Always snapshot before experimenting!**
