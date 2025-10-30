import React from 'react';

/**
 * Footer Component
 *
 * Flexible footer - products control content and links
 * Can be used for both platform and product footers
 *
 * @param {ReactNode} children - Custom footer content
 * @param {string} className - Additional CSS classes
 * @param {string} variant - 'simple' | 'detailed'
 */
export function Footer({ children, className = '', variant = 'simple' }) {
  return (
    <footer className={`border-t border-gray-200 bg-gray-50 ${className}`}>
      {children}
    </footer>
  );
}

/**
 * FooterContent - Default content wrapper
 */
export function FooterContent({ children, className = '' }) {
  return (
    <div className={`max-w-7xl mx-auto px-6 py-8 ${className}`}>{children}</div>
  );
}

/**
 * FooterRow - Simple row with flex layout
 */
export function FooterRow({
  children,
  className = '',
  align = 'between', // 'between' | 'center' | 'start' | 'end'
}) {
  const alignMap = {
    between: 'justify-between',
    center: 'justify-center',
    start: 'justify-start',
    end: 'justify-end',
  };

  return (
    <div
      className={`flex flex-col md:flex-row items-center ${alignMap[align]} gap-4 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * FooterLink - Styled link
 */
export function FooterLink({ href, children, className = '' }) {
  return (
    <a
      href={href}
      className={`text-sm text-gray-600 hover:text-gray-900 transition-colors ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * FooterText - Styled text
 */
export function FooterText({ children, className = '', size = 'sm' }) {
  const sizeMap = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
  };

  return (
    <div className={`${sizeMap[size]} text-gray-600 ${className}`}>
      {children}
    </div>
  );
}

/**
 * FooterGrid - Grid layout for links
 */
export function FooterGrid({ children, className = '' }) {
  return (
    <div className={`grid md:grid-cols-4 gap-8 ${className}`}>{children}</div>
  );
}

/**
 * FooterSection - Section with heading
 */
export function FooterSection({ title, children, className = '' }) {
  return (
    <div className={className}>
      {title && (
        <h4 className="font-semibold text-gray-900 mb-3">{title}</h4>
      )}
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}

export default Footer;
