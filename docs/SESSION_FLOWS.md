# Session Flows

**Created:** November 1, 2025
**Version:** 1.0.0
**Status:** Complete

---

## Overview

This document provides complete flowcharts for all session scenarios in LocalLoops, including the checkpoint mechanism, participant coordination, and shopping phases.

---

## Flow 1: Session Creation (Solo Mode)

**Scenario:** Host creates a session and shops alone without participants.

```
┌─────────────────────────────────────────┐
│ HomeScreen                              │
│ User clicks "New List"                  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionCreateScreen (Step 1)            │
│ - Add items from catalog                │
│ - Enter location, scheduled time        │
│ - Items: [Tomatoes 2kg, Onions 1kg]    │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Start List")
┌─────────────────────────────────────────┐
│ Name/Nickname Modal                     │
│ - Enter real name (optional)            │
│ - Select nickname from pool             │
│ - Selected: "Raj 👑"                    │
└─────────────┬───────────────────────────┘
              │
              ▼ (Submit)
┌─────────────────────────────────────────┐
│ API: POST /api/sessions                 │
│                                         │
│ Body:                                   │
│ {                                       │
│   location_text: "Building A",         │
│   scheduled_time: "2025-11-01T18:00",  │
│   selected_nickname: "Raj",            │
│   selected_avatar_emoji: "👑",         │
│   items: [...]                         │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Backend: Create Session                 │
│ - Generate session_id: "abc123"        │
│ - Generate host_token: "secure_token"  │
│ - Set items_confirmed: true (host)     │
│ - Set expected_participants: null      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Frontend: Store host_token              │
│                                         │
│ localStorage.setItem(                   │
│   `host_token_abc123`,                 │
│   'secure_token'                       │
│ )                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Step 2)            │
│                                         │
│ State:                                  │
│ - expected_participants: null          │
│ - checkpoint_complete: N/A             │
│ - Status: "Start Shopping" DISABLED    │
│                                         │
│ UI Shows:                               │
│ "Set how many friends joining above"   │
└─────────────┬───────────────────────────┘
              │
              ▼ (Select "0 - Go solo")
┌─────────────────────────────────────────┐
│ API: PATCH /api/sessions/:id/expected   │
│                                         │
│ Body: { expected_participants: 0 }     │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Updated)           │
│                                         │
│ State:                                  │
│ - expected_participants: 0             │
│ - Checkpoint BYPASSED                  │
│ - Status: "Start Shopping" ENABLED     │
│                                         │
│ UI Shows:                               │
│ "Ready to shop - Solo mode"            │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Start Shopping")
┌─────────────────────────────────────────┐
│ API: PUT /api/sessions/:id/status       │
│                                         │
│ Headers:                                │
│   X-Host-Token: secure_token           │
│                                         │
│ Body: { status: 'shopping' }           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Backend: Validate & Update              │
│ - Verify host_token ✓                  │
│ - Update status to 'shopping'          │
│ - Broadcast to WebSocket room          │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ShoppingScreen                          │
│ - Record payments for items             │
│ - Mark items as purchased               │
│ - Complete shopping                     │
└─────────────────────────────────────────┘
```

**Duration:** ~2-3 minutes
**Key Points:**
- No checkpoint validation needed
- Immediate shopping access after setting solo mode
- Host token required for status change

---

## Flow 2: Session Creation (Group Mode)

**Scenario:** Host creates a session and waits for 2 participants to join and confirm.

```
┌─────────────────────────────────────────┐
│ HomeScreen → SessionCreateScreen        │
│ (Same as Solo Mode above)               │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Step 2)            │
│                                         │
│ State:                                  │
│ - expected_participants: null          │
│ - Status: "Start Shopping" DISABLED    │
└─────────────┬───────────────────────────┘
              │
              ▼ (Select "2 - Wait for 2")
┌─────────────────────────────────────────┐
│ API: PATCH /api/sessions/:id/expected   │
│                                         │
│ Body: { expected_participants: 2 }     │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Updated)           │
│                                         │
│ State:                                  │
│ - expected_participants: 2             │
│ - joinedCount: 0                       │
│ - Status: "Start Shopping" DISABLED    │
│                                         │
│ UI Shows:                               │
│ "Waiting for 2 more to join"           │
│                                         │
│ Share Options:                          │
│ [QR Code] [Copy Link] [WhatsApp]       │
└─────────────┬───────────────────────────┘
              │
              │ ┌──────────────────────────┐
              │ │ Participant 1 joins     │
              ▼ │ (See Flow 3 below)      │
┌──────────────┴──────────────────────────┐
│ WebSocket: participant-joined           │
│                                         │
│ {                                       │
│   participant: {                        │
│     id: "p_001",                       │
│     nickname: "Maya",                  │
│     items_confirmed: false             │
│   }                                     │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Updated)           │
│                                         │
│ State:                                  │
│ - joinedCount: 1                       │
│ - confirmedCount: 0                    │
│ - Status: "Start Shopping" DISABLED    │
│                                         │
│ UI Shows:                               │
│ "Waiting for 1 more to join"           │
│ "Maya joined but hasn't confirmed"     │
└─────────────┬───────────────────────────┘
              │
              │ ┌──────────────────────────┐
              │ │ Participant 2 joins     │
              ▼ │ (See Flow 3 below)      │
┌──────────────┴──────────────────────────┐
│ WebSocket: participant-joined           │
│                                         │
│ {                                       │
│   participant: {                        │
│     id: "p_002",                       │
│     nickname: "Amit",                  │
│     items_confirmed: false             │
│   }                                     │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Updated)           │
│                                         │
│ State:                                  │
│ - joinedCount: 2                       │
│ - confirmedCount: 0                    │
│ - Status: "Start Shopping" DISABLED    │
│                                         │
│ UI Shows:                               │
│ "All expected joined!"                  │
│ "Waiting for 2 to confirm lists"       │
│                                         │
│ Checkpoint 1: ✓ (all expected joined)  │
│ Checkpoint 2: ✗ (waiting confirmations)│
└─────────────┬───────────────────────────┘
              │
              │ ┌──────────────────────────┐
              │ │ Maya confirms list      │
              ▼ │                         │
┌──────────────┴──────────────────────────┐
│ WebSocket: participant-status-updated   │
│                                         │
│ {                                       │
│   participant: {                        │
│     id: "p_001",                       │
│     items_confirmed: true              │
│   }                                     │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Updated)           │
│                                         │
│ State:                                  │
│ - confirmedCount: 1/2                  │
│ - Status: "Start Shopping" DISABLED    │
│                                         │
│ UI Shows:                               │
│ "Maya ✓ confirmed"                     │
│ "Waiting for Amit to confirm"          │
└─────────────┬───────────────────────────┘
              │
              │ ┌──────────────────────────┐
              │ │ Amit confirms list      │
              ▼ │                         │
┌──────────────┴──────────────────────────┐
│ WebSocket: participant-status-updated   │
│                                         │
│ {                                       │
│   participant: {                        │
│     id: "p_002",                       │
│     items_confirmed: true              │
│   }                                     │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Updated)           │
│                                         │
│ State:                                  │
│ - confirmedCount: 2/2                  │
│ - Status: "Start Shopping" ENABLED     │
│                                         │
│ UI Shows:                               │
│ "All participants ready!"               │
│ "Maya ✓ confirmed"                     │
│ "Amit ✓ confirmed"                     │
│                                         │
│ Checkpoint 1: ✓ (all expected joined)  │
│ Checkpoint 2: ✓ (all confirmed)        │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Start Shopping")
┌─────────────────────────────────────────┐
│ API: PUT /api/sessions/:id/status       │
│ Headers: X-Host-Token                   │
│ Body: { status: 'shopping' }           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ShoppingScreen                          │
│ - Record payments                       │
│ - Complete shopping                     │
└─────────────────────────────────────────┘
```

**Duration:** ~5-10 minutes
**Key Points:**
- Two checkpoints: all joined + all confirmed
- Real-time updates via WebSocket
- Shopping enabled only when both checkpoints met

---

## Flow 3: Participant Join & Confirm

**Scenario:** Participant receives invite link, joins session, adds items, and confirms.

```
┌─────────────────────────────────────────┐
│ Participant receives link/QR           │
│ https://minibag.in/abc123              │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Browser: Load session URL               │
│                                         │
│ Route: /session/:sessionId             │
│ Params: { sessionId: "abc123" }        │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ API: GET /api/sessions/abc123           │
│                                         │
│ Verify session exists and is active    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionJoinScreen                       │
│                                         │
│ Shows:                                  │
│ - Session details (location, time)     │
│ - Host name                             │
│ - "Join Session" button                │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Join Session")
┌─────────────────────────────────────────┐
│ Name/Nickname Modal                     │
│ - Enter real name (optional)            │
│ - Select nickname from pool             │
│ - Selected: "Maya 🌸"                   │
└─────────────┬───────────────────────────┘
              │
              ▼ (Submit)
┌─────────────────────────────────────────┐
│ API: POST /api/sessions/:id/join        │
│                                         │
│ Body:                                   │
│ {                                       │
│   real_name: "Maya Kumar",             │
│   selected_nickname: "Maya",           │
│   selected_avatar_emoji: "🌸"          │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Backend: Create Participant             │
│ - Create participant record             │
│ - Set items_confirmed: false           │
│ - Mark nickname as used                │
│ - Set invite_timeout_at (+20 min)      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ WebSocket: Broadcast participant-joined │
│                                         │
│ Notifies:                               │
│ - Host (SessionActiveScreen)           │
│ - Other participants                    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ParticipantChecklistScreen              │
│                                         │
│ Shows:                                  │
│ - Catalog items                         │
│ - Add to list functionality             │
│ - "Confirm my list" button (disabled)  │
└─────────────┬───────────────────────────┘
              │
              ▼ (Add items from catalog)
┌─────────────────────────────────────────┐
│ Add: Tomatoes 2kg                       │
│ Add: Onions 1kg                         │
│ Add: Potatoes 3kg                       │
│                                         │
│ Items: [                                │
│   { item_id: "v001", quantity: 2 },    │
│   { item_id: "v002", quantity: 1 },    │
│   { item_id: "v003", quantity: 3 }     │
│ ]                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ API: PUT /api/participants/:id/items    │
│                                         │
│ Body: {                                 │
│   items: [...],                        │
│   items_confirmed: false               │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ WebSocket: participant-items-updated    │
│                                         │
│ Broadcasts to host:                     │
│ - Updated item list                     │
│ - Confirmation status: false           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ParticipantChecklistScreen (Updated)    │
│                                         │
│ Shows:                                  │
│ - Items added: 3 items                  │
│ - "Confirm my list" button (ENABLED)   │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Confirm my list")
┌─────────────────────────────────────────┐
│ Confirmation Modal                      │
│                                         │
│ "Confirm your list?"                    │
│ "You won't be able to edit after this" │
│                                         │
│ [Cancel] [Confirm]                     │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Confirm")
┌─────────────────────────────────────────┐
│ API: PUT /api/participants/:id/status   │
│                                         │
│ Body: {                                 │
│   items_confirmed: true                │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Backend: Update Participant             │
│ - Set items_confirmed: true            │
│ - Lock items from editing               │
│ - Update checkpoint calculation         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ WebSocket: participant-status-updated   │
│                                         │
│ Broadcasts to:                          │
│ - Host (update checkpoint)             │
│ - Other participants (info)            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ParticipantTrackingScreen               │
│                                         │
│ Shows:                                  │
│ - "List confirmed ✓"                   │
│ - Your items (read-only)                │
│ - Waiting for host to start shopping   │
│ - Session status updates                │
└─────────────────────────────────────────┘
```

**Duration:** ~3-5 minutes
**Key Points:**
- Nickname selection prevents duplicates
- Items locked after confirmation
- Real-time updates to host's checkpoint

---

## Flow 4: Participant Decline

**Scenario:** Participant receives invite but declines to participate.

```
┌─────────────────────────────────────────┐
│ Participant loads session URL           │
│ https://minibag.in/abc123              │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionJoinScreen                       │
│                                         │
│ Shows:                                  │
│ - Session details                       │
│ - [Join Session] button                │
│ - [Not Coming] button                  │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Not Coming")
┌─────────────────────────────────────────┐
│ Decline Confirmation Modal              │
│                                         │
│ "Decline invitation?"                   │
│ "The host will be notified"            │
│                                         │
│ [Cancel] [Decline]                     │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Decline")
┌─────────────────────────────────────────┐
│ Name/Nickname Modal                     │
│ - "Who should we tell declined?"       │
│ - Select nickname                       │
└─────────────┬───────────────────────────┘
              │
              ▼ (Submit)
┌─────────────────────────────────────────┐
│ API: POST /api/sessions/:id/decline     │
│                                         │
│ Body: {                                 │
│   selected_nickname: "Priya",          │
│   selected_avatar_emoji: "💫"          │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Backend: Create Participant (Declined)  │
│ - Create participant record             │
│ - Set marked_not_coming: true          │
│ - Set items_confirmed: false           │
│ - Update checkpoint calculation         │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ WebSocket: participant-status-updated   │
│                                         │
│ Broadcasts to host:                     │
│ {                                       │
│   participant: {                        │
│     nickname: "Priya",                 │
│     marked_not_coming: true            │
│   }                                     │
│ }                                       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Host: SessionActiveScreen (Updated)     │
│                                         │
│ State:                                  │
│ - notComingCount: 1                    │
│ - Checkpoint recalculated               │
│                                         │
│ UI Shows:                               │
│ "Priya declined invitation"             │
│ "Waiting for X more"                   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Participant: Thank You Screen           │
│                                         │
│ "Thanks for letting us know!"           │
│ "The host has been notified"           │
│                                         │
│ [Close]                                 │
└─────────────────────────────────────────┘
```

**Duration:** ~1-2 minutes
**Key Points:**
- Decline counts toward checkpoint completion
- Host notified in real-time
- Participant still assigned nickname for tracking

---

## Flow 5: Auto-Timeout

**Scenario:** Host sets expected=3, only 1 joins, 2 slots timeout after 20 minutes.

```
┌─────────────────────────────────────────┐
│ Host: SessionActiveScreen               │
│                                         │
│ State:                                  │
│ - expected_participants: 3             │
│ - joinedCount: 1                       │
│ - created_at: T₀                       │
└─────────────┬───────────────────────────┘
              │
              ▼ (Wait 15 minutes)
┌─────────────────────────────────────────┐
│ Timer: Check elapsed time               │
│                                         │
│ elapsedTime = now() - created_at       │
│ = 15 minutes                            │
│                                         │
│ Status: Still waiting                   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ UI Shows:                               │
│ "Waiting for 2 more to join"           │
│ "Invite expires in 5 minutes"          │
└─────────────┬───────────────────────────┘
              │
              ▼ (Wait 5 more minutes)
┌─────────────────────────────────────────┐
│ Timer: 20-minute threshold reached      │
│                                         │
│ elapsedTime = now() - created_at       │
│ = 20 minutes                            │
│                                         │
│ Trigger: Auto-timeout logic             │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Frontend: Calculate auto-timeout        │
│                                         │
│ unfilledSlots = expected - (joined +   │
│                              notComing) │
│ = 3 - (1 + 0)                          │
│ = 2 slots                               │
│                                         │
│ autoTimedOutCount = 2                  │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ Checkpoint Recalculation                │
│                                         │
│ checkpointMet =                         │
│   (joined + notComing + timedOut)      │
│   >= expected                           │
│                                         │
│ = (1 + 0 + 2) >= 3                     │
│ = 3 >= 3                                │
│ = TRUE ✓                                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ SessionActiveScreen (Updated)           │
│                                         │
│ State:                                  │
│ - joinedCount: 1                       │
│ - autoTimedOutCount: 2                 │
│ - Checkpoint: MET (if joined confirmed)│
│ - Status: "Start Shopping" ENABLED     │
│                                         │
│ UI Shows:                               │
│ "⏱ Invite timeout: 2 slots unfilled"   │
│ "Ready to shop with 1 participant"     │
└─────────────┬───────────────────────────┘
              │
              ▼ (Click "Start Shopping")
┌─────────────────────────────────────────┐
│ API: PUT /api/sessions/:id/status       │
│ Body: { status: 'shopping' }           │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│ ShoppingScreen                          │
│ - Shop with 1 participant               │
│ - 2 slots never filled                  │
└─────────────────────────────────────────┘
```

**Duration:** 20 minutes wait
**Key Points:**
- Automatic after 20 minutes
- Prevents indefinite waiting
- Allows shopping with partial participants

---

## State Diagram

**Session Status State Machine**

```
                  ┌─────────┐
                  │         │
                  │  START  │
                  │         │
                  └────┬────┘
                       │
                       │ POST /api/sessions
                       ▼
                  ┌─────────┐
                  │         │
            ┌────▶│  OPEN   │
            │     │         │
            │     └────┬────┘
            │          │
            │          │ First participant joins
            │          ▼
            │     ┌─────────┐
            │     │         │
            │     │ ACTIVE  │◀────┐
            │     │         │     │
            │     └────┬────┘     │
            │          │          │
            │          │          │ Checkpoint not met
            │          │          │ (waiting for participants)
            │          │          │
            │          │ Checkpoint met:
            │          │ - Expected count reached
            │          │ - All confirmed
            │          │
            │          ▼
            │     ┌──────────┐
            │     │          │
            │     │ SHOPPING │
            │     │          │
            │     └────┬─────┘
            │          │
            │          │ All items paid
            │          │ Click "Complete Shopping"
            │          ▼
            │     ┌───────────┐
            │     │           │
            │     │ COMPLETED │
            │     │           │
            │     └───────────┘
            │
            │     ┌──────────┐
            │     │          │
            └─────│ EXPIRED  │ (scheduled_time + 2 hours)
                  │          │
                  └──────────┘

                  ┌───────────┐
                  │           │
                  │ CANCELLED │ (host cancels)
                  │           │
                  └───────────┘
```

**Participant Status State Machine**

```
                  ┌─────────┐
                  │         │
                  │  START  │
                  │         │
                  └────┬────┘
                       │
                       │ POST /api/sessions/:id/join
                       ▼
                  ┌─────────────┐
            ┌────▶│             │
            │     │   JOINED    │
            │     │             │
            │     │ confirmed:  │
            │     │   false     │
            │     └──────┬──────┘
            │            │
            │            │ Add/edit items
            │            │
            │            ▼
            │     ┌─────────────┐
            │     │             │
            └─────│  EDITING    │
                  │             │
                  │ confirmed:  │
                  │   false     │
                  └──────┬──────┘
                         │
                         │ PUT /api/participants/:id/status
                         │ { items_confirmed: true }
                         ▼
                  ┌─────────────┐
                  │             │
                  │  CONFIRMED  │
                  │             │
                  │ confirmed:  │
                  │   true      │
                  │             │
                  │ (locked)    │
                  └─────────────┘


                  Alternative path:

                  ┌─────────────┐
                  │             │
                  │   DECLINED  │
                  │             │
                  │ not_coming: │
                  │   true      │
                  └─────────────┘
```

---

## Checkpoint State Diagram

**Checkpoint Evaluation Flow**

```
┌────────────────────────────────────────┐
│ Is expected_participants set?          │
└────────┬───────────────────────────────┘
         │
         ├─── NO (null) ───▶ Show "Set expected count" → DISABLED
         │
         └─── YES
              │
              ▼
┌────────────────────────────────────────┐
│ Is expected_participants = 0?          │
└────────┬───────────────────────────────┘
         │
         ├─── YES ───▶ Solo Mode → BYPASS CHECKPOINT → ENABLED
         │
         └─── NO (1-3)
              │
              ▼
┌────────────────────────────────────────┐
│ Calculate response count:               │
│ responseCount = joined + notComing +   │
│                 autoTimedOut           │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Is responseCount >= expected?          │
└────────┬───────────────────────────────┘
         │
         ├─── NO ───▶ Show "Waiting for X more" → DISABLED
         │
         └─── YES (Checkpoint 1 met)
              │
              ▼
┌────────────────────────────────────────┐
│ Are all JOINED participants confirmed? │
└────────┬───────────────────────────────┘
         │
         ├─── NO ───▶ Show "Waiting for X to confirm" → DISABLED
         │
         └─── YES (Checkpoint 2 met)
              │
              ▼
┌────────────────────────────────────────┐
│ Does aggregated list have items?       │
└────────┬───────────────────────────────┘
         │
         ├─── NO ───▶ Show "No items to shop" → DISABLED
         │
         └─── YES (Checkpoint 3 met)
              │
              ▼
┌────────────────────────────────────────┐
│ ALL CHECKPOINTS MET                    │
│ Shopping Enabled ✓                     │
└────────────────────────────────────────┘
```

---

## Summary Table

| Flow | Duration | Participants | Checkpoint | Outcome |
|------|----------|--------------|------------|---------|
| Solo Mode | 2-3 min | 0 | Bypassed | Immediate shopping |
| Group Mode (Success) | 5-10 min | 2-3 | Met | Shopping after all confirm |
| Participant Join | 3-5 min | 1 | Partial | Updates host checkpoint |
| Participant Decline | 1-2 min | 0 | Counts toward completion | Host notified |
| Auto-Timeout | 20+ min | Partial | Met with timeout | Shopping with fewer participants |

---

## References

- [CHECKPOINT_MECHANISM.md](./CHECKPOINT_MECHANISM.md) - Detailed checkpoint documentation
- [API.md](./API.md) - API endpoints used in flows
- [DATABASE.md](./DATABASE.md) - Database schema for sessions and participants

---

**Last Updated:** November 1, 2025
**Maintained By:** LocalLoops Team
