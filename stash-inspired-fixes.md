# Stash-Inspired UI Styling Fixes

> **Note:** These are styling-only changes borrowed from `stash@{0}` to be implemented later.
> **Critical:** Preserve all functionality - only modify CSS classes, button layouts, and icons.

---

## BONUS: Avatar Selection Tap Feedback Animation

> **Found in commit:** `75bee2d` (Nov 5, 2025)
> **Status:** Removed from current codebase
>
> **Impact:** Adds delightful tap feedback when users select their avatar/nickname

### What It Does:
When user taps an avatar option:
1. **Big checkmark overlay** (600ms) - Green circle with white checkmark appears inside the avatar circle
2. **Small persistent badge** - Tiny checkmark badge stays at top-right corner of selected avatar
3. **Smooth animations** - Uses `animate-pop` and `animate-float-up` for satisfying feedback

### Visual Behavior:
```
User taps avatar →
  Green overlay fades in (bg-green-600/90) →
  Big white checkmark appears (animate-pop + animate-float-up) →
  After 600ms, overlay fades out →
  Small badge remains at top-right corner
```

### Implementation:

**Files to update:**
- `packages/minibag/src/screens/JoinSessionScreen/index.jsx`
- `packages/minibag/src/screens/SessionCreateScreen/index.jsx`

#### 1. Add State for Animation Tracking

```jsx
// Add this state at the top of component
const [showBigCheck, setShowBigCheck] = useState(null); // Track which avatar shows big checkmark
```

#### 2. Update Avatar Click Handler

```jsx
// BEFORE (current):
onClick={() => setSelectedNickname(option)}

// AFTER (with tap feedback):
onClick={() => {
  setSelectedNickname(option);
  // Trigger big checkmark animation
  setShowBigCheck(option.nickname);
  setTimeout(() => setShowBigCheck(null), 600);
}}
```

#### 3. Add Checkmark Overlays to Avatar Circle

```jsx
{/* Wrap avatar circle in relative container */}
<div className="relative">
  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
    selectedNickname?.nickname === option.nickname
      ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-[2px]'
      : 'border-2 border-gray-300 hover:border-gray-400'
  }`}>
    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
      <span className="text-2xl">{option.avatar_emoji}</span>
    </div>
  </div>

  {/* Big checkmark overlay - tap feedback (inside circle) */}
  {showBigCheck === option.nickname && (
    <div className="absolute inset-0 w-16 h-16 rounded-full bg-green-600/90 flex items-center justify-center animate-pop animate-float-up pointer-events-none">
      <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )}

  {/* Small persistent badge (outside circle, top-right) */}
  {selectedNickname?.nickname === option.nickname && (
    <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center border-2 border-white animate-pop">
      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  )}
</div>
```

### Required CSS Animations

Make sure these animations exist in `packages/minibag/src/index.css`:

```css
@keyframes popScale {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

@keyframes float-up {
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-8px); }
}

.animate-pop {
  animation: popScale 300ms ease-in-out;
}

.animate-float-up {
  animation: float-up 600ms ease-out forwards;
}
```

### Benefits:
- **Instant feedback**: Users immediately know their tap registered
- **Delightful UX**: Satisfying animation makes the app feel polished
- **Clear selection**: Persistent badge shows which avatar is selected
- **Mobile-optimized**: Perfect for touch interfaces

### Original Commit Reference

**Commit:** `75bee2d` (Nov 5, 2025)
**Title:** feat(ui): enhance onboarding modals with circular navigation and avatar feedback

**Commit Message Excerpt:**
> - Add avatar selection visual feedback with big checkmark tap animation (600ms) overlaying inside circle
> - Add small persistent badge at top-right corner for selected avatars
> - Replace full-width Next/Back buttons with circular icon buttons (40x40px)
> - Position forward button on right to signify motion (< left, > right → ✓)

---

## File 1: PaymentModal.jsx

**Location:** `packages/minibag/src/components/PaymentModal.jsx`

### Changes:

1. **Line 28** - Update label text:
   ```jsx
   // FROM: "Payment method"
   // TO:   "Paid via"
   ```

2. **Lines 69-84** - Replace button section:
   ```jsx
   // REMOVE: Cancel button entirely
   // CHANGE: Two-button flex layout → Single centered circular button

   // New structure:
   <div className="flex justify-end">
     <button
       onClick={() => amount && onConfirm(method, amount)}
       disabled={!amount}
       className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 rounded-full text-white transition-all duration-150 active:scale-90 disabled:active:scale-100"
       title="Confirm payment"
     >
       <Check size={20} strokeWidth={2} />
     </button>
   </div>
   ```

**Preserve:**
- All state management (`method`, `amount`)
- All event handlers
- Validation logic
- ModalWrapper props

---

## File 2: ItemRow.jsx

**Location:** `packages/minibag/src/components/items/ItemRow.jsx`

### Changes:

1. **Add `layout` prop** to component signature:
   ```jsx
   function ItemRow({
     emoji = '🥬',
     name,
     subtitle,
     rightContent,
     onClick,
     className = '',
     layout = 'vertical'  // ADD THIS
   }) {
   ```

2. **Add `parseQuantity` helper function** (before component):
   ```jsx
   // Parse quantity from subtitle for horizontal layout (e.g., "1kg" -> { qty: "1", unit: "kg" })
   const parseQuantity = (subtitle) => {
     if (!subtitle || typeof subtitle !== 'string') return null;
     const match = subtitle.match(/^([\d.]+)\s*(kg|g|l|ml)?$/i);
     if (match) {
       return { qty: match[1], unit: match[2] || 'kg' };
     }
     return null;
   };
   ```

3. **Add layout logic** (after container class definition):
   ```jsx
   const quantityData = layout === 'horizontal' ? parseQuantity(subtitle) : null;
   ```

4. **Update subtitle rendering** (replace lines 36-43):
   ```jsx
   {/* Item info */}
   <div className="flex-1 min-w-0">
     {layout === 'horizontal' && quantityData ? (
       // Horizontal layout: Name and quantity on same line
       <div className="flex items-center justify-between gap-2">
         <p className="text-base text-gray-900">{name}</p>
         <div className="flex items-baseline gap-1">
           <span className="text-lg text-gray-900">{quantityData.qty}</span>
           <span className="text-xs text-gray-500">{quantityData.unit}</span>
         </div>
       </div>
     ) : (
       // Vertical layout: Name and subtitle stacked
       <>
         <p className="text-base text-gray-900">{name}</p>
         {subtitle && (
           <p className="text-sm text-gray-600">{subtitle}</p>
         )}
       </>
     )}
   </div>
   ```

**Preserve:**
- All existing props functionality
- onClick behavior
- rightContent rendering
- Hover states

---

## File 3: SessionActiveScreen.jsx

**Location:** `packages/minibag/src/screens/SessionActiveScreen.jsx`

### Changes:

1. **Line 2** - Update imports:
   ```jsx
   import { Plus, Minus, Clock, Users, ChevronUp, ChevronDown } from 'lucide-react';
   ```

2. **Quantity selector redesign** (around lines 330-360):

   **Replace minus button:**
   ```jsx
   // OLD: w-9 h-9 rounded-full border border-gray-400
   // Will be part of vertical chevron group below
   ```

   **Replace input field:**
   ```jsx
   <div className="relative">
     <input
       type="number"
       inputMode="decimal"
       step="0.5"
       min="0.25"
       max="10"
       value={quantity}
       onChange={(e) => {
         const val = parseFloat(e.target.value);

         // Allow empty input for editing
         if (e.target.value === '') {
           updateMyItemQuantity(veg.id, '');
           return;
         }

         if (!isNaN(val) && val > 0) {
           const otherItemsWeight = myTotalWeight - (quantity || 0);
           if (otherItemsWeight + val <= 10) {
             updateMyItemQuantity(veg.id, val);
           }
         }
       }}
       onBlur={(e) => {
         const val = parseFloat(e.target.value);
         if (isNaN(val) || val <= 0 || e.target.value === '') {
           updateMyItemQuantity(veg.id, 0.25);
         }
       }}
       style={{
         appearance: 'textfield',
         MozAppearance: 'textfield',
         WebkitAppearance: 'none'
       }}
       className="w-20 pl-2 pr-7 text-lg text-gray-900 text-center border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none py-1.5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
     />
     <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">kg</span>
   </div>
   ```

   **Replace plus button with vertical chevron group:**
   ```jsx
   <div className="flex flex-col gap-0.5">
     <button
       onClick={() => {
         if (myTotalWeight < 10) {
           updateMyItemQuantity(veg.id, quantity + 0.5);
         }
       }}
       disabled={myTotalWeight >= 10}
       className="w-8 h-6 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
     >
       <ChevronUp size={16} strokeWidth={2} className="text-gray-700" />
     </button>
     <button
       onClick={() => {
         const newVal = Math.max(0, quantity - 0.5);
         updateMyItemQuantity(veg.id, newVal);
       }}
       className="w-8 h-6 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-all duration-150 active:scale-95"
     >
       <ChevronDown size={16} strokeWidth={2} className="text-gray-700" />
     </button>
   </div>
   ```

3. **Update ItemRow usage** (around line 566):
   ```jsx
   <ItemRow
     key={itemId}
     emoji={veg?.emoji || '🥬'}
     name={getItemName(veg)}
     subtitle={`${qty}kg`}
     layout="horizontal"  // ADD THIS
   />
   ```

**Preserve:**
- ALL state management
- ALL onClick handler logic
- ALL validation (onChange, onBlur)
- ALL disabled conditions
- ALL weight calculations

---

## File 4: SessionCreateScreen/index.jsx

**Location:** `packages/minibag/src/screens/SessionCreateScreen/index.jsx`

### Changes:

1. **Line 2** - Update imports:
   ```jsx
   import { Plus, Minus, Check, X, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
   ```

2. **Quantity selector redesign** (around lines 345-395):

   Apply the same changes as SessionActiveScreen:

   - Replace round minus button with vertical chevron group
   - Update input field styling (rounded border, inline unit label)
   - Replace round plus button with vertical chevron group

   **Structure:**
   ```jsx
   <div className="flex items-center gap-2">
     <div className="relative">
       {/* Input with inline "kg" label */}
     </div>
     <div className="flex flex-col gap-0.5">
       {/* ChevronUp button */}
       {/* ChevronDown button */}
     </div>
   </div>
   ```

   **Key differences from SessionActiveScreen:**
   - Uses `setHostItems` instead of `updateMyItemQuantity`
   - Checks `isListLocked` state
   - Uses `getTotalWeight(hostItems)` calculation

**Preserve:**
- ALL state management (`hostItems`, etc.)
- ALL `updateItemQuantity` function logic
- ALL animation states (`flashingItems`, `floatingLabels`)
- ALL validation logic
- ALL disabled states

---

## Implementation Checklist

When implementing these fixes:

- [ ] Import chevron icons from lucide-react
- [ ] Replace round +/- buttons with vertical chevron buttons
- [ ] Update input fields: border-bottom → full rounded border
- [ ] Move unit labels inside input fields (absolute positioning)
- [ ] Add `layout="horizontal"` support to ItemRow
- [ ] Simplify PaymentModal to single circular confirm button
- [ ] Test all quantity selectors still work correctly
- [ ] Verify weight calculations unchanged
- [ ] Test disabled states still work
- [ ] Verify modal close behavior works (X button, outside click)

---

## Visual Reference

### Before:
- Round ⊖ button | Input `2` kg | Round ⊕ button
- PaymentModal: [Cancel] [✓ Confirm]

### After:
- Stacked chevrons ⌃/⌄ | Input `2kg` (inline unit)
- PaymentModal: Single circular (✓) button

---

## Notes

- These are purely visual changes - no functional modifications
- All event handlers, state management, and validation logic remain identical
- Focus on CSS classes, button shapes, and icon swaps only
- Test thoroughly after implementation to ensure no regressions

---
---

# CRITICAL: Cache Policy Restoration (Functional Fix)

> **⚠️ PRIORITY: HIGH** - This is a **functional fix**, not just styling. It was removed after commit `3177f88` and needs to be restored.
>
> **Impact:** Without this fix, users experience stale session data, inconsistent participant lists, and false "expired invite" errors.

## Problem

Cache control headers were removed from both client and server, causing:
- Stale session data on refresh
- Participant lists not updating
- Invite links showing incorrect expiration status
- Outdated bill information

## Solution: Restore Cache Headers

### File 1: API Client (Client-Side)

**Location:** `packages/minibag/src/services/api.js`

**Current State (BROKEN):**
```javascript
// Line 61-65
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include',
};
```

**Restore To:**
```javascript
// Line 61-67
const defaultOptions = {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
  },
  credentials: 'include',
};
```

**Why This Matters:**
- Forces browser to fetch fresh data on every API call
- Prevents stale participant lists
- Ensures invite status is always current

---

### File 2: Server Cache Middleware (Server-Side)

**Location:** `packages/shared/server.js`

**Insert After:** Line ~140 (after CORS middleware, before rate limiting)

**Add This Middleware:**
```javascript
// Disable caching for all API routes to prevent stale data issues
// CRITICAL: Session data, participant lists, and invite status must always be fresh
app.use('/api/', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
```

**Explanation:**
- `no-cache`: Client must revalidate with server
- `no-store`: Don't store in any cache (browser or proxy)
- `must-revalidate`: Must check with server when stale
- `private`: Only browser can cache (not shared/proxy caches)
- `Pragma: no-cache`: HTTP/1.0 backward compatibility
- `Expires: 0`: Immediate expiration for legacy clients

---

## Verification Checklist

After implementing cache policy restoration:

- [ ] Client-side cache headers added to api.js
- [ ] Server-side middleware added to server.js
- [ ] Test: Session refresh shows latest participant list
- [ ] Test: Invite link shows correct expiration status
- [ ] Test: Bill page displays current data (not cached)
- [ ] Test: Network tab shows `Cache-Control: no-cache` in request headers
- [ ] Test: Network tab shows `Cache-Control: no-cache, no-store...` in response headers

---

## Original Commit Reference

**Commit:** `3177f88` (Nov 6, 2025)
**Title:** fix(cache): implement comprehensive no-cache policy to prevent stale data

**Original Commit Message Excerpt:**
> Critical caching fixes:
> - Add server-wide Cache-Control headers for all /api/* routes
> - Add cache-busting headers to API client default options
> - Fix session restoration race condition allowing retry on failure
> - Ensure invite links and bills always fetch fresh data
>
> Fixes session refresh resetting state, stale participant lists, and
> inconsistent invite expiration status.

---

## Priority Level

**CRITICAL** - This should be implemented **BEFORE** the UI styling fixes, as it affects core functionality and data consistency.

---
---

# IMPORTANT: Nickname First-Letter Matching Restoration

> **⚠️ PRIORITY: MEDIUM-HIGH** - This feature improves personalization and nickname pool capacity. It was removed after commit `6e1a2f7`.
>
> **Impact:** Without this feature, users get random nicknames instead of ones matching their first name initial.

## Problem

The first-letter matching feature for nicknames was removed, along with the expanded 213-name pool. Currently:
- Users see random nicknames unrelated to their name
- Nickname pool is smaller (original 58 names)
- No personalization for nickname selection
- Lower capacity for concurrent sessions

## Original Feature (Commit 6e1a2f7)

### What It Did:
1. **Expanded nickname pool** from 58 to 213 names (3.7x increase)
2. **First-letter matching**: When user enters "Ravi", they see nicknames starting with "R" (Raj, Ria, Rex, etc.)
3. **Gender balance**: Always shows 1 male + 1 female option
4. **Immediate release**: Nicknames freed when participants decline or sessions expire
5. **Better capacity**: Supports 30-40 concurrent sessions (150-200 users)

### Components:

#### 1. Database Migration
**File:** `database/021_add_new_nicknames.sql` (487 lines)
- Adds 179 new nicknames to pool
- Removes duplicate "Ali" nickname
- Total: 213 unique three-letter nicknames
- Includes metadata: gender, emoji, language origin, difficulty level

**Sample nicknames by first letter:**
```
A: Ace, Adi, Anu, Ara, Avi, Ayu, Ana, Amy, Ari, Asa, Ava...
B: Bea, Ben, Bob, Boe, Boo...
C: Cal, Cam, Cat, Cay, Ced, Cia...
D: Dan, Das, Day, Dee, Dex, Dev, Dia, Dom, Don...
E: Eli, Eva, Edy, Els, Ena, Eni, Eno, Eri...
...and so on for all 26 letters
```

#### 2. API Changes
**File:** `packages/shared/api/sessions.js`

**Function to restore:** `getTwoNicknameOptions(firstLetter = null)`

**Current implementation (BASIC - No matching):**
```javascript
async function getTwoNicknameOptions() {
  // Get 1 male nickname
  const { data: maleOption, error: maleError } = await supabase
    .from('nicknames_pool')
    .select('*')
    .eq('is_available', true)
    .eq('gender', 'male')
    .limit(1)
    .single();

  // Get 1 female nickname
  const { data: femaleOption, error: femaleError } = await supabase
    .from('nicknames_pool')
    .select('*')
    .eq('is_available', true)
    .eq('gender', 'female')
    .limit(1)
    .single();

  // Return both options...
}
```

**Restore to (WITH first-letter matching):**
```javascript
async function getTwoNicknameOptions(firstLetter = null) {
  let maleOption = null;
  let femaleOption = null;

  // If firstLetter provided, try to find matching nicknames
  if (firstLetter) {
    const upperLetter = firstLetter.toUpperCase();

    // Try to get male nickname starting with letter
    const { data: matchedMale } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'male')
      .ilike('nickname', `${upperLetter}%`)
      .limit(1)
      .single();

    // Try to get female nickname starting with letter
    const { data: matchedFemale } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'female')
      .ilike('nickname', `${upperLetter}%`)
      .limit(1)
      .single();

    // Use matched nicknames if found
    if (matchedMale) maleOption = matchedMale;
    if (matchedFemale) femaleOption = matchedFemale;
  }

  // Fallback: If we don't have both genders with matching letter, get any available
  if (!maleOption) {
    const { data: anyMale } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'male')
      .limit(1)
      .single();

    if (anyMale) maleOption = anyMale;
  }

  if (!femaleOption) {
    const { data: anyFemale } = await supabase
      .from('nicknames_pool')
      .select('*')
      .eq('is_available', true)
      .eq('gender', 'female')
      .limit(1)
      .single();

    if (anyFemale) femaleOption = anyFemale;
  }

  // Build options array...
  const options = [];
  if (maleOption) {
    options.push({
      id: maleOption.id,
      nickname: maleOption.nickname,
      avatar_emoji: maleOption.avatar_emoji,
      gender: maleOption.gender
    });
  }

  if (femaleOption) {
    options.push({
      id: femaleOption.id,
      nickname: femaleOption.nickname,
      avatar_emoji: femaleOption.avatar_emoji,
      gender: femaleOption.gender
    });
  }

  return options;
}
```

**Update endpoint to accept query parameter:**
```javascript
export async function getNicknameOptions(req, res) {
  try {
    const { firstLetter } = req.query;  // ADD THIS LINE

    const options = await getTwoNicknameOptions(firstLetter);  // PASS firstLetter

    res.json({
      success: true,
      data: options
    });
  } catch (error) {
    console.error('Error fetching nickname options:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
```

#### 3. Frontend Changes

**Files to update:**
- `packages/minibag/src/screens/JoinSessionScreen/index.jsx`
- `packages/minibag/src/screens/SessionCreateScreen/index.jsx`

**Change:** Pass user's first name initial when fetching nicknames

**Example API call update:**
```javascript
// Before (current):
const response = await fetch('/api/sessions/nickname-options');

// After (with first-letter matching):
const firstName = userRealName.trim().charAt(0).toUpperCase();
const response = await fetch(`/api/sessions/nickname-options?firstLetter=${firstName}`);
```

---

## Benefits

### User Experience:
- **Personalization**: "Ravi" sees "Raj" or "Ria" options (feels more personal)
- **Memorability**: Easier to remember nicknames that match your name
- **Recognition**: Other users can guess who's who by matching initials

### System Capacity:
- **213 names** vs 58 = 3.7x more capacity
- Supports **30-40 concurrent sessions** (up from ~10)
- Handles **150-200 simultaneous users** comfortably
- Faster nickname availability with immediate release

### Data:
The feature includes a complete CSV file (`three_letter_names_final.csv`) with:
- 213 unique three-letter names
- Metadata: gender, emoji, language (Hindi/Gujarati/English), difficulty
- Balanced distribution across all 26 letters

---

## Implementation Checklist

- [ ] Add database migration `021_add_new_nicknames.sql`
- [ ] Run migration to add 213 nicknames to pool
- [ ] Update `getTwoNicknameOptions()` to accept `firstLetter` parameter
- [ ] Add first-letter matching logic with fallback
- [ ] Update API endpoint to accept `?firstLetter=X` query param
- [ ] Update JoinSessionScreen to pass user's first initial
- [ ] Update SessionCreateScreen to pass user's first initial
- [ ] Test: User "Amit" sees nicknames starting with "A"
- [ ] Test: Fallback works when no matching nicknames available
- [ ] Test: Gender balance maintained (always 1M + 1F)
- [ ] Verify: Nickname pool size increased to 213

---

## Original Commit Reference

**Commit:** `6e1a2f7` (Nov 6, 2025)
**Title:** feat(nicknames): enhance nickname system with first-letter matching and immediate release

**Full Commit Message:**
> Improve nickname personalization and availability by implementing smart matching and releasing nicknames as soon as they're no longer needed.
>
> Changes:
> - Expand nickname pool from 58 to 213 names (removed Ali, added 179 new)
> - Implement first-letter matching: users see nicknames starting with their first initial when available
> - Always maintain 1M/1F gender balance in options presented
> - Release nicknames immediately when participants mark "Not Coming"
> - Release nicknames when sessions expire (previously only on complete/cancel)
> - Add database migration with all 213 nicknames and metadata
>
> Impact:
> - Better personalization: nicknames match user's name when possible
> - 3-5x larger pool capacity supports more concurrent sessions
> - Faster nickname availability with immediate release on participant exit
> - Can handle 30-40 concurrent sessions (150-200 users) comfortably

---

## Files to Restore from Commit 6e1a2f7:

1. `database/021_add_new_nicknames.sql` (487 lines) - **NEW FILE**
2. `three_letter_names_final.csv` (214 lines) - **NEW FILE** (reference data)
3. `packages/shared/api/sessions.js` - **MODIFY** getTwoNicknameOptions function
4. `packages/minibag/src/screens/JoinSessionScreen/index.jsx` - **MODIFY** API call
5. `packages/minibag/src/screens/SessionCreateScreen/index.jsx` - **MODIFY** API call

---

## Priority Level

**MEDIUM-HIGH** - Improves UX and system capacity. Should be implemented after cache policy restoration but before UI styling fixes.

---
---

# Code Review Findings → Moved to Infrastructure Roadmap

> **📋 Note:** Code review findings have been integrated into the infrastructure roadmap.
>
> **See:** `docs/roadmap/infrastructure-improvements-roadmap.md` - Appendix D: Code Review Addendum
>
> **Summary:** 4 security and performance issues identified:
> 1. ✅ Nickname validation (allows spaces) - **CORRECTED** in Task 1B
> 2. ✅ Item quantity validation (negative/excessive values) - **ENHANCED** in Task 14B
> 3. ✅ Nickname assignment race condition - **NEW TASK** 1D added to Week 1
> 4. ✅ Missing database index (payments.item_id) - **ADDED** to Task 6B
>
> All issues are now tracked in the main infrastructure roadmap with specific tasks, file locations, and implementation details.
