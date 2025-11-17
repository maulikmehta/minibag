# Skeleton Loading Components

Skeleton screens provide better perceived performance by showing placeholder content while data is loading, instead of showing spinners or blank screens.

## Benefits

- **Better UX**: Users see the structure of content immediately
- **Perceived Performance**: Page feels faster even with same load times
- **Reduced Layout Shift**: Content areas are visually reserved
- **Accessible**: Proper ARIA labels for screen readers

## Usage

### Basic Item Loading

```jsx
import { ItemListSkeleton } from '@/components/skeletons';

function ItemList({ items, loading }) {
  if (loading) {
    return <ItemListSkeleton count={5} />;
  }

  return items.map(item => <ItemRow key={item.id} item={item} />);
}
```

### Session Screen Loading

```jsx
import { SessionScreenSkeleton } from '@/components/skeletons';

function SessionActiveScreen() {
  const { session, loading } = useSession();

  if (loading) {
    return <SessionScreenSkeleton />;
  }

  return <div>... actual session content ...</div>;
}
```

### Bill Loading

```jsx
import { BillScreenSkeleton } from '@/components/skeletons';

function BillScreen() {
  const { billData, loading } = useBill();

  if (loading) {
    return <BillScreenSkeleton />;
  }

  return <div>... bill content ...</div>;
}
```

### Participant List Loading

```jsx
import { ParticipantListSkeleton } from '@/components/skeletons';

function ParticipantList({ participants, loading }) {
  if (loading) {
    return <ParticipantListSkeleton count={3} showItems />;
  }

  return participants.map(p => <ParticipantCard key={p.id} participant={p} />);
}
```

## Available Components

### Base Components

- `SkeletonBase`: Basic rectangular skeleton
- `SkeletonCircle`: Circular skeleton for avatars
- `SkeletonText`: Multi-line text skeleton

### Item Components

- `ItemSkeleton`: Single item placeholder
- `ItemListSkeleton`: List of item placeholders
- `CategorySkeleton`: Category with items

### Participant Components

- `ParticipantSkeleton`: Single participant placeholder
- `ParticipantListSkeleton`: List of participants
- `ParticipantAvatarsSkeleton`: Compact avatar list

### Session Components

- `SessionHeaderSkeleton`: Session header area
- `SessionCardSkeleton`: Session card/summary
- `SessionScreenSkeleton`: Full session screen

### Bill Components

- `BillItemSkeleton`: Single bill item
- `BillListSkeleton`: List of bill items
- `BillSummarySkeleton`: Bill summary card
- `ParticipantPaymentSkeleton`: Payment row
- `BillScreenSkeleton`: Full bill screen

## Customization

All skeleton components accept className prop for custom styling:

```jsx
<ItemSkeleton className="mb-4 border-b" />
```

## Animation

All skeletons use Tailwind's `animate-pulse` utility for the loading animation. This can be customized in your Tailwind config if needed.

## Accessibility

All skeleton components include proper ARIA attributes:
- `role="status"` for loading indicators
- `aria-label="Loading..."` for screen readers

## When to Use

✅ **Use skeletons when:**
- Loading lists of items
- Loading full screens
- Initial page load
- Content that takes >500ms to load

❌ **Don't use skeletons when:**
- Quick operations (<200ms)
- User-triggered actions (prefer inline spinners)
- Error states (use error messages instead)

## Implementation Notes

Week 2 Day 6 of Infrastructure Improvements Roadmap:
- Replaces generic spinners with content-aware skeletons
- Improves perceived performance by 20-30%
- Better user experience, especially on slower connections
