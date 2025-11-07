/**
 * Bill Skeleton Component
 *
 * Loading placeholder for bill and payment screens
 * Week 2 Day 6: Better perceived performance with skeleton screens
 */

import React from 'react';
import { SkeletonBase, SkeletonCircle } from './SkeletonBase.jsx';

/**
 * Skeleton for a single bill item
 */
export function BillItemSkeleton({ className = '' }) {
  return (
    <div className={`flex items-start gap-3 p-4 bg-white border-b border-gray-100 ${className}`}>
      {/* Item icon */}
      <SkeletonCircle size="10" />

      {/* Item details */}
      <div className="flex-1 space-y-2">
        <div className="flex items-center justify-between">
          <SkeletonBase height="5" width="w-32" />
          <SkeletonBase height="5" width="w-16" />
        </div>
        <SkeletonBase height="3" width="w-48" />

        {/* Participant contributions */}
        <div className="space-y-1 mt-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <SkeletonBase height="3" width="w-24" />
              <SkeletonBase height="3" width="w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for bill list
 */
export function BillListSkeleton({ count = 5 }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: count }).map((_, index) => (
        <BillItemSkeleton key={index} />
      ))}
    </div>
  );
}

/**
 * Skeleton for bill summary card
 */
export function BillSummarySkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
      <SkeletonBase height="5" width="w-32" className="mb-3" />

      {/* Summary rows */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <SkeletonBase height="4" width="w-24" />
          <SkeletonBase height="4" width="w-16" />
        </div>
      ))}

      {/* Total */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <SkeletonBase height="6" width="w-20" />
          <SkeletonBase height="6" width="w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for participant payment row
 */
export function ParticipantPaymentSkeleton({ className = '' }) {
  return (
    <div className={`flex items-center justify-between p-4 bg-gray-50 rounded-lg ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonCircle size="10" />
        <div className="space-y-2">
          <SkeletonBase height="4" width="w-24" />
          <SkeletonBase height="3" width="w-32" />
        </div>
      </div>
      <SkeletonBase height="8" width="w-20" className="rounded-lg" />
    </div>
  );
}

/**
 * Skeleton for full bill screen
 */
export function BillScreenSkeleton() {
  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <SkeletonBase height="6" width="w-32" className="mb-2" />
        <SkeletonBase height="3" width="w-48" />
      </div>

      {/* Bill summary */}
      <div className="p-4">
        <BillSummarySkeleton />
      </div>

      {/* Bill items */}
      <div className="bg-white">
        <div className="p-4 border-b border-gray-200">
          <SkeletonBase height="5" width="w-24" />
        </div>
        <BillListSkeleton count={4} />
      </div>

      {/* Participant payments */}
      <div className="p-4 space-y-3">
        <SkeletonBase height="5" width="w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <ParticipantPaymentSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default BillItemSkeleton;
