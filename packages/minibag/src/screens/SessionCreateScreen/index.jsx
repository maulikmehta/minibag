import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Check, X, Loader2, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VoiceSearch from '../../components/VoiceSearch.jsx';
import CategoryButton from '../../components/performance/CategoryButton.jsx';
import AppHeader from '../../components/layout/AppHeader.jsx';
import ProgressBar from '../../components/layout/ProgressBar.jsx';
import { useNotification } from '../../hooks/useNotification.js';

export default function SessionCreateScreen({
  categories,
  items,
  vegCategoryIds,
  session,
  currentParticipant,
  createSession,
  getItemName,
  getItemSubtitles,
  getTotalWeight,
  onSessionCreated,
  onLanguageChange,
  onHelpClick,
  onLogoClick,
  onNavigateToStep,
  initialHostItems = {}
}) {
  const { i18n } = useTranslation();
  const notify = useNotification();

  // Local state for this screen - initialize from parent's hostItems when navigating back
  const [hostItems, setHostItems] = useState(initialHostItems);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  // Animation states for visual feedback
  const [floatingLabels, setFloatingLabels] = useState({});
  const [flashingItems, setFlashingItems] = useState({});

  // Nickname modal state
  const [hostName, setHostName] = useState('');
  const [showHostNicknameModal, setShowHostNicknameModal] = useState(false);
  const [hostNicknameOptions, setHostNicknameOptions] = useState([]);
  const [selectedHostNickname, setSelectedHostNickname] = useState(null);
  const [loadingHostNicknames, setLoadingHostNicknames] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1); // 1: Name, 2: Language, 3: Nickname
  const [showBigCheck, setShowBigCheck] = useState(null); // Track which avatar shows big checkmark

  // Reset onboarding step when modal opens
  useEffect(() => {
    if (showHostNicknameModal) {
      setOnboardingStep(1);
    }
  }, [showHostNicknameModal]);

  // Update local state when navigating back with existing items
  useEffect(() => {
    if (Object.keys(initialHostItems).length > 0) {
      setHostItems(initialHostItems);
    }
  }, [initialHostItems]);

  // Set default category to vegetables when categories are loaded
  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      // Find the vegetable category and set it as default
      const vegCategory = categories.find(cat => cat.name?.toLowerCase().includes('vegetable'));
      if (vegCategory) {
        setSelectedCategory(vegCategory.id);
      } else {
        setSelectedCategory(categories[0].id);
      }
    }
  }, [categories, selectedCategory]);

  // Memoize VEGETABLES array to prevent recalculation on every render
  const VEGETABLES = useMemo(
    () => items.filter(item => vegCategoryIds.includes(item.category_id)),
    [items, vegCategoryIds]
  );

  // List is never locked on Step 1 - host can always edit before shopping starts
  const isListLocked = false;

  // Memoize totalWeight calculation
  const totalWeight = useMemo(() => getTotalWeight(hostItems), [hostItems, getTotalWeight]);

  // Memoize filteredItems calculation to prevent recalculation on every render
  const filteredItems = useMemo(() => {
    let filtered = VEGETABLES.filter(v => {
      const matchesCategory = !selectedCategory || v.category_id === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (v.name_gu && v.name_gu.includes(searchQuery)) ||
        (v.name_hi && v.name_hi.includes(searchQuery));
      return matchesCategory && matchesSearch;
    });

    // Fallback: if no items found and no search, show all vegetables
    if (filtered.length === 0 && searchQuery === '') {
      filtered = VEGETABLES;
    }

    return filtered;
  }, [VEGETABLES, selectedCategory, searchQuery]);

  // Handle language change
  const handleLanguageChange = (languageCode) => {
    i18n.changeLanguage(languageCode);
  };

  // Helper function to update item quantity with animations
  const updateItemQuantity = (itemId, newQuantity, increment = 0) => {
    // Update quantity
    if (newQuantity <= 0) {
      const { [itemId]: _, ...rest } = hostItems;
      setHostItems(rest);
    } else {
      setHostItems({ ...hostItems, [itemId]: newQuantity });
    }

    // Show floating label for increments/decrements
    if (increment !== 0) {
      setFloatingLabels(prev => ({
        ...prev,
        [itemId]: increment > 0 ? `+${increment}kg` : `${increment}kg`
      }));

      setTimeout(() => {
        setFloatingLabels(prev => {
          const updated = { ...prev };
          delete updated[itemId];
          return updated;
        });
      }, 600);
    }

    // Flash the row
    setFlashingItems(prev => ({ ...prev, [itemId]: true }));
    setTimeout(() => {
      setFlashingItems(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
    }, 300);
  };

  // Show host nickname selection modal
  const handleCreateSessionClick = async () => {
    // If session already exists, just navigate (don't ask for name again)
    if (session && currentParticipant) {
      // Pass the current hostItems to parent
      onSessionCreated(hostItems);
      return;
    }

    // Fetch nickname options for host
    setLoadingHostNicknames(true);
    setShowHostNicknameModal(true);

    try {
      // Extract first letter from host name if available
      const firstLetter = hostName.trim() ? hostName.trim().charAt(0).toUpperCase() : null;
      const url = firstLetter
        ? `/api/sessions/nickname-options?firstLetter=${firstLetter}`
        : '/api/sessions/nickname-options';

      const response = await fetch(url);
      const data = await response.json();

      if (data.success && data.data) {
        setHostNicknameOptions(data.data);
        // Auto-select first option
        if (data.data.length > 0) {
          setSelectedHostNickname(data.data[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch nickname options:', err);
      // Fallback options if API fails
      setHostNicknameOptions([
        { nickname: 'Raj', avatar_emoji: '👨', gender: 'male' },
        { nickname: 'Ria', avatar_emoji: '👩', gender: 'female' }
      ]);
      setSelectedHostNickname({ nickname: 'Raj', avatar_emoji: '👨', gender: 'male' });
    } finally {
      setLoadingHostNicknames(false);
    }
  };

  // Handle session creation with nickname selection
  const handleCreateSession = async () => {
    if (!hostName.trim()) {
      notify.warning('Please enter your name');
      return;
    }

    if (!selectedHostNickname) {
      notify.warning('Please select a nickname');
      return;
    }

    try {
      setCreatingSession(true);
      setShowHostNicknameModal(false);

      // Format items for API
      const formattedItems = Object.entries(hostItems).map(([itemId, quantity]) => ({
        item_id: itemId,
        quantity: parseFloat(quantity),
        unit: 'kg'
      }));

      // Create session via API with nickname selection
      const result = await createSession({
        location_text: 'My location', // TODO: Get from user input
        neighborhood: 'Local area',   // TODO: Get from user input
        scheduled_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour from now
        title: 'Shopping Run',
        description: 'Group shopping session',
        items: formattedItems,
        expected_participants: null, // Host must choose on SessionActiveScreen: null (not set) -> 0 (solo) or 1-3 (wait)
        // Add nickname selection data
        real_name: hostName,
        selected_nickname_id: selectedHostNickname.id,
        selected_nickname: selectedHostNickname.nickname,
        selected_avatar_emoji: selectedHostNickname.avatar_emoji
      });

      // Navigate to session-active screen and pass hostItems
      onSessionCreated(hostItems);
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      notify.error(error.userMessage || 'Unable to start list. Please try again.');
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
      <AppHeader
        i18n={i18n}
        onLanguageChange={onLanguageChange || handleLanguageChange}
        onHelpClick={onHelpClick}
        onLogoClick={onLogoClick}
      />
      <div className="p-6 pt-20">
        {/* Progress Bar */}
        <ProgressBar
          currentStep={1}
          onStepClick={(step) => onNavigateToStep && onNavigateToStep(step)}
          canNavigate={!isListLocked}
        />

        <div className="mb-6 flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {isListLocked ? 'Your Items (Locked)' : 'Add Items'}
          </p>
          <p className="text-sm text-gray-600">{totalWeight}kg added</p>
        </div>

        {/* Category circles - Hidden when locked */}
        {!isListLocked && (
          <div className="mb-6 -mx-2">
            <div className="flex gap-4 overflow-x-auto pb-4 px-2" data-tour="category-filters">
              {categories.map(cat => {
                const isVegCategory = vegCategoryIds.includes(cat.id);
                const isDisabled = !isVegCategory;

                return (
                  <CategoryButton
                    key={cat.id}
                    category={cat}
                    isSelected={selectedCategory === cat.id}
                    isDisabled={isDisabled}
                    onClick={() => {
                      if (isVegCategory) {
                        setSelectedCategory(cat.id);
                        setSearchQuery('');
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Search with Voice - Hidden when locked */}
        {!isListLocked && (
          <div className="mb-6 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <VoiceSearch
                onSearch={(transcript) => setSearchQuery(transcript)}
                userLanguage="english"
                data-tour="voice-search"
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="divide-y divide-gray-200">
          {filteredItems.map(veg => {
            const quantity = hostItems[veg.id] || 0;
            const isSelected = quantity > 0;

            return (
              <div
                key={veg.id}
                className={`flex items-center gap-3 py-3 px-2 relative transition-colors ${
                  isSelected ? 'bg-gray-50' : ''
                } ${flashingItems[veg.id] ? 'animate-flash-green' : ''}`}
              >
                {/* Floating label for quantity changes */}
                {floatingLabels[veg.id] && (
                  <span
                    className="floating-label"
                    style={{ top: '10px', right: '20%' }}
                  >
                    {floatingLabels[veg.id]}
                  </span>
                )}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl">
                  {veg.emoji || '🥬'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base text-gray-900">{getItemName(veg)}</p>
                  <p className="text-xs text-gray-500 truncate">{getItemSubtitles(veg)}</p>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-2 relative">
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0.25"
                        max="10"
                        value={quantity}
                        onChange={(e) => {
                          if (isListLocked) return;
                          const val = parseFloat(e.target.value);

                          // Allow empty input for editing
                          if (e.target.value === '') {
                            setHostItems({ ...hostItems, [veg.id]: '' });
                            return;
                          }

                          if (!isNaN(val) && val > 0) {
                            const otherItemsWeight = getTotalWeight(hostItems) - (quantity || 0);
                            if (otherItemsWeight + val <= 10) {
                              setHostItems({ ...hostItems, [veg.id]: val });
                            }
                          }
                        }}
                        onBlur={(e) => {
                          if (isListLocked) return;
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val <= 0 || e.target.value === '') {
                            setHostItems({ ...hostItems, [veg.id]: 0.25 });
                          }
                        }}
                        disabled={isListLocked}
                        style={{
                          appearance: 'textfield',
                          MozAppearance: 'textfield',
                          WebkitAppearance: 'none'
                        }}
                        className="w-20 pl-2 pr-7 text-lg text-gray-900 text-center border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none py-1.5 disabled:opacity-50 disabled:cursor-not-allowed [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">kg</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => {
                          if (isListLocked) return;
                          if (totalWeight < 10) {
                            updateItemQuantity(veg.id, quantity + 0.5, 0.5);
                          }
                        }}
                        disabled={totalWeight >= 10 || isListLocked}
                        className="w-8 h-6 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                      >
                        <ChevronUp size={16} strokeWidth={2} className="text-gray-700" />
                      </button>
                      <button
                        onClick={() => {
                          if (isListLocked) return;
                          const newVal = Math.max(0, quantity - 0.5);
                          updateItemQuantity(veg.id, newVal, -0.5);
                        }}
                        disabled={isListLocked}
                        className="w-8 h-6 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                      >
                        <ChevronDown size={16} strokeWidth={2} className="text-gray-700" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (isListLocked) return;
                      if (totalWeight < 10) {
                        updateItemQuantity(veg.id, 0.5, 0.5);
                        setSearchQuery(''); // Clear search after adding item
                      }
                    }}
                    disabled={totalWeight >= 10 || isListLocked}
                    data-tour="quantity-controls"
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-button text-sm font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 transition-all duration-150 active:scale-95"
                  >
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {Object.keys(hostItems).length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto z-40">
            <button
              onClick={() => {
                if (isListLocked) {
                  // Navigate to session-active screen
                  onSessionCreated(hostItems);
                } else {
                  handleCreateSessionClick();
                }
              }}
              disabled={creatingSession}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold flex items-center justify-center gap-2 disabled:bg-gray-500 disabled:hover:bg-gray-500 disabled:cursor-not-allowed transition-colors"
            >
              {creatingSession ? (
                <>
                  <Loader2 size={20} className="animate-spin" strokeWidth={2} />
                  Creating...
                </>
              ) : isListLocked ? (
                'Go to Session →'
              ) : (
                <>
                  <Check size={20} strokeWidth={2} />
                  Start List
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Host Nickname Selection Modal */}
      {showHostNicknameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6 animate-fade-in">
          <div className="bg-white rounded-modal max-w-sm w-full p-4 relative animate-modal-enter shadow-2xl">
            <button
              onClick={() => setShowHostNicknameModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all duration-150 active:scale-90"
            >
              <X size={24} />
            </button>

            <h2 className="text-lg font-bold text-gray-900 mb-3">Start Your List</h2>

            {/* Step 1: Name Input */}
            {onboardingStep === 1 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  What's your name?
                </label>
                <input
                  type="text"
                  value={hostName}
                  onChange={(e) => {
                    // Allow only letters and spaces
                    const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setHostName(value);
                  }}
                  placeholder="Enter your name"
                  className="input"
                  maxLength={50}
                  autoFocus
                  required
                />
                <p className="text-xs text-gray-500 mt-0.5">For payment tracking</p>
              </div>
            )}

            {/* Step 2: Language Preference */}
            {onboardingStep === 2 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Choose your language
                </label>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => onLanguageChange && onLanguageChange('en')}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 ${
                      i18n.language === 'en'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguageChange && onLanguageChange('hi')}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 ${
                      i18n.language === 'hi'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    हिंदी
                  </button>
                  <button
                    type="button"
                    onClick={() => onLanguageChange && onLanguageChange('gu')}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-150 active:scale-95 ${
                      i18n.language === 'gu'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    ગુજરાતી
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Nickname Selection */}
            {onboardingStep === 3 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Pick your bag tag
                </label>
                {loadingHostNicknames ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-green-600" />
                  </div>
                ) : (
                  <div className="flex justify-center gap-8">
                    {hostNicknameOptions.map((option, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          setSelectedHostNickname(option);
                          // Trigger big checkmark animation
                          setShowBigCheck(option.nickname);
                          setTimeout(() => setShowBigCheck(null), 600);
                        }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                            selectedHostNickname?.nickname === option.nickname
                              ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-[2px]'
                              : 'border-2 border-gray-300 hover:border-gray-400'
                          }`}>
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <span className="text-2xl">{option.avatar_emoji}</span>
                            </div>
                          </div>

                          {/* Big checkmark overlay - tap feedback (inside circle) */}
                          {showBigCheck === option.nickname && (
                            <div className="absolute inset-0 w-16 h-16 rounded-full bg-green-600/90 flex items-center justify-center animate-pop animate-float-up pointer-events-none">
                              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}

                          {/* Small persistent badge (outside circle, top-right) */}
                          {selectedHostNickname?.nickname === option.nickname && (
                            <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center border-2 border-white animate-pop">
                              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="text-sm font-medium text-gray-900">{option.nickname}</div>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-3 text-center">How you'll appear to other shoppers</p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-3 mt-4">
              {onboardingStep > 1 && (
                <button
                  onClick={() => setOnboardingStep(onboardingStep - 1)}
                  className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-button text-gray-900 hover:bg-gray-50 transition-all duration-150 active:scale-90"
                  title="Back"
                >
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
              )}

              {onboardingStep < 3 ? (
                <button
                  onClick={() => {
                    // Validate current step before proceeding
                    if (onboardingStep === 1 && !hostName.trim()) {
                      notify.warning('Please enter your name');
                      return;
                    }
                    setOnboardingStep(onboardingStep + 1);
                  }}
                  disabled={onboardingStep === 1 && !hostName.trim()}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-button text-base font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 disabled:active:scale-100"
                >
                  <span>Next ({onboardingStep}/3)</span>
                  <ChevronRight size={18} strokeWidth={2.5} />
                </button>
              ) : (
                <button
                  onClick={handleCreateSession}
                  disabled={creatingSession || !selectedHostNickname}
                  className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-button text-base font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 flex items-center justify-center gap-2 transition-all duration-150 active:scale-95 disabled:active:scale-100"
                >
                  {creatingSession ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check size={18} strokeWidth={2.5} />
                      Start List
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
