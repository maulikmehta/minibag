/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      // Elderly-friendly font sizes (18px minimum for body text)
      fontSize: {
        'xs': ['0.875rem', { lineHeight: '1.5' }],    // 14px - use sparingly (labels only)
        'sm': ['1rem', { lineHeight: '1.5' }],        // 16px - secondary text
        'base': ['1.125rem', { lineHeight: '1.6' }],  // 18px - body text (WCAG AAA for elderly)
        'lg': ['1.25rem', { lineHeight: '1.6' }],     // 20px - emphasized text
        'xl': ['1.5rem', { lineHeight: '1.5' }],      // 24px - headings
        '2xl': ['1.875rem', { lineHeight: '1.4' }],   // 30px - large headings
        '3xl': ['2.25rem', { lineHeight: '1.3' }],    // 36px - page titles
        '4xl': ['3rem', { lineHeight: '1.2' }],       // 48px - hero text
      },

      // Line spacing for readability
      lineHeight: {
        'relaxed': '1.75',
        'loose': '2',
      },

      // LocalLoops custom animations
      animation: {
        'pop': 'popScale 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'slide-down': 'slideDown 0.2s ease-out',
        'stagger': 'staggerFadeIn 0.3s ease-out forwards',
        'flash-green': 'flashGreen 0.3s ease-out',
        'float-up': 'floatUp 0.6s ease-out forwards',
        'bounce-in': 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shake': 'shake 0.4s ease-in-out',
        'gradient-pulse': 'gradientPulse 2s ease-in-out infinite',
        'modal-enter': 'modalEnter 0.2s ease-out',
        'fade-in': 'fadeIn 0.15s ease-out',
        'progress-glow': 'progressGlow 2s ease-in-out infinite',
      },

      // Material Design-inspired shadows
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
      },

      // Standard border radius
      borderRadius: {
        'button': '10px',
        'card': '12px',
        'modal': '16px',
      },

      // Smooth animation curves
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
}
