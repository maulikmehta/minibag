import React, { useState, useEffect } from 'react';
import { Check, X, Users, Loader2, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import AppHeader from '../../components/layout/AppHeader.jsx';
import { useNotification } from '../../hooks/useNotification.js';

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
  const [onboardingStep, setOnboardingStep] = useState(1); // 1: Name, 2: Language, 3: Nickname

  // Extract invite token from URL query parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const inv = urlParams.get('inv');
    if (inv) {
      setInviteToken(inv);
    }
  }, []);

  // Fetch nickname options when screen loads
  useEffect(() => {
    if (nicknameOptions.length === 0 && !loadingNicknames) {
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
  }, [nicknameOptions.length, loadingNicknames]);

  // Handle joining a session
  const handleJoinSession = async () => {
    if (!participantName.trim()) {
      notify.warning('Please enter your name');
      return;
    }

    if (!selectedNickname) {
      notify.warning('Please select a nickname');
      return;
    }

    // Check if session is full (max 4 people: 1 host + 3 participants)
    if (participants.length >= 3) {
      notify.error('This list is full! Maximum 4 people can shop together.');
      return;
    }

    try {
      setJoiningSession(true);

      // Join session via API with nickname selection
      const result = await joinSession(joinSessionId, [], {
        real_name: participantName,
        selected_nickname_id: selectedNickname.id,
        selected_nickname: selectedNickname.nickname,
        selected_avatar_emoji: selectedNickname.avatar_emoji,
        invite_token: inviteToken // Include invite token if present
      });

      console.log('✅ Joined session:', result);

      // Navigate to session-active screen
      onJoinSuccess();
    } catch (error) {
      console.error('❌ Failed to join session:', error);
      // Check error type
      if (error.message && error.message.includes('full')) {
        notify.error('This list is full! Maximum 4 people can shop together.');
      } else if (error.message && error.message.includes('expired')) {
        notify.error('This invite link has expired. The host set a 20-minute timeout. Please ask for a new link.');
      } else {
        notify.error(error.userMessage || 'Unable to join list. Please check the link and try again.');
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
        selected_nickname_id: selectedNickname.id,
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
      console.error('❌ Failed to decline session:', error);
      // Still navigate away even if API fails
      notify.info('You\'ve declined the invitation.');
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

          <div className="space-y-3 w-full">
            <button
              onClick={onNavigateToCreate}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold transition-colors"
            >
              Start your own list
            </button>
            <button
              onClick={onNavigateToHome}
              className="w-full py-4 border-2 border-gray-300 hover:border-green-600 text-gray-900 hover:text-green-600 rounded-xl text-base font-medium transition-colors"
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

          <div className="space-y-3 w-full">
            <button
              onClick={onNavigateToCreate}
              className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-base font-semibold transition-colors"
            >
              Start your own list
            </button>
            <button
              onClick={onNavigateToHome}
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

        {/* Dot Navigation */}
        <div className="flex gap-2 justify-center mb-6">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`w-2 h-2 rounded-full transition-all ${
                step <= onboardingStep ? 'bg-green-600' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Name Input */}
        {onboardingStep === 1 && (
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
        )}

        {/* Step 2: Language Preference */}
        {onboardingStep === 2 && i18n && handleLanguageChange && (
          <div className="mb-6">
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

        {/* Step 3: Nickname Selection + Items */}
        {onboardingStep === 3 && (
          <>
            {/* Nickname Selection */}
            <div className="mb-6" data-tour="participant-nickname-selection">
              <label className="block text-sm font-medium text-gray-900 mb-3">
                Pick your bag tag
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

            {/* Items Preview Section */}
            {hostSelectedItems.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-900 mb-3">
                  Items in this list ({hostSelectedItems.length})
                </p>
                <div className="divide-y divide-gray-200 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
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
          </>
        )}

        {/* Navigation Buttons */}
        {onboardingStep < 3 ? (
          <div className="flex gap-3">
            {onboardingStep > 1 && (
              <button
                onClick={() => setOnboardingStep(onboardingStep - 1)}
                className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50 transition-colors"
                title="Back"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
            )}
            <button
              onClick={() => {
                // Validate current step before proceeding
                if (onboardingStep === 1 && !participantName.trim()) {
                  notify.warning('Please enter your name');
                  return;
                }
                setOnboardingStep(onboardingStep + 1);
              }}
              disabled={onboardingStep === 1 && !participantName.trim()}
              className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-base font-semibold disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
            >
              Next
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <>
            {/* Back and Join Buttons - Side by Side */}
            <div className="flex gap-3">
              <button
                onClick={() => setOnboardingStep(2)}
                className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg text-gray-900 hover:bg-gray-50 transition-colors"
                title="Back"
              >
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <button
                onClick={handleJoinSession}
                disabled={joiningSession || !selectedNickname}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-base font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {joiningSession ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Check size={18} strokeWidth={2.5} />
                    Join list
                  </>
                )}
              </button>
            </div>
          </>
        )}

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
