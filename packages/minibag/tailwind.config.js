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
      // Ensure adequate line spacing for readability
      lineHeight: {
        'relaxed': '1.75',
        'loose': '2',
      },
    },
  },
  plugins: [],
}
