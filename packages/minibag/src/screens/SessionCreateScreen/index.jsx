import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Check, X, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VoiceSearch from '../../components/VoiceSearch.jsx';
import CategoryButton from '../../components/performance/CategoryButton.jsx';
import AppHeader from '../../components/layout/AppHeader.jsx';
import ProgressBar from '../../components/layout/ProgressBar.jsx';

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

  // Local state for this screen - initialize from parent's hostItems when navigating back
  const [hostItems, setHostItems] = useState(initialHostItems);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);

  // Nickname modal state
  const [hostName, setHostName] = useState('');
  const [expectedParticipants, setExpectedParticipants] = useState(0);
  const [showHostNicknameModal, setShowHostNicknameModal] = useState(false);
  const [hostNicknameOptions, setHostNicknameOptions] = useState([]);
  const [selectedHostNickname, setSelectedHostNickname] = useState(null);
  const [loadingHostNicknames, setLoadingHostNicknames] = useState(false);

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
      const response = await fetch('/api/sessions/nickname-options');
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
      alert('Please enter your name');
      return;
    }

    if (!selectedHostNickname) {
      alert('Please select a nickname');
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
        expected_participants: expectedParticipants, // Number of participants expected
        // Add nickname selection data
        real_name: hostName,
        selected_nickname_id: selectedHostNickname.id,
        selected_nickname: selectedHostNickname.nickname,
        selected_avatar_emoji: selectedHostNickname.avatar_emoji
      });

      console.log('✅ Session created:', result);

      // Navigate to session-active screen and pass hostItems
      onSessionCreated(hostItems);
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      alert('Unable to start list. Please try again.');
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
                className={`flex items-center gap-3 py-3 px-2 ${
                  isSelected ? 'bg-gray-50' : ''
                }`}
              >
                {veg.thumbnail_url || veg.img ? (
                  <img
                    src={veg.thumbnail_url || veg.img}
                    alt={veg.name}
                    loading="lazy"
                    className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl" style={{display: (veg.thumbnail_url || veg.img) ? 'none' : 'flex'}}>
                  🥬
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base text-gray-900">{getItemName(veg)}</p>
                  <p className="text-xs text-gray-500 truncate">{getItemSubtitles(veg)}</p>
                </div>

                {isSelected ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (isListLocked) return;
                        const newVal = Math.max(0, quantity - 0.5);
                        if (newVal === 0) {
                          const { [veg.id]: _, ...rest } = hostItems;
                          setHostItems(rest);
                        } else {
                          setHostItems({ ...hostItems, [veg.id]: newVal });
                        }
                      }}
                      disabled={isListLocked}
                      className="w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus size={16} strokeWidth={2} />
                    </button>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.25"
                        min="0.25"
                        max="10"
                        value={quantity}
                        onChange={(e) => {
                          if (isListLocked) return;
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val) && val > 0) {
                            const otherItemsWeight = getTotalWeight(hostItems) - quantity;
                            if (otherItemsWeight + val <= 10) {
                              setHostItems({ ...hostItems, [veg.id]: val });
                            }
                          } else if (e.target.value === '') {
                            // Allow empty for editing
                            setHostItems({ ...hostItems, [veg.id]: 0.25 });
                          }
                        }}
                        onBlur={(e) => {
                          if (isListLocked) return;
                          // Ensure valid value on blur
                          const val = parseFloat(e.target.value);
                          if (isNaN(val) || val <= 0) {
                            setHostItems({ ...hostItems, [veg.id]: 0.25 });
                          }
                        }}
                        disabled={isListLocked}
                        className="w-14 text-base text-gray-900 text-center border-b-2 border-gray-300 focus:border-gray-900 focus:outline-none py-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-gray-600">kg</span>
                    </div>
                    <button
                      onClick={() => {
                        if (isListLocked) return;
                        if (totalWeight < 10) {
                          setHostItems({ ...hostItems, [veg.id]: quantity + 0.5 });
                        }
                      }}
                      disabled={totalWeight >= 10 || isListLocked}
                      className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center disabled:bg-gray-400 disabled:hover:bg-gray-400 flex-shrink-0 transition-colors"
                    >
                      <Plus size={16} className="text-white" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (isListLocked) return;
                      if (totalWeight < 10) {
                        setHostItems({ ...hostItems, [veg.id]: 0.5 });
                        setSearchQuery(''); // Clear search after adding item
                      }
                    }}
                    disabled={totalWeight >= 10 || isListLocked}
                    data-tour="quantity-controls"
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:bg-gray-400 disabled:hover:bg-gray-400 transition-colors"
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
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:cursor-not-allowed transition-colors"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-lg max-w-sm w-full p-6 relative">
            <button
              onClick={() => setShowHostNicknameModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-6">Start Your List</h2>

            {/* Name Input */}
            <div className="mb-6">
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
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-600 focus:outline-none text-base"
                maxLength={50}
                autoFocus
                required
              />
              <p className="text-xs text-gray-500 mt-1">For payment tracking & receipts</p>
            </div>

            {/* Expected Participants Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                How many people are you inviting?
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={expectedParticipants}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (value >= 0 && value <= 20) {
                    setExpectedParticipants(value);
                  }
                }}
                placeholder="0"
                min="0"
                max="20"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-600 focus:outline-none text-base"
              />
              <p className="text-xs text-gray-500 mt-1">
                {expectedParticipants === 0
                  ? "You can start shopping immediately"
                  : `Shopping will wait for ${expectedParticipants} ${expectedParticipants === 1 ? 'person' : 'people'} to join`}
              </p>
            </div>

            {/* Nickname Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Choose your shopping buddy name
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
                      onClick={() => setSelectedHostNickname(option)}
                      className="flex flex-col items-center"
                    >
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                        selectedHostNickname?.nickname === option.nickname
                          ? 'bg-gradient-to-br from-blue-500 via-purple-500 to-purple-600 p-[2px]'
                          : 'border-2 border-gray-300 hover:border-gray-400'
                      }`}>
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                          <span className="text-2xl">{option.avatar_emoji}</span>
                        </div>
                      </div>
                      <div className="text-sm font-medium text-gray-900">{option.nickname}</div>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-3 text-center">How you'll appear to other shoppers</p>
            </div>

            {/* Create Button */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowHostNicknameModal(false)}
                className="flex-1 py-3 border-2 border-gray-300 rounded-lg text-base text-gray-900 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSession}
                disabled={creatingSession || !selectedHostNickname || !hostName.trim()}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-base font-semibold disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
