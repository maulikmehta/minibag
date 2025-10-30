import React from 'react';
import { MapPin } from 'lucide-react';

export default function Logo({ size = 'md', showText = true }) {
  const sizes = {
    sm: { box: 'w-8 h-8', icon: 16, text: 'text-lg' },
    md: { box: 'w-12 h-12', icon: 24, text: 'text-3xl' },
    lg: { box: 'w-16 h-16', icon: 32, text: 'text-4xl' }
  };

  const config = sizes[size];

  return (
    <div className="flex items-center gap-3">
      <div className={`${config.box} rounded-lg bg-gray-900 flex items-center justify-center shadow-md`}>
        <MapPin size={config.icon} className="text-white" strokeWidth={2.5} />
      </div>
      {showText && (
        <span className={`${config.text} font-semibold text-gray-900`}>
          LocalLoops
        </span>
      )}
    </div>
  );
}
