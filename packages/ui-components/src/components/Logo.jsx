import React from 'react';

/**
 * Logo Component
 *
 * Flexible logo wrapper - product controls icon, colors, and styling
 *
 * @param {Component} icon - Lucide icon component (e.g., ShoppingBag, MapPin)
 * @param {string} name - Product/platform name
 * @param {string} tagline - Optional tagline
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} variant - Layout: 'default' | 'compact' | 'icon-only'
 * @param {string} iconColor - Icon background color (Tailwind class)
 * @param {string} iconSize - Icon size override
 * @param {string} className - Additional CSS classes
 */
export function Logo({
  icon: Icon,
  name,
  tagline,
  size = 'md',
  variant = 'default',
  iconColor = 'bg-gray-900',
  iconSize,
  className = '',
}) {
  // Size mappings
  const sizeConfig = {
    sm: {
      wrapper: 'w-8 h-8 rounded-lg',
      icon: 20,
      text: 'text-lg',
      tagline: 'text-xs',
    },
    md: {
      wrapper: 'w-10 h-10 rounded-xl',
      icon: 24,
      text: 'text-2xl',
      tagline: 'text-xs',
    },
    lg: {
      wrapper: 'w-12 h-12 rounded-xl',
      icon: 28,
      text: 'text-3xl',
      tagline: 'text-sm',
    },
    xl: {
      wrapper: 'w-16 h-16 rounded-2xl',
      icon: 32,
      text: 'text-4xl',
      tagline: 'text-base',
    },
  };

  const config = sizeConfig[size] || sizeConfig.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <div
        className={`${config.wrapper} ${iconColor} flex items-center justify-center shadow-lg`}
      >
        <Icon
          size={iconSize || config.icon}
          className="text-white"
          strokeWidth={2.5}
        />
      </div>

      {/* Text */}
      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <span className={`${config.text} font-bold text-gray-900`}>
            {name}
          </span>
          {variant === 'default' && tagline && (
            <p className={`${config.tagline} text-gray-600`}>{tagline}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Logo;
