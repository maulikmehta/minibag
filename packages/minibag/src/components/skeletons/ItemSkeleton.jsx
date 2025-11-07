/**
 * Item Skeleton Component
 *
 * Loading placeholder for catalog items and participant items
 * Week 2 Day 6: Better perceived performance with skeleton screens
 */

import React from 'react';
import { SkeletonBase, SkeletonCircle } from './SkeletonBase.jsx';

/**
 * Skeleton for a single item in the catalog or shopping list
 */
export function ItemSkeleton({ showQuantity = true, className = '' }) {
  return (
    <div className={`flex items-center gap-3 py-3 px-4 ${className}`}>
      {/* Emoji/Icon placeholder */}
      <SkeletonCircle size="10" />

      {/* Item details */}
      <div className="flex-1 space-y-2">
        <SkeletonBase height="4" width="w-3/4" />
        <SkeletonBase height="3" width="w-1/2" />
      </div>

      {/* Quantity controls placeholder */}
      {showQuantity && (
        <div className="flex items-center gap-2">
          <SkeletonCircle size="8" />
          <SkeletonBase height="6" width="w-12" />
          <SkeletonCircle size="8" />
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton for item list
 */
export function ItemListSkeleton({ count = 5, showQuantity = true }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, index) => (
        <ItemSkeleton key={index} showQuantity={showQuantity} />
      ))}
    </div>
  );
}

/**
 * Skeleton for category section with items
 */
export function CategorySkeleton() {
  return (
    <div className="mb-6">
      {/* Category header */}
      <div className="flex items-center gap-2 mb-3 px-4">
        <SkeletonCircle size="6" />
        <SkeletonBase height="5" width="w-32" />
      </div>

      {/* Category items */}
      <ItemListSkeleton count={3} />
    </div>
  );
}

export default ItemSkeleton;
