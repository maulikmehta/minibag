# Minibag Styling Guide
**Design System Documentation**

**Last Updated:** October 25, 2025
**Status:** Active - Reference for all UI development

---

## 🎨 Design Philosophy

### Principles
1. **Mobile-First** - Designed for 360px-420px screens
2. **High Contrast** - Clear visual hierarchy
3. **Touch-Friendly** - 44px minimum tap targets
4. **Minimal Clutter** - One action per screen
5. **Indian Context** - Rupee symbols, regional fonts

### Inspiration
- WhatsApp (familiar messaging UX)
- Google Pay (payment UI patterns)
- Swiggy (Indian e-commerce standards)

---

## 🌈 Color System

### Primary Palette

**Green (Actions & CTAs)**
```css
bg-green-600         /* Primary buttons */
hover:bg-green-700   /* Button hover */
bg-green-100         /* Light backgrounds */
border-green-600     /* Active borders */
text-green-600       /* Success text */
text-green-800       /* Dark success text */
```

**Usage:**
- ✅ Primary action buttons ("Create session", "Add", "Done")
- ✅ Success states
- ✅ Active item indicators
- ✅ Trust signals

**Blue-Purple Gradient (Active States)**
```css
bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600
```

**Usage:**
- ✅ Selected category tab
- ✅ Active user avatar
- ✅ Focus indicator for tabs

**Rationale:**
- Professional, modern look
- Complimentary to green (not competing)
- High visibility without overwhelming
- Accessible contrast ratios

**Gray (Neutral & Structure)**
```css
/* Dark grays */
bg-gray-900          /* Headings, primary text */
border-gray-900      /* Strong borders */
text-gray-900        /* Body text */

/* Medium grays */
bg-gray-600          /* Secondary text */
text-gray-600        /* Muted content */
border-gray-300      /* Default borders */

/* Light grays */
bg-gray-50           /* Selected row backgrounds */
bg-gray-100          /* Inactive buttons, cards */
text-gray-500        /* Tertiary text */
```

**Yellow (Pro & Warnings)**
```css
bg-yellow-100        /* Pro badge background */
text-yellow-800      /* Pro badge text */
text-yellow-600      /* Warning text */
border-yellow-300    /* Warning borders */
```

**Red (Errors & Destructive)**
```css
bg-red-600           /* Error states */
text-red-600         /* Error text */
bg-red-100           /* Error backgrounds */
border-red-300       /* Error borders */
```

---

## 📐 Layout & Spacing

### Container
```css
max-w-md mx-auto     /* Max 448px width, centered */
```

**Rationale:** Optimized for mobile phones (360-420px)

### Padding Scale
```css
p-2      /* 8px  - Tight spacing */
p-3      /* 12px - Button padding */
p-4      /* 16px - Card padding */
p-6      /* 24px - Screen padding */
```

**Standard Screen Padding:**
```jsx
<div className="max-w-md mx-auto bg-white min-h-screen pb-24">
  <div className="p-6">
    {/* Screen content */}
  </div>
</div>
```

### Gap Scale
```css
gap-2    /* 8px  - Compact */
gap-3    /* 12px - Default */
gap-4    /* 16px - Comfortable */
gap-6    /* 24px - Spacious */
```

---

## 🔤 Typography

### Font Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

**Supports:**
- Latin (English)
- Devanagari (Hindi) - नागरी
- Gujarati - ગુજરાતી

### Text Sizes
```css
/* Headings */
text-4xl      /* 36px - Hero text */
text-2xl      /* 24px - Screen titles */
text-xl       /* 20px - Section headers */
text-lg       /* 18px - Large text */

/* Body */
text-base     /* 16px - Default body */
text-sm       /* 14px - Secondary text */
text-xs       /* 12px - Captions, labels */
```

### Font Weights
```css
font-bold     /* 700 - Headings */
font-semibold /* 600 - Emphasis */
font-medium   /* 500 - Buttons, labels */
font-normal   /* 400 - Body text */
```

### Text Colors
```css
text-gray-900 /* Primary content */
text-gray-600 /* Secondary content */
text-gray-500 /* Tertiary content */
text-gray-400 /* Disabled text */
```

---

## 🔘 Component Patterns

### Buttons

**Primary Action**
```jsx
<button className="w-full bg-green-600 hover:bg-green-700 text-white
                   py-4 rounded-lg text-base font-semibold
                   transition-colors">
  Create session
</button>
```

**Secondary Action**
```jsx
<button className="w-full border-2 border-gray-900 py-4 rounded-lg
                   text-base text-gray-900 hover:bg-gray-50
                   transition-colors">
  Test add participant
</button>
```

**Small Action**
```jsx
<button className="px-5 py-2 bg-green-600 hover:bg-green-700
                   text-white rounded-lg text-sm font-semibold
                   transition-colors">
  Add
</button>
```

**Disabled State**
```jsx
<button disabled
        className="... disabled:bg-gray-400 disabled:cursor-not-allowed">
  Disabled
</button>
```

### Cards

**Default Card**
```jsx
<div className="border-2 border-gray-300 rounded-lg p-4">
  {/* Card content */}
</div>
```

**Selected Card**
```jsx
<div className="border-2 border-gray-900 bg-gray-50 rounded-lg p-4">
  {/* Active card content */}
</div>
```

### Circular Tabs (Categories/Avatars)

**Active Tab with Gradient**
```jsx
<div className="w-16 h-16 rounded-full flex items-center justify-center
                mb-2 transition-all
                bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600
                p-[3px]">
  <div className="w-full h-full rounded-full flex items-center justify-center bg-white">
    <span className="text-2xl">{emoji}</span>
  </div>
</div>
```

**Inactive Tab**
```jsx
<div className="w-16 h-16 rounded-full flex items-center justify-center
                mb-2 border-2 border-gray-300 bg-gray-50">
  <span className="text-2xl">{emoji}</span>
</div>
```

**Has Items (Green Border)**
```jsx
<div className="w-16 h-16 rounded-full flex items-center justify-center
                mb-2 border-2 border-green-600 bg-white">
  <span className="text-2xl">{emoji}</span>
</div>
```

### Input Fields

**Text Input**
```jsx
<input
  type="text"
  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg
             focus:border-gray-900 focus:outline-none"
  placeholder="Search items..."
/>
```

**Number Input (Quantity)**
```jsx
<input
  type="number"
  inputMode="decimal"
  step="0.25"
  value={quantity}
  className="w-14 text-base text-gray-900 text-center
             border-b-2 border-gray-300 focus:border-gray-900
             focus:outline-none py-1"
/>
```

### Lists

**Divider List**
```jsx
<div className="divide-y divide-gray-200">
  {items.map(item => (
    <div key={item.id} className="flex items-center gap-3 py-3 px-2">
      {/* List item content */}
    </div>
  ))}
</div>
```

**Selected Row**
```jsx
<div className="flex items-center gap-3 py-3 px-2 bg-gray-50">
  {/* Selected item */}
</div>
```

---

## 🎭 Interactive States

### Hover Effects
```css
hover:bg-green-700      /* Buttons */
hover:bg-gray-100       /* Secondary actions */
hover:bg-gray-50        /* Subtle hover */
hover:border-green-600  /* Interactive elements */
```

### Transitions
```css
transition-colors       /* Color changes */
transition-all          /* Multiple properties */
```

**Usage:**
```jsx
<button className="... transition-colors">
  /* Smooth color transitions on hover */
</button>
```

### Loading States
```jsx
import { Loader2 } from 'lucide-react';

<Loader2 size={48} className="text-gray-900 animate-spin" />
```

### Disabled States
```jsx
<button
  disabled={isDisabled}
  className="... disabled:bg-gray-400 disabled:hover:bg-gray-400
             disabled:cursor-not-allowed">
  {/* Button content */}
</button>
```

---

## 🖼️ Icons

### Library
**Lucide React** - Consistent, simple icons

```bash
npm install lucide-react
```

### Common Icons
```jsx
import {
  Plus,           // Add actions
  Minus,          // Remove actions
  Check,          // Confirmations
  X,              // Close/Delete
  Share2,         // Sharing
  Users,          // People/Groups
  ShoppingBag,    // Shopping
  MapPin,         // Location
  Calendar,       // Scheduling
  Clock,          // Time
  IndianRupee,    // Currency
  Loader2         // Loading
} from 'lucide-react';
```

### Icon Sizes
```jsx
<Icon size={16} />  /* Small - inline text */
<Icon size={20} />  /* Medium - buttons */
<Icon size={24} />  /* Large - headers */
<Icon size={48} />  /* XL - loading states */
```

### Icon Colors
```jsx
<Icon className="text-white" />      /* On dark backgrounds */
<Icon className="text-gray-600" />   /* Muted */
<Icon className="text-gray-900" />   /* Prominent */
<Icon className="text-green-600" />  /* Success */
<Icon className="text-red-600" />    /* Error */
```

---

## 📱 Responsive Patterns

### Mobile-First Approach
```css
/* Default: Mobile (360px+) */
p-6 text-base

/* Tablet: 768px+ (if needed) */
md:p-8 md:text-lg

/* Desktop: Not our primary target */
```

### Safe Areas
```jsx
/* Avoid bottom nav bar collision */
<div className="pb-24">
  {/* Content */}
</div>

/* Fixed bottom CTA */
<div className="fixed bottom-0 left-0 right-0 bg-white border-t
                border-gray-300 p-6 max-w-md mx-auto">
  <button>Action</button>
</div>
```

### Scrollable Areas
```jsx
/* Horizontal scroll for tabs */
<div className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-2">
  {tabs.map(tab => <Tab key={tab.id} />)}
</div>
```

---

## 🌐 Multilingual Considerations

### Font Rendering
```css
/* Gujarati needs more line height */
.gujarati-text {
  line-height: 1.6;
}

/* Hindi Devanagari rendering */
.hindi-text {
  line-height: 1.5;
}
```

### Text Alignment
```jsx
/* Always left-align (not RTL) */
<p className="text-left">
  {localizedText}
</p>
```

### Language Switcher
```jsx
<button
  onClick={() => toggleLanguage()}
  className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
  title="Switch language"
>
  🌐
</button>
```

---

## ⚡ Performance Optimizations

### Image Loading
```jsx
<img
  src={item.img}
  alt={item.name}
  loading="lazy"  /* Lazy load off-screen images */
  className="w-10 h-10 rounded-full object-cover bg-gray-100"
/>
```

### Transition Performance
```css
/* Use transform instead of width/height */
transform: scale(1.1);  /* ✅ GPU-accelerated */
width: 110%;            /* ❌ Slow reflow */
```

### Shadow Performance
```css
/* Use sparingly, prefer borders */
shadow-xl    /* Only for modals */
shadow-lg    /* Floating elements */
border-2     /* Default (faster) */
```

---

## 🎯 Accessibility

### Touch Targets
**Minimum:** 44px × 44px (iOS HIG standard)

```css
min-w-[44px] min-h-[44px]
```

### Contrast Ratios
- Text on white: Gray-900 (✅ AA compliant)
- Buttons: Green-600 + white (✅ AA compliant)
- Links: Blue-600 (✅ AA compliant)

### Focus States
```css
focus:outline-none       /* Remove default */
focus:border-gray-900    /* Custom focus ring */
focus:ring-2             /* Alternative: ring style */
```

### Screen Reader Support
```jsx
<button aria-label="Add tomatoes to bag">
  <Plus size={16} />
</button>
```

---

## 📦 Reusable Classes

### Utility Combinations

**Flex Center**
```css
flex items-center justify-center
```

**Full Width Button**
```css
w-full py-4 rounded-lg text-base font-semibold transition-colors
```

**Card Style**
```css
border-2 border-gray-300 rounded-lg p-4
```

**Screen Container**
```css
max-w-md mx-auto bg-white min-h-screen
```

**Section Padding**
```css
p-6
```

**Divider**
```css
border-t border-gray-300
```

---

## 🛡️ Do's and Don'ts

### ✅ Do's
- Use Tailwind utility classes (avoid custom CSS)
- Follow mobile-first approach
- Use semantic HTML (`<button>`, `<nav>`, etc.)
- Add loading states for async actions
- Use emoji sparingly, only for visual hierarchy
- Test on 360px viewport (smallest phones)
- Use `transition-colors` for smooth interactions
- Lazy load images off-screen

### ❌ Don'ts
- Don't use inline styles
- Don't add emojis unless explicitly requested
- Don't use fixed widths (use max-w-md)
- Don't forget disabled states
- Don't use small tap targets (< 44px)
- Don't use too many colors (stick to palette)
- Don't add animations without purpose
- Don't nest more than 3 levels deep in Tailwind classes

---

## 🔄 Version History

### v1.0 - October 25, 2025
- ✅ Blue-purple gradient for active tabs
- ✅ Green color palette for actions
- ✅ Mobile-first responsive system
- ✅ Typography scale defined
- ✅ Component patterns documented

### v0.9 - October 14, 2025
- Initial styling system
- Green gradient (deprecated Oct 25)

---

## 📞 Questions & Support

**Styling Questions:**
- Check this guide first
- Reference Tailwind CSS docs: https://tailwindcss.com/docs
- Review existing components in codebase

**Color Conflicts:**
- Active tabs: Blue-purple gradient
- Actions: Green
- Structure: Gray
- Never mix gradients on one screen

**Responsive Issues:**
- Test on 360px (Chrome DevTools)
- Use `max-w-md` container
- Avoid fixed widths

---

**Last Updated:** October 25, 2025
**Next Review:** When adding new component types
**Maintainer:** Product & Design Team

🎨 **Keep it simple, keep it consistent!**
