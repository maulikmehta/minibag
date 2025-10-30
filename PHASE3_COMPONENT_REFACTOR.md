# Phase 3: Component Architecture Refactor Plan

**Created:** October 30, 2025
**Status:** Planning
**Target:** Break down 2,214-line monolith into manageable components
**Estimated Time:** 1-2 weeks

---

## Table of Contents
1. [Current State Analysis](#current-state-analysis)
2. [Component Inventory](#component-inventory)
3. [State Management Analysis](#state-management-analysis)
4. [Dependency Tree](#dependency-tree)
5. [Extraction Strategy](#extraction-strategy)
6. [Day-by-Day Execution Plan](#day-by-day-execution-plan)
7. [Testing Checkpoints](#testing-checkpoints)
8. [Rollback Strategy](#rollback-strategy)

---

## Current State Analysis

### File Structure
**File:** `packages/minibag/minibag-ui-prototype.tsx`
**Total Lines:** 2,214 (as of Oct 30, 2025)

### Main Sections Identified

| Section | Line Range | Lines | Description |
|---------|-----------|-------|-------------|
| **Imports & Setup** | 1-27 | 27 | React imports, hooks, services |
| **LanguageSwitcher** | 29-56 | 27 | Already extracted inline component |
| **Main Component** | 58-700 | ~642 | State, hooks, effects, handlers |
| **Screen 0: HOME** | 702-828 | ~126 | Landing page with quick actions |
| **Screen 1: CREATE SESSION** | 829-1330 | ~501 | Session creation flow with shopping list |
| **Screen 2: SESSION ACTIVE** | 1331-1653 | ~322 | Active session with participant management |
| **Screen 3: SHOPPING** | 1654-1831 | ~177 | Payment recording screen |
| **Screen 5: PAYMENT SPLIT** | 1832-2020 | ~188 | Host view of payment breakdown |
| **Screen 6: PARTICIPANT BILL** | 2021-2134 | ~113 | Participant individual bill view |
| **PaymentModal** | 2135-end | ~79 | Payment recording modal |

### Complexity Metrics
- **Total State Variables:** ~25 useState hooks
- **Effects:** ~10 useEffect hooks
- **Memoized Values:** 5 (VEGETABLES, vegCategoryIds, filteredItems, totalWeight)
- **Callbacks:** 4 (getTotalWeight, getItemName, getItemSubtitles, handleLanguageChange)
- **Screens:** 6 distinct UI screens
- **Event Handlers:** ~30+ functions

---

## Component Inventory

### 1. Already Extracted Components ✅
- `LanguageSwitcher` (lines 29-56) - Inline, can be moved to separate file
- `CategoryButton` (imported from performance/)
- `ItemCard` (imported from performance/)
- `VoiceSearch` (imported from components/)
- `PaymentModal` (lines 2135-end) - Inline, needs extraction

### 2. Screens to Extract 🎯

#### Screen 0: HomeScreen
**Lines:** 702-828 (~126 lines)
**Purpose:** Landing page with session creation/join options
**Dependencies:**
- Language switcher
- Session state (minimal)
**Props Needed:**
- `onCreateSession: () => void`
- `onJoinSession: () => void`
- `onStartTour: () => void`
- `isFirstVisit: boolean`

#### Screen 1: SessionCreateScreen
**Lines:** 829-1330 (~501 lines) ⚠️ LARGEST SCREEN
**Purpose:** Create session with shopping list
**Dependencies:**
- CategoryButton, ItemCard, VoiceSearch
- VEGETABLES data, categories
- Item quantity management
**Props Needed:**
- `categories: Category[]`
- `items: Item[]`
- `selectedCategory: string`
- `onCategoryChange: (id) => void`
- `hostItems: Record<string, number>`
- `onItemChange: (itemId, quantity) => void`
- `onCreateSession: () => void`
- `onBack: () => void`

#### Screen 2: SessionActiveScreen
**Lines:** 1331-1653 (~322 lines)
**Purpose:** Active session with participant avatars
**Dependencies:**
- Session data, participants
- Item summaries
**Props Needed:**
- `session: Session`
- `participants: Participant[]`
- `currentParticipant: Participant`
- `items: Item[]`
- `onNavigateToPayment: () => void`
- `onNavigateToSplit: () => void`

#### Screen 3: ShoppingScreen
**Lines:** 1654-1831 (~177 lines)
**Purpose:** Payment recording for purchased items
**Dependencies:**
- PaymentModal
- Item list with payment status
**Props Needed:**
- `session: Session`
- `items: Item[]`
- `itemPayments: Record<string, Payment>`
- `onRecordPayment: (itemId, method, amount) => void`

#### Screen 5: PaymentSplitScreen
**Lines:** 1832-2020 (~188 lines)
**Purpose:** Host view of payment breakdown by participant
**Dependencies:**
- Session data, participants, payments
**Props Needed:**
- `session: Session`
- `participants: Participant[]`
- `splitData: SplitData`
- `onBack: () => void`

#### Screen 6: ParticipantBillScreen
**Lines:** 2021-2134 (~113 lines)
**Purpose:** Individual participant bill view
**Dependencies:**
- Participant data, their items, payment split
**Props Needed:**
- `session: Session`
- `participant: Participant`
- `billData: BillData`

### 3. Reusable Components to Extract 🔧

#### SessionHeader
**Where:** Used in multiple screens
**Purpose:** Show session info (ID, location, participants)
**Lines:** ~30-50 (currently duplicated)

#### ParticipantAvatar
**Where:** Session active screen
**Purpose:** Show participant circle with emoji and name
**Lines:** ~20-30

#### ItemList / ItemRow
**Where:** Multiple screens
**Purpose:** Display items with quantities/prices
**Lines:** ~40-60

#### ModalWrapper
**Where:** SignUp modal, Payment modal, Nickname selection
**Purpose:** Reusable modal container with backdrop
**Lines:** ~30

#### SessionMenu / PlusMenu
**Where:** Session active screen
**Purpose:** Dropdown menus for actions
**Lines:** ~40-60

---

## State Management Analysis

### Global State (from hooks)
```javascript
// From useSession hook
- session: Session
- participants: Participant[]
- currentParticipant: Participant
- loading, error, connected

// From useCatalog hook
- categories: Category[]
- items: Item[]
- loading, error

// From useOnboarding hook
- isFirstVisit: boolean
- showScreenTour
- shouldShowTooltip
- completedTooltips
```

### Local Component State
```javascript
// Navigation
- currentScreen: string ✅ Keep in root

// Shopping list (host-create screen)
- hostItems: Record<string, number> ✅ Move to SessionCreateScreen
- selectedCategory: string ✅ Move to SessionCreateScreen
- searchQuery: string ✅ Move to SessionCreateScreen

// UI state
- showPlusMenu: boolean ✅ Move to SessionActiveScreen
- showSessionMenu: boolean ✅ Move to SessionActiveScreen
- selectedParticipant: string ✅ Move to SessionActiveScreen

// Modals
- showSignUpModal: boolean ✅ Move to relevant screen
- showPaymentModal: boolean ✅ Move to ShoppingScreen
- selectedItemForPayment: string ✅ Move to ShoppingScreen
- showHostNicknameModal: boolean ✅ Move to SessionCreateScreen

// Form state
- participantName: string ✅ Move to JoinScreen
- hostName: string ✅ Move to SessionCreateScreen
- nicknameOptions: Nickname[] ✅ Move to relevant screens

// Payment state
- itemPayments: Record<string, Payment> ⚠️ Might need lifting or context

// Loading states
- creatingSession: boolean ✅ Move to SessionCreateScreen
- joiningSession: boolean ✅ Move to JoinScreen
```

### State That Needs Lifting / Context
⚠️ **Potential Issues:**
- `itemPayments` - Used in both ShoppingScreen and PaymentSplitScreen
- **Solution:** Keep in root component or create PaymentContext

---

## Dependency Tree

```
MinibagApp (Root)
├── HomeScreen
│   └── LanguageSwitcher
├── SessionCreateScreen
│   ├── LanguageSwitcher
│   ├── CategoryButton[]
│   ├── ItemCard[]
│   ├── VoiceSearch
│   └── NicknameModal (inline)
├── SessionActiveScreen
│   ├── SessionHeader
│   ├── ParticipantAvatar[]
│   ├── ItemList
│   ├── PlusMenu
│   └── SessionMenu
├── ShoppingScreen
│   ├── SessionHeader
│   ├── ItemList
│   └── PaymentModal
├── PaymentSplitScreen
│   ├── SessionHeader
│   └── ParticipantBillSummary[]
└── ParticipantBillScreen
    ├── SessionHeader
    └── ItemList
```

**Shared Components:**
- LanguageSwitcher → Used by 2 screens
- SessionHeader → Used by 4 screens
- ItemList → Used by 3 screens
- ParticipantAvatar → Used by 2 screens

---

## Extraction Strategy

### Principles
1. **Start with leaf components** (no dependencies)
2. **Extract one component at a time**
3. **Test after each extraction**
4. **Commit after successful test**
5. **No more than 2-3 components per day**

### Priority Levels

**Priority 1: Already Separated (Quick Wins)**
- [x] CategoryButton (already done)
- [x] ItemCard (already done)
- [ ] Move LanguageSwitcher to separate file (lines 29-56)
- [ ] Move PaymentModal to separate file (lines 2135-end)

**Priority 2: Utility Components (No Dependencies)**
- [ ] ModalWrapper
- [ ] LoadingSpinner
- [ ] ParticipantAvatar
- [ ] SessionHeader

**Priority 3: Feature Components (Some Dependencies)**
- [ ] ItemList / ItemRow
- [ ] NicknameModal
- [ ] SessionMenu / PlusMenu

**Priority 4: Screen Components (Many Dependencies)**
- [ ] HomeScreen (smallest, simplest)
- [ ] ParticipantBillScreen (second simplest)
- [ ] ShoppingScreen
- [ ] PaymentSplitScreen
- [ ] SessionActiveScreen
- [ ] SessionCreateScreen (largest, most complex - do last!)

---

## Day-by-Day Execution Plan

### Week 1: Utility Components & Simple Screens

#### Day 1: Move Already-Inline Components
**Goal:** Move inline components to separate files
**Time:** 2-3 hours

Tasks:
1. [ ] Create `src/components/LanguageSwitcher.jsx`
   - Move code from lines 29-56
   - Add PropTypes/TypeScript types
   - Export component
2. [ ] Update import in minibag-ui-prototype.tsx
3. [ ] Test language switching works
4. [ ] Commit: "refactor: extract LanguageSwitcher to separate file"
5. [ ] Create `src/components/PaymentModal.jsx`
   - Move code from lines 2135-end
   - Add PropTypes
   - Export component
6. [ ] Update import in minibag-ui-prototype.tsx
7. [ ] Test payment modal functionality
8. [ ] Commit: "refactor: extract PaymentModal to separate file"

**Testing Checkpoints:**
- [ ] Language switching still works
- [ ] Payment modal opens and closes
- [ ] Payment recording succeeds

---

#### Day 2: Create Utility Components
**Goal:** Extract small reusable components
**Time:** 3-4 hours

Tasks:
1. [ ] Create `src/components/shared/ModalWrapper.jsx`
   - Generic modal container with backdrop
   - Props: isOpen, onClose, title, children
2. [ ] Create `src/components/shared/LoadingSpinner.jsx`
   - Reusable spinner component
   - Props: size, text
3. [ ] Refactor PaymentModal to use ModalWrapper
4. [ ] Test modals still work
5. [ ] Commit: "refactor: create ModalWrapper and LoadingSpinner components"

**Testing Checkpoints:**
- [ ] All modals open/close correctly
- [ ] Loading states display properly

---

#### Day 3: Session Components
**Goal:** Extract session-related UI components
**Time:** 3-4 hours

Tasks:
1. [ ] Create `src/components/session/SessionHeader.jsx`
   - Show session ID, location, participant count
   - Props: session, showCopyButton
2. [ ] Create `src/components/session/ParticipantAvatar.jsx`
   - Avatar circle with emoji and name
   - Props: participant, size, onClick
3. [ ] Update screens to use new components
4. [ ] Test session display
5. [ ] Commit: "refactor: extract SessionHeader and ParticipantAvatar"

**Testing Checkpoints:**
- [ ] Session info displays correctly
- [ ] Participant avatars render properly
- [ ] Copy session ID works

---

#### Day 4: Item Components
**Goal:** Extract item display logic
**Time:** 3-4 hours

Tasks:
1. [ ] Create `src/components/items/ItemList.jsx`
   - Reusable list container
   - Props: items, renderItem, emptyMessage
2. [ ] Create `src/components/items/ItemRow.jsx`
   - Single item row display
   - Props: item, quantity, price, onAction
3. [ ] Update relevant screens
4. [ ] Test item displays
5. [ ] Commit: "refactor: extract ItemList and ItemRow components"

**Testing Checkpoints:**
- [ ] Items display correctly in all screens
- [ ] Item interactions work (add/remove)

---

#### Day 5: Simple Screens (Part 1)
**Goal:** Extract HomeScreen
**Time:** 3-4 hours

Tasks:
1. [ ] Create `src/screens/HomeScreen.jsx`
   - Extract lines 702-828
   - Pass required props from parent
   - Handle button clicks via callbacks
2. [ ] Update MinibagApp to render HomeScreen
3. [ ] Test navigation from home
4. [ ] Commit: "refactor: extract HomeScreen component"

**Testing Checkpoints:**
- [ ] Home screen renders
- [ ] Can navigate to create/join
- [ ] Tour works (if applicable)

---

### Week 2: Complex Screens

#### Day 6: Simple Screens (Part 2)
**Goal:** Extract ParticipantBillScreen
**Time:** 2-3 hours

Tasks:
1. [ ] Create `src/screens/ParticipantBillScreen.jsx`
   - Extract lines 2021-2134
   - Use SessionHeader, ItemList components
2. [ ] Update MinibagApp routing
3. [ ] Test participant bill view
4. [ ] Commit: "refactor: extract ParticipantBillScreen"

**Testing Checkpoints:**
- [ ] Bill displays correctly
- [ ] Calculations are accurate
- [ ] WhatsApp deep link works

---

#### Day 7: Payment Screens
**Goal:** Extract ShoppingScreen and PaymentSplitScreen
**Time:** 4-5 hours

Tasks:
1. [ ] Create `src/screens/ShoppingScreen.jsx`
   - Extract lines 1654-1831
   - Use PaymentModal
   - Manage itemPayments state
2. [ ] Create `src/screens/PaymentSplitScreen.jsx`
   - Extract lines 1832-2020
   - Use existing components
3. [ ] Update MinibagApp
4. [ ] Test payment flow end-to-end
5. [ ] Commit: "refactor: extract payment screens"

**Testing Checkpoints:**
- [ ] Can record payments
- [ ] Payment split calculates correctly
- [ ] Real-time updates work

---

#### Day 8: Session Active Screen
**Goal:** Extract SessionActiveScreen
**Time:** 4-5 hours

Tasks:
1. [ ] Create `src/screens/SessionActiveScreen.jsx`
   - Extract lines 1331-1653
   - Use SessionHeader, ParticipantAvatar
   - Manage menus, participant selection
2. [ ] Update MinibagApp
3. [ ] Test session management
4. [ ] Commit: "refactor: extract SessionActiveScreen"

**Testing Checkpoints:**
- [ ] Session displays correctly
- [ ] Can manage participants
- [ ] Navigation to other screens works
- [ ] WebSocket updates work

---

#### Day 9-10: Create Session Screen (Most Complex)
**Goal:** Extract SessionCreateScreen (largest refactor)
**Time:** 6-8 hours (spread over 2 days)

**Day 9 Tasks:**
1. [ ] Create `src/screens/SessionCreateScreen/index.jsx`
2. [ ] Extract basic structure (lines 829-1000)
3. [ ] Move category selection logic
4. [ ] Move item management state
5. [ ] Test basic rendering
6. [ ] Commit: "refactor: extract SessionCreateScreen structure"

**Day 10 Tasks:**
1. [ ] Complete SessionCreateScreen extraction (lines 1000-1330)
2. [ ] Extract inline NicknameModal to separate component
3. [ ] Wire up all event handlers
4. [ ] Test session creation flow end-to-end
5. [ ] Commit: "refactor: complete SessionCreateScreen extraction"

**Testing Checkpoints:**
- [ ] Can add/remove items
- [ ] Category filtering works
- [ ] Search works
- [ ] Voice search works
- [ ] Nickname selection works
- [ ] Session creation succeeds
- [ ] WebSocket connection established

---

#### Day 11: Final Integration & Testing
**Goal:** Ensure everything works together
**Time:** 3-4 hours

Tasks:
1. [ ] Review all extracted components
2. [ ] Update imports and exports
3. [ ] Run full E2E test of app
4. [ ] Fix any remaining issues
5. [ ] Update documentation
6. [ ] Final commit: "refactor: complete Phase 3 component architecture"

**Final Testing Checklist:**
- [ ] All screens accessible and functional
- [ ] Navigation between screens works
- [ ] Session creation → active → payment → split flow
- [ ] Participant join flow
- [ ] Real-time updates work
- [ ] No console errors
- [ ] Performance is acceptable

---

## Testing Checkpoints

### After Each Component Extraction

**1. Component Renders**
```bash
# Start dev server
./start.sh

# Check browser console for errors
# Verify component appears visually
```

**2. Props Flow Correctly**
- Inspect component in React DevTools
- Verify all props are received
- Check for missing/undefined values

**3. State Management Works**
- Test state changes (button clicks, form inputs)
- Verify updates propagate correctly
- Check for infinite re-render loops

**4. Event Handlers Work**
- Test all clickable elements
- Verify callbacks are called
- Check network tab for API calls

**5. Real-time Updates**
- Test WebSocket connections
- Verify updates appear in UI
- Check multiple browser tabs

### Integration Tests (Day 11)

**Full User Flows:**
1. **Session Creation Flow**
   - Home → Create → Add Items → Create Session → Active
2. **Participant Join Flow**
   - Home → Join → Select Nickname → Join → Active
3. **Payment Flow**
   - Active → Shopping → Record Payment → View Split
4. **Bill Viewing Flow**
   - Direct link → Participant Bill → View Items

---

## Rollback Strategy

### Git Strategy
```bash
# Before starting each day's work
git checkout -b refactor/phase3-day-X
git commit -m "refactor: checkpoint before Day X changes"

# If something breaks
git stash  # Save current work
git checkout main  # Go back to working version
git branch -D refactor/phase3-day-X  # Delete broken branch

# Or fix and continue
git add .
git commit -m "fix: resolve issue with component X"
```

### Backup Strategy
1. **Before starting Phase 3:** Create full backup
   ```bash
   git tag phase3-start
   git push origin phase3-start
   ```

2. **Daily checkpoints:** Commit working state at end of each day
   ```bash
   git add .
   git commit -m "refactor: Day X complete - all tests passing"
   ```

3. **If major issues arise:**
   ```bash
   git reset --hard phase3-start
   # Start over with lessons learned
   ```

### Incremental Approach
- Extract one component at a time
- Test immediately after each extraction
- Don't move to next component until current one works
- If stuck for >1 hour, revert and try different approach

---

## Target Architecture (End State)

```
packages/minibag/src/
├── pages/
│   └── MinibagApp.jsx              (~200-300 lines)
│       └── Navigation logic, state management
│
├── screens/
│   ├── HomeScreen.jsx               (~100 lines)
│   ├── SessionCreateScreen/
│   │   ├── index.jsx                (~200 lines)
│   │   └── NicknameModal.jsx        (~80 lines)
│   ├── SessionActiveScreen.jsx      (~250 lines)
│   ├── ShoppingScreen.jsx           (~150 lines)
│   ├── PaymentSplitScreen.jsx       (~150 lines)
│   └── ParticipantBillScreen.jsx    (~100 lines)
│
├── components/
│   ├── shared/
│   │   ├── ModalWrapper.jsx         (~40 lines)
│   │   ├── LoadingSpinner.jsx       (~20 lines)
│   │   └── LanguageSwitcher.jsx     (~30 lines)
│   ├── session/
│   │   ├── SessionHeader.jsx        (~60 lines)
│   │   ├── ParticipantAvatar.jsx    (~40 lines)
│   │   ├── SessionMenu.jsx          (~50 lines)
│   │   └── PlusMenu.jsx             (~50 lines)
│   ├── items/
│   │   ├── ItemList.jsx             (~60 lines)
│   │   └── ItemRow.jsx              (~40 lines)
│   ├── performance/
│   │   ├── CategoryButton.jsx       (✅ existing)
│   │   └── ItemCard.jsx             (✅ existing)
│   ├── VoiceSearch.jsx              (✅ existing)
│   └── PaymentModal.jsx             (~80 lines)
│
├── hooks/                            (✅ existing)
│   ├── useCatalog.js
│   ├── useSession.js
│   └── useOnboarding.js
│
└── services/                         (✅ existing)
    ├── api.js
    └── socket.js
```

---

## Success Criteria

### Phase 3 Complete When:
- [x] No file > 400 lines
- [x] All screens in separate files
- [x] Reusable components extracted
- [x] Clear component responsibilities
- [x] All E2E user flows work
- [x] No console errors
- [x] WebSocket real-time updates work
- [x] Git history shows incremental progress
- [x] Documentation updated

### Quality Metrics:
- **Max file size:** 400 lines
- **Component complexity:** Each component has single responsibility
- **Reusability:** Shared components used in 2+ places
- **Test coverage:** All major user flows tested manually
- **Performance:** No regressions from monolith version

---

## Notes & Observations

### What Went Well
- [Document successes during implementation]

### Challenges Encountered
- [Document problems and solutions]

### Lessons Learned
- [Document insights for future refactors]

---

**Next Review:** After Day 5 (end of Week 1)
**Final Review:** Day 11 (completion)

