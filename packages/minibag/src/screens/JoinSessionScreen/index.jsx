import React, { useState, useEffect } from 'react';
import { Check, X, MapPin, Clock, ShoppingBag, Users, Loader2 } from 'lucide-react';
import AppHeader from '../../components/layout/AppHeader.jsx';

export default function JoinSessionScreen({
  session,
  sessionLoading,
  sessionError,
  joinSessionId,
  participants,
  joinSession,
  onJoinSuccess,
  onNavigateToHome,
  onNavigateToCreate
}) {
  // Local state for this screen
  const [joiningSession, setJoiningSession] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [nicknameOptions, setNicknameOptions] = useState([]);
  const [selectedNickname, setSelectedNickname] = useState(null);
  const [loadingNicknames, setLoadingNicknames] = useState(false);

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
      onJoinSuccess();
    } catch (error) {
      console.error('❌ Failed to join session:', error);
      // Check error type
      if (error.message && error.message.includes('full')) {
        alert('This list is full! Maximum 4 people can shop together.');
      } else if (error.message && error.message.includes('expired')) {
        alert('This invite link has expired. The host set a 20-minute timeout. Please ask for a new link.');
      } else {
        alert('Unable to join list. Please check the link and try again.');
      }
    } finally {
      setJoiningSession(false);
    }
  };

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
          className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 mb-3"
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

        {/* Decline Button */}
        <button
          onClick={onNavigateToHome}
          disabled={joiningSession}
          className="w-full px-6 py-4 border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-900 text-base font-medium rounded-xl transition-all flex items-center justify-center gap-2"
        >
          No thanks, maybe next time
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
