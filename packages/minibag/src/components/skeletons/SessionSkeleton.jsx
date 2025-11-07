/**
 * Session Skeleton Component
 *
 * Loading placeholder for session details and screens
 * Week 2 Day 6: Better perceived performance with skeleton screens
 */

import React from 'react';
import { SkeletonBase, SkeletonCircle } from './SkeletonBase.jsx';
import { ParticipantAvatarsSkeleton } from './ParticipantSkeleton.jsx';

/**
 * Skeleton for session header
 */
export function SessionHeaderSkeleton() {
  return (
    <div className="bg-white p-4 border-b border-gray-200">
      {/* Session ID and status */}
      <div className="flex items-center justify-between mb-3">
        <SkeletonBase height="6" width="w-24" />
        <SkeletonBase height="6" width="w-20" className="rounded-full" />
      </div>

      {/* Host info */}
      <div className="flex items-center gap-2 mb-3">
        <SkeletonCircle size="8" />
        <SkeletonBase height="4" width="w-32" />
      </div>

      {/* Participants */}
      <div className="flex items-center gap-3">
        <SkeletonBase height="3" width="w-24" />
        <ParticipantAvatarsSkeleton count={3} />
      </div>
    </div>
  );
}

/**
 * Skeleton for session details card
 */
export function SessionCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBase height="5" width="w-32" />
        <SkeletonCircle size="6" />
      </div>
      <SkeletonBase height="3" width="w-48" />
      <SkeletonBase height="3" width="w-40" />
      <div className="pt-2 border-t border-gray-100">
        <SkeletonBase height="10" width="w-full" className="rounded-lg" />
      </div>
    </div>
  );
}

/**
 * Skeleton for full session screen
 */
export function SessionScreenSkeleton() {
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      <SessionHeaderSkeleton />

      {/* Content area */}
      <div className="p-4 space-y-4">
        {/* Stats or info cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <SkeletonBase height="3" width="w-16" />
            <SkeletonBase height="6" width="w-12" />
          </div>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <SkeletonBase height="3" width="w-20" />
            <SkeletonBase height="6" width="w-16" />
          </div>
        </div>

        {/* Main content sections */}
        <div className="space-y-3">
          <SkeletonBase height="5" width="w-32" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <SkeletonCircle size="10" />
                <div className="flex-1 space-y-2">
                  <SkeletonBase height="4" width="w-3/4" />
                  <SkeletonBase height="3" width="w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SessionHeaderSkeleton;
