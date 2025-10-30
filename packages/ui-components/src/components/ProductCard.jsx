import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * ProductCard Component
 *
 * Flexible product card - highly customizable via props
 * Products can override entire sections using children prop
 *
 * @param {Component} icon - Lucide icon component
 * @param {string} name - Product name
 * @param {string} tagline - Product tagline
 * @param {string} description - Product description
 * @param {Array<string>} features - Feature list
 * @param {string} status - 'Live' | 'Coming Soon'
 * @param {string} link - URL to product landing
 * @param {string} color - Primary color (Tailwind class, e.g., 'bg-green-600')
 * @param {string} hoverColor - Hover color (Tailwind class)
 * @param {string} className - Additional CSS classes
 * @param {ReactNode} children - Custom content (overrides default layout)
 */
export function ProductCard({
  icon: Icon,
  name,
  tagline,
  description,
  features = [],
  status,
  link,
  color = 'bg-gray-600',
  hoverColor = 'hover:bg-gray-700',
  className = '',
  children,
}) {
  const isLive = status === 'Live';

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 transition-all ${
        isLive ? 'hover:shadow-xl hover:scale-105' : 'opacity-75'
      } ${className}`}
    >
      {children || (
        <>
          {/* Header: Icon & Status */}
          <div className="flex items-start justify-between mb-6">
            <div
              className={`w-16 h-16 rounded-2xl ${color} flex items-center justify-center shadow-md`}
            >
              <Icon size={32} className="text-white" strokeWidth={2.5} />
            </div>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                isLive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {status}
            </span>
          </div>

          {/* Content */}
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{name}</h3>
          {tagline && <p className="text-sm text-gray-600 mb-4">{tagline}</p>}
          {description && (
            <p className="text-base text-gray-700 mb-6">{description}</p>
          )}

          {/* Features */}
          {features.length > 0 && (
            <ul className="space-y-2 mb-6">
              {features.map((feature, idx) => (
                <li
                  key={idx}
                  className="flex items-center gap-2 text-sm text-gray-600"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                  {feature}
                </li>
              ))}
            </ul>
          )}

          {/* CTA Button */}
          {isLive && link ? (
            <a
              href={link}
              className={`inline-flex items-center gap-2 w-full justify-center px-6 py-3 ${color} ${hoverColor} text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all`}
            >
              Try {name}
              <ArrowRight size={18} strokeWidth={2.5} />
            </a>
          ) : (
            <button
              disabled
              className="w-full px-6 py-3 bg-gray-300 text-gray-500 font-semibold rounded-xl cursor-not-allowed"
            >
              Coming Soon
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default ProductCard;
