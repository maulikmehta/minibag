# Shared Component Library Structure

**Version:** 1.0
**Last Updated:** 2025-11-01
**Status:** Implementation Guide

---

## Table of Contents

1. [Overview](#overview)
2. [Package Architecture](#package-architecture)
3. [Component Catalog](#component-catalog)
4. [Component API Standards](#component-api-standards)
5. [Migration Strategy](#migration-strategy)
6. [Bundle Optimization](#bundle-optimization)
7. [Development Workflow](#development-workflow)
8. [Testing Standards](#testing-standards)

---

## Overview

### Purpose

The LocalLoops Shared Component Library (`@localloops/*` packages) provides reusable UI components, hooks, and utilities that:

1. **Ensure consistency** across all LocalLoops apps (Minibag, StreetHawk, Fitbag, Partybag)
2. **Reduce duplication** by centralizing common functionality
3. **Accelerate development** of new apps
4. **Maintain brand-silent architecture** (components are generic, not LocalLoops-branded)

### Principles

- **Composable:** Small, focused components that work together
- **Accessible:** WCAG 2.1 AA compliant out of the box
- **Performant:** Optimized for mobile, < 50KB per package
- **Documented:** Each component has usage examples and API docs
- **Tested:** Unit tests + visual regression tests

---

## Package Architecture

### Monorepo Structure

```
/packages/
├── shared/                    ← Backend (existing)
│   ├── api/
│   ├── db/
│   └── websocket/
│
├── ui-components/             ← Base UI primitives (existing, needs expansion)
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   ├── package.json
│   └── README.md
│
├── @localloops/identity/      ← NEW: Identity & auth
│   ├── src/
│   │   ├── components/
│   │   │   ├── UserIdentity.jsx
│   │   │   ├── NicknameSelector.jsx
│   │   │   └── AuthProvider.jsx
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   └── useIdentity.js
│   │   ├── services/
│   │   │   └── authService.js
│   │   └── types/
│   │       └── identity.ts
│   └── package.json
│
├── @localloops/catalog/       ← NEW: Item catalog
│   ├── src/
│   │   ├── components/
│   │   │   ├── CategoryButton.jsx
│   │   │   ├── ItemCard.jsx
│   │   │   ├── ItemList.jsx
│   │   │   └── CatalogProvider.jsx
│   │   ├── hooks/
│   │   │   ├── useCatalog.js
│   │   │   ├── useCategories.js
│   │   │   └── useItems.js
│   │   ├── services/
│   │   │   └── catalogAPI.js
│   │   └── utils/
│   │       └── catalogTransformers.js
│   └── package.json
│
├── @localloops/events/        ← NEW: Real-time & notifications
│   ├── src/
│   │   ├── socket/
│   │   │   ├── SocketProvider.jsx
│   │   │   ├── useSocket.js
│   │   │   └── socketClient.js
│   │   ├── notifications/
│   │   │   ├── NotificationProvider.jsx
│   │   │   ├── NotificationToast.jsx
│   │   │   └── useNotification.js
│   │   └── events/
│   │       ├── sessionEvents.js
│   │       └── eventBus.js
│   └── package.json
│
├── @localloops/ui/            ← NEW: Enhanced UI library (replaces ui-components)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── ProgressBar.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── LanguageSwitcher.jsx
│   │   ├── hooks/
│   │   │   └── useMediaQuery.js
│   │   ├── utils/
│   │   │   └── cn.js (classnames utility)
│   │   └── styles/
│   │       └── tokens.css (design tokens)
│   └── package.json
│
└── minibag/                   ← Existing app (consumer of shared packages)
    └── streethawk/            ← Future app (consumer of shared packages)
```

---

### Package Dependencies

```
@localloops/ui
  ├── react
  ├── lucide-react (icons)
  └── (no other LocalLoops packages)

@localloops/identity
  ├── @localloops/ui
  ├── react
  └── (identity-specific deps)

@localloops/catalog
  ├── @localloops/ui
  ├── react
  └── (catalog-specific deps)

@localloops/events
  ├── @localloops/ui
  ├── socket.io-client
  ├── react
  └── (event-specific deps)

minibag
  ├── @localloops/ui
  ├── @localloops/identity
  ├── @localloops/catalog
  ├── @localloops/events
  ├── react
  └── (app-specific deps)
```

**Dependency Rules:**
- ✅ Apps can depend on any `@localloops/*` package
- ✅ Domain packages (`identity`, `catalog`, `events`) can depend on `@localloops/ui`
- ❌ `@localloops/ui` CANNOT depend on domain packages (must be base layer)
- ❌ Domain packages CANNOT depend on each other (avoid circular dependencies)

---

## Component Catalog

### @localloops/ui (Base UI Components)

#### Buttons

**Primary Button:**
```jsx
import { Button } from '@localloops/ui';

<Button variant="primary" size="lg" fullWidth onClick={handleClick}>
  Create list
</Button>
```

**API:**
```typescript
interface ButtonProps {
  variant: 'primary' | 'secondary' | 'destructive' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}
```

**Variants:**
- `primary`: Gray-900 background, white text (main actions)
- `secondary`: White background, gray-900 border (secondary actions)
- `destructive`: Red-500 background, white text (delete, leave, cancel)
- `ghost`: Transparent background, gray-600 text (subtle actions)

**Sizes:**
- `sm`: 36px height, 0.875rem text
- `md`: 44px height, 1rem text (default)
- `lg`: 52px height, 1rem text

---

#### Icon Button

```jsx
import { IconButton } from '@localloops/ui';
import { Plus } from 'lucide-react';

<IconButton
  icon={<Plus size={20} />}
  variant="primary"
  ariaLabel="Add item"
  onClick={handleAdd}
/>
```

**API:**
```typescript
interface IconButtonProps {
  icon: React.ReactNode;
  variant: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel: string; // Required for accessibility
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}
```

---

#### Input

```jsx
import { Input } from '@localloops/ui';

<Input
  type="text"
  placeholder="Enter your name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={errors.name}
  helperText="First name only"
/>
```

**API:**
```typescript
interface InputProps {
  type: 'text' | 'search' | 'number' | 'email' | 'tel';
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string; // Error message
  helperText?: string;
  icon?: React.ReactNode; // Left icon (e.g., Search)
  className?: string;
}
```

---

#### Search Input

```jsx
import { SearchInput } from '@localloops/ui';

<SearchInput
  placeholder="Search items..."
  value={query}
  onChange={setQuery}
  onClear={() => setQuery('')}
/>
```

**Features:**
- Search icon (left)
- Clear button (right, appears when value exists)
- Auto-focus option

---

#### Card

```jsx
import { Card } from '@localloops/ui';

<Card variant="default" interactive onClick={handleClick}>
  <Card.Header>
    <h3>Shopping List</h3>
  </Card.Header>
  <Card.Body>
    <p>3 participants, 12 items</p>
  </Card.Body>
  <Card.Footer>
    <Button variant="ghost">View</Button>
  </Card.Footer>
</Card>
```

**API:**
```typescript
interface CardProps {
  variant?: 'default' | 'feature' | 'outline';
  interactive?: boolean; // Adds hover effects
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}
```

**Variants:**
- `default`: White background, subtle shadow
- `feature`: Gradient background (blue-50 to purple-50)
- `outline`: Transparent background, gray-300 border

---

#### Modal

```jsx
import { Modal } from '@localloops/ui';

<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Confirm action"
  size="sm"
>
  <p>Are you sure you want to leave this session?</p>
  <div className="flex gap-3 mt-6">
    <Button variant="secondary" fullWidth onClick={handleClose}>
      Cancel
    </Button>
    <Button variant="destructive" fullWidth onClick={handleLeave}>
      Leave
    </Button>
  </div>
</Modal>
```

**API:**
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}
```

**Features:**
- Focus trap (keyboard navigation stays inside)
- ESC key closes modal
- Overlay click closes modal (optional)
- Accessible (role="dialog", aria-labelledby, aria-describedby)

---

#### Progress Bar

```jsx
import { ProgressBar } from '@localloops/ui';

<ProgressBar
  steps={['Create', 'Shop', 'Pay', 'Complete']}
  currentStep={1}
/>
```

**Visual:**
```
[1✓] ———— [2] ———— [3] ———— [4]
Create   Shop   Pay   Complete
```

**API:**
```typescript
interface ProgressBarProps {
  steps: string[] | { label: string; icon?: ReactNode }[];
  currentStep: number; // 0-indexed
  variant?: 'default' | 'compact';
  className?: string;
}
```

---

#### Empty State

```jsx
import { EmptyState } from '@localloops/ui';

<EmptyState
  emoji="🛒"
  title="No shopping lists yet"
  description="Create your first list to start coordinating with neighbors"
  action={{
    label: "Create list",
    onClick: handleCreate
  }}
/>
```

**API:**
```typescript
interface EmptyStateProps {
  emoji?: string;
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}
```

---

#### Loading Spinner

```jsx
import { LoadingSpinner, SkeletonLoader } from '@localloops/ui';

// Inline spinner
<LoadingSpinner size="md" label="Loading..." />

// Skeleton screen (preferred for content loading)
<SkeletonLoader type="list" rows={5} />
```

**Skeleton Types:**
- `list`: Item list skeleton
- `card`: Card skeleton
- `text`: Text paragraph skeleton
- `avatar`: Circular avatar skeleton

---

#### Language Switcher

```jsx
import { LanguageSwitcher } from '@localloops/ui';

<LanguageSwitcher
  currentLanguage={i18n.language}
  onLanguageChange={(code) => i18n.changeLanguage(code)}
  languages={[
    { code: 'en', label: 'EN' },
    { code: 'gu', label: 'GU' },
    { code: 'hi', label: 'HI' }
  ]}
/>
```

---

### @localloops/identity (Identity Components)

#### UserIdentity

```jsx
import { UserIdentity } from '@localloops/identity';

<UserIdentity
  realName="Maulik Patel"
  nickname="Dev"
  useFirstNameOnly={true}
  className="text-lg"
/>
// Renders: Maulik @ Dev
```

**See Design System for full specification.**

---

#### NicknameSelector

```jsx
import { NicknameSelector } from '@localloops/identity';

<NicknameSelector
  value={nickname}
  onChange={setNickname}
  availableNicknames={['Dev', 'Max', 'Sam']}
  onRefresh={fetchNewNicknames}
/>
```

**Features:**
- Shows random nickname by default
- "Refresh" button to get new random nickname
- Manual input option (validates against available list)
- Preview: "You'll appear as: YourName @ Dev"

---

#### AuthProvider

```jsx
import { AuthProvider, useAuth } from '@localloops/identity';

// App wrapper
<AuthProvider>
  <App />
</AuthProvider>

// In components
function MyComponent() {
  const { user, login, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <button onClick={() => login({ phone })}>Login with OTP</button>;
  }

  return <p>Welcome, {user.displayName}</p>;
}
```

**API:**
```typescript
interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}
```

---

### @localloops/catalog (Catalog Components)

#### CategoryButton

```jsx
import { CategoryButton } from '@localloops/catalog';

<CategoryButton
  category={{
    id: 'veggies',
    name: 'Veggies',
    emoji: '🥬',
    color: 'bg-green-100'
  }}
  isSelected={selectedCategory === 'veggies'}
  isDisabled={false}
  onClick={() => setSelectedCategory('veggies')}
/>
```

**See Design System for full specification.**

---

#### ItemCard

```jsx
import { ItemCard } from '@localloops/catalog';

<ItemCard
  item={item}
  quantity={quantities[item.id] || 0}
  isSelected={quantities[item.id] > 0}
  getItemName={(item) => item[`name_${language}`] || item.name}
  getItemSubtitles={(item) => `₹${item.price}/kg`}
  onQuantityChange={(newQuantity) => updateQuantity(item.id, newQuantity)}
  maxWeight={10}
/>
```

**See Design System for full specification.**

---

#### ItemList

```jsx
import { ItemList } from '@localloops/catalog';

<ItemList
  items={filteredItems}
  quantities={quantities}
  onQuantityChange={handleQuantityChange}
  getItemName={(item) => item[`name_${i18n.language}`]}
  loading={isLoading}
  emptyState={
    <EmptyState
      emoji="🔍"
      title="No items found"
      description="Try a different search term"
    />
  }
/>
```

**Features:**
- Virtual scrolling for large lists (react-window)
- Grouped by category (optional)
- Search highlight (optional)

---

#### CatalogProvider

```jsx
import { CatalogProvider, useCatalog } from '@localloops/catalog';

// App wrapper
<CatalogProvider
  config={{
    apiBaseUrl: process.env.API_URL,
    language: i18n.language,
    cacheTimeout: 300000 // 5 minutes
  }}
>
  <App />
</CatalogProvider>

// In components
function ItemSelector() {
  const {
    items,
    categories,
    searchItems,
    loading,
    error
  } = useCatalog();

  return <ItemList items={items} />;
}
```

---

### @localloops/events (Events & Notifications)

#### NotificationProvider

```jsx
import { NotificationProvider, useNotification } from '@localloops/events';

// App wrapper
<NotificationProvider position="bottom">
  <App />
</NotificationProvider>

// In components
function MyComponent() {
  const { notify } = useNotification();

  const handleSuccess = () => {
    notify({
      type: 'success',
      message: 'Item added successfully',
      duration: 3000
    });
  };

  return <button onClick={handleSuccess}>Add Item</button>;
}
```

**API:**
```typescript
interface NotifyOptions {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
  duration?: number; // Auto-dismiss in ms (default: 3000)
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

---

#### NotificationToast

**Automatic component (rendered by NotificationProvider). Don't use directly.**

**Visual Variants:** See Design System Toast Notifications section.

---

#### SocketProvider

```jsx
import { SocketProvider, useSocket } from '@localloops/events';

// App wrapper
<SocketProvider
  url={process.env.SOCKET_URL}
  options={{
    reconnection: true,
    reconnectionDelay: 1000
  }}
>
  <App />
</SocketProvider>

// In components
function SessionScreen({ sessionId }) {
  const { socket, connected, emit, on, off } = useSocket();

  useEffect(() => {
    // Subscribe to events
    const handleParticipantJoined = (data) => {
      console.log('Participant joined:', data);
    };

    on('participant-joined', handleParticipantJoined);

    // Join session room
    emit('join-session', { sessionId });

    // Cleanup
    return () => {
      off('participant-joined', handleParticipantJoined);
      emit('leave-session', { sessionId });
    };
  }, [sessionId, on, off, emit]);

  return <div>Connected: {connected ? 'Yes' : 'No'}</div>;
}
```

**API:**
```typescript
interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
}
```

---

## Component API Standards

### Naming Conventions

**Components:**
- PascalCase: `UserIdentity`, `ItemCard`, `NotificationToast`
- Descriptive noun: Describes what it is, not what it does
- Avoid abbreviations: `Button` not `Btn`

**Props:**
- camelCase: `onClick`, `isSelected`, `fullWidth`
- Boolean props: Prefix with `is`, `has`, `should`, `can`
- Event handlers: Prefix with `on`

**Hooks:**
- camelCase: `useAuth`, `useCatalog`, `useNotification`
- Prefix with `use`
- Return object (not array) for multiple values

```jsx
// ✅ Good - Clear naming
const { user, login, logout } = useAuth();

// ❌ Bad - Array return (unclear order)
const [user, login, logout] = useAuth();
```

---

### Props Guidelines

**Required vs Optional:**
```typescript
interface ComponentProps {
  // Required props (no default)
  id: string;
  onClick: () => void;

  // Optional props (has default or nullable)
  variant?: 'primary' | 'secondary';
  className?: string;
  children?: React.ReactNode;
}
```

**Callback Props:**
```typescript
// ✅ Good - Named function signature
interface ItemCardProps {
  onQuantityChange: (itemId: string, quantity: number) => void;
}

// ❌ Bad - Generic callback
interface ItemCardProps {
  onChange: (data: any) => void;
}
```

**Boolean Props:**
```typescript
// ✅ Good - Clear intent
<Button disabled={true} loading={false} fullWidth />

// ❌ Bad - Unclear
<Button state="disabled" width="full" />
```

---

### Composition Patterns

**Compound Components:**
```jsx
// ✅ Good - Flexible composition
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

// ❌ Bad - Rigid props
<Card
  header="Title"
  body="Content"
  footer="Actions"
/>
```

**Render Props (when appropriate):**
```jsx
<ItemList
  items={items}
  renderItem={(item) => (
    <CustomItemCard item={item} />
  )}
  renderEmpty={() => (
    <CustomEmptyState />
  )}
/>
```

---

### TypeScript (Future)

**Gradually adopt TypeScript for shared packages:**

**Priority:**
1. `@localloops/ui` → TypeScript (base layer, stable API)
2. `@localloops/identity` → TypeScript (auth is critical)
3. `@localloops/catalog` → TypeScript
4. `@localloops/events` → TypeScript

**Apps:** Keep JavaScript for now (faster iteration)

**Example:**
```typescript
// Button.tsx
import React from 'react';

export interface ButtonProps {
  variant: 'primary' | 'secondary' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  onClick,
  children,
  className = ''
}) => {
  // Implementation...
};
```

---

## Migration Strategy

### Phase 1: Create Base Packages (Week 1-2)

**Goal:** Set up package structure, migrate low-risk components

**Tasks:**
1. Create `@localloops/ui` package
2. Move generic components from Minibag:
   - `Button` (extract from inline JSX)
   - `Input` (extract from inline JSX)
   - `Card` (extract from inline JSX)
   - `LanguageSwitcher` (already exists in Minibag)
   - `LoadingSpinner` (create from inline spinners)
   - `EmptyState` (create from inline patterns)

3. Set up package build tooling (Vite library mode)
4. Configure monorepo linking (npm workspaces or similar)

**Validation:**
- Minibag imports from `@localloops/ui` instead of local components
- Bundle size remains < 192KB gzipped
- No visual regressions

---

### Phase 2: Identity Layer (Week 3)

**Goal:** Extract identity components and auth logic

**Tasks:**
1. Create `@localloops/identity` package
2. Move from Minibag:
   - `UserIdentity` component (packages/minibag/src/components/UserIdentity.jsx)
   - Create `NicknameSelector` component (new)
   - Create `AuthProvider` context (new)
   - Extract `useAuth` hook (consolidate localStorage logic)

3. Update Minibag to consume `@localloops/identity`

**Validation:**
- UserIdentity displays correctly in all Minibag screens
- Nickname selection works in session creation
- No changes to user-facing behavior

---

### Phase 3: Catalog Layer (Week 4)

**Goal:** Extract catalog components and data fetching

**Tasks:**
1. Create `@localloops/catalog` package
2. Move from Minibag:
   - `CategoryButton` (packages/minibag/src/components/performance/CategoryButton.jsx)
   - `ItemCard` (packages/minibag/src/components/performance/ItemCard.jsx)
   - `ItemList` (create from patterns in ShoppingScreen)
   - `useCatalog` hook (packages/minibag/src/hooks/useCatalog.js)
   - Catalog API client (packages/minibag/src/services/api.js - catalog methods)

3. Create `CatalogProvider` context
4. Update Minibag to consume `@localloops/catalog`

**Validation:**
- Catalog loads correctly in all languages
- Search works as before
- Item selection and quantity changes work
- Bundle size impact < 20KB

---

### Phase 4: Events Layer (Month 2)

**Goal:** Extract real-time and notification systems

**Tasks:**
1. Create `@localloops/events` package
2. Extract from Minibag:
   - Socket client (packages/minibag/src/services/socket.js)
   - Create `SocketProvider` context
   - Create `NotificationProvider` context (implement from FEATURE_IMPLEMENTATION_PLAN.md)
   - Create `NotificationToast` component
   - Extract `useSocket` hook
   - Create `useNotification` hook

3. Update Minibag to consume `@localloops/events`

**Validation:**
- Real-time sync works in sessions
- Notifications display correctly
- WebSocket reconnection works
- No performance degradation

---

### Phase 5: StreetHawk Foundation (Month 3)

**Goal:** Build StreetHawk using shared packages

**Tasks:**
1. Create StreetHawk app structure
2. Import all shared packages:
   - `@localloops/ui`
   - `@localloops/identity`
   - `@localloops/catalog`
   - `@localloops/events`

3. Build StreetHawk-specific features on top
4. Identify any missing shared components and add to packages

**Validation:**
- StreetHawk bundle size < 250KB gzipped
- Design consistency with Minibag (same components)
- Shared packages work across both apps

---

### Extraction Checklist (Per Component)

When moving a component from Minibag to shared package:

**Pre-Migration:**
- [ ] Component is stable (no planned major changes)
- [ ] Component is used in 2+ places OR will be used by other apps
- [ ] Component has no app-specific logic (Minibag-specific)

**During Migration:**
- [ ] Create component in shared package
- [ ] Add prop types (TypeScript interfaces or PropTypes)
- [ ] Write JSDoc comments
- [ ] Add usage example in README
- [ ] Export from package index

**Post-Migration:**
- [ ] Update Minibag imports
- [ ] Test in all affected screens
- [ ] Verify bundle size impact
- [ ] Update documentation

**Rollback Plan:**
- Keep old component file for 1 sprint
- If issues found, revert import, fix in shared package, re-migrate

---

## Bundle Optimization

### Target Sizes

| Package | Target Size (gzipped) | Current Est. |
|---------|----------------------|--------------|
| `@localloops/ui` | < 30KB | ~25KB |
| `@localloops/identity` | < 15KB | ~10KB |
| `@localloops/catalog` | < 20KB | ~15KB |
| `@localloops/events` | < 20KB (incl. socket.io) | ~18KB |
| **Total Shared** | **< 85KB** | **~68KB** |
| **Minibag (incl. shared)** | **< 250KB** | **~192KB + 68KB** |

---

### Tree-Shaking

**Configure Vite for Tree-Shaking:**

```javascript
// packages/@localloops/ui/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: './src/index.js',
      name: 'LocalLoopsUI',
      formats: ['es', 'cjs'], // ES modules for tree-shaking
      fileName: (format) => `index.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom'], // Don't bundle React
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
});
```

**Named Exports (Required for Tree-Shaking):**
```javascript
// ✅ Good - Named exports (tree-shakeable)
export { Button } from './components/Button';
export { Input } from './components/Input';
export { Card } from './components/Card';

// ❌ Bad - Default export (not tree-shakeable)
export default {
  Button,
  Input,
  Card
};
```

**Usage:**
```javascript
// ✅ Good - Import only what you need
import { Button, Input } from '@localloops/ui';

// ❌ Bad - Import entire package
import * as UI from '@localloops/ui';
```

---

### Code Splitting

**Lazy Load Heavy Components:**
```javascript
// ✅ Good - Lazy load chart components
const AdminDashboard = lazy(() => import('./screens/AdminDashboard'));

// In component
<Suspense fallback={<LoadingSpinner />}>
  <AdminDashboard />
</Suspense>
```

**Split Vendor Chunks:**
```javascript
// Minibag vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-i18n': ['i18next', 'react-i18next'],
          'vendor-socket': ['socket.io-client'],
          // Shared packages
          'shared-ui': ['@localloops/ui'],
          'shared-identity': ['@localloops/identity'],
          'shared-catalog': ['@localloops/catalog'],
          'shared-events': ['@localloops/events']
        }
      }
    }
  }
};
```

---

### Performance Monitoring

**Bundle Size Tracking:**
```bash
# Add to package.json scripts
"size": "vite build && npx vite-bundle-visualizer"
"size:check": "bundlesize"
```

**Bundle Size Budget (.bundlesizerc.json):**
```json
{
  "files": [
    {
      "path": "packages/minibag/dist/assets/index-*.js",
      "maxSize": "150 KB"
    },
    {
      "path": "packages/@localloops/ui/dist/*.js",
      "maxSize": "30 KB"
    }
  ]
}
```

**CI/CD Check:**
- Fail PR if bundle size exceeds budget
- Show size diff in PR comments

---

## Development Workflow

### Local Development Setup

**1. Install Dependencies:**
```bash
# Install all packages (monorepo)
npm install

# Link local packages
npm run link-packages
```

**2. Start Dev Servers:**
```bash
# Terminal 1: Backend
cd packages/shared
npm run dev

# Terminal 2: Minibag (watches shared packages)
cd packages/minibag
npm run dev

# Terminal 3: Shared package in watch mode (if editing)
cd packages/@localloops/ui
npm run dev
```

**3. Testing Changes:**
- Edit component in `@localloops/ui/src/components/Button.jsx`
- Minibag hot-reloads automatically (Vite watches node_modules)
- See changes immediately in Minibag

---

### Publishing Packages (Future)

**npm Organization:** `@localloops`

**Versioning:** Semantic Versioning (semver)
- Patch: Bug fixes (1.0.0 → 1.0.1)
- Minor: New features, backward compatible (1.0.0 → 1.1.0)
- Major: Breaking changes (1.0.0 → 2.0.0)

**Publishing Workflow:**
```bash
# 1. Update version
cd packages/@localloops/ui
npm version patch # or minor, major

# 2. Build package
npm run build

# 3. Publish to npm
npm publish --access public

# 4. Update dependent packages
cd packages/minibag
npm install @localloops/ui@latest
```

**Automated Publishing (Future):**
- Use Changesets or Lerna for monorepo publishing
- CI/CD auto-publishes on merge to main

---

### Documentation

**Component README Template:**

```markdown
# @localloops/ui

Shared UI components for LocalLoops apps.

## Installation

\`\`\`bash
npm install @localloops/ui
\`\`\`

## Components

### Button

Primary action button.

**Usage:**
\`\`\`jsx
import { Button } from '@localloops/ui';

<Button variant="primary" onClick={handleClick}>
  Click me
</Button>
\`\`\`

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| variant | 'primary' \| 'secondary' \| 'destructive' | 'primary' | Visual style |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Button size |
| fullWidth | boolean | false | Full width button |
| onClick | () => void | - | Click handler |

**Examples:**
\`\`\`jsx
// Primary button
<Button variant="primary">Save</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Full width
<Button fullWidth>Create List</Button>
\`\`\`
```

**Storybook (Future):**
- Interactive component documentation
- Visual testing
- Design system showcase

---

## Testing Standards

### Unit Tests

**Test Coverage Target:** 80%+ for shared packages

**Testing Library:** React Testing Library

**Example:**
```javascript
// Button.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByText('Click')).toBeDisabled();
  });
});
```

---

### Visual Regression Tests (Future)

**Tool:** Chromatic or Percy

**Workflow:**
1. Take screenshots of components in all states
2. Compare with baseline on every PR
3. Approve or reject visual changes

**Coverage:**
- All component variants
- All sizes
- Responsive breakpoints
- Dark mode (future)

---

### Accessibility Tests

**Tool:** jest-axe or axe-core

**Example:**
```javascript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';

expect.extend(toHaveNoViolations);

it('should have no accessibility violations', async () => {
  const { container } = render(<Button>Click</Button>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Manual Testing:**
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Color contrast meets WCAG AA
- [ ] Touch targets are 44x44px minimum

---

## FAQ

**Q: When should I create a shared component vs keep it in Minibag?**

A: Create a shared component if:
- It's used in 2+ places in Minibag, OR
- It will be used by other apps (StreetHawk, etc.), OR
- It represents a core design pattern (buttons, inputs, cards)

Keep it in Minibag if:
- It's highly specific to Minibag flows (e.g., PaymentSplitScreen)
- It's still changing frequently (not stable)

**Q: How do I handle app-specific styling?**

A: Use the `className` prop to override styles:
```jsx
<Button className="bg-purple-500 hover:bg-purple-600">
  StreetHawk Action
</Button>
```

**Q: Can I override shared component behavior?**

A: Yes, via props:
```jsx
// Override default button behavior
<Button
  onClick={(e) => {
    e.preventDefault();
    // Custom logic
    handleCustomClick();
  }}
>
  Custom Action
</Button>
```

**Q: How do I test changes to shared packages locally?**

A: Use npm link or workspace linking:
```bash
# In shared package
cd packages/@localloops/ui
npm link

# In Minibag
cd packages/minibag
npm link @localloops/ui

# Changes to @localloops/ui will reflect in Minibag immediately
```

---

## Related Documents

- [LocalLoops Design System](./LOCALLOOPS_DESIGN_SYSTEM.md)
- [Core Infrastructure API Specification](./CORE_API_SPECIFICATION.md)
- [Core Data Models](./CORE_DATA_MODELS.md)

---

**Maintained by:** LocalLoops Core Team
**Questions?** Open an issue in the repository
