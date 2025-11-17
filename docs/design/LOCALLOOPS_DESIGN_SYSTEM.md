# LocalLoops Design System & UX Patterns

**Version:** 1.0
**Last Updated:** 2025-11-01
**Status:** Living Document

---

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Design Principles](#design-principles)
3. [Visual Design Tokens](#visual-design-tokens)
4. [Component Patterns](#component-patterns)
5. [Interaction Patterns](#interaction-patterns)
6. [Multilingual Support](#multilingual-support)
7. [Privacy-First Patterns](#privacy-first-patterns)
8. [Voice-First Guidelines](#voice-first-guidelines)
9. [Accessibility Standards](#accessibility-standards)
10. [Responsive Design](#responsive-design)

---

## Design Philosophy

> **"Digitally enable the ways people already help each other"**

LocalLoops apps (Minibag, StreetHawk, Fitbag, Partybag) are designed to **amplify existing social behaviors**, not impose new ones. We mirror real-world coordination patterns and make them more efficient through technology.

### Core Tenets

1. **Conversational over Transactional**
   - WhatsApp-like flows, not e-commerce checkouts
   - Natural language interactions, not forms
   - Progressive disclosure, not upfront data collection

2. **Privacy over Visibility**
   - Anonymous participation by default
   - Trust built through completion rates, not identity verification
   - No phone number exposure between users

3. **Behavioral Fidelity**
   - Use terms people actually say ("tamatar" not just "tomato")
   - Support mixed language usage (Hindi-English, Gujarati-English)
   - Mirror real-world social norms (3-letter nicknames, casual tone)

4. **Inclusive by Design**
   - Low digital literacy assumed
   - Voice-first for reading challenges
   - Multilingual from day 1, not bolt-on later

---

## Design Principles

### 1. Brand-Silent Infrastructure

**What:** LocalLoops Core is invisible to end users. Apps appear as standalone brands.

**Implementation:**
- Never expose "LocalLoops" branding in app UIs
- Each app has its own name, icon, and visual identity
- Shared components are generic, not branded

```jsx
// ✅ Good - Generic component
<ParticipantList participants={participants} />

// ❌ Bad - Branded component
<LocalLoopsParticipantList participants={participants} />
```

### 2. Anonymous Coordination

**What:** Users participate without exposing personal details.

**Implementation:**
- 3-letter nicknames for all coordination activities
- "RealName @ Nickname" format for display
- No phone numbers visible to other participants

```jsx
// ✅ Good - Anonymous display
<UserIdentity realName="Maulik Patel" nickname="Dev" />
// Renders: "Maulik @ Dev"

// ❌ Bad - PII exposure
<UserProfile phone="+919876543210" />
```

### 3. Progressive Enrichment

**What:** Minimal onboarding, add details over time.

**Implementation:**
- One-tap session creation with defaults
- Optional details shown contextually
- No forced profile completion

```jsx
// ✅ Good - One-tap create
<Button onClick={createSession}>New list</Button>

// ❌ Bad - Multi-step forced form
<OnboardingWizard steps={['profile', 'preferences', 'verification']} />
```

### 4. Mobile-First, Touch-Optimized

**What:** Designed for one-handed smartphone use.

**Implementation:**
- Minimum touch target: 44x44px
- Thumbable zone for primary actions (bottom 60% of screen)
- Swipe gestures for common actions

### 5. Conversational Tone

**What:** Friendly, casual, helpful voice.

**Implementation:**
- Use "you" and "your" (not "user" or "customer")
- Casual prompts ("Head to the store" not "Proceed to shopping phase")
- Emoji where culturally appropriate (🥬 for vegetables, not 💰 for money)

---

## Visual Design Tokens

### Typography

**System Stack:**
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI',
             Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
```

**Type Scale:**
| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| Heading 1 | 2rem (32px) | 600 | 1.2 | Screen titles |
| Heading 2 | 1.5rem (24px) | 600 | 1.3 | Section headings |
| Heading 3 | 1.25rem (20px) | 500 | 1.4 | Card titles |
| Body Large | 1rem (16px) | 400 | 1.6 | Primary content |
| Body | 0.875rem (14px) | 400 | 1.6 | Default text |
| Caption | 0.75rem (12px) | 400 | 1.4 | Metadata, hints |
| Tiny | 0.625rem (10px) | 400 | 1.3 | Labels, tags |

### Color System

**Grayscale (Primary Palette):**
```css
--gray-50:  #F9FAFB;  /* Backgrounds */
--gray-100: #F3F4F6;  /* Subtle backgrounds */
--gray-300: #D1D5DB;  /* Borders */
--gray-400: #9CA3AF;  /* Disabled text */
--gray-500: #6B7280;  /* Secondary text */
--gray-600: #4B5563;  /* Body text */
--gray-700: #374151;  /* Emphasized text */
--gray-900: #111827;  /* Headings, primary text */
```

**Semantic Colors:**
```css
/* Blue - Primary actions, selected states */
--blue-500:   #3B82F6;
--blue-600:   #2563EB;

/* Purple - Accents, highlights */
--purple-500: #A855F7;
--purple-600: #9333EA;

/* Green - Success, positive actions */
--green-50:   #F0FDF4;
--green-100:  #DCFCE7;
--green-500:  #10B981;
--green-600:  #059669;

/* Red - Errors, destructive actions */
--red-50:     #FEF2F2;
--red-500:    #EF4444;
--red-600:    #DC2626;

/* Yellow - Warnings */
--yellow-50:  #FFFBEB;
--yellow-500: #F59E0B;
```

**Gradient (Selection State):**
```css
background: linear-gradient(135deg, #3B82F6 0%, #A855F7 50%, #9333EA 100%);
/* Used for selected category buttons, premium features */
```

### Spacing Scale

**Based on 4px grid:**
```css
--space-0:  0px;
--space-1:  4px;   /* 0.25rem */
--space-2:  8px;   /* 0.5rem */
--space-3:  12px;  /* 0.75rem */
--space-4:  16px;  /* 1rem */
--space-5:  20px;  /* 1.25rem */
--space-6:  24px;  /* 1.5rem */
--space-8:  32px;  /* 2rem */
--space-10: 40px;  /* 2.5rem */
--space-12: 48px;  /* 3rem */
--space-16: 64px;  /* 4rem */
```

**Common Usages:**
- Component padding: `space-3` to `space-4`
- Section spacing: `space-6` to `space-8`
- Screen margins: `space-4` to `space-6`

### Border Radius

```css
--rounded-sm:   0.125rem;  /* 2px - subtle elements */
--rounded:      0.25rem;   /* 4px - inputs, cards */
--rounded-md:   0.375rem;  /* 6px - buttons */
--rounded-lg:   0.5rem;    /* 8px - modals, containers */
--rounded-xl:   0.75rem;   /* 12px - feature cards */
--rounded-full: 9999px;    /* circles, pills */
```

### Shadows

```css
/* Elevation 1 - Cards, panels */
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

/* Elevation 2 - Modals, overlays */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);

/* Elevation 3 - Floating action buttons */
box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
```

---

## Component Patterns

### 1. UserIdentity Component

**Purpose:** Display user identity consistently across all apps.

**Format:** `RealName @ Nickname`

**Variations:**
```jsx
// Full name
<UserIdentity realName="Maulik Patel" nickname="Dev" />
// Renders: Maulik Patel @ Dev

// First name only (default)
<UserIdentity realName="Maulik Patel" nickname="Dev" useFirstNameOnly={true} />
// Renders: Maulik @ Dev

// Nickname only (if no real name)
<UserIdentity nickname="Dev" />
// Renders: Dev
```

**Visual Style:**
- Real name: Bold, gray-900
- @ symbol: Regular, gray-600
- Nickname: Medium weight, gray-700

**Implementation:**
```jsx
function UserIdentity({ realName, nickname, useFirstNameOnly = true, className = '' }) {
  if (!realName) {
    return <span className={className}>{nickname || 'User'}</span>;
  }

  const displayName = useFirstNameOnly ? extractFirstName(realName) : realName;

  return (
    <span className={className}>
      <span className="font-bold text-gray-900">{displayName}</span>
      <span className="text-gray-600 mx-1">@</span>
      <span className="font-medium text-gray-700">{nickname}</span>
    </span>
  );
}
```

---

### 2. CategoryButton Component

**Purpose:** Select item categories (vegetables, staples, dairy, etc.)

**Visual States:**

| State | Border | Background | Icon | Text |
|-------|--------|------------|------|------|
| Default | 2px gray-300 | gray-50 | Emoji | gray-600 |
| Selected | 3px gradient | gradient → color fill | Emoji | gray-900 bold |
| Disabled | 2px gray-300 | gray-50 | Emoji (40% opacity) | gray-400 + "Soon" |

**Anatomy:**
```
┌─────────────┐
│  [64x64px]  │  ← Circular icon container
│   [Emoji]   │
└─────────────┘
   Category      ← Text label (12px)
     Soon        ← Disabled label (10px, gray-400)
```

**Implementation:**
```jsx
<button className="flex flex-col items-center flex-shrink-0">
  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
    selected
      ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-[3px]'
      : 'border-2 border-gray-300 bg-gray-50'
  }`}>
    <div className={`w-full h-full rounded-full flex items-center justify-center ${
      selected ? category.color : 'bg-gray-50'
    }`}>
      <span className="text-2xl">{category.emoji}</span>
    </div>
  </div>
  <p className={`text-xs ${selected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
    {category.name}
  </p>
  {disabled && <p className="text-[10px] text-gray-400 mt-0.5">Soon</p>}
</button>
```

**Behavioral Notes:**
- Use `React.memo` to prevent unnecessary re-renders
- Horizontal scrollable list (no wrapping)
- Touch target includes icon + label

---

### 3. ItemCard Component

**Purpose:** Display item with quantity selector

**Layout:**
```
┌────────────────────────────────────────────────┐
│ [Icon] Item Name                    [+] or [-] │
│        Subtitle (price, unit)     [Qty] [+/-]  │
└────────────────────────────────────────────────┘
```

**Visual States:**

| State | Background | Add Button | Quantity Controls |
|-------|------------|------------|-------------------|
| Unselected | White | Black border circle with + | Hidden |
| Selected | gray-50 | Hidden | Visible (-, input, +) |

**Implementation Details:**

**Icon Hierarchy:**
1. `thumbnail_url` (if available) → 40x40px rounded image
2. `img` (fallback) → 40x40px rounded image
3. Default emoji → 🥬 in green-100 circle

**Quantity Input:**
- Type: `number` with `inputMode="decimal"`
- Step: `0.25`
- Min: `0.25`
- Max: `10`
- Width: `56px` (14 characters)
- Unit: Display "kg" next to input

**Touch Targets:**
- Add button: 36x36px
- Minus/Plus buttons: 36x36px
- Input field: 56x36px

```jsx
<div className={`flex items-center gap-3 py-3 px-2 ${selected ? 'bg-gray-50' : ''}`}>
  {/* Icon */}
  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
    {item.thumbnail_url ? (
      <img src={item.thumbnail_url} alt={item.name} className="w-10 h-10 rounded-full" />
    ) : (
      <span className="text-xl">🥬</span>
    )}
  </div>

  {/* Info */}
  <div className="flex-1 min-w-0">
    <p className="text-base text-gray-900">{item.name}</p>
    <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
  </div>

  {/* Controls */}
  {selected ? (
    <div className="flex items-center gap-2">
      <button className="w-9 h-9 rounded-full border border-gray-400">
        <Minus size={16} />
      </button>
      <input
        type="number"
        inputMode="decimal"
        step="0.25"
        min="0.25"
        max="10"
        className="w-14 h-9 text-center border border-gray-300 rounded-lg"
      />
      <span className="text-xs text-gray-500">kg</span>
      <button className="w-9 h-9 rounded-full border border-gray-400">
        <Plus size={16} />
      </button>
    </div>
  ) : (
    <button className="w-9 h-9 rounded-full border-2 border-gray-900">
      <Plus size={20} strokeWidth={2.5} />
    </button>
  )}
</div>
```

**Performance:**
- Wrap with `React.memo`
- Use `loading="lazy"` for images
- Handle image errors gracefully (fallback to emoji)

---

### 4. LanguageSwitcher Component

**Purpose:** Toggle between supported languages

**Behavior:** Cycles through languages on each click (EN → GU → HI → EN)

**Visual Style:**
- Text-based button (no icons)
- 2-letter language code in uppercase
- Subtle hover effect (gray-600 → gray-900)

**Placement:**
- Top-right corner of header
- Always visible
- Small, non-intrusive

```jsx
function LanguageSwitcher({ currentLanguage, onLanguageChange }) {
  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'gu', label: 'GU' },
    { code: 'hi', label: 'HI' }
  ];

  const currentIndex = languages.findIndex(l => l.code === currentLanguage);
  const nextIndex = (currentIndex + 1) % languages.length;

  return (
    <button
      onClick={() => onLanguageChange(languages[nextIndex].code)}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      {languages[currentIndex].label}
    </button>
  );
}
```

---

### 5. Button Patterns

**Primary Button:**
```jsx
<button className="w-full bg-gray-900 text-white py-4 rounded-lg font-medium hover:bg-gray-800">
  Create list
</button>
```

**Secondary Button:**
```jsx
<button className="w-full bg-white text-gray-900 py-4 rounded-lg font-medium border-2 border-gray-900 hover:bg-gray-50">
  Cancel
</button>
```

**Destructive Button:**
```jsx
<button className="w-full bg-red-500 text-white py-4 rounded-lg font-medium hover:bg-red-600">
  Leave session
</button>
```

**Icon Button:**
```jsx
<button className="w-10 h-10 rounded-full border border-gray-400 flex items-center justify-center hover:border-gray-600">
  <Plus size={20} />
</button>
```

**States:**
- Default: Full opacity, pointer cursor
- Hover: Slight color shift
- Active: Scale down slightly (transform: scale(0.98))
- Disabled: 40% opacity, not-allowed cursor
- Loading: Show spinner, disabled state

---

### 6. Input Fields

**Text Input:**
```jsx
<input
  type="text"
  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none"
  placeholder="Enter your name"
/>
```

**Search Input:**
```jsx
<div className="relative">
  <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
  <input
    type="search"
    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:border-gray-900"
    placeholder="Search items..."
  />
</div>
```

**Number Input (Quantity):**
```jsx
<input
  type="number"
  inputMode="decimal"
  step="0.25"
  min="0"
  className="w-14 h-9 text-center border border-gray-300 rounded-lg focus:border-gray-900"
/>
```

**States:**
- Default: gray-300 border
- Focus: gray-900 border, no outline
- Error: red-500 border
- Disabled: gray-100 background, gray-400 text

---

### 7. Card Patterns

**Basic Card:**
```jsx
<div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
  {children}
</div>
```

**Interactive Card (clickable):**
```jsx
<button className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:border-gray-400 hover:shadow transition-all text-left">
  {children}
</button>
```

**Feature Card:**
```jsx
<div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
  {children}
</div>
```

---

### 8. Progress Indicators

**Session Progress Bar:**
```jsx
<div className="flex items-center gap-4">
  {steps.map((step, index) => (
    <>
      <div className={`flex items-center gap-2 ${
        index <= currentStep ? 'text-gray-900' : 'text-gray-400'
      }`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          index < currentStep
            ? 'bg-green-500 text-white'
            : index === currentStep
            ? 'bg-gray-900 text-white'
            : 'bg-gray-200'
        }`}>
          {index < currentStep ? '✓' : index + 1}
        </div>
        <span className="text-sm font-medium">{step}</span>
      </div>
      {index < steps.length - 1 && (
        <div className={`flex-1 h-0.5 ${
          index < currentStep ? 'bg-green-500' : 'bg-gray-200'
        }`} />
      )}
    </>
  ))}
</div>
```

**Loading Spinner:**
```jsx
<div className="flex items-center justify-center p-4">
  <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
</div>
```

---

### 9. Empty States

**Pattern:**
```jsx
<div className="flex flex-col items-center justify-center py-12 px-4 text-center">
  <div className="text-6xl mb-4">{emoji}</div>
  <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
  <p className="text-sm text-gray-600 mb-6">{description}</p>
  <button className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium">
    {actionLabel}
  </button>
</div>
```

**Examples:**
- No sessions: 🛒 "No shopping lists yet" + "Create your first list"
- No participants: 👥 "Waiting for neighbors" + "Share link to invite"
- No items: 🥬 "Add items to start" + "Browse categories"

---

### 10. Toast Notifications

**Success:**
```jsx
<div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
  <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
    ✓
  </div>
  <p className="text-sm text-green-900">{message}</p>
</div>
```

**Error:**
```jsx
<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
  <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center">
    !
  </div>
  <p className="text-sm text-red-900">{message}</p>
</div>
```

**Info:**
```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
  <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
    i
  </div>
  <p className="text-sm text-blue-900">{message}</p>
</div>
```

**Placement:** Bottom of screen, slide up animation, auto-dismiss after 3s

---

## Interaction Patterns

### 1. One-Tap Session Creation

**Goal:** Minimize friction to start coordination

**Pattern:**
```
Home Screen → [New list] button → Session created (with defaults)
                                ↓
                         Immediately enter session
```

**Default Values:**
- Session name: Auto-generated ("Morning veggies", "Today's shopping")
- Capacity: 5 people
- Weight limit: 20kg
- Duration: 2 hours

**Progressive Enrichment:**
- Add items → Shopping screen
- Invite neighbors → Share link (optional)
- Split payment → After shopping

**Anti-Pattern:** ❌ Multi-step forms before session creation

---

### 2. Progressive Disclosure

**Goal:** Show complexity only when needed

**Examples:**

**Basic → Advanced:**
- Item quantity: Default 0.5kg → Tap to edit → Show decimal input
- Session settings: Hidden by default → "Settings" button reveals
- Payment split: Equal split default → "Custom split" shows detailed breakdown

**Contextual Actions:**
- Show "Leave session" only after joining
- Show "Share link" only for session hosts
- Show "Complete shopping" only when items are added

---

### 3. Optimistic UI Updates

**Goal:** Instant feedback, background sync

**Pattern:**
```javascript
// Immediate UI update
addItemLocally(item);

// Background sync
syncToServer(item).catch(error => {
  // Rollback + show error
  removeItemLocally(item);
  showError('Could not add item. Try again.');
});
```

**Use Cases:**
- Adding/removing items
- Changing quantities
- Joining/leaving sessions
- Updating payment splits

---

### 4. Confirmation Patterns

**When to Confirm:**
- ✅ Destructive actions (leave session, cancel list)
- ✅ Financial actions (complete payment)
- ✅ Irreversible actions (end session)

**When NOT to Confirm:**
- ❌ Adding items (easily reversible)
- ❌ Changing quantities (easily reversible)
- ❌ Navigating screens (non-destructive)

**Confirmation Modal:**
```jsx
<div className="bg-white rounded-xl p-6 max-w-sm">
  <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
  <p className="text-sm text-gray-600 mb-6">{description}</p>
  <div className="flex gap-3">
    <button className="flex-1 bg-gray-100 text-gray-900 py-3 rounded-lg font-medium">
      Cancel
    </button>
    <button className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium">
      {destructiveAction}
    </button>
  </div>
</div>
```

---

### 5. Real-Time Synchronization

**Goal:** Keep all participants in sync

**Visual Indicators:**

**Connection Status:**
```jsx
// Connected
<div className="flex items-center gap-2 text-green-600">
  <div className="w-2 h-2 rounded-full bg-green-500" />
  <span className="text-xs">Live</span>
</div>

// Reconnecting
<div className="flex items-center gap-2 text-yellow-600">
  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
  <span className="text-xs">Reconnecting...</span>
</div>

// Offline
<div className="flex items-center gap-2 text-red-600">
  <div className="w-2 h-2 rounded-full bg-red-500" />
  <span className="text-xs">Offline</span>
</div>
```

**Real-Time Events:**
- Participant joined → Toast: "Maulik @ Dev joined"
- Items updated → Immediate list refresh
- Session status changed → Screen transition

---

### 6. Error Handling

**Error Types & Responses:**

| Error Type | User Message | Action |
|------------|--------------|--------|
| Network error | "Connection lost. Retrying..." | Auto-retry, show offline indicator |
| Session full | "This list is full (5/5)" | Disable join button |
| Capacity exceeded | "Can't add more. 20kg limit reached." | Disable add button |
| Session expired | "This list ended. Start a new one?" | Show "New list" CTA |
| Payment failed | "Payment failed. Try again?" | Retry button |

**Error Message Pattern:**
```jsx
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
  <p className="text-sm font-medium text-red-900">{errorTitle}</p>
  <p className="text-sm text-red-700 mt-1">{errorDescription}</p>
  {retryable && (
    <button className="mt-3 text-sm font-medium text-red-600 hover:text-red-800">
      Try again
    </button>
  )}
</div>
```

---

### 7. Loading States

**Skeleton Screens (Preferred):**
```jsx
<div className="animate-pulse">
  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
  <div className="h-4 bg-gray-200 rounded w-1/2" />
</div>
```

**Spinners (Inline):**
```jsx
<div className="flex items-center gap-2">
  <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-900 rounded-full animate-spin" />
  <span className="text-sm text-gray-600">Loading...</span>
</div>
```

**Full-Screen Loader (Rare):**
```jsx
<div className="fixed inset-0 bg-white flex items-center justify-center">
  <div className="text-center">
    <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4" />
    <p className="text-sm text-gray-600">Setting up your list...</p>
  </div>
</div>
```

---

## Multilingual Support

### Supported Languages

**Initial Set:**
- English (en) - Default, fallback
- Gujarati (gu) - Regional
- Hindi (hi) - National

**Future Expansion:** Tamil, Telugu, Marathi, Kannada, Bengali, Malayalam, Punjabi

---

### Implementation Pattern

**i18next Configuration:**
```javascript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      gu: { translation: guTranslations },
      hi: { translation: hiTranslations }
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'gu', 'hi'],
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },
    interpolation: {
      escapeValue: false // React already escapes
    }
  });
```

**Detection Order:**
1. `localStorage` (user preference)
2. Browser navigator language
3. Fallback to English

---

### Translation File Structure

**Namespace by Feature:**
```json
{
  "common": {
    "add": "Add",
    "remove": "Remove",
    "cancel": "Cancel",
    "confirm": "Confirm"
  },
  "home": {
    "title": "Track your shopping,\nsplit with neighbors",
    "newRun": "New list"
  },
  "session": {
    "create": {
      "title": "New list",
      "searchPlaceholder": "Search items..."
    },
    "active": {
      "participants": "{{count}} of {{max}} people"
    }
  }
}
```

**Interpolation:**
```jsx
const { t } = useTranslation();

// Simple
<h1>{t('home.title')}</h1>

// With variables
<p>{t('session.active.participants', { count: 3, max: 5 })}</p>
// Renders: "3 of 5 people"
```

---

### Multilingual Content Patterns

**Database-Backed Content (Catalog Items):**

**Schema:**
```sql
catalog_items (
  id,
  name,        -- English name
  name_gu,     -- Gujarati name
  name_hi      -- Hindi name
)
```

**Display Logic:**
```javascript
function getItemName(item, language) {
  const languageMap = {
    en: item.name,
    gu: item.name_gu || item.name,
    hi: item.name_hi || item.name
  };
  return languageMap[language] || item.name;
}
```

---

### Voice Aliases & Behavioral Fidelity

**Concept:** Support how people actually speak, not just formal names

**Example:**
```javascript
catalog_item: {
  name: "Tomatoes",
  name_hi: "टमाटर",
  aliases_hi: ["tamatar", "टमाटर", "tameta"],
  aliases_gu: ["ટમેટાં", "tameta"]
}
```

**Search Implementation:**
```javascript
function searchItems(query, language) {
  // Match on:
  // 1. Exact name match
  // 2. Alias match (case-insensitive)
  // 3. Phonetic match (future: Levenshtein distance)

  return items.filter(item => {
    const nameKey = `name_${language}`;
    const aliasKey = `aliases_${language}`;

    return (
      item[nameKey]?.toLowerCase().includes(query.toLowerCase()) ||
      item[aliasKey]?.some(alias => alias.toLowerCase().includes(query.toLowerCase()))
    );
  });
}
```

---

### Mixed Language Support

**Pattern:** Allow Hindi-English mixing (common in urban India)

**Examples:**
- "2 kilo pyaaz add karo" (Add 2kg onions)
- "Morning ka list banao" (Create morning list)

**Implementation Strategy:**
- Voice input: Detect language mix, parse separately
- Display: Show in user's selected language
- Search: Match across all language aliases

---

### RTL (Right-to-Left) Considerations

**Current:** Not applicable (Gujarati, Hindi use Devanagari script - LTR)

**Future:** If Arabic, Urdu support added:
```css
[dir="rtl"] .flex {
  flex-direction: row-reverse;
}

[dir="rtl"] .text-left {
  text-align: right;
}
```

---

## Privacy-First Patterns

### 1. Anonymous Nicknames

**Pattern:** 3-letter nicknames for all coordination

**Generation:**
- Random 3-letter combinations from pool
- Avoid offensive combinations (pre-filtered list)
- Unique within session (not globally)

**Implementation:**
```javascript
// nicknames_pool table
const NICKNAME_POOL = ['Dev', 'Max', 'Sam', 'Ava', 'Leo', 'Mia', ...];

function getUniqueNickname(sessionId, excludeNicknames) {
  const available = NICKNAME_POOL.filter(n => !excludeNicknames.includes(n));
  return available[Math.floor(Math.random() * available.length)];
}
```

**Display:**
- Always show as "RealName @ Nickname"
- Never show phone numbers
- Never show full addresses (neighborhood level only)

---

### 2. No Phone Exposure

**Pattern:** Users never see each other's phone numbers

**Implementation:**
- Session invites via shareable links (not phone numbers)
- Push notifications via app (not SMS)
- Host can't see participant phones
- Participants can't see host phone

**Database Design:**
```sql
participants (
  id,
  session_id,
  user_id,          -- Internal reference
  nickname,         -- Public display
  real_name,        -- Public display (first name)
  -- NO phone column here
)

users (
  id,
  phone,            -- Only in identity layer
  -- Never joined with public queries
)
```

---

### 3. Coarse-Grained Location

**Pattern:** Neighborhood-level, not GPS coordinates

**Precision Levels:**
```
GPS Coordinates (15m accuracy)     ❌ Too precise
Street Address                     ❌ Too precise
Society/Apartment Complex          ✅ Just right
Neighborhood (500m radius)         ✅ Preferred
Locality/Pincode                   ⚠️ Too coarse (fallback only)
```

**Database:**
```sql
neighborhoods (
  id,
  name,              -- "Bodakdev", "Thaltej"
  city,
  center_lat,        -- Approximate center (not user location)
  center_lng,
  radius_meters      -- Approximate coverage area
)
```

**Privacy Rule:** Never store exact user home locations

---

### 4. Trust Without Identity

**Pattern:** Build trust via behavior, not identity verification

**Trust Signals:**
- ✅ Session completion rate
- ✅ On-time arrival rate
- ✅ Payment completion rate
- ❌ NOT: Aadhaar verification
- ❌ NOT: Phone verification (beyond OTP)

**Display:**
```jsx
// Show trust score contextually
<div className="flex items-center gap-1">
  <UserIdentity realName="Maulik" nickname="Dev" />
  <span className="text-xs text-green-600">✓ 12 completed</span>
</div>
```

**Algorithm (Future):**
```javascript
function calculateTrustScore(user) {
  const completionRate = user.completed_sessions / user.total_sessions;
  const onTimeRate = user.on_time_arrivals / user.total_sessions;
  const paymentRate = user.paid_sessions / user.completed_sessions;

  return (completionRate * 0.5) + (onTimeRate * 0.3) + (paymentRate * 0.2);
}
```

---

### 5. Data Minimization

**Principle:** Collect only what's necessary, delete aggressively

**Session Data Lifecycle:**
```
Session Created
  ↓
Session Active (collect coordination data)
  ↓
Session Completed
  ↓
[24 hours] → Anonymize participant details
  ↓
[7 days] → Archive to analytics (aggregated)
  ↓
[30 days] → Delete raw session data
```

**What to Keep (Anonymized):**
- Item popularity (no user link)
- Session success rates (neighborhood level)
- Seasonal trends (category level)

**What to Delete:**
- Individual participant items
- Real names, nicknames
- Session chat history (if implemented)

---

## Voice-First Guidelines

### 1. Voice Input UI

**Pattern:** Show microphone button alongside text input

**Component:**
```jsx
<div className="relative">
  <input
    type="search"
    placeholder="Search items or speak..."
    className="w-full pr-12 pl-4 py-3 border border-gray-300 rounded-lg"
  />
  <button className="absolute right-3 top-3 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
    <Mic size={18} className="text-gray-600" />
  </button>
</div>
```

**States:**
- Default: Gray microphone icon
- Listening: Red pulsing icon
- Processing: Spinner
- Success: Green checkmark (briefly), then show result

---

### 2. Voice Parsing

**Architecture:**
```
Voice Input → Speech-to-Text → Intent Parsing → Action
```

**Example Utterances:**
```
"Add 2 kilo tamatar"
  → Intent: ADD_ITEM
  → Item: "tamatar" (match to Tomatoes)
  → Quantity: 2kg

"Remove pyaaz"
  → Intent: REMOVE_ITEM
  → Item: "pyaaz" (match to Onions)

"Show my list"
  → Intent: VIEW_LIST
  → No parameters
```

**Intent Patterns (Future ML):**
```javascript
const INTENT_PATTERNS = {
  ADD_ITEM: /^(add|dalo|daalo)\s+(\d+\.?\d*)\s*(kilo|kg)?\s+(.+)$/i,
  REMOVE_ITEM: /^(remove|delete|nikalo|hataao)\s+(.+)$/i,
  VIEW_LIST: /^(show|dikhao|list)\s+(my|meri)\s+(list|items)$/i,
};
```

---

### 3. Mixed Language Voice

**Challenge:** Users mix Hindi-English in single utterance

**Strategy:**
1. Don't force language selection before voice input
2. Parse for language markers (kilo, kg, dalo, add)
3. Match item names across all language aliases
4. Show result in user's selected UI language

**Example:**
```
Voice: "Add 2 kilo pyaaz"
  ↓
Parse: "add" (English verb) + "2 kilo" (unit) + "pyaaz" (Hindi noun)
  ↓
Match: "pyaaz" → Onions (using aliases_hi)
  ↓
Display (in user's language): "Added 2kg Onions" or "2kg प्याज़ जोड़ा"
```

---

### 4. Voice Confirmation

**Pattern:** Show what was understood, allow quick edit

```jsx
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <p className="text-sm text-blue-900">
    Heard: "Add 2 kilo tamatar"
  </p>
  <div className="flex items-center gap-2 mt-2">
    <button className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium">
      ✓ Add 2kg Tomatoes
    </button>
    <button className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium border border-blue-300">
      Edit
    </button>
  </div>
</div>
```

---

### 5. Accessibility for Voice

**Screen Reader Compatibility:**
- All voice buttons have `aria-label="Voice input"`
- Voice results announced via `aria-live` regions
- Fallback to text input always available

**Error Handling:**
```jsx
// Microphone permission denied
<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
  <p className="text-sm text-yellow-900">
    Microphone access needed for voice input.
  </p>
  <button className="mt-2 text-sm font-medium text-yellow-600">
    Enable in settings
  </button>
</div>

// Speech not recognized
<div className="bg-red-50 border border-red-200 rounded-lg p-4">
  <p className="text-sm text-red-900">
    Couldn't understand. Try again or type instead.
  </p>
</div>
```

---

## Accessibility Standards

### 1. Color Contrast

**WCAG 2.1 Level AA Compliance:**
- Normal text (< 18px): 4.5:1 minimum
- Large text (≥ 18px): 3:1 minimum
- UI components: 3:1 minimum

**Tested Combinations:**
| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| gray-900 | white | 16.1:1 | ✅ AAA |
| gray-600 | white | 6.8:1 | ✅ AAA |
| gray-500 | white | 4.6:1 | ✅ AA |
| blue-500 | white | 4.7:1 | ✅ AA |

**Tool:** Use WebAIM Contrast Checker during design

---

### 2. Touch Targets

**Minimum Size:** 44x44px (Apple HIG, WCAG 2.5.5)

**Implementation:**
```jsx
// ✅ Good - 44x44px clickable area
<button className="w-11 h-11 flex items-center justify-center">
  <Plus size={20} />
</button>

// ❌ Bad - 20x20px clickable area
<button>
  <Plus size={20} />
</button>
```

**Spacing:** Minimum 8px gap between adjacent touch targets

---

### 3. Screen Reader Support

**Semantic HTML:**
```jsx
// ✅ Good - Semantic structure
<header>
  <h1>Shopping List</h1>
  <nav aria-label="Main navigation">
    <button aria-label="Create new list">New list</button>
  </nav>
</header>

<main>
  <section aria-labelledby="items-heading">
    <h2 id="items-heading">Your Items</h2>
    <ul role="list">
      <li>Tomatoes - 2kg</li>
    </ul>
  </section>
</main>
```

**ARIA Labels:**
```jsx
// Icon-only buttons
<button aria-label="Add item">
  <Plus />
</button>

// Status announcements
<div role="status" aria-live="polite">
  Item added
</div>

// Loading states
<div role="status" aria-busy="true">
  Loading...
</div>
```

---

### 4. Keyboard Navigation

**Focus Indicators:**
```css
button:focus-visible,
input:focus-visible {
  outline: 2px solid #111827; /* gray-900 */
  outline-offset: 2px;
}
```

**Tab Order:**
- Logical flow: top-to-bottom, left-to-right
- Skip navigation link for screen readers
- Modal traps focus inside

**Keyboard Shortcuts (Future):**
- `Ctrl/Cmd + N`: New session
- `Ctrl/Cmd + F`: Focus search
- `Escape`: Close modal/dialog

---

### 5. Motion & Animation

**Respect User Preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Animation Guidelines:**
- Default: Subtle transitions (200-300ms)
- Loading: Smooth spinners, no flashing
- Toast: Slide in/out (300ms ease-out)
- Avoid parallax, auto-playing carousels

---

## Responsive Design

### 1. Breakpoints

**Mobile-First Approach:**
```css
/* Default: Mobile (320px - 767px) */
.container {
  padding: 1rem;
}

/* Tablet (768px - 1023px) */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
    max-width: 768px;
    margin: 0 auto;
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .container {
    max-width: 1024px;
  }
}
```

**Tailwind Breakpoints:**
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

---

### 2. Mobile-First Components

**Primary Device:** Smartphone (375px - 414px width)

**Design Constraints:**
- Single column layout (no multi-column on mobile)
- Full-width buttons (easier to tap)
- Bottom navigation (thumb-reachable)
- Minimal header (maximize content space)

```jsx
// Mobile layout
<div className="flex flex-col gap-4 p-4">
  <Header />
  <main className="flex-1">
    {children}
  </main>
  <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
    {/* Bottom navigation */}
  </nav>
</div>
```

---

### 3. Touch Gestures

**Swipe Actions:**
- Swipe right on participant → View details
- Swipe left on item → Quick delete
- Pull down → Refresh session

**Implementation:**
```jsx
// Use React gesture libraries
import { useSwipeable } from 'react-swipeable';

const handlers = useSwipeable({
  onSwipedLeft: () => handleDelete(),
  onSwipedRight: () => handleViewDetails(),
  trackMouse: true // Also support mouse drag
});

<div {...handlers}>
  {content}
</div>
```

---

### 4. Viewport Units

**Safe Areas (iOS Notch):**
```css
.container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

**Full-Height Layouts:**
```css
/* Avoid 100vh on mobile (address bar issues) */
.full-height {
  min-height: 100vh;
  min-height: -webkit-fill-available;
}
```

---

### 5. Performance for Mobile

**Image Optimization:**
- Use WebP format
- Lazy loading: `loading="lazy"`
- Responsive images: `srcset` for different screen densities

```jsx
<img
  src="item-thumbnail.webp"
  srcset="item-thumbnail.webp 1x, item-thumbnail@2x.webp 2x"
  loading="lazy"
  alt="Tomatoes"
/>
```

**Bundle Size:**
- Target: < 250KB gzipped per app
- Code splitting by route
- Lazy load heavy components (charts, modals)

**Network Resilience:**
- Offline support (service workers)
- Optimistic UI updates
- Auto-retry failed requests

---

## Testing Checklist

### Visual Regression
- [ ] Components render correctly in all 3 languages
- [ ] Colors meet WCAG AA contrast ratios
- [ ] Touch targets are minimum 44x44px
- [ ] Responsive layouts work on 375px - 1280px widths

### Functional
- [ ] Keyboard navigation works (tab order, focus indicators)
- [ ] Screen readers announce content correctly
- [ ] Voice input (if implemented) parses mixed language
- [ ] Real-time sync works on slow connections

### Privacy
- [ ] No phone numbers exposed in UI
- [ ] Nicknames are anonymous (3-letter format)
- [ ] Location is coarse-grained (neighborhood level)
- [ ] PII is not logged in errors

### Performance
- [ ] Initial load < 3s on 3G
- [ ] Bundle size < 250KB gzipped
- [ ] Images are lazy-loaded
- [ ] Animations respect `prefers-reduced-motion`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-01 | Initial release based on Minibag patterns |

---

## Related Documents

- [Shared Component Library Structure](./SHARED_COMPONENT_LIBRARY.md)
- [Core Infrastructure API Specification](./CORE_API_SPECIFICATION.md)
- [Core Data Models](./CORE_DATA_MODELS.md)

---

**Maintained by:** LocalLoops Core Team
**Questions?** Open an issue in the repository
