# Shared Components Architecture

**Created:** October 24, 2025
**Version:** 1.0.0

## Overview

LocalLoops now uses a **loosely-coupled component toolkit** to share branding and UI elements across all products (Minibag, Partybag, Fitbag) while maintaining product uniqueness.

## Core Philosophy

> **Shared but not tightly tied** - Products stay unique yet hint to the parent.

### Principles

1. **Composable Components** - Building blocks, not rigid templates
2. **Prop-based Customization** - Products control their own styling
3. **Opt-in Usage** - Products can use shared components OR build custom ones
4. **Subtle Brand Connection** - Visual hints, not forced uniformity
5. **No Vendor Lock-in** - Products aren't dependent on the library

---

## Package Structure

```
localloops/
├── packages/
│   ├── shared/              # Backend API (Express, Supabase, Socket.IO)
│   ├── ui-components/       # 🆕 Shared UI component toolkit
│   │   ├── src/
│   │   │   ├── components/  # Reusable UI components
│   │   │   │   ├── Logo.jsx
│   │   │   │   ├── ProductCard.jsx
│   │   │   │   └── Footer.jsx (+ subcomponents)
│   │   │   ├── config/      # Product metadata (NOT styling)
│   │   │   │   └── products.js
│   │   │   └── utils/       # Helper functions
│   │   ├── package.json
│   │   └── README.md
│   └── minibag/            # Product: Minibag
│       └── src/
│           ├── LocalLoopsLanding.jsx  # Uses shared components
│           └── LandingPage.jsx        # Uses shared components
```

---

## What's Shared?

### ✅ Product Metadata (`config/products.js`)

```javascript
export const PRODUCTS = {
  minibag: {
    id: 'minibag',
    name: 'Minibag',
    tagline: 'Track your shopping, split with neighbors',
    icon: 'ShoppingBag',  // String reference
    colors: {
      primary: '#22c55e',
      hover: '#16a34a',
    },
    routes: {
      landing: '/minibag',
      app: '/app',
    },
    features: ['Vegetable shopping', 'Cost splitting', 'WhatsApp bills'],
    status: 'Live',
  },
  // ... partybag, fitbag
};
```

**Benefits:**
- Single source of truth for product names, routes, colors
- Easy to add new products
- Products can override/extend config as needed

### ✅ Reusable UI Components

#### 1. **Logo Component**
Flexible logo wrapper - accepts any icon and customization.

```javascript
import { Logo } from '@localloops/ui-components';
import { ShoppingBag } from 'lucide-react';

<Logo
  icon={ShoppingBag}
  name="Minibag"
  tagline="Shopping made simple"
  size="lg"                    // 'sm' | 'md' | 'lg' | 'xl'
  variant="compact"            // 'default' | 'compact' | 'icon-only'
  iconColor="bg-green-600"    // Product controls color
  className="custom-class"     // Product adds custom styles
/>
```

#### 2. **ProductCard Component**
Displays product information in a card layout.

```javascript
import { ProductCard } from '@localloops/ui-components';

<ProductCard
  icon={ShoppingBag}
  name="Minibag"
  tagline="Track your shopping"
  description="Split with neighbors"
  features={['Shopping lists', 'Cost splitting']}
  status="Live"
  link="/minibag"
  color="bg-green-600"
  hoverColor="hover:bg-green-700"
>
  {/* Optional: Override entire card content */}
</ProductCard>
```

#### 3. **Footer Components**
Composable footer building blocks.

```javascript
import {
  Footer,
  FooterContent,
  FooterRow,
  FooterLink,
  FooterText
} from '@localloops/ui-components';

<Footer>
  <FooterContent>
    <FooterRow align="between">
      <FooterText>© 2025 LocalLoops</FooterText>
      <FooterLink href="/about">About</FooterLink>
    </FooterRow>
  </FooterContent>
</Footer>
```

### ✅ Helper Functions

```javascript
import {
  getProduct,
  getAllProducts,
  getLiveProducts,
  getProductColorClasses
} from '@localloops/ui-components/config';

const minibag = getProduct('minibag');
const allProducts = getAllProducts();
const colors = getProductColorClasses('minibag');
// { bg: 'bg-green-600', hover: 'hover:bg-green-700', ... }
```

---

## What's NOT Shared?

### ❌ Opinionated Styling
Products control their own design language, spacing, typography.

### ❌ Rigid Templates
No enforced page layouts or screen structures.

### ❌ Business Logic
Product-specific features stay in product packages.

---

## Usage Examples

### Example 1: Using Shared Config + Logo

**Before:**
```javascript
// Hard-coded in LocalLoopsLanding.jsx
<div className="flex items-center gap-3">
  <div className="w-12 h-12 rounded-xl bg-gray-900...">
    <MapPin size={28} className="text-white" />
  </div>
  <div>
    <h1>LocalLoops</h1>
    <p>Micro-coordination for neighborhoods</p>
  </div>
</div>
```

**After:**
```javascript
import { Logo } from '@localloops/ui-components';
import { PLATFORM } from '@localloops/ui-components/config';
import { MapPin } from 'lucide-react';

<Logo
  icon={MapPin}
  name={PLATFORM.name}
  tagline={PLATFORM.tagline}
  size="lg"
  iconColor="bg-gray-900"
/>
```

### Example 2: Product Cards

**Before:**
```javascript
// 142 lines of duplicated card markup in LocalLoopsLanding.jsx
const products = [
  { id: 'minibag', name: 'Minibag', color: 'bg-green-600', ... },
  { id: 'partybag', name: 'Partybag', color: 'bg-purple-600', ... },
];

return products.map(product => (
  <div className="bg-white rounded-2xl...">
    <div className={`w-16 h-16 ${product.color}...`}>
      <Icon />
    </div>
    <h3>{product.name}</h3>
    {/* ... 30+ more lines ... */}
  </div>
));
```

**After:**
```javascript
import { ProductCard } from '@localloops/ui-components';
import { getAllProducts, getProductColorClasses } from '@localloops/ui-components/config';

const products = getAllProducts().map(p => ({
  ...p,
  ...getProductColorClasses(p.id),
}));

return products.map(product => (
  <ProductCard
    key={product.id}
    icon={iconMap[product.icon]}
    name={product.name}
    tagline={product.tagline}
    description={product.description}
    features={product.features}
    status={product.status}
    link={product.routes.landing}
    color={product.bg}
    hoverColor={product.hover}
  />
));
```

### Example 3: Opt-Out Option

Products can **completely ignore** shared components:

```javascript
// Custom implementation - no shared components
<div className="my-unique-minibag-header">
  <ShoppingBag className="text-green-600" />
  <h1 className="custom-font">Minibag</h1>
</div>
```

---

## Benefits

### 1. **DRY (Don't Repeat Yourself)**
- Product metadata defined once
- Update product names/colors in one place
- Changes propagate automatically

### 2. **Consistency with Flexibility**
- Shared branding elements (logos, colors)
- Products control their own UX
- Subtle brand connection, not forced uniformity

### 3. **Scalability**
- Easy to add new products (Partybag, Fitbag)
- New components can be added incrementally
- No breaking changes - products can migrate gradually

### 4. **Reduced Iteration**
- Change logo styling once, applies everywhere (if using shared Logo)
- Update color palette in config
- Less duplication = fewer places to update

---

## Adding a New Product

1. **Add to config** (`packages/ui-components/src/config/products.js`):
```javascript
export const PRODUCTS = {
  // ... existing products
  newbag: {
    id: 'newbag',
    name: 'Newbag',
    icon: 'Star',
    colors: { primary: '#3b82f6', hover: '#2563eb' },
    routes: { landing: '/newbag', app: '/newbag/app' },
    features: ['Feature 1', 'Feature 2'],
    status: 'Coming Soon',
  },
};
```

2. **Update color classes** (if needed):
```javascript
const colorMap = {
  // ... existing colors
  '#3b82f6': { bg: 'bg-blue-600', hover: 'hover:bg-blue-700', ... },
};
```

3. **Add icon mapping** in consuming components:
```javascript
const iconMap = {
  ShoppingBag, PartyPopper, Heart, Star, // Add Star
};
```

4. **Done!** Product appears in LocalLoops landing page automatically.

---

## Migration Checklist

- [x] Created `@localloops/ui-components` package
- [x] Defined product metadata in config
- [x] Created Logo, ProductCard, Footer components
- [x] Refactored LocalLoopsLanding.jsx to use shared components
- [x] Refactored Minibag LandingPage.jsx to use shared components
- [x] Tested hot module reloading
- [x] Documented architecture

### Future Work

- [ ] Add TypeScript types for stricter contracts
- [ ] Create visual component library documentation
- [ ] Add unit tests for shared components
- [ ] Create Storybook for component preview
- [ ] Extract admin dashboard components (if needed)

---

## Files Modified

### New Files Created
- `packages/ui-components/` - Entire package
  - `src/components/Logo.jsx`
  - `src/components/ProductCard.jsx`
  - `src/components/Footer.jsx`
  - `src/config/products.js`
  - `package.json`
  - `README.md`

### Files Modified
- `packages/minibag/package.json` - Added `@localloops/ui-components` dependency
- `packages/minibag/src/LocalLoopsLanding.jsx` - Refactored to use shared components (210 → 153 lines)
- `packages/minibag/src/LandingPage.jsx` - Refactored to use shared components (170 → 174 lines)

---

## Testing

**Dev servers running:**
- Frontend: `http://localhost:5173/`
- Backend API: `http://localhost:3000/`
- WebSocket: `ws://localhost:3001/`

**Test URLs:**
- `/` - LocalLoops platform landing (uses ProductCard)
- `/minibag` - Minibag landing (uses Logo, config)
- `/app` - Minibag app

**Expected behavior:**
- ✅ All pages load without errors
- ✅ Logos render with correct icons and colors
- ✅ Product cards display all 3 products
- ✅ Navigation works between pages
- ✅ Hot module reloading works

---

## Maintenance

### Updating Product Branding

**To change a product name/tagline:**
```javascript
// packages/ui-components/src/config/products.js
minibag: {
  name: 'Minibag Pro',  // Changed
  tagline: 'New tagline',  // Changed
  // ... rest stays same
}
```
Changes reflect everywhere the product is used.

### Adding a New Shared Component

1. Create component in `packages/ui-components/src/components/`
2. Export from `packages/ui-components/src/components/index.js`
3. Use in products: `import { NewComponent } from '@localloops/ui-components'`

### Best Practices

- **Keep components flexible** - Use props for customization
- **Provide children prop** - Allow complete content override
- **Don't enforce styling** - Products should control their look
- **Document prop types** - Use JSDoc comments
- **Version semantically** - Breaking changes = major version bump

---

**End of Document**
