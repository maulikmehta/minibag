# Accessibility Guide for MiniBag

**Target Users:** Elderly users (60+ years old)
**Standards:** WCAG 2.1 AA (targeting AAA where possible)
**Last Updated:** 2025-11-02

---

## Table of Contents

1. [Typography & Readability](#typography--readability)
2. [Components](#components)
3. [Color & Contrast](#color--contrast)
4. [Keyboard Navigation](#keyboard-navigation)
5. [Screen Readers](#screen-readers)
6. [Touch Targets](#touch-targets)
7. [Implementation Checklist](#implementation-checklist)

---

## Typography & Readability

### ✅ Font Sizes (Completed)

**Configuration:** `packages/minibag/tailwind.config.js`

**Elderly-Friendly Font Scale:**
- `text-xs`: 14px - **Use sparingly** (labels, timestamps only)
- `text-sm`: 16px - Secondary text, metadata
- `text-base`: **18px** - **Primary body text** (WCAG AAA compliant for elderly)
- `text-lg`: 20px - Emphasized text, buttons
- `text-xl`: 24px - Section headings
- `text-2xl`: 30px - Page headings
- `text-3xl`: 36px - Large titles

**Line Height:**
- All font sizes have increased line height (1.5-1.6)
- `leading-relaxed`: 1.75
- `leading-loose`: 2.0

**Before vs After:**
| Class | Before | After | Improvement |
|-------|--------|-------|-------------|
| text-base | 16px | 18px | +12.5% |
| text-sm | 14px | 16px | +14.3% |
| text-lg | 18px | 20px | +11.1% |

### 📋 Typography Best Practices

**Do:**
- ✅ Use `text-base` (18px) for all body text
- ✅ Use `text-lg` (20px) for button text
- ✅ Use `text-xl` (24px) or larger for headings
- ✅ Maintain line-height of at least 1.5

**Don't:**
- ❌ Use text-xs except for non-critical labels
- ❌ Use uppercase for long text (harder to read)
- ❌ Use light font weights (<400) for body text

---

## Components

### ✅ ConfirmationModal (Completed)

**File:** `src/components/common/ConfirmationModal.jsx`

**Features:**
- Large, readable text (18px+)
- High contrast colors
- Big touch targets (56px minimum height)
- Clear action descriptions
- Keyboard shortcuts (Esc to cancel, Enter to confirm)
- ARIA labels for screen readers
- Focus management
- Safety-first design (Cancel button is default)

**Usage:**
```jsx
import ConfirmationModal from '@/components/common/ConfirmationModal';

<ConfirmationModal
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Item?"
  message="This will remove the item from your list. This action cannot be undone."
  confirmText="Delete Item"
  cancelText="Keep Item"
  variant="danger"
/>
```

**Variants:**
- `danger` - Red, for destructive actions (delete, cancel)
- `warning` - Amber, for cautionary actions
- `info` - Blue, for informational confirmations

### ✅ ConnectionStatus (Completed)

**File:** `src/components/common/ConnectionStatus.jsx`

**Features:**
- Clear visual indicator (icon + color)
- Readable status messages
- ARIA live region (announces changes to screen readers)
- Auto-hides when connected
- Prominent when disconnected
- Fixed position (always visible)

**Usage:**
```jsx
import ConnectionStatus from '@/components/common/ConnectionStatus';

<ConnectionStatus
  isConnected={socket.connected}
  isReconnecting={socket.reconnecting}
/>
```

**States:**
- **Connected** (green) - Briefly shows, then auto-hides
- **Reconnecting** (amber) - Shows with spinner
- **Disconnected** (red) - Stays visible with warning

### ✅ LoadingState (Completed)

**File:** `src/components/common/LoadingState.jsx`

**Features:**
- Specific, helpful messages (not generic "Loading...")
- Large, readable text
- Animated spinner
- ARIA live region
- Multiple sizes
- Full-screen option

**Usage:**
```jsx
import LoadingState, { LoadingMessages } from '@/components/common/LoadingState';

// Instead of this:
{loading && <div>Loading...</div>}

// Use this:
{loading && <LoadingState message={LoadingMessages.LOADING_SESSION} />}

// Full screen version:
{loading && (
  <LoadingState
    message={LoadingMessages.CREATING_SESSION}
    size="large"
    fullScreen
  />
)}
```

**Pre-defined Messages:**
```javascript
LoadingMessages.CREATING_SESSION    // "Creating your session..."
LoadingMessages.JOINING_SESSION     // "Joining session..."
LoadingMessages.LOADING_CATALOG     // "Loading available items..."
LoadingMessages.RECORDING_PAYMENT   // "Recording payment..."
// ... and many more
```

---

## Color & Contrast

### 🔍 Status: Needs Review

**WCAG Requirements:**
- **Level AA:** Contrast ratio of at least 4.5:1 for normal text
- **Level AAA:** Contrast ratio of at least 7:1 for normal text (recommended for elderly)

### Color Palette Analysis Needed

**High Priority:** Audit these color combinations:
1. Text on backgrounds
2. Button text on button backgrounds
3. Link colors
4. Error/warning/success message colors
5. Disabled state colors
6. Focus indicators

**Tools to Use:**
- Chrome DevTools: Inspect → Accessibility → Contrast
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colorable](https://colorable.jxnblk.com/)

**Common Issues to Check:**
- Gray text on white backgrounds (often fails)
- Light blue links (often fails)
- Disabled button text (often too light)

---

## Keyboard Navigation

### 📋 Status: Needs Implementation

**WCAG Requirements:**
- All functionality must be keyboard accessible
- Focus indicators must be visible
- Logical tab order
- No keyboard traps

### Implementation Checklist

**Focus Indicators:**
- [ ] Add visible focus rings to all interactive elements
- [ ] Ensure focus rings have sufficient contrast (3:1)
- [ ] Use Tailwind `focus:ring-4` for prominent focus indicators
- [ ] Test focus visibility on all backgrounds

**Tab Order:**
- [ ] Verify logical tab order through forms
- [ ] Test tab navigation through modals
- [ ] Ensure "skip to content" links work

**Keyboard Shortcuts:**
- ✅ ConfirmationModal: Esc to cancel, Enter to confirm
- [ ] Add keyboard shortcuts documentation
- [ ] Test all interactive components with keyboard only

**Example Focus Styles:**
```jsx
// Good: High contrast, thick focus ring
className="focus:outline-none focus:ring-4 focus:ring-blue-500"

// Better: Even more visible for elderly
className="focus:outline-none focus:ring-4 focus:ring-blue-600 focus:ring-offset-2"
```

---

## Screen Readers

### 📋 Status: Partially Implemented

**Components with ARIA:**
- ✅ ConfirmationModal - Full ARIA support
- ✅ ConnectionStatus - ARIA live region
- ✅ LoadingState - ARIA status

**Still Needed:**
- [ ] Add ARIA labels to all buttons without text
- [ ] Add ARIA landmarks (main, nav, aside, footer)
- [ ] Add ARIA labels to form inputs
- [ ] Add ARIA descriptions for complex interactions
- [ ] Test with VoiceOver (macOS/iOS)
- [ ] Test with NVDA (Windows)

### ARIA Label Examples

**Buttons with icons only:**
```jsx
<button aria-label="Delete item" onClick={handleDelete}>
  <Trash className="w-6 h-6" />
</button>
```

**Form inputs:**
```jsx
<input
  type="text"
  aria-label="Session name"
  aria-required="true"
  aria-invalid={errors.name ? "true" : "false"}
  aria-describedby="name-error"
/>
{errors.name && <span id="name-error">{errors.name}</span>}
```

**Landmarks:**
```jsx
<header role="banner">...</header>
<nav role="navigation" aria-label="Main navigation">...</nav>
<main role="main">...</main>
<aside role="complementary">...</aside>
<footer role="contentinfo">...</footer>
```

---

## Touch Targets

### 📋 Status: Needs Verification

**WCAG Requirements:**
- Minimum touch target size: 44x44 pixels
- Recommended for elderly: 48x48 pixels or larger
- Adequate spacing between targets

### Implementation

**Button Minimum Heights:**
```jsx
// Good: 48px+ touch target
className="px-6 py-4 min-h-[48px]"

// Better: 56px for primary actions (elderly-friendly)
className="px-6 py-4 min-h-[56px] text-lg"

// Example from ConfirmationModal:
className="... min-h-[56px]"
```

**Checklist:**
- [ ] Audit all buttons for minimum 48px height
- [ ] Check icon-only buttons have 48x48px hit area
- [ ] Verify spacing between adjacent clickable elements (8px minimum)
- [ ] Test on actual mobile devices

---

## Implementation Checklist

### ✅ Completed (Day 6)

- [x] **Font sizes increased** to 18px minimum for body text
- [x] **ConfirmationModal** component with full accessibility
- [x] **ConnectionStatus** indicator with ARIA live regions
- [x] **LoadingState** component with specific messages
- [x] Keyboard navigation in ConfirmationModal
- [x] Focus management in modals

### 🔄 In Progress

- [ ] Color contrast audit
- [ ] ARIA labels on all interactive elements
- [ ] Focus indicators on all components
- [ ] Screen reader testing

### 📋 To Do (Week 2)

**High Priority:**
- [ ] Audit and fix color contrast ratios
- [ ] Add ARIA landmarks to all pages
- [ ] Add visible focus indicators everywhere
- [ ] Test keyboard navigation on all flows
- [ ] Add ARIA labels to all icon buttons

**Medium Priority:**
- [ ] Test with VoiceOver on iOS
- [ ] Test with NVDA on Windows
- [ ] Add "skip to content" link
- [ ] Verify all form inputs have labels
- [ ] Test on real devices with elderly users (if possible)

**Nice to Have:**
- [ ] Add preference for high contrast mode
- [ ] Add option to increase font size further
- [ ] Add voice control hints
- [ ] Create printed user guide

---

## Integration Guide

### How to Use New Components

**1. Replace Generic Loading States:**

```jsx
// ❌ Before:
{loading && <div>Loading...</div>}

// ✅ After:
import LoadingState, { LoadingMessages } from '@/components/common/LoadingState';

{loading && <LoadingState message={LoadingMessages.LOADING_SESSION} />}
```

**2. Add Confirmation to Destructive Actions:**

```jsx
// ❌ Before:
const handleDelete = () => {
  deleteItem(itemId);
};

// ✅ After:
import ConfirmationModal from '@/components/common/ConfirmationModal';
import { useState } from 'react';

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

const handleDelete = () => {
  setShowDeleteConfirm(true);
};

const confirmDelete = () => {
  deleteItem(itemId);
  setShowDeleteConfirm(false);
};

// In JSX:
<ConfirmationModal
  isOpen={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  onConfirm={confirmDelete}
  title="Delete Item?"
  message="This will remove the item permanently. This cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  variant="danger"
/>
```

**3. Add Connection Status:**

```jsx
// In your main App.jsx or session screen:
import ConnectionStatus from '@/components/common/ConnectionStatus';
import { useSocket } from '@/hooks/useSocket';

function SessionActiveScreen() {
  const { connected, reconnecting } = useSocket();

  return (
    <>
      <ConnectionStatus isConnected={connected} isReconnecting={reconnecting} />
      {/* rest of your component */}
    </>
  );
}
```

---

## Testing Procedures

### Visual Testing

1. **Font Size Audit:**
   ```bash
   # Search for small text usage
   grep -r "text-xs" packages/minibag/src --include="*.jsx"
   ```

2. **Contrast Testing:**
   - Open Chrome DevTools
   - Inspect element
   - Check "Accessibility" tab
   - Look for contrast warnings

### Keyboard Testing

1. **Tab Navigation:**
   - Use Tab key to navigate through page
   - Verify all interactive elements are reachable
   - Check focus indicators are visible

2. **Modal Testing:**
   - Open modal
   - Press Tab - should trap focus inside modal
   - Press Esc - should close modal
   - Press Enter - should confirm action

### Screen Reader Testing

1. **macOS/iOS (VoiceOver):**
   - Enable: Cmd + F5
   - Navigate: Ctrl + Option + Arrow keys
   - Interact: Ctrl + Option + Space

2. **Windows (NVDA):**
   - Download from https://www.nvaccess.org/
   - Navigate: Arrow keys
   - Interact: Enter/Space

---

## Resources

**Tools:**
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)

**Guidelines:**
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Inclusive Design Principles](https://inclusivedesignprinciples.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

**Elderly User Research:**
- [Designing for Older Adults](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [Web Accessibility for Older Users](https://www.w3.org/WAI/older-users/)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-02
**Status:** Active Development
