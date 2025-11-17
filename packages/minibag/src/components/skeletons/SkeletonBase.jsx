/**
 * Base Skeleton Component
 *
 * Provides the basic animated skeleton for loading states
 * Week 2 Day 6: Loading skeletons for better perceived performance
 */

import React from 'react';

/**
 * Base skeleton element with pulse animation
 */
export function SkeletonBase({ className = '', width = 'full', height = '4' }) {
  const widthClass = width === 'full' ? 'w-full' : width.includes('w-') ? width : `w-${width}`;
  const heightClass = height.includes('h-') ? height : `h-${height}`;

  return (
    <div
      className={`bg-gray-200 rounded animate-pulse ${widthClass} ${heightClass} ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
}

/**
 * Circle skeleton for avatars
 */
export function SkeletonCircle({ size = 10, className = '' }) {
  const sizeClass = typeof size === 'number' ? `w-${size} h-${size}` : size;

  return (
    <div
      className={`bg-gray-200 rounded-full animate-pulse ${sizeClass} ${className}`}
      role="status"
      aria-label="Loading..."
    />
  );
}

/**
 * Text skeleton with natural line variation
 */
export function SkeletonText({ lines = 1, className = '' }) {
  const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-9/12', 'w-full'];

  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <SkeletonBase
          key={index}
          width={index === lines - 1 && lines > 1 ? 'w-3/4' : widths[index % widths.length]}
          height="3"
        />
      ))}
    </div>
  );
}

export default SkeletonBase;
