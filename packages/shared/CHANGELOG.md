# Changelog

All notable changes to LocalLoops will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased] - 2025-11-01

### Added

- Checkpoint mechanism (3-state logic: not set / solo / group)
- Host token authentication for secure session operations
- Participant confirmation flow
- 20-minute auto-timeout for unfilled participant slots
- Decline functionality for invited participants
- Real-time WebSocket sync for confirmation status

### Changed

- Start shopping now requires checkpoint validation (group mode)
- Solo mode bypasses checkpoint for immediate shopping
- Session status updates require X-Host-Token header
- Host confirmation happens at "Start List" click (not separate step)
- Participant items sync changed to upsert pattern (prevents race conditions)

### Fixed

- Real-time sync for participant items and confirmation status
- Content-Type header preservation in apiFetch
- Checkpoint validation accuracy (excludes host, declined, timed-out)

### Technical

- Database: Added expected_participants, checkpoint_complete, host_token to sessions
- Database: Added items_confirmed, marked_not_coming, auto_timed_out to participants
- API: New PATCH /api/sessions/:id/expected endpoint
- API: Modified PUT /api/sessions/:id/status (now requires host token)

### Documentation

- Created CHECKPOINT_MECHANISM.md (complete guide)
- Created SESSION_FLOWS.md (flowcharts for all scenarios)
- Updated API.md v1.1.0 (checkpoint and host token sections)
- Updated DATABASE.md v1.1.0 (new schema fields)
- Updated ARCHITECTURE.md v1.1.0 (checkpoint architecture)

### Code Quality

- Removed 19 debug console.log statements
- Deleted 12 old backup files
- Cleaned test database

---

## [0.2.0] - 2025-10-31

### Added
- Initial session coordination system
- Participant joining via QR code
- WebSocket real-time sync

---

## [0.1.0] - 2025-10-24

### Added
- Initial project structure
- Basic UI components
- Landing page
