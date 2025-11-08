import React from 'react';

export default function LocalLoopsIcon({ size = 24, className = '' }) {
  return (
    <img
      src="/localloops-logo.png"
      alt="LocalLoops"
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, objectFit: 'contain' }}
    />
  );
}
