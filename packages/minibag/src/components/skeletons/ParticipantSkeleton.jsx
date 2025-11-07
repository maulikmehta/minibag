/**
 * Participant Skeleton Component
 *
 * Loading placeholder for participant lists and avatars
 * Week 2 Day 6: Better perceived performance with skeleton screens
 */

import React from 'react';
import { SkeletonBase, SkeletonCircle } from './SkeletonBase.jsx';

/**
 * Skeleton for a single participant item
 */
export function ParticipantSkeleton({ showItems = false, className = '' }) {
  return (
    <div className={`flex items-center gap-3 p-4 bg-white rounded-lg ${className}`}>
      {/* Avatar placeholder */}
      <SkeletonCircle size="12" />

      {/* Participant info */}
      <div className="flex-1 space-y-2">
        <SkeletonBase height="5" width="w-32" />
        {showItems && <SkeletonBase height="3" width="w-48" />}
      </div>

      {/* Status or action placeholder */}
      <SkeletonBase height="6" width="w-16" />
    </div>
  );
}

/**
 * Skeleton for participant list
 */
export function ParticipantListSkeleton({ count = 3, showItems = false }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <ParticipantSkeleton key={index} showItems={showItems} />
      ))}
    </div>
  );
}

/**
 * Skeleton for compact participant avatars (e.g., in header)
 */
export function ParticipantAvatarsSkeleton({ count = 4 }) {
  return (
    <div className="flex -space-x-2">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCircle
          key={index}
          size="10"
          className="border-2 border-white"
        />
      ))}
    </div>
  );
}

export default ParticipantSkeleton;
