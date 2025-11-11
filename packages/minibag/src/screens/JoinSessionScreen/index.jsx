import React, { useState, useEffect } from 'react';
import { Check, X, Users, Loader2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import AppHeader from '../../components/layout/AppHeader.jsx';
import { useNotification } from '../../hooks/useNotification.js';
import { VALIDATION_LIMITS } from '@shared/constants/limits.js';
import { ERROR_MESSAGES } from '@shared/constants/errorMessages.js';

export default function JoinSessionScreen({
  session,
  sessionLoading,
  sessionError,
  joinSessionId,
  participants,
  items,
  getItemName,
  hostItems,
  joinSession,
  onJoinSuccess,
  onNavigateToHome,
  onNavigateToCreate,
  i18n,
  handleLanguageChange
}) {
  const notify = useNotification();

  // Local state for this screen
  const [joiningSession, setJoiningSession] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [nicknameOptions, setNicknameOptions] = useState([]);
  const [selectedNickname, setSelectedNickname] = useState(null);
  const [loadingNicknames, setLoadingNicknames] = useState(false);
  const [inviteToken, setInviteToken] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false); // Modal for collecting user info
  const [modalStep, setModalStep] = useState(1); // 1: Name, 2: Language, 3: Nickname
  const [showBigCheck, setShowBigCheck] = useState(null); // Track which avatar shows big checkmark

  // PIN authentication state (for protected sessions)
  const [sessionPin, setSessionPin] = useState('');

  // Extract invite token from URL query parameter (Issue #14)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inv = urlParams.get('inv');
    if (inv) {
      // Validate format: 8-character hex string (matches generateInviteToken)
      if (/^[a-f0-9]{8}$/i.test(inv)) {
        setInviteToken(inv);
      } else {
        console.warn('Invalid invite token format', { token: inv });
        notify.warning('Invalid invite link format. Please check your link and try again.');
      }
    }
  }, [notify]);

  // Fetch nickname options with debouncing and immediate fallback (Issues #11, #15)
  // Initialize fallback nicknames once on mount (Issue #15)
  useEffect(() => {
    setNicknameOptions([
      { nickname: 'Raj', avatar_emoji: '👨', gender: 'male', fallback: true, id: 'fallback-male-default' },
      { nickname: 'Ria', avatar_emoji: '👩', gender: 'female', fallback: true, id: 'fallback-female-default' }
    ]);
    setSelectedNickname({ nickname: 'Raj', avatar_emoji: '👨', gender: 'male', fallback: true, id: 'fallback-male-default' });
  }, []); // Run once on mount

  // Fetch nickname options when participant name changes (Issue #11)
  useEffect(() => {
    // Skip if no name entered yet
    if (!participantName.trim()) return;

    // Skip if already loading
    if (loadingNicknames) return;

    // Debounce: wait 300ms after user stops typing
    const timeoutId = setTimeout(() => {
      setLoadingNicknames(true);

      // Extract first letter for personalized matches
      const firstLetter = participantName.trim().charAt(0).toUpperCase();

      // Build URL with optional sessionUuid parameter (for reservation)
      // Use session.id (UUID) not joinSessionId (TEXT) for proper reservation
      let url = `/api/sessions/nickname-options?firstLetter=${firstLetter}`;

      // Add session UUID for reservation (prevent race conditions)
      // Only include if session is loaded with valid UUID
      if (session?.id) {
        url += `&sessionUuid=${session.id}`;
      }

      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data && data.data.length > 0) {
            // Replace fallback with real options (Issue #15)
            setNicknameOptions(data.data);
            setSelectedNickname(data.data[0]);
          }
          // Keep fallback options if API returns empty
        })
        .catch(err => {
          console.error('Failed to fetch nickname options:', err);
          // Keep fallback options on error (Issue #15)
        })
        .finally(() => {
          setLoadingNicknames(false);
        });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [participantName, session?.id]); // Only re-run when name or session UUID changes

  // Handle joining a session - now shows modal first
  const handleJoinClick = () => {
    // Check if session is full (max 4 people: 1 host + 3 participants)
    if (participants.length >= 3) {
      notify.error('This shopping list is full! Only 4 people can shop together at once.');
      return;
    }

    // Show modal to collect user info
    setShowJoinModal(true);
    setModalStep(1);
  };

  // Handle actual join after modal completion
  const handleConfirmJoin = async () => {
    if (!participantName.trim()) {
      notify.warning('Please enter your name');
      return;
    }

    if (!selectedNickname) {
      notify.warning('Please select a nickname');
      return;
    }

    // CRITICAL: Validate nickname has required fields (Issue #4)
    if (!selectedNickname.nickname || !selectedNickname.avatar_emoji) {
      notify.error(ERROR_MESSAGES.MISSING_NICKNAME_DATA);
      console.error('Invalid nickname data', { selectedNickname });
      return;
    }

    // Validate PIN if session requires it (Issue #10)
    if (session?.requires_pin) {
      if (!sessionPin || sessionPin.trim().length === 0) {
        notify.warning(ERROR_MESSAGES.MISSING_PIN);
        return;
      }

      if (sessionPin.trim().length < VALIDATION_LIMITS.MIN_PIN_LENGTH || sessionPin.trim().length > VALIDATION_LIMITS.MAX_PIN_LENGTH) {
        notify.warning(ERROR_MESSAGES.INVALID_PIN_LENGTH);
        return;
      }

      const pinRegex = new RegExp(`^\\d{${VALIDATION_LIMITS.MIN_PIN_LENGTH},${VALIDATION_LIMITS.MAX_PIN_LENGTH}}$`);
      if (!pinRegex.test(sessionPin.trim())) {
        notify.warning(ERROR_MESSAGES.INVALID_PIN_FORMAT);
        return;
      }
    }

    try {
      setJoiningSession(true);

      // Join session via API with nickname selection and PIN (if required)
      const result = await joinSession(joinSessionId, [], {
        real_name: participantName,
        selected_nickname_id: selectedNickname.id || null, // Fallback nicknames don't have ID
        selected_nickname: selectedNickname.nickname,
        selected_avatar_emoji: selectedNickname.avatar_emoji,
        invite_token: inviteToken, // Include invite token if present
        session_pin: sessionPin.trim() || null // Include PIN if provided
      });

      console.log('✅ Joined session:', result);

      // Navigate to session-active screen
      onJoinSuccess();
    } catch (error) {
      console.error('❌ Failed to join session:', error);
      // Check error type
      if (error.message && error.message.includes('full')) {
        notify.error('This shopping list is full! Only 4 people can shop together at once.');
      } else if (error.message && error.message.includes('expired')) {
        notify.error('This invite link expired after 20 minutes. Please ask the person who invited you for a new link.');
      } else {
        notify.error(error.userMessage || 'Unable to join this shopping list. Please check the link and try again.');
      }
    } finally {
      setJoiningSession(false);
    }
  };

  // Handle declining a session
  const handleDeclineSession = async () => {
    // If no nickname available yet, just navigate away silently
    if (!selectedNickname) {
      onNavigateToHome();
      return;
    }

    try {
      setJoiningSession(true);

      // Join session with marked_not_coming: true to notify host of decline
      // Use provided name or placeholder for anonymous declines
      await joinSession(joinSessionId, [], {
        real_name: participantName.trim() || 'Declined User',
        selected_nickname_id: selectedNickname.id || null, // Fallback nicknames don't have ID
        selected_nickname: selectedNickname.nickname,
        selected_avatar_emoji: selectedNickname.avatar_emoji,
        marked_not_coming: true,
        invite_token: inviteToken // Include invite token if present
      });

      console.log('✅ Declined session - host notified');

      // Show confirmation message and navigate immediately
      notify.info('You\'ve declined the invitation. The host has been notified.');
      onNavigateToHome();
    } catch (error) {
      console.error('❌ Failed to decline session:', {
        error,
        message: error.message,
        userMessage: error.userMessage,
        nickname: selectedNickname,
        participantName
      });

      // Distinguish error types for better user feedback
      if (error.message?.includes('network') || error.message?.includes('fetch')) {
        notify.warning('Network error - you may still be declined, but the host might not be notified.');
      } else if (error.message?.includes('validation') || error.message?.includes('required')) {
        notify.error('Unable to process decline. Please try again.');
      } else {
        // For other errors, still navigate but show a warning
        notify.warning('You\'ve declined, but there was an issue notifying the host.');
      }

      // Navigate away regardless - don't trap user on page
      onNavigateToHome();
    } finally {
      setJoiningSession(false);
    }
  };

  // Extract host nickname for personalized messaging
  const host = participants?.find(p => p.is_creator);
  const hostNickname = host?.nickname || session?.creator_nickname || 'Someone';

  // Filter items to show only what host has selected
  const hostSelectedItems = items?.filter(item => hostItems && hostItems[item.id]) || [];

  // Check if session failed to load or doesn't exist
  const sessionNotFound = !sessionLoading && !session && joinSessionId;

  // Check if invite link has expired
  const isInviteExpired = session?.is_invite_expired || false;

  if (sessionNotFound) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <AppHeader />
        <div className="p-6 flex flex-col items-center justify-center min-h-screen">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-red-100 flex items-center justify-center">
            <X size={32} className="text-red-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Session not found</h1>
          <p className="text-sm text-gray-600 mb-8 text-center max-w-sm">
            This shopping list has expired or doesn't exist anymore.
          </p>

          <div className="w-full flex justify-center">
            <button
              onClick={onNavigateToHome}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold transition-colors"
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isInviteExpired) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen">
        <AppHeader />
        <div className="p-6 flex flex-col items-center justify-center min-h-screen">
          <div className="w-16 h-16 mb-4 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Clock size={32} className="text-amber-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Invite link expired</h1>
          <p className="text-sm text-gray-600 mb-8 text-center max-w-sm">
            This invite link expired 20 minutes after the host set their expectations. Please ask the host to send a new invite link.
          </p>

          <div className="w-full flex justify-center">
            <button
              onClick={onNavigateToHome}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold transition-colors"
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
      <AppHeader />
      <div className="p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-green-100 flex items-center justify-center">
            <Users size={32} className="text-green-600" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join shopping list</h1>
          <p className="text-sm text-gray-600">
            {hostNickname} invited you to their Minibag!
          </p>
        </div>

        {/* Items Preview Section - Now shown first! */}
        {hostSelectedItems.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-900 mb-3">
              Items in this list ({hostSelectedItems.length})
            </p>
            <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
              {hostSelectedItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 py-3 px-3">
                  {/* Emoji */}
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-lg flex-shrink-0">
                    {item.emoji || '🥬'}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{getItemName(item)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PIN Input (if session requires it) - shown directly below items */}
        {session?.requires_pin && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Session PIN
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={sessionPin}
              onChange={(e) => {
                // Allow only digits up to max PIN length
                const value = e.target.value.replace(/\D/g, '').slice(0, VALIDATION_LIMITS.MAX_PIN_LENGTH);
                setSessionPin(value);
              }}
              placeholder={`Enter ${VALIDATION_LIMITS.MIN_PIN_LENGTH}-digit PIN`}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-600 focus:outline-none text-base"
              maxLength={VALIDATION_LIMITS.MAX_PIN_LENGTH}
              autoComplete="off"
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the PIN from your invite message
            </p>
          </div>
        )}

        {/* Join / Decline Buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={handleDeclineSession}
            disabled={joiningSession}
            className="flex-1 py-3 border-2 border-gray-300 hover:border-red-500 text-gray-900 hover:text-red-600 rounded-xl text-base font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={18} strokeWidth={2.5} />
            No Thanks
          </button>
          <button
            onClick={handleJoinClick}
            disabled={joiningSession}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-base font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Check size={18} strokeWidth={2.5} />
            Join List
          </button>
        </div>

        {/* Error Display */}
        {sessionError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{sessionError}</p>
          </div>
        )}
      </div>

      {/* Join Modal - Collect Name, Language, Nickname */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white rounded-modal max-w-sm w-full p-4 relative animate-modal-enter shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setShowJoinModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-all duration-150 active:scale-90"
            >
              <X size={24} />
            </button>

            {/* Modal Header */}
            <h2 className="text-lg font-bold text-gray-900 mb-3">Join the list</h2>

            {/* Dot Navigation */}
            <div className="flex gap-2 justify-center mb-4">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-2 h-2 rounded-full transition-all ${
                    step <= modalStep ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Step 1: Name Input */}
            {modalStep === 1 && (
              <div className="mb-4">
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
            )}

            {/* Step 2: Language Preference */}
            {modalStep === 2 && i18n && handleLanguageChange && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Choose your language
                </label>
                <div className="flex gap-3 justify-center">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('en')}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                      i18n.language === 'en'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('hi')}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
                      i18n.language === 'hi'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    हिंदी
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('gu')}
                    className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all ${
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
            {modalStep === 3 && (
              <div className="mb-4" data-tour="participant-nickname-selection">
                <div className="flex items-center gap-3 mb-3">
                  <label className="block text-sm font-medium text-gray-900">
                    Pick your bag tag
                  </label>
                  {loadingNicknames && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Loader2 size={12} className="animate-spin" />
                      Loading options...
                    </span>
                  )}
                </div>
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
                        onClick={() => {
                          setSelectedNickname(option);
                          // Trigger big checkmark animation
                          setShowBigCheck(option.nickname);
                          setTimeout(() => setShowBigCheck(null), 600);
                        }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                            selectedNickname?.nickname === option.nickname
                              ? 'bg-gradient-to-br from-green-500 via-cyan-400 to-cyan-500 p-[2px]'
                              : 'border-2 border-gray-300 hover:border-gray-400'
                          }`}>
                            <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                              <span className="text-2xl">{option.avatar_emoji}</span>
                            </div>
                          </div>

                          {/* Big checkmark overlay - tap feedback (inside circle) */}
                          {showBigCheck === option.nickname && (
                            <div className="absolute inset-0 w-16 h-16 rounded-full bg-green-600/90 flex items-center justify-center animate-pop animate-ripple pointer-events-none">
                              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}

                          {/* Small persistent badge (outside circle, top-right) */}
                          {selectedNickname?.nickname === option.nickname && (
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
                <p className="mt-3 text-xs text-gray-500 text-center">
                  How you'll appear to other shoppers
                </p>
              </div>
            )}

            {/* Modal Navigation Buttons */}
            {modalStep < 3 ? (
              <div className="flex justify-end gap-3 mt-4">
                {modalStep > 1 && (
                  <button
                    onClick={() => setModalStep(modalStep - 1)}
                    className="w-10 h-10 flex items-center justify-center bg-gray-400 hover:bg-gray-500 rounded-full text-white transition-all duration-150 active:scale-90"
                    title="Back"
                  >
                    <ChevronLeft size={20} strokeWidth={2} />
                  </button>
                )}
                <button
                  onClick={() => {
                    // Validate current step before proceeding
                    if (modalStep === 1 && !participantName.trim()) {
                      notify.warning('Please enter your name');
                      return;
                    }
                    setModalStep(modalStep + 1);
                  }}
                  disabled={modalStep === 1 && !participantName.trim()}
                  className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 rounded-full text-white transition-all duration-150 active:scale-90 disabled:active:scale-100"
                  title="Next"
                >
                  <ChevronRight size={20} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setModalStep(2)}
                  className="w-10 h-10 flex items-center justify-center bg-gray-400 hover:bg-gray-500 rounded-full text-white transition-all duration-150 active:scale-90"
                  title="Back"
                >
                  <ChevronLeft size={20} strokeWidth={2} />
                </button>
                <button
                  onClick={handleConfirmJoin}
                  disabled={joiningSession || !selectedNickname}
                  className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 rounded-full text-white transition-all duration-150 active:scale-90 disabled:active:scale-100"
                  title={joiningSession ? "Joining..." : "Confirm & Join"}
                >
                  {joiningSession ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <Check size={20} strokeWidth={2} />
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
