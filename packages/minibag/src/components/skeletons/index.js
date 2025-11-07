/**
 * Skeleton Components Index
 *
 * Centralized exports for all skeleton loading components
 * Week 2 Day 6: Testing Infrastructure + Loading Skeletons
 *
 * Usage:
 * import { ItemSkeleton, ParticipantListSkeleton, BillScreenSkeleton } from '@/components/skeletons';
 */

// Base skeleton components
export {
  SkeletonBase,
  SkeletonCircle,
  SkeletonText,
} from './SkeletonBase.jsx';

// Item skeletons
export {
  ItemSkeleton,
  ItemListSkeleton,
  CategorySkeleton,
} from './ItemSkeleton.jsx';

// Participant skeletons
export {
  ParticipantSkeleton,
  ParticipantListSkeleton,
  ParticipantAvatarsSkeleton,
} from './ParticipantSkeleton.jsx';

// Session skeletons
export {
  SessionHeaderSkeleton,
  SessionCardSkeleton,
  SessionScreenSkeleton,
} from './SessionSkeleton.jsx';

// Bill skeletons
export {
  BillItemSkeleton,
  BillListSkeleton,
  BillSummarySkeleton,
  ParticipantPaymentSkeleton,
  BillScreenSkeleton,
} from './BillSkeleton.jsx';
