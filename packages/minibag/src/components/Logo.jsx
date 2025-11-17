import React from 'react';
import MinibagIcon from './MinibagIcon';

export default function Logo({ size = 'md', showText = true, name = 'Minibag' }) {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 64, text: 'text-3xl' },
    lg: { icon: 64, text: 'text-4xl' }
  };

  const config = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <MinibagIcon size={config.icon} />
      {showText && (
        <span className={`${config.text} font-semibold text-gray-900`}>
          {name}
        </span>
      )}
    </div>
  );
}
