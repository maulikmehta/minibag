import React from 'react';
import { extractFirstName } from '../utils/sessionTransformers.js';

/**
 * UserIdentity Component
 *
 * Displays user identity in the consistent "RealName @ Nickname" format
 * with distinctive styling throughout the app.
 *
 * @param {string} realName - User's real name (e.g., "Maulik Patel")
 * @param {string} nickname - User's nickname/alias (e.g., "Dev")
 * @param {boolean} useFirstNameOnly - If true, shows only first name instead of full name (default: true)
 * @param {string} className - Additional CSS classes
 */
export default function UserIdentity({
  realName,
  nickname,
  useFirstNameOnly = true,
  className = ''
}) {
  // If no real name, just show nickname
  if (!realName) {
    return <span className={className}>{nickname || 'User'}</span>;
  }

  const displayName = useFirstNameOnly ? extractFirstName(realName) : realName;

  return (
    <span className={className}>
      <span className="font-bold text-gray-900">{displayName}</span>
      <span className="text-gray-600 mx-1">@</span>
      <span className="font-medium text-gray-700">{nickname}</span>
    </span>
  );
}
