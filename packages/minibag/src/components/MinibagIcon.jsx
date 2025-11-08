import React from 'react';

export default function MinibagIcon({ size = 24, className = '' }) {
  return (
    <img
      src="/minibag-logo.png"
      alt="Minibag"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
