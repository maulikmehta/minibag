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
import ShoppingScreen from './src/screens/ShoppingScreen.jsx';
import PaymentSplitScreen from './src/screens/PaymentSplitScreen.jsx';
import SessionActiveScreen from './src/screens/SessionActiveScreen.jsx';
import SessionCreateScreen from './src/screens/SessionCreateScreen/index.jsx';
import JoinSessionScreen from './src/screens/JoinSessionScreen/index.jsx';
import ParticipantAddItemsScreen from './src/screens/ParticipantAddItemsScreen/index.jsx';
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
    leave: leaveSession,
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
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showSessionMenu, setShowSessionMenu] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState('host');
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpContext, setSignUpContext] = useState('');
  const [itemPayments, setItemPayments] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);

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
        console.error('Failed to load session:', err);
      });
    }
  }, [billSessionId, billParticipantId, currentScreen, loadSession]);

  // Redirect to session-active if session is restored from localStorage
  React.useEffect(() => {
    if (session && currentParticipant && currentScreen === 'home' && !joinSessionId && !billSessionId) {
      console.log('Session restored from localStorage, redirecting to session-active');
      setCurrentScreen('session-active');
    }
  }, [session, currentParticipant, currentScreen, joinSessionId, billSessionId]);

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

  // On-demand tour handler - triggered by help icon
  const handleHelpClick = useCallback(() => {
    // Determine which tour to show based on current screen
    switch (currentScreen) {
      case 'home':
        showScreenTour(GUIDED_TOUR_STEPS, 'home');
        break;
      case 'host-create':
        showScreenTour(HOST_CREATE_TOUR_STEPS, 'host-create');
        break;
      case 'session-active':
        if (currentParticipant?.is_creator) {
          showScreenTour(SESSION_ACTIVE_TOUR_STEPS, 'session-active');
        } else {
          showScreenTour(PARTICIPANT_SESSION_TOUR_STEPS, 'participant-session');
        }
        break;
      case 'join':
        showScreenTour(PARTICIPANT_JOIN_TOUR_STEPS, 'participant-join');
        break;
      case 'participant-add-items':
        showScreenTour(PARTICIPANT_ADD_ITEMS_TOUR_STEPS, 'participant-add-items');
        break;
      default:
        console.log('No tour available for screen:', currentScreen);
    }
  }, [currentScreen, currentParticipant, showScreenTour]);

  // AUTO-LOAD TOURS REMOVED - Now using on-demand help icon instead
  // All tours are now triggered by clicking the help (?) icon in the header

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


  // Memoize totalWeight calculation (must be at top level, before any conditional returns)
  const totalWeight = useMemo(() => getTotalWeight(hostItems), [hostItems, getTotalWeight]);


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
    return (
      <JoinSessionScreen
        session={session}
        sessionLoading={sessionLoading}
        sessionError={sessionError}
        joinSessionId={joinSessionId}
        participants={participants}
        joinSession={joinSession}
        onJoinSuccess={() => setCurrentScreen('session-active')}
        onNavigateToHome={() => setCurrentScreen('home')}
        onNavigateToCreate={() => setCurrentScreen('host-create')}
      />
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
      <SessionCreateScreen
        categories={CATEGORIES}
        items={items}
        vegCategoryIds={vegCategoryIds}
        session={session}
        currentParticipant={currentParticipant}
        createSession={createSession}
        getItemName={getItemName}
        getItemSubtitles={getItemSubtitles}
        getTotalWeight={getTotalWeight}
        onSessionCreated={() => setCurrentScreen('session-active')}
      />
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
    return (
      <ParticipantAddItemsScreen
        participants={participants}
        selectedParticipant={selectedParticipant}
        hostItems={hostItems}
        items={VEGETABLES}
        getItemName={getItemName}
        getItemSubtitles={getItemSubtitles}
        getTotalWeight={getTotalWeight}
        onUpdateParticipants={setParticipants}
        onBack={() => setCurrentScreen('session-active')}
      />
    );
  }

  // SCREEN 2: SESSION ACTIVE (with avatar circles)
  if (currentScreen === 'session-active') {
    return (
      <SessionActiveScreen
        session={session}
        currentParticipant={currentParticipant}
        hostItems={hostItems}
        participants={participants}
        selectedParticipant={selectedParticipant}
        onSelectedParticipantChange={setSelectedParticipant}
        showSessionMenu={showSessionMenu}
        onShowSessionMenuChange={setShowSessionMenu}
        onNavigateBack={() => setCurrentScreen('host-create')}
        onNavigateToHostCreate={() => setCurrentScreen('host-create')}
        onNavigateToParticipantAddItems={() => setCurrentScreen('participant-add-items')}
        onNavigateToShopping={() => setCurrentScreen('shopping')}
        onEndSession={() => {
          leaveSession(); // Clear session from state and localStorage
          setCurrentScreen('home');
          setHostItems({});
          setParticipants([]);
          setSelectedParticipant('host');
        }}
        items={VEGETABLES}
        getItemName={getItemName}
        getTotalWeight={getTotalWeight}
        handleShare={handleShare}
        handleLanguageChange={handleLanguageChange}
        onHelpClick={handleHelpClick}
      />
    );
  }

  // SCREEN 3: SHOPPING (Payment Recording)
  if (currentScreen === 'shopping') {
    return (
      <ShoppingScreen
        hostItems={hostItems}
        participants={participants}
        itemPayments={itemPayments}
        items={items}
        getItemName={getItemName}
        currentParticipant={currentParticipant}
        showPaymentModal={showPaymentModal}
        setShowPaymentModal={setShowPaymentModal}
        selectedItemForPayment={selectedItemForPayment}
        setSelectedItemForPayment={setSelectedItemForPayment}
        onRecordPayment={async (itemId, method, amount) => {
          try {
            // Record payment to backend
            const payment = await recordPayment(session.session_id, {
              item_id: itemId,
              amount: parseFloat(amount),
              method: method,
              recorded_by: currentParticipant?.id || null
            });

            // Update local state
            setItemPayments({
              ...itemPayments,
              [itemId]: {
                id: payment.id,
                method: payment.method,
                amount: payment.amount
              }
            });

            // Emit WebSocket event for real-time sync
            socketService.emitPaymentUpdate(session.session_id, payment);
          } catch (error) {
            console.error('Failed to record payment:', error);
            alert('Failed to record payment. Please try again.');
          }
        }}
        onDoneShopping={() => setCurrentScreen('payment-split')}
      />
    );
  }

  // SCREEN 5: PAYMENT SPLIT (Host View)
  if (currentScreen === 'payment-split') {
    return (
      <PaymentSplitScreen
        hostItems={hostItems}
        participants={participants}
        itemPayments={itemPayments}
        items={items}
        getItemName={getItemName}
        session={session}
        onDone={() => setCurrentScreen('home')}
      />
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
