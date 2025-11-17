import React from 'react';

/**
 * LanguageSwitcher Component
 *
 * Minimal inline toggle for language selection.
 * Cycles through languages: EN → GU → HI → EN
 *
 * @param {string} currentLanguage - Current language code (e.g., 'en', 'en-US')
 * @param {function} onLanguageChange - Callback when language changes
 */
function LanguageSwitcher({ currentLanguage, onLanguageChange }) {
  const languages = [
    { code: 'en', label: 'EN' },
    { code: 'gu', label: 'GU' },
    { code: 'hi', label: 'HI' }
  ];

  // Safety check - default to 'en' if currentLanguage is undefined
  const activeLang = currentLanguage?.split('-')[0] || 'en';
  const currentIndex = languages.findIndex(l => l.code === activeLang);
  const currentLabel = languages[currentIndex]?.label || 'EN';

  const handleToggle = () => {
    // Cycle through languages: EN → GU → HI → EN
    const nextIndex = (currentIndex + 1) % languages.length;
    onLanguageChange(languages[nextIndex].code);
  };

  return (
    <button
      onClick={handleToggle}
      data-tour="language-switcher"
      className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
    >
      {currentLabel}
    </button>
  );
}

export default LanguageSwitcher;
