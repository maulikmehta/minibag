import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Minus, Check, MapPin, X, Share2, Users, Calendar, Clock, IndianRupee, ShoppingBag, Loader2, Copy, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import useCatalog from './src/hooks/useCatalog.js';
import useSession from './src/hooks/useSession.js';
import { recordPayment, getSessionPayments } from './src/services/api.js';
import socketService from './src/services/socket.js';
import VoiceSearch from './src/components/VoiceSearch.jsx';
import CategoryButton from './src/components/performance/CategoryButton.jsx';
import ItemCard from './src/components/performance/ItemCard.jsx';
import LanguageSwitcher from './src/components/LanguageSwitcher.jsx';
import PaymentModal from './src/components/PaymentModal.jsx';
import ParticipantAvatar from './src/components/session/ParticipantAvatar.jsx';
import ItemList from './src/components/items/ItemList.jsx';
import ItemRow from './src/components/items/ItemRow.jsx';
import HomeScreen from './src/screens/HomeScreen.jsx';
import ParticipantBillScreen from './src/screens/ParticipantBillScreen.jsx';
import useOnboarding from './src/hooks/useOnboarding.js';
import {
  GUIDED_TOUR_STEPS,
  HOST_CREATE_TOUR_STEPS,
  SESSION_ACTIVE_TOUR_STEPS,
  PARTICIPANT_JOIN_TOUR_STEPS,
  PARTICIPANT_SESSION_TOUR_STEPS,
  PARTICIPANT_ADD_ITEMS_TOUR_STEPS
} from './src/config/tooltips.config.js';
import './src/styles/driver-custom.css';

// Hardcoded data removed - now fetched from API via useCatalog hook
// See hooks/useCatalog.js for data fetching logic

// 3-letter names matching backend pool
const FALLBACK_NAMES = ['Raj', 'Avi', 'Ria', 'Dev', 'Sia', 'Jay', 'Pia', 'Sam'];

export default function MinibagPrototype({ joinSessionId = null, billSessionId = null, billParticipantId = null }) {
  // Language translation
  const { t, i18n } = useTranslation();

  // Fetch catalog data from API
  const { categories, items, loading: catalogLoading, error: catalogError } = useCatalog();

  // Session management
  const {
    session,
    participants: apiParticipants,
    currentParticipant,
    loading: sessionLoading,
    error: sessionError,
    create: createSession,
    join: joinSession,
    loadSession,
    connected
  } = useSession();

  // Onboarding/Tooltip management
  const {
    isFirstVisit,
    showScreenTour,
    shouldShowTooltip,
    completedTooltips
  } = useOnboarding();

  // UI state
  const [currentScreen, setCurrentScreen] = useState('home');
  const [hostItems, setHostItems] = useState({});
  const [participants, setParticipants] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState('host');
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpContext, setSignUpContext] = useState('');
  const [itemPayments, setItemPayments] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [joiningSession, setJoiningSession] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [nicknameOptions, setNicknameOptions] = useState([]);
  const [selectedNickname, setSelectedNickname] = useState(null);
  const [loadingNicknames, setLoadingNicknames] = useState(false);
  // Host nickname selection state
  const [hostName, setHostName] = useState('');
  const [showHostNicknameModal, setShowHostNicknameModal] = useState(false);
  const [hostNicknameOptions, setHostNicknameOptions] = useState([]);
  const [selectedHostNickname, setSelectedHostNickname] = useState(null);
  const [loadingHostNicknames, setLoadingHostNicknames] = useState(false);

  // Set default category to vegetables when categories are loaded
  React.useEffect(() => {
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

  // Handle join session if joinSessionId is provided
  React.useEffect(() => {
    if (joinSessionId && currentScreen === 'home') {
      setCurrentScreen('join');
      // Load session details to preview before joining
      loadSession(joinSessionId).catch(err => {
        console.error('Failed to load session:', err);
      });
    }
  }, [joinSessionId, currentScreen, loadSession]);

  // Handle bill viewing if billSessionId is provided
  React.useEffect(() => {
    if (billSessionId && billParticipantId && currentScreen === 'home') {
      setCurrentScreen('participant-bill');
      // Load session details for bill
      loadSession(billSessionId).catch(err => {
        console.error('Failed to load session for bill:', err);
      });
    }
  }, [billSessionId, billParticipantId, currentScreen, loadSession]);

  // Fetch nickname options when join screen loads
  React.useEffect(() => {
    if (currentScreen === 'join' && nicknameOptions.length === 0 && !loadingNicknames) {
      setLoadingNicknames(true);
      fetch('/api/sessions/nickname-options')
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data) {
            setNicknameOptions(data.data);
            // Auto-select first option
            if (data.data.length > 0) {
              setSelectedNickname(data.data[0]);
            }
          }
        })
        .catch(err => {
          console.error('Failed to fetch nickname options:', err);
          // Fallback options if API fails
          setNicknameOptions([
            { nickname: 'Raj', avatar_emoji: '👨', gender: 'male' },
            { nickname: 'Ria', avatar_emoji: '👩', gender: 'female' }
          ]);
          setSelectedNickname({ nickname: 'Raj', avatar_emoji: '👨', gender: 'male' });
        })
        .finally(() => {
          setLoadingNicknames(false);
        });
    }
  }, [currentScreen, nicknameOptions.length, loadingNicknames]);

  // Load payments when session is active
  React.useEffect(() => {
    if (session?.session_id) {
      // Load existing payments
      getSessionPayments(session.session_id)
        .then(payments => {
          // Convert array of payments to object map
          const paymentsMap = {};
          payments.forEach(payment => {
            paymentsMap[payment.item_id] = {
              id: payment.id,
              method: payment.method,
              amount: payment.amount
            };
          });
          setItemPayments(paymentsMap);
        })
        .catch(err => {
          console.error('Failed to load payments:', err);
        });

      // Listen for real-time payment updates
      const handlePaymentUpdate = (payment) => {
        setItemPayments(prev => ({
          ...prev,
          [payment.item_id]: {
            id: payment.id,
            method: payment.method,
            amount: payment.amount
          }
        }));
      };

      socketService.onPaymentUpdated(handlePaymentUpdate);

      return () => {
        // Cleanup listener
        socketService.socket?.off('payment-updated', handlePaymentUpdate);
      };
    }
  }, [session?.session_id]);

  // Guided Tour: Home screen
  useEffect(() => {
    console.log('🎯 Tour Check - Home:', {
      currentScreen,
      completedTooltips,
      tourHomeCompleted: completedTooltips.includes('tour-home')
    });

    // Show tour if not completed (don't rely on isFirstVisit)
    if (currentScreen === 'home' && !completedTooltips.includes('tour-home')) {
      console.log('✅ Starting home tour in 1.5s...');
      // Wait for all elements to be ready
      const timer = setTimeout(() => {
        console.log('🚀 Launching home tour now!');
        const fabButton = document.querySelector('[data-tour="fab-menu"]');
        console.log('FAB button found?', !!fabButton, fabButton);
        showScreenTour(GUIDED_TOUR_STEPS, 'home');
      }, 1500); // Increased to 1.5s

      return () => clearTimeout(timer);
    } else {
      console.log('❌ Not showing tour - already completed');
    }
  }, [currentScreen, completedTooltips, showScreenTour]);

  // Guided Tour: Host Create screen
  useEffect(() => {
    if (currentScreen === 'host-create' && !completedTooltips.includes('tour-host-create')) {
      // Quick delay for screen transition
      const timer = setTimeout(() => {
        showScreenTour(HOST_CREATE_TOUR_STEPS, 'host-create');
      }, 1000); // Reduced to 1 second

      return () => clearTimeout(timer);
    }
  }, [currentScreen, completedTooltips, showScreenTour]);

  // Guided Tour: Session Active screen (for HOST)
  useEffect(() => {
    if (currentScreen === 'session-active' && !completedTooltips.includes('tour-session-active') && currentParticipant?.is_creator) {
      // Quick delay for session to load
      const timer = setTimeout(() => {
        showScreenTour(SESSION_ACTIVE_TOUR_STEPS, 'session-active');
      }, 1000); // Reduced to 1 second

      return () => clearTimeout(timer);
    }
  }, [currentScreen, completedTooltips, showScreenTour, currentParticipant]);

  // Participant Tour: Join Screen
  useEffect(() => {
    if (currentScreen === 'join' && !completedTooltips.includes('tour-participant-join')) {
      const timer = setTimeout(() => {
        showScreenTour(PARTICIPANT_JOIN_TOUR_STEPS, 'participant-join');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentScreen, completedTooltips, showScreenTour]);

  // Participant Tour: Session Active Screen (for PARTICIPANTS)
  useEffect(() => {
    if (currentScreen === 'session-active' && !completedTooltips.includes('tour-participant-session') && currentParticipant && !currentParticipant.is_creator) {
      const timer = setTimeout(() => {
        showScreenTour(PARTICIPANT_SESSION_TOUR_STEPS, 'participant-session');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [currentScreen, completedTooltips, showScreenTour, currentParticipant]);

  // Participant Tour: Add Items Screen
  useEffect(() => {
    if (currentScreen === 'participant-add-items' && !completedTooltips.includes('tour-participant-add-items')) {
      const timer = setTimeout(() => {
        showScreenTour(PARTICIPANT_ADD_ITEMS_TOUR_STEPS, 'participant-add-items');
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [currentScreen, completedTooltips, showScreenTour]);

  // Fallback data for offline/error state
  // Show all categories but only enable vegetables for field testing
  const CATEGORIES = categories;
  const vegCategories = categories.filter(cat => cat.name?.toLowerCase().includes('vegetable'));

  // Memoize vegCategoryIds to prevent VEGETABLES from recalculating unnecessarily
  const vegCategoryIds = useMemo(
    () => vegCategories.map(c => c.id),
    [vegCategories]
  );

  // Memoize VEGETABLES array to prevent recalculation on every render
  const VEGETABLES = useMemo(
    () => items.filter(item => vegCategoryIds.includes(item.category_id)),
    [items, vegCategoryIds]
  );

  // Memoize getTotalWeight function with useCallback
  const getTotalWeight = useCallback((items) => {
    return Object.values(items).reduce((sum, qty) => sum + qty, 0);
  }, []);

  // Handle language change - memoized with useCallback
  const handleLanguageChange = useCallback((languageCode) => {
    i18n.changeLanguage(languageCode);
  }, [i18n]);

  // Get localized item name based on current language - memoized with useCallback
  const getItemName = useCallback((item) => {
    const lang = i18n.language?.split('-')[0] || 'en';
    if (lang === 'gu' && item.name_gu) return item.name_gu;
    if (lang === 'hi' && item.name_hi) return item.name_hi;
    return item.name; // fallback to English
  }, [i18n.language]);

  // Get subtitle names (other two languages) - memoized with useCallback
  const getItemSubtitles = useCallback((item) => {
    const lang = i18n.language?.split('-')[0] || 'en';
    if (lang === 'gu') {
      return `${item.name} • ${item.name_hi || item.name}`;
    } else if (lang === 'hi') {
      return `${item.name} • ${item.name_gu || item.name}`;
    } else {
      // English is primary, show GU and HI
      return `${item.name_gu || item.name} • ${item.name_hi || item.name}`;
    }
  }, [i18n.language]);

  // Show host nickname selection modal
  const handleCreateSessionClick = async () => {
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
    // Check if a session already exists and user is the creator
    // If so, navigate back to that session instead of creating a new one
    if (session && currentParticipant?.is_creator) {
      console.log('✅ Session already exists, navigating back to it');
      setCurrentScreen('session-active');
      return;
    }

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
        // Add nickname selection data
        real_name: hostName,
        selected_nickname_id: selectedHostNickname.id,
        selected_nickname: selectedHostNickname.nickname,
        selected_avatar_emoji: selectedHostNickname.avatar_emoji
      });

      console.log('✅ Session created:', result);

      // Navigate to session-active screen
      setCurrentScreen('session-active');
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      alert('Unable to start list. Please try again.');
    } finally {
      setCreatingSession(false);
    }
  };

  // Handle joining a session
  const handleJoinSession = async () => {
    if (!participantName.trim()) {
      alert('Please enter your name');
      return;
    }

    if (!selectedNickname) {
      alert('Please select a nickname');
      return;
    }

    // Check if session is full (max 4 people: 1 host + 3 participants)
    if (participants.length >= 3) {
      alert('This list is full! Maximum 4 people can shop together.');
      return;
    }

    try {
      setJoiningSession(true);

      // Join session via API with nickname selection
      const result = await joinSession(joinSessionId, [], {
        real_name: participantName,
        selected_nickname_id: selectedNickname.id,
        selected_nickname: selectedNickname.nickname,
        selected_avatar_emoji: selectedNickname.avatar_emoji
      });

      console.log('✅ Joined session:', result);

      // Navigate to session-active screen
      setCurrentScreen('session-active');
    } catch (error) {
      console.error('❌ Failed to join session:', error);
      // Check if error is due to full session
      if (error.message && error.message.includes('full')) {
        alert('This list is full! Maximum 4 people can shop together.');
      } else {
        alert('Unable to join list. Please check the link and try again.');
      }
    } finally {
      setJoiningSession(false);
    }
  };

  // Memoize totalWeight calculation (must be at top level, before any conditional returns)
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

  // LOADING STATE
  if (catalogLoading) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col items-center justify-center">
        <Loader2 size={48} className="text-gray-900 animate-spin mb-4" />
        <p className="text-lg text-gray-600">Loading catalog...</p>
      </div>
    );
  }

  // ERROR STATE
  if (catalogError) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <X size={32} className="text-red-600" />
        </div>
        <p className="text-xl text-gray-900 mb-2">Failed to load catalog</p>
        <p className="text-sm text-gray-600 mb-6 text-center">{catalogError}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // SCREEN: JOIN SESSION
  if (currentScreen === 'join') {
    // Check if session failed to load or doesn't exist
    const sessionNotFound = !sessionLoading && !session && joinSessionId;

    if (sessionNotFound) {
      return (
        <div className="max-w-md mx-auto bg-white min-h-screen">
          <div className="p-6 flex flex-col items-center justify-center min-h-screen">
            <div className="w-16 h-16 mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
              <X size={32} className="text-red-600" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Session not found</h1>
            <p className="text-sm text-gray-600 mb-8 text-center max-w-sm">
              This shopping list has expired or doesn't exist anymore.
            </p>

            <div className="space-y-3 w-full">
              <button
                onClick={() => {
                  setCurrentScreen('host-create');
                }}
                className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold transition-colors"
              >
                Start your own list
              </button>
              <button
                onClick={() => {
                  setCurrentScreen('home');
                }}
                className="w-full py-4 border-2 border-gray-300 hover:border-green-600 text-gray-900 hover:text-green-600 rounded-xl text-base font-medium transition-colors"
              >
                Go to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-100 flex items-center justify-center">
              <Users size={32} className="text-green-600" strokeWidth={2.5} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Join shopping list</h1>
            <p className="text-sm text-gray-600">
              Someone invited you to their Minibag!
            </p>
          </div>

          {/* Session Info (if loaded) */}
          {session && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <MapPin size={16} className="text-gray-600" />
                <p className="text-sm text-gray-900 font-medium">{session.location_text || 'Local area'}</p>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <Clock size={16} className="text-gray-600" />
                <p className="text-sm text-gray-600">
                  {session.scheduled_time ? new Date(session.scheduled_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Soon'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ShoppingBag size={16} className="text-gray-600" />
                <p className="text-sm text-gray-600">
                  {session.items?.length || 0} items in list
                </p>
              </div>
            </div>
          )}

          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              What's your name?
            </label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => {
                // Allow only letters and spaces
                const value = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                setParticipantName(value);
              }}
              placeholder="Enter your name"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-600 focus:outline-none text-base"
              maxLength={50}
              autoFocus
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              We'll use this for payment splits & receipts
            </p>
          </div>

          {/* Nickname Selection */}
          <div className="mb-6" data-tour="participant-nickname-selection">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Choose your shopping buddy name
            </label>
            {loadingNicknames ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 size={24} className="animate-spin text-green-600" />
              </div>
            ) : (
              <div className="flex justify-center gap-8">
                {nicknameOptions.map((option, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setSelectedNickname(option)}
                    className="flex flex-col items-center"
                  >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                      selectedNickname?.nickname === option.nickname
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
            <p className="mt-3 text-xs text-gray-500 text-center">
              How you'll appear to other shoppers
            </p>
          </div>

          {/* Join Button */}
          <button
            onClick={handleJoinSession}
            disabled={joiningSession || !participantName.trim() || !selectedNickname}
            className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
          >
            {joiningSession ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Check size={20} />
                Join list
              </>
            )}
          </button>

          {/* Error Display */}
          {sessionError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{sessionError}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SCREEN 0: HOME
  if (currentScreen === 'home') {
    return (
      <HomeScreen
        showPlusMenu={showPlusMenu}
        setShowPlusMenu={setShowPlusMenu}
        onCreateSession={() => setCurrentScreen('host-create')}
        showSignUpModal={showSignUpModal}
        setShowSignUpModal={setShowSignUpModal}
        signUpContext={signUpContext}
        setSignUpContext={setSignUpContext}
      />
    );
  }

  // SCREEN 1: CREATE SESSION
  if (currentScreen === 'host-create') {

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        <div className="p-6">
          {/* Progress indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Step 1 of 4</p>
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-600">{totalWeight}kg added</p>
                {i18n && i18n.language && (
                  <>
                    <span className="text-gray-300">•</span>
                    <LanguageSwitcher currentLanguage={i18n.language} onLanguageChange={handleLanguageChange} />
                  </>
                )}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-600 h-1.5 rounded-full" style={{width: '25%'}}></div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-lg font-semibold text-gray-900">Add Items</p>
          </div>

          {/* Category circles */}
          <div className="mb-6 -mx-2">
            <div className="flex gap-4 overflow-x-auto pb-4 px-2" data-tour="category-filters">
              {CATEGORIES.map(cat => {
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

          {/* Search with Voice */}
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
                          const newVal = Math.max(0, quantity - 0.5);
                          if (newVal === 0) {
                            const { [veg.id]: _, ...rest } = hostItems;
                            setHostItems(rest);
                          } else {
                            setHostItems({ ...hostItems, [veg.id]: newVal });
                          }
                        }}
                        className="w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0"
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
                            // Ensure valid value on blur
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val <= 0) {
                              setHostItems({ ...hostItems, [veg.id]: 0.25 });
                            }
                          }}
                          className="w-14 text-base text-gray-900 text-center border-b-2 border-gray-300 focus:border-gray-900 focus:outline-none py-1"
                        />
                        <span className="text-sm text-gray-600">kg</span>
                      </div>
                      <button
                        onClick={() => {
                          if (totalWeight < 10) {
                            setHostItems({ ...hostItems, [veg.id]: quantity + 0.5 });
                          }
                        }}
                        disabled={totalWeight >= 10}
                        className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center disabled:bg-gray-400 disabled:hover:bg-gray-400 flex-shrink-0 transition-colors"
                      >
                        <Plus size={16} className="text-white" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (totalWeight < 10) {
                          setHostItems({ ...hostItems, [veg.id]: 0.5 });
                          setSearchQuery(''); // Clear search after adding item
                        }
                      }}
                      disabled={totalWeight >= 10}
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
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
              <button
                onClick={handleCreateSessionClick}
                disabled={creatingSession}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:hover:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {creatingSession ? (
                  <>
                    <Loader2 size={20} className="animate-spin" strokeWidth={2} />
                    Creating...
                  </>
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

  // Handle share functionality - Open WhatsApp directly
  const handleShare = async () => {
    if (!session) return;

    const shareUrl = `${window.location.origin}/join/${session.session_id}`;
    // Use localized message if available, otherwise fallback to English
    const shareText = t('whatsapp.invitation', {
      url: shareUrl,
      defaultValue: `Hey! I'm going shopping soon.\n\nWant to add anything to the list? I'll grab it for you.\n\nJoin here: ${shareUrl}`
    });

    // Try native share sheet first (works on mobile and some desktop browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my Minibag shopping list',
          text: shareText,
          url: shareUrl
        });
        console.log('✅ Shared successfully');
      } catch (error) {
        // User cancelled the share or error occurred
        if (error.name !== 'AbortError') {
          console.error('❌ Error sharing:', error);
          // Fallback to WhatsApp if share fails
          const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
          window.open(whatsappUrl, '_blank');
        }
      }
    } else {
      // Fallback for browsers that don't support Web Share API (mostly desktop)
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  // SCREEN: PARTICIPANT ADD ITEMS (from host's catalog)
  if (currentScreen === 'participant-add-items') {
    // Get current participant's items
    const currentParticipantItems = participants.find(p => p.name === selectedParticipant)?.items || {};
    const totalWeight = getTotalWeight(currentParticipantItems);

    // Only show items that the host has selected
    const hostSelectedItems = VEGETABLES.filter(v => hostItems[v.id]);

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-32">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6" data-tour="participant-catalog-info">
            <button
              onClick={() => setCurrentScreen('session-active')}
              className="mb-4 text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <p className="text-2xl text-gray-900 mb-2">Add your items</p>
            <p className="text-sm text-gray-600">Select from host's list</p>
          </div>

          {/* Weight indicator */}
          <div className="mb-6 flex justify-between items-center">
            <p className="text-base text-gray-900">Your bag</p>
            <p className={`text-base ${totalWeight >= 10 ? 'text-red-600' : 'text-gray-900'}`}>
              {totalWeight}kg / 10kg
            </p>
          </div>

          {/* Items from host's selection */}
          <div className="divide-y divide-gray-200">
            {hostSelectedItems.map(veg => {
              const quantity = currentParticipantItems[veg.id] || 0;
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
                    <p className="text-base text-gray-900 truncate">{getItemName(veg)}</p>
                    {getItemSubtitles(veg) && (
                      <p className="text-xs text-gray-500 truncate">{getItemSubtitles(veg)}</p>
                    )}
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const newVal = Math.max(0, quantity - 0.5);
                          const updatedParticipants = participants.map(p => {
                            if (p.name === selectedParticipant) {
                              const newItems = { ...p.items };
                              if (newVal === 0) {
                                delete newItems[veg.id];
                              } else {
                                newItems[veg.id] = newVal;
                              }
                              return { ...p, items: newItems };
                            }
                            return p;
                          });
                          setParticipants(updatedParticipants);
                        }}
                        className="w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0"
                      >
                        <Minus size={16} strokeWidth={2} />
                      </button>
                      <div className="flex items-center gap-1">
                        <span className="text-base text-gray-900">{quantity}</span>
                        <span className="text-sm text-gray-600">kg</span>
                      </div>
                      <button
                        onClick={() => {
                          if (totalWeight < 10) {
                            const updatedParticipants = participants.map(p => {
                              if (p.name === selectedParticipant) {
                                return { ...p, items: { ...p.items, [veg.id]: quantity + 0.5 } };
                              }
                              return p;
                            });
                            setParticipants(updatedParticipants);
                          }
                        }}
                        disabled={totalWeight >= 10}
                        className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center disabled:bg-gray-400 disabled:hover:bg-gray-400 flex-shrink-0 transition-colors"
                      >
                        <Plus size={16} className="text-white" strokeWidth={2.5} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (totalWeight < 10) {
                          const updatedParticipants = participants.map(p => {
                            if (p.name === selectedParticipant) {
                              return { ...p, items: { ...p.items, [veg.id]: 0.5 } };
                            }
                            return p;
                          });
                          setParticipants(updatedParticipants);
                        }
                      }}
                      disabled={totalWeight >= 10}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:bg-gray-400 disabled:hover:bg-gray-400 transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {hostSelectedItems.length === 0 && (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500">Host hasn't selected any items yet</p>
            </div>
          )}
        </div>

        {/* Done button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
          <button
            onClick={() => setCurrentScreen('session-active')}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 2: SESSION ACTIVE (with avatar circles)
  if (currentScreen === 'session-active') {
    const allItems = { ...hostItems };
    participants.forEach(p => {
      Object.entries(p.items || {}).forEach(([id, qty]) => {
        allItems[id] = (allItems[id] || 0) + qty;
      });
    });

    const selectedItems = selectedParticipant === 'host'
      ? hostItems
      : (participants.find(p => p.name === selectedParticipant)?.items || {});

    // Get session info
    const sessionCode = session?.session_id || 'loading...';
    const hostNickname = currentParticipant?.nickname || 'You';

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        <div className="p-6">
          {/* Progress indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => currentParticipant?.is_creator && setCurrentScreen('host-create')}
                data-tour="back-button"
                className={`text-sm font-medium ${currentParticipant?.is_creator ? 'text-green-600 hover:text-green-700 cursor-pointer' : 'text-gray-900 cursor-default'}`}
              >
                ← Step 2 of 4
              </button>
              <div className="flex items-center gap-3 relative">
                <div className="flex items-center gap-1.5" data-tour="live-indicator">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm text-green-600 font-medium">Live</p>
                </div>
                {i18n && i18n.language && (
                  <>
                    <span className="text-gray-300">•</span>
                    <LanguageSwitcher currentLanguage={i18n.language} onLanguageChange={handleLanguageChange} />
                  </>
                )}
                {/* Three-dot menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowSessionMenu(!showSessionMenu)}
                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <MoreVertical size={18} className="text-gray-600" />
                  </button>

                  {showSessionMenu && (
                    <>
                      {/* Backdrop to close menu */}
                      <div
                        onClick={() => setShowSessionMenu(false)}
                        className="fixed inset-0 z-30"
                      />

                      {/* Menu dropdown */}
                      <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-40 w-48">
                        <button
                          onClick={() => {
                            setShowSessionMenu(false);
                            // Reset to home screen
                            setCurrentScreen('home');
                            // Clear session data
                            setHostItems({});
                            setParticipants([]);
                            setSelectedParticipant('host');
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-2 text-red-600 hover:text-red-700"
                        >
                          <X size={16} />
                          <span className="font-medium">End Session</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-600 h-1.5 rounded-full" style={{width: '50%'}}></div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-semibold text-gray-900">Share & Collaborate</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={12} />
                <span>4 hour session</span>
              </div>
            </div>
            {currentParticipant && (
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                <span className="text-lg">{currentParticipant.avatar_emoji}</span>
                <p className="text-sm text-green-800">
                  You're joined as <span className="font-semibold">{hostNickname}</span>
                </p>
              </div>
            )}
          </div>

          {/* Avatar circles with gradient - 4 slots total */}
          <div className="mb-6" data-tour="participants-list">
            <p className="text-sm text-gray-600 mb-4">
              {participants.length === 0 ? 'Shopping solo' : `${participants.length + 1} of 4 people`}
            </p>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-2">
              {/* Host slot */}
              <ParticipantAvatar
                displayText={hostNickname}
                label="Host"
                isSelected={selectedParticipant === 'host'}
                hasItems={Object.keys(hostItems).length > 0}
                onClick={() => setSelectedParticipant('host')}
              />

              {/* Participant slots - show 3 slots total */}
              {[0, 1, 2].map((slotIndex) => {
                const participant = participants[slotIndex];

                if (participant) {
                  // Active participant slot
                  return (
                    <ParticipantAvatar
                      key={participant.name}
                      displayText={participant.name.slice(0, 2).toUpperCase()}
                      label={participant.name}
                      isSelected={selectedParticipant === participant.name}
                      hasItems={Object.keys(participant.items || {}).length > 0}
                      onClick={() => setSelectedParticipant(participant.name)}
                    />
                  );
                } else {
                  // Empty slot
                  return (
                    <div
                      key={`empty-${slotIndex}`}
                      className="flex flex-col items-center flex-shrink-0 opacity-30"
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-2 border-2 border-dashed border-gray-300 bg-gray-50">
                        <Users size={24} className="text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-400">Empty</p>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* Selected participant's items */}
          <div className="mb-6">
            <p className="text-base text-gray-900 mb-4">
              {selectedParticipant === 'host' ? 'Your items' : `${selectedParticipant}'s items`}
            </p>

            <ItemList
              emptyMessage={selectedParticipant === 'host' ? 'No items added' : 'Selecting items...'}
            >
              {Object.entries(selectedItems).map(([itemId, qty]) => {
                const veg = VEGETABLES.find(v => v.id === itemId);
                return (
                  <ItemRow
                    key={itemId}
                    imageUrl={veg.thumbnail_url || veg.img}
                    name={getItemName(veg)}
                    subtitle={`${qty}kg`}
                  />
                );
              })}
            </ItemList>

            {/* Add Items button - for participants to add from host's catalog */}
            {selectedParticipant === 'host' && currentParticipant?.is_creator && Object.keys(hostItems).length === 0 && (
              <button
                onClick={() => setCurrentScreen('host-create')}
                className="mt-4 w-full border-2 border-green-600 bg-white hover:bg-green-50 text-green-700 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                <span className="font-semibold">Add items to your list</span>
              </button>
            )}

            {!currentParticipant?.is_creator && selectedParticipant !== 'host' && Object.keys(hostItems).length > 0 && (
              <button
                onClick={() => setCurrentScreen('participant-add-items')}
                data-tour="participant-add-items-button"
                className="mt-4 w-full border-2 border-green-600 bg-white hover:bg-green-50 text-green-700 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                <span className="font-semibold">Add items from host's list</span>
              </button>
            )}
          </div>

          {/* Group total */}
          <div className="border-t-2 border-gray-900 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <p className="text-base text-gray-900">Group total</p>
              <p className="text-2xl text-gray-900">{getTotalWeight(allItems)}kg</p>
            </div>
          </div>

          {/* Invite or Continue Solo Section - Only for Host */}
          {currentParticipant?.is_creator && (
            <div className="mb-6 space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-3">
                {participants.length >= 3
                  ? 'List is full (4/4 people)'
                  : participants.length === 0
                    ? 'Shop with friends or continue solo'
                    : 'Invite more friends'}
              </p>

              {/* Invite buttons - WhatsApp + Copy Link */}
              <div className="flex gap-3 mb-3">
                {/* WhatsApp Share Button */}
                <button
                  onClick={handleShare}
                  disabled={!session || participants.length >= 3}
                  data-tour="share-button"
                  className="flex-1 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 py-3.5 px-4 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Share2 size={18} strokeWidth={2} />
                    <span className="font-semibold">Invite friends</span>
                  </div>
                </button>

                {/* Copy Link Icon Button */}
                <button
                  onClick={async () => {
                    if (!session || participants.length >= 3) return;
                    const shareUrl = `${window.location.origin}/join/${session.session_id}`;
                    // Use the same message as WhatsApp share
                    const shareText = t('whatsapp.invitation', {
                      url: shareUrl,
                      defaultValue: `Hey! I'm going shopping soon.\n\nWant to add anything to the list? I'll grab it for you.\n\nJoin here: ${shareUrl}`
                    });
                    try {
                      await navigator.clipboard.writeText(shareText);
                      alert('✓ Invitation copied to clipboard!');
                    } catch (error) {
                      // Fallback for browsers that don't support clipboard API
                      alert(`Copy this message:\n\n${shareText}`);
                    }
                  }}
                  disabled={!session || participants.length >= 3}
                  className="w-14 h-14 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  title="Copy invite message"
                >
                  <Copy size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Test button removed for field testing */}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto z-50">
          <button
            onClick={() => setCurrentScreen('shopping')}
            disabled={Object.keys(allItems).length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Start shopping
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 3: SHOPPING (Payment Recording)
  if (currentScreen === 'shopping') {
    const allItems = { ...hostItems };
    participants.forEach(p => {
      Object.entries(p.items || {}).forEach(([id, qty]) => {
        allItems[id] = (allItems[id] || 0) + qty;
      });
    });

    const hostNickname = currentParticipant?.nickname || 'You';
    const totalPaid = Object.values(itemPayments).reduce((sum, p) => sum + (p?.amount || 0), 0);
    const allItemsPaid = Object.keys(allItems).every(id => itemPayments[id]);

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-32">
        <div className="p-6">
          {/* Progress indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Step 3 of 4</p>
              <p className="text-sm text-gray-600">₹{totalPaid} paid</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-600 h-1.5 rounded-full" style={{width: '75%'}}></div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-lg font-semibold text-gray-900 mb-3">Record Payments</p>
            <div className="flex justify-between items-center text-sm">
              <p className="text-gray-600">Items paid: {Object.keys(itemPayments).length}/{Object.keys(allItems).length}</p>
            </div>
          </div>

          <div className="divide-y divide-gray-200 mb-6">
            {Object.entries(allItems).map(([itemId, totalQty]) => {
              const veg = VEGETABLES.find(v => v.id === itemId);
              const payment = itemPayments[itemId];
              const isPaid = !!payment;

              // Skip if vegetable not found
              if (!veg) return null;

              // Calculate participant breakdown
              const breakdown = [];
              if (hostItems[itemId]) {
                breakdown.push({ name: hostNickname, qty: hostItems[itemId] });
              }
              participants.forEach(p => {
                if (p.items && p.items[itemId]) {
                  breakdown.push({ name: p.name, qty: p.items[itemId] });
                }
              });

              return (
                <div
                  key={itemId}
                  className={`flex items-start gap-3 py-3 px-2 ${
                    isPaid ? 'bg-gray-50' : ''
                  }`}
                >
                  {veg.thumbnail_url || veg.img ? (
                    <img
                      src={veg.thumbnail_url || veg.img}
                      alt={veg.name}
                      loading="lazy"
                      className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0 mt-1"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl mt-1" style={{display: (veg.thumbnail_url || veg.img) ? 'none' : 'flex'}}>
                    🥬
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-900 mb-1">{getItemName(veg)}</p>
                    <p className="text-sm text-gray-500">
                      {breakdown.map((b, idx) => (
                        <span key={idx}>
                          {b.name}: {b.qty}kg{idx < breakdown.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </p>
                    {isPaid && (
                      <p className="text-sm text-gray-900 mt-1">
                        ✓ ₹{payment.amount} • {payment.method === 'upi' ? 'UPI' : 'Cash'}
                      </p>
                    )}
                  </div>

                  {isPaid ? (
                    <button
                      onClick={() => {
                        setSelectedItemForPayment(itemId);
                        setShowPaymentModal(true);
                      }}
                      className="text-sm text-gray-600 px-4 py-2 flex-shrink-0"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedItemForPayment(itemId);
                        setShowPaymentModal(true);
                      }}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex-shrink-0 mt-1 transition-colors"
                    >
                      Pay
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment Modal */}
        {showPaymentModal && selectedItemForPayment && (
          <PaymentModal
            itemId={selectedItemForPayment}
            items={VEGETABLES}
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedItemForPayment(null);
            }}
            onConfirm={async (method, amount) => {
              try {
                // Record payment to backend
                const payment = await recordPayment(session.session_id, {
                  item_id: selectedItemForPayment,
                  amount: parseFloat(amount),
                  method: method,
                  recorded_by: currentParticipant?.id || null
                });

                // Update local state
                setItemPayments({
                  ...itemPayments,
                  [selectedItemForPayment]: {
                    id: payment.id,
                    method: payment.method,
                    amount: payment.amount
                  }
                });

                // Emit WebSocket event for real-time sync
                socketService.emitPaymentUpdate(session.session_id, payment);

                setShowPaymentModal(false);
                setSelectedItemForPayment(null);
              } catch (error) {
                console.error('Failed to record payment:', error);
                alert('Failed to record payment. Please try again.');
              }
            }}
          />
        )}

        {/* Done button */}
        {allItemsPaid && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
            <button
              onClick={() => setCurrentScreen('payment-split')}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Check size={20} strokeWidth={2.5} />
              Done shopping
            </button>
          </div>
        )}
      </div>
    );
  }

  // SCREEN 5: PAYMENT SPLIT (Host View)
  if (currentScreen === 'payment-split') {
    const allItems = { ...hostItems };
    participants.forEach(p => {
      Object.entries(p.items || {}).forEach(([id, qty]) => {
        allItems[id] = (allItems[id] || 0) + qty;
      });
    });

    const totalPaid = Object.values(itemPayments).reduce((sum, p) => sum + (p?.amount || 0), 0);

    // Calculate host cost
    let hostCost = 0;
    Object.entries(hostItems).forEach(([itemId, qty]) => {
      const payment = itemPayments[itemId];
      if (payment) {
        const totalQty = allItems[itemId];
        const pricePerKg = payment.amount / totalQty;
        hostCost += pricePerKg * qty;
      }
    });

    // Calculate participant costs
    const participantCosts = {};
    participants.forEach(p => {
      let cost = 0;
      Object.entries(p.items || {}).forEach(([itemId, qty]) => {
        const payment = itemPayments[itemId];
        if (payment) {
          const totalQty = allItems[itemId];
          const pricePerKg = payment.amount / totalQty;
          cost += pricePerKg * qty;
        }
      });
      participantCosts[p.name] = cost;
    });

    const totalToReceive = Object.values(participantCosts).reduce((sum, cost) => sum + cost, 0);

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        <div className="p-6">
          {/* Progress indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-900">Step 4 of 4</p>
              <p className="text-sm text-green-600 font-medium">Complete</p>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-green-600 h-1.5 rounded-full" style={{width: '100%'}}></div>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-lg font-semibold text-gray-900">Split Costs</p>
          </div>

          <div className="border-2 border-gray-900 rounded-lg p-6 mb-6 text-center">
            <p className="text-sm text-gray-600 mb-2">Total spent</p>
            <p className="text-4xl text-gray-900">₹{totalPaid.toFixed(0)}</p>
          </div>

          <div className="mb-6 py-4 border-t border-b border-gray-300">
            <div className="flex justify-between items-center">
              <p className="text-base text-gray-900">Your cost</p>
              <p className="text-2xl text-gray-900">₹{hostCost.toFixed(0)}</p>
            </div>
          </div>

          {/* Show different text for solo vs group shopping */}
          <p className="text-base text-gray-900 mb-4">
            {participants.length === 0 ? 'Your shopping summary' : 'Collect from others'}
          </p>

          {/* Solo shopper summary */}
          {participants.length === 0 && (
            <div className="border border-gray-300 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-600 space-y-2">
                {Object.entries(hostItems).map(([itemId, qty]) => {
                  const veg = VEGETABLES.find(v => v.id === itemId);
                  const payment = itemPayments[itemId];
                  if (!payment) {
                    return (
                      <div key={itemId} className="flex justify-between items-center py-2">
                        <div>
                          <p className="text-base text-gray-900">{getItemName(veg)}</p>
                          <p className="text-xs text-gray-500">{qty}kg</p>
                        </div>
                        <p className="text-sm text-gray-400">-</p>
                      </div>
                    );
                  }
                  const totalQty = allItems[itemId];
                  const pricePerKg = payment.amount / totalQty;
                  const itemCost = pricePerKg * qty;
                  return (
                    <div key={itemId} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-base text-gray-900">{getItemName(veg)}</p>
                        <p className="text-xs text-gray-500">{qty}kg × ₹{pricePerKg.toFixed(0)}/kg</p>
                      </div>
                      <p className="text-base text-gray-900 font-medium">₹{itemCost.toFixed(0)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {participants.map(p => {
              const owes = participantCosts[p.name];
              return (
                <div key={p.name} className="border border-gray-300 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 text-xs flex-shrink-0">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-base text-gray-900">{p.name}</p>
                    </div>
                    <p className="text-xl text-gray-900">₹{owes.toFixed(0)}</p>
                  </div>

                  <div className="text-sm text-gray-600 space-y-1 pt-3 border-t border-gray-200 mb-4">
                    {Object.entries(p.items || {}).map(([itemId, qty]) => {
                      const veg = VEGETABLES.find(v => v.id === itemId);
                      const payment = itemPayments[itemId];
                      if (!payment) return null;
                      const totalQty = allItems[itemId];
                      const pricePerKg = payment.amount / totalQty;
                      const itemCost = pricePerKg * qty;
                      return (
                        <div key={itemId} className="flex justify-between">
                          <span>{getItemName(veg)} {qty}kg @ ₹{pricePerKg.toFixed(0)}/kg</span>
                          <span>₹{itemCost.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => {
                      const itemsList = Object.entries(p.items || {})
                        .map(([itemId, qty]) => {
                          const veg = VEGETABLES.find(v => v.id === itemId);
                          const payment = itemPayments[itemId];
                          if (!payment) return null;
                          const totalQty = allItems[itemId];
                          const pricePerKg = payment.amount / totalQty;
                          const itemCost = pricePerKg * qty;
                          return `${getItemName(veg)} ${qty}kg - ₹${Math.round(itemCost)}`;
                        })
                        .filter(Boolean)
                        .join('%0A');

                      const billUrl = `${window.location.origin}/bill/${session.session_id}/${p.id || p.name.toLowerCase()}`;
                      const message = encodeURIComponent(`Hi! Your shopping bill is ready.\n\nBag tag: "${p.name}"\n\n${itemsList.replace(/%0A/g, '\n')}\n\nTotal: ₹${Math.round(owes)}\n\nView & pay: ${billUrl}`);

                      window.open(`https://wa.me/?text=${message}`, '_blank');
                    }}
                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                  >
                    Send payment request
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">You'll receive</p>
              <p className="text-2xl text-gray-900">₹{totalToReceive.toFixed(0)}</p>
            </div>
            <button
              onClick={() => setCurrentScreen('home')}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-base font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 6: PARTICIPANT BILL (accessed via WhatsApp link)
  if (currentScreen === 'participant-bill') {
    return (
      <ParticipantBillScreen
        participants={participants}
        hostItems={hostItems}
        itemPayments={itemPayments}
        items={items}
        getItemName={getItemName}
        onGoHome={() => setCurrentScreen('home')}
      />
    );
  }

  return null;
}
