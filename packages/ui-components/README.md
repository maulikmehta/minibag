# @localloops/ui-components

Shared UI component toolkit for LocalLoops products.

## Philosophy

**Loosely-coupled, not tightly-controlled.**

- ✅ Provides building blocks, not rigid templates
- ✅ Products control their own styling and behavior
- ✅ Opt-in usage - use what you need, ignore the rest
- ✅ Subtle brand hints, not forced uniformity

## Installation

```bash
npm install @localloops/ui-components
```

## Usage

### Import Product Config

```javascript
import { PRODUCTS, PLATFORM, getProduct } from '@localloops/ui-components/config';

const minibag = getProduct('minibag');
console.log(minibag.name); // "Minibag"
console.log(minibag.colors.primary); // "#22c55e"
```

### Use Shared Components

```javascript
import { Logo, ProductCard } from '@localloops/ui-components';
import { ShoppingBag } from 'lucide-react';

// Logo - highly customizable
<Logo
  icon={ShoppingBag}
  name="Minibag"
  tagline="Shopping made simple"
  size="lg"
  iconColor="bg-green-600"
  className="custom-styles"
/>

// ProductCard - flexible layout
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
/>
```

### Or Build Your Own

Products can completely ignore shared components and build custom implementations:

```javascript
// Completely custom, product-specific design
<div className="my-unique-header">
  <ShoppingBag className="text-green-600" />
  <h1>Minibag</h1>
</div>
```

## Components

### Logo
Flexible logo wrapper - accepts any icon and customization.

**Props:**
- `icon` - Lucide icon component
- `name` - Product/platform name
- `tagline` - Optional tagline
- `size` - 'sm' | 'md' | 'lg' | 'xl'
- `variant` - 'default' | 'compact' | 'icon-only'
- `iconColor` - Tailwind class
- `className` - Additional styles

### ProductCard
Flexible product card for showcasing products.

**Props:**
- `icon` - Lucide icon component
- `name` - Product name
- `tagline` - Product tagline
- `description` - Product description
- `features` - Array of feature strings
- `status` - 'Live' | 'Coming Soon'
- `link` - Product landing URL
- `color` - Primary color (Tailwind class)
- `hoverColor` - Hover color (Tailwind class)
- `className` - Additional styles
- `children` - Custom content (overrides default)

### Footer Components
Composable footer building blocks:
- `Footer` - Main wrapper
- `FooterContent` - Content container
- `FooterRow` - Flex row
- `FooterLink` - Styled link
- `FooterText` - Styled text
- `FooterGrid` - Grid layout
- `FooterSection` - Section with heading

## Config

### PRODUCTS
Object containing metadata for all products (Minibag, Partybag, Fitbag).

### PLATFORM
Object containing LocalLoops platform metadata.

### Helper Functions
- `getProduct(id)` - Get product by ID
- `getAllProducts()` - Get all products as array
- `getLiveProducts()` - Get only live products
- `getProductColorClasses(id)` - Get Tailwind color classes

## Design Principles

1. **Metadata, not styling** - Config provides data, products control design
2. **Props over presets** - Everything customizable via props
3. **Children prop** - Products can override entire sections
4. **No vendor lock-in** - Products can opt-out anytime
5. **Tailwind classes** - Uses Tailwind for flexibility

## License

MIT
