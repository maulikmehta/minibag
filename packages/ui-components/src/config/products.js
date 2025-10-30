/**
 * Product Registry - Metadata Only
 *
 * This file contains product definitions (names, routes, colors)
 * but does NOT enforce styling. Products control their own design.
 */

export const PLATFORM = {
  id: 'localloops',
  name: 'LocalLoops',
  tagline: 'Micro-coordination for neighborhoods',
  description: 'Digital infrastructure for neighborhood coordination',
  icon: 'MapPin', // string reference - product imports actual icon
  colors: {
    primary: '#111827',    // gray-900
    secondary: '#6b7280',  // gray-500
    accent: '#374151',     // gray-700
    background: '#f9fafb', // gray-50
  },
  routes: {
    home: '/',
    admin: '/admin',
  },
};

export const PRODUCTS = {
  minibag: {
    id: 'minibag',
    name: 'Minibag',
    tagline: 'Track your shopping, split with neighbors',
    description: 'Simple shopping lists for Indian neighborhoods',
    icon: 'ShoppingBag',
    colors: {
      primary: '#22c55e',   // green-600
      hover: '#16a34a',     // green-700
      light: '#dcfce7',     // green-100
      background: '#f0fdf4', // green-50
    },
    features: [
      'Vegetable shopping',
      'Cost splitting',
      'WhatsApp bills',
    ],
    routes: {
      landing: '/minibag',
      app: '/app',
    },
    status: 'Live',
  },

  partybag: {
    id: 'partybag',
    name: 'Partybag',
    tagline: 'Organize parties, share expenses',
    description: 'Group event planning made easy',
    icon: 'PartyPopper',
    colors: {
      primary: '#9333ea',   // purple-600
      hover: '#7c3aed',     // purple-700
      light: '#f3e8ff',     // purple-100
      background: '#faf5ff', // purple-50
    },
    features: [
      'Event planning',
      'Guest management',
      'Cost sharing',
    ],
    routes: {
      landing: '/partybag',
      app: '/partybag/app',
    },
    status: 'Coming Soon',
  },

  fitbag: {
    id: 'fitbag',
    name: 'Fitbag',
    tagline: 'Stay fit with friends',
    description: 'Group fitness tracking',
    icon: 'Heart',
    colors: {
      primary: '#dc2626',   // red-600
      hover: '#b91c1c',     // red-700
      light: '#fee2e2',     // red-100
      background: '#fef2f2', // red-50
    },
    features: [
      'Activity tracking',
      'Group challenges',
      'Progress sharing',
    ],
    routes: {
      landing: '/fitbag',
      app: '/fitbag/app',
    },
    status: 'Coming Soon',
  },
};

/**
 * Get product by ID
 */
export function getProduct(productId) {
  return PRODUCTS[productId] || null;
}

/**
 * Get all products as array
 */
export function getAllProducts() {
  return Object.values(PRODUCTS);
}

/**
 * Get live products only
 */
export function getLiveProducts() {
  return Object.values(PRODUCTS).filter(p => p.status === 'Live');
}

/**
 * Get product color variants for Tailwind classes
 */
export function getProductColorClasses(productId) {
  const product = getProduct(productId);
  if (!product) return {};

  // Map hex colors to Tailwind classes
  const colorMap = {
    '#22c55e': { bg: 'bg-green-600', hover: 'hover:bg-green-700', text: 'text-green-600', bgLight: 'bg-green-100' },
    '#9333ea': { bg: 'bg-purple-600', hover: 'hover:bg-purple-700', text: 'text-purple-600', bgLight: 'bg-purple-100' },
    '#dc2626': { bg: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', bgLight: 'bg-red-100' },
  };

  return colorMap[product.colors.primary] || {};
}
