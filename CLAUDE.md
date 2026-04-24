# LocalLoops Source Code Protection - Project Guide

## Project Context

**What**: Source code protection for LocalLoops federated platform ecosystem
**Status**: Phase 1 (Repository Privacy & Documentation) - Ready to plan
**Mode**: YOLO (auto-execute)

See `.planning/PROJECT.md` for full context.

## Current Phase

**Phase 1: Repository Privacy & Documentation**
- Goal: Repositories are private and future protection options are documented
- Requirements: REPO-01, DOC-01, DOC-02
- Status: Not started

## GSD Workflow

This project uses Get Shit Done (GSD) methodology:

1. **Planning**: `/gsd-plan-phase [N]` - Create executable plans for a phase
2. **Execution**: `/gsd-execute-phase [N]` - Run all plans in a phase
3. **Verification**: Automatic - verifies deliverables match phase goals
4. **Progress**: `/gsd-progress` - Check status and next steps

## Quick Commands

- `/gsd-progress` - Show current status and what's next
- `/gsd-plan-phase 1` - Create plans for Phase 1
- `/gsd-execute-phase 1` - Execute Phase 1 (after planning)

## Files

- `.planning/PROJECT.md` - Project overview and context
- `.planning/REQUIREMENTS.md` - All requirements (v1, v2, out of scope)
- `.planning/ROADMAP.md` - 3 phases with success criteria
- `.planning/config.json` - Workflow preferences (YOLO mode, coarse granularity)

## Protection Strategy

**Now (Phase 1-3):**
- Private repos (free)
- Frontend obfuscation (free)
- Basic backend hardening (free)

**Later (when validated):**
- License key system
- Domain locking
- Runtime integrity checks

See UPGRADE_PATH.md (created in Phase 1) for upgrade details.

---
*Last updated: 2026-04-22 - Project initialized*
