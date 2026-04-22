import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { Plus, Minus, Clock, Users, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ItemList from '../components/items/ItemList.jsx';
import ItemRow from '../components/items/ItemRow.jsx';
import AppHeader from '../components/layout/AppHeader.jsx';
import ProgressBar from '../components/layout/ProgressBar.jsx';
import SessionParticipantList from '../components/session/SessionParticipantList.jsx';
import InviteTabsSelector from '../components/session/InviteTabsSelector.jsx';
import SessionInviteControls from '../components/session/SessionInviteControls.jsx';
import CheckpointStatus from '../components/session/CheckpointStatus.jsx';
import IdentityBanner from '../components/session/IdentityBanner.jsx';
import ModalWrapper from '../components/shared/ModalWrapper.jsx';
import { useNotification } from '../hooks/useNotification.js';
import { useParticipantSync } from '../hooks/useParticipantSync.js';
import { useExpectedParticipants } from '../hooks/useExpectedParticipants.js';
import { aggregateAllItems } from '../utils/calculateItems';

export default function SessionActiveScreen({
  session,
  currentParticipant,
  hostItems,
  participants,
  selectedParticipant,
  onSelectedParticipantChange,
  showSessionMenu,
  onShowSessionMenuChange,
  onNavigateBack,
  onNavigateToHostCreate,
  onNavigateToParticipantAddItems,
  onNavigateToShopping,
  onNavigateToTracking, // For participant confirmation navigation
  onNavigateToStep,
  onEndSession,
  onUpdateParticipants, // For updating participant items
  items,
  getItemName,
  getItemSubtitles,
  getTotalWeight,
  handleShare,
  handleLanguageChange,
  onHelpClick,
  onLogoClick
}) {
  const { t, i18n } = useTranslation();

  // Use new notification system
  const notify = useNotification();

  // Track if we've shown the initial "joined" notification
  const hasShownJoinedNotification = useRef(false);

  // Track if we've shown checkpoint completion notification (prevents duplicate firings)
  const hasShownCheckpointComplete = useRef(false);

  // Ref for mode prompt button to auto-scroll into view
  const modePromptRef = useRef(null);

  // Show one-time "You're joined" notification when session loads
  useEffect(() => {
    if (currentParticipant && session && !hasShownJoinedNotification.current) {
      const isHost = currentParticipant?.is_creator || false;
      const displayName = currentParticipant?.nickname || currentParticipant?.real_name?.split(' ')[0] || 'You';

      const message = isHost
        ? `You're joined as ${displayName} (Host)`
        : `You're joined as ${displayName}`;
      notify.success(message);

      hasShownJoinedNotification.current = true;
    }
  }, [currentParticipant, session, notify, t]);

  useParticipantSync({
    session,
    currentParticipant,
    participants,
    onUpdateParticipants,
    onShowNotification: notify.success
  });

  const {
    expectedCount,
    setExpectedCount,
    checkpointComplete,
    waitingCount,
    autoTimedOutCount,
    isInviteExpired
  } = useExpectedParticipants(session, participants);

  // Reactive notification management: Show checkpoint success banner when all friends respond
  useEffect(() => {
    // Only act when checkpoint completes for group mode (expectedCount > 0)
    if (checkpointComplete && expectedCount > 0 && waitingCount === 0) {
      // Guard: only show once per checkpoint completion
      if (hasShownCheckpointComplete.current) return;

      const joinedCount = participants.filter(p => !p.marked_not_coming).length;

      // Show success message as NEW banner (replaces any existing banner)
      const successMessage = joinedCount > 0
        ? `${joinedCount} ${joinedCount === 1 ? 'friend has' : 'friends have'} joined! Ready to start`
        : 'Friends have joined! Ready to start';

      // Use notify.success() without priority to create banner (LOW priority = banner)
      notify.success(successMessage);
      hasShownCheckpointComplete.current = true; // Mark as shown
    } else if (!checkpointComplete) {
      // Reset guard when checkpoint becomes incomplete
      hasShownCheckpointComplete.current = false;
    }
  }, [checkpointComplete, expectedCount, waitingCount, notify, participants.length]);

  // Determine if current user is host (needed early for invites fetch)
  const isHost = currentParticipant?.is_creator || false;

  // Modal state for shopping mode selection
  const [showModeModal, setShowModeModal] = useState(false);
  // Track if host has confirmed their mode choice (clicked OK)
  const [modeConfirmed, setModeConfirmed] = useState(false);

  // Memoize modal handlers
  const handleOpenModeModal = useCallback(() => setShowModeModal(true), []);
  const handleCloseModeModal = useCallback(() => setShowModeModal(false), []);

  const handleModeConfirm = useCallback((selectedMode) => {
    setShowModeModal(false);
    setModeConfirmed(true); // Mark mode as confirmed - hide prompt
    notify.success(
      selectedMode === 0
        ? 'Ready to shop solo!'
        : 'Group mode ready - share link with friends!'
    );
  }, [notify, t]);

  // Initialize modeConfirmed if mode was already chosen (page refresh scenario)
  // Either timeout started OR solo mode was selected
  useEffect(() => {
    if (session?.expected_participants_set_at || session?.expected_participants === 0) {
      setModeConfirmed(true);
    }
  }, [session?.expected_participants_set_at, session?.expected_participants]);

  // Auto-scroll to "Who are we shopping for?" prompt on load (mobile fix)
  useEffect(() => {
    if (!modeConfirmed && modePromptRef.current && currentParticipant?.is_creator) {
      // Small delay to ensure layout is settled before scrolling
      const scrollTimer = setTimeout(() => {
        modePromptRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 300);

      return () => clearTimeout(scrollTimer);
    }
  }, [modeConfirmed, currentParticipant?.is_creator]);

  // Fetch invites for the session
  const [invites, setInvites] = useState([]);

  // Memoize fetchInvites to prevent recreation on every render
  const fetchInvites = useCallback(async () => {
    if (!session?.session_id || !isHost) return;

    try {
      const response = await fetch(`/api/sessions/${session.session_id}/invites`);
      const data = await response.json();
      if (data.success) {
        setInvites(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  }, [session?.session_id, isHost]);

  useEffect(() => {
    if (!session?.session_id || !isHost) return;

    fetchInvites();

    // Poll for invite status updates every 3 seconds
    const interval = setInterval(fetchInvites, 3000);
    return () => clearInterval(interval);
  }, [fetchInvites, session?.session_id, isHost]);

  // Compute all items from host + participants (memoized for performance)
  const allItems = useMemo(
    () => aggregateAllItems(hostItems, participants),
    [hostItems, participants]
  );

  // Get selected participant's items (memoized to prevent re-renders)
  const selectedItems = useMemo(() => {
    if (selectedParticipant === 'host') return hostItems;
    return participants.find(p => (p.nickname || p.name) === selectedParticipant)?.items || {};
  }, [selectedParticipant, hostItems, participants]);

  // Get session info
  const sessionCode = session?.session_id || 'loading...';

  // Check how many participants have confirmed their lists (memoized for performance)
  // Only count participants who are actually participating (not marked as not coming)
  const activeParticipants = useMemo(
    () => participants.filter(p => !p.marked_not_coming),
    [participants]
  );

  const confirmedParticipants = useMemo(
    () => activeParticipants.filter(p => p.items_confirmed).length,
    [activeParticipants]
  );

  const hasConfirmedParticipants = confirmedParticipants > 0;

  // Check if ALL JOINED participants (not host, not declined) have confirmed their lists
  // Host already confirmed when clicking "Start List" button
  // participants array already excludes host (is_creator is filtered out in sessionTransformers.js)
  const allJoinedParticipantsConfirmed = useMemo(() => {
    console.log('🔍 [Checkpoint] Checking confirmation status:', {
      activeParticipantsCount: activeParticipants.length,
      activeParticipants: activeParticipants.map(p => ({
        id: p.id,
        nickname: p.nickname,
        items_confirmed: p.items_confirmed,
        items: p.items,
        itemsCount: Object.keys(p.items || {}).length
      })),
      allConfirmed: activeParticipants.length === 0 || activeParticipants.every(p => p.items_confirmed)
    });
    return activeParticipants.length === 0 || activeParticipants.every(p => p.items_confirmed);
  }, [activeParticipants]);

  // Get the actual host's nickname (for display in Host avatar slot)
  // If current user is host, show their nickname; otherwise show "Host" placeholder
  const actualHostNickname = isHost
    ? (currentParticipant?.nickname || 'Host')
    : (session?.creator_nickname || 'Host');

  // Get current user's nickname (for "You're joined as..." message)
  const myNickname = currentParticipant?.nickname || 'You';

  // Get current participant's items (for non-host users) - memoized
  const myParticipantData = useMemo(() => {
    if (isHost) return null;
    return participants.find(p => p.id === currentParticipant?.id) || null;
  }, [isHost, participants, currentParticipant?.id]);

  const myItems = useMemo(
    () => myParticipantData?.items || {},
    [myParticipantData]
  );

  // Calculate total weight for current participant
  const myTotalWeight = useMemo(
    () => getTotalWeight(myItems),
    [myItems, getTotalWeight]
  );

  // Only show items that the host has selected
  const hostSelectedItems = useMemo(
    () => items.filter(v => hostItems[v.id]),
    [items, hostItems]
  );

  // Handle item quantity changes for participants (memoized callback)
  const updateMyItemQuantity = useCallback(async (itemId, newQuantity) => {
    if (!myParticipantData) return;

    // Optimistic update - update UI immediately
    const updatedParticipants = (participants || []).map(p => {
      if (p.id === currentParticipant?.id) {
        const newItems = { ...p.items };
        if (newQuantity === 0 || newQuantity === '') {
          delete newItems[itemId];
        } else {
          newItems[itemId] = newQuantity;
        }
        return { ...p, items: newItems };
      }
      return p;
    });
    onUpdateParticipants(updatedParticipants);

    // Persist to backend and broadcast via WebSocket (debounced to avoid too many API calls)
    // Only persist numeric values (skip empty string during editing)
    if (newQuantity !== '') {
      try {
        // Import API and socket service
        const { updateParticipantItems } = await import('../services/api.js');
        const socketService = (await import('../services/socket.js')).default;

        // Get updated items for this participant
        const updatedParticipant = updatedParticipants.find(p => p.id === currentParticipant?.id);
        const itemsToSave = updatedParticipant?.items || {};

        console.log('💾 [PERSIST] Saving participant items:', {
          participantId: currentParticipant.id,
          participantNickname: currentParticipant.nickname,
          items: itemsToSave,
          itemCount: Object.keys(itemsToSave).length
        });

        // Persist to database
        await updateParticipantItems(currentParticipant.id, itemsToSave);

        console.log('✅ [PERSIST] Items saved successfully');

        // Broadcast to host via WebSocket (so they see real-time updates)
        socketService.emitParticipantItemsUpdated(
          currentParticipant.id,
          itemsToSave,
          {
            real_name: currentParticipant.real_name,
            nickname: currentParticipant.nickname,
            items_confirmed: false // Not confirmed yet, just updating items
          }
        );

        console.log('📡 [PERSIST] WebSocket broadcast sent');
      } catch (error) {
        console.error('❌ [PERSIST] Failed to persist participant items:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          participantId: currentParticipant?.id
        });
        // Optimistic update already happened, so UI shows the change
        // If persistence fails, items will revert on page reload
      }
    }
  }, [myParticipantData, participants, currentParticipant?.id, currentParticipant?.real_name, currentParticipant?.nickname, onUpdateParticipants]);

  // PARTICIPANT VIEW - Simplified, locked to their own items
  if (!isHost) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        <AppHeader
          i18n={i18n}
          onLanguageChange={handleLanguageChange}
          showEndSessionMenu={false}
          onHelpClick={onHelpClick}
          onLogoClick={onLogoClick}
        />
        <div className="p-6 pt-20">
          {/* Sticky Container: Header + Timer + Banner */}
          <div className="sticky top-[56px] z-40 bg-white pb-4 -mx-6 px-6 border-b border-gray-100 mb-4">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-3">
                <p className="text-lg font-semibold text-gray-900">Shopping Session</p>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Clock size={12} />
                  <span>2 hour session</span>
                </div>
              </div>
              {currentParticipant && (
                <IdentityBanner
                  currentParticipant={currentParticipant}
                  currentUser={currentParticipant}
                  phase="waiting"
                />
              )}
            </div>
          </div>

          {/* Avatar circles - Read-only for participants */}
          <SessionParticipantList
            participants={participants}
            hostItems={hostItems}
            hostNickname={session?.creator_nickname || 'Host'}
            hostRealName={session?.creator_real_name || null}
            selectedParticipant={null}
            onParticipantSelect={() => {}}
            isHost={false}
            currentParticipantId={currentParticipant?.id}
            readOnly={true}
          />

          {/* Weight indicator */}
          <div className="mb-4 flex justify-between items-center">
            <p className="text-base text-gray-900">Your bag</p>
            <p className={`text-base ${myTotalWeight >= 10 ? 'text-red-600' : 'text-gray-900'}`}>
              {myTotalWeight}kg / 10kg
            </p>
          </div>

          {/* Direct item selection from host's catalog - Matches Host UI */}
          <div className="mb-6">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-lg font-semibold text-gray-900">Select Items</p>
              <p className="text-sm text-gray-600">{myTotalWeight}kg added</p>
            </div>

            {hostSelectedItems.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {hostSelectedItems.map(veg => {
                  const quantity = myItems[veg.id] || 0;
                  const isSelected = veg.id in myItems;

                  return (
                    <div
                      key={veg.id}
                      className={`flex items-center gap-3 py-3 px-2 ${
                        isSelected ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl">
                        {'🥬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-900">{getItemName(veg)}</p>
                        {getItemSubtitles && getItemSubtitles(veg) && (
                          <p className="text-xs text-gray-500 truncate">{getItemSubtitles(veg)}</p>
                        )}
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.5"
                              min="0.25"
                              max="10"
                              value={quantity}
                              onChange={(e) => {
                                const inputValue = e.target.value;

                                // Allow empty input for editing
                                if (inputValue === '') {
                                  updateMyItemQuantity(veg.id, '');
                                  return;
                                }

                                // Allow any numeric input during editing (including partial like "0.", "0")
                                const val = parseFloat(inputValue);
                                if (!isNaN(val)) {
                                  const otherItemsWeight = myTotalWeight - (quantity || 0);
                                  // Allow partial inputs like "0." or values within limit
                                  if (inputValue.endsWith('.') || (val >= 0 && otherItemsWeight + val <= 10)) {
                                    updateMyItemQuantity(veg.id, inputValue);
                                  }
                                }
                              }}
                              onBlur={(e) => {
                                const val = parseFloat(e.target.value);
                                if (isNaN(val) || val <= 0 || e.target.value === '') {
                                  updateMyItemQuantity(veg.id, 0.25);
                                }
                              }}
                              style={{
                                appearance: 'textfield',
                                MozAppearance: 'textfield',
                                WebkitAppearance: 'none'
                              }}
                              className="w-20 pl-2 pr-7 text-lg text-gray-900 text-center border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none py-1.5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">kg</span>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <button
                              onClick={() => {
                                if (myTotalWeight < 10) {
                                  updateMyItemQuantity(veg.id, quantity + 0.5);
                                }
                              }}
                              disabled={myTotalWeight >= 10}
                              className="w-8 h-6 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-95"
                            >
                              <ChevronUp size={16} strokeWidth={2} className="text-gray-700" />
                            </button>
                            <button
                              onClick={() => {
                                const newVal = Math.max(0, quantity - 0.5);
                                updateMyItemQuantity(veg.id, newVal);
                              }}
                              className="w-8 h-6 rounded border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center transition-all duration-150 active:scale-95"
                            >
                              <ChevronDown size={16} strokeWidth={2} className="text-gray-700" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (myTotalWeight < 10) {
                              updateMyItemQuantity(veg.id, 0.5);
                            }
                          }}
                          disabled={myTotalWeight >= 10}
                          className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center flex-shrink-0 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-150 active:scale-90"
                        >
                          <Plus size={20} className="text-white" strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-card">
                <Users size={32} className="text-gray-400 mx-auto mb-2 animate-pulse-glow" />
                <p className="text-gray-500">Host hasn't selected any items yet</p>
                <p className="text-xs text-gray-400 mt-1">You'll see items here when host adds them</p>
              </div>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto z-50">
          <button
            onClick={onNavigateToTracking}
            disabled={Object.keys(myItems).length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Confirm my list
          </button>
        </div>
      </div>
    );
  }

  // HOST VIEW - Original functionality with avatar switching
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
      <AppHeader
        i18n={i18n}
        onLanguageChange={handleLanguageChange}
        showEndSessionMenu={currentParticipant?.is_creator}
        endSessionMenuOpen={showSessionMenu}
        onEndSessionMenuToggle={onShowSessionMenuChange}
        onEndSession={onEndSession}
        onHelpClick={onHelpClick}
        onLogoClick={onLogoClick}
      />

      <div className="p-6 pt-20">
        {/* Sticky Container: Progress + Header + Timer + Banner */}
        <div className="sticky top-[56px] z-40 bg-white pb-4 -mx-6 px-6 border-b border-gray-100 mb-4">
          {/* Progress Bar - Only show for host */}
          {currentParticipant?.is_creator && (
            <ProgressBar
              currentStep={2}
              onStepClick={(step) => onNavigateToStep && onNavigateToStep(step)}
              canNavigate={!modeConfirmed}
            />
          )}

          <div className="mb-3">
            <div className="flex items-center justify-between mb-3">
              <p className="text-lg font-semibold text-gray-900">Share & Collaborate</p>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Clock size={12} />
                <span>2 hour session</span>
              </div>
            </div>
            {currentParticipant && (
              <IdentityBanner
                currentParticipant={currentParticipant}
                currentUser={currentParticipant}
                phase="waiting"
              />
            )}
          </div>
        </div>

        {/* Shopping Preference Prompt - Only for Host */}
        {currentParticipant?.is_creator && !modeConfirmed && (
          <div className="mb-6" ref={modePromptRef}>
            <button
              onClick={handleOpenModeModal}
              className="w-full p-4 bg-white border-2 border-green-500 rounded-lg hover:bg-green-50 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users size={24} className="text-green-600" />
                  <div className="text-left">
                    <p className="text-base font-medium text-gray-900">
                      Who are we shopping for?
                    </p>
                    <p className="text-sm text-gray-600">
                      Choose solo or invite friends
                    </p>
                  </div>
                </div>
                <span className="text-green-600 group-hover:translate-x-1 transition-transform">
                  →
                </span>
              </div>
            </button>
          </div>
        )}

        {/* Shopping Mode Selection Modal */}
        {currentParticipant?.is_creator && (
          <ModalWrapper
            isOpen={showModeModal}
            onClose={handleCloseModeModal}
            title="Choose shopping mode"
            maxWidth="max-w-md"
          >
            <InviteTabsSelector
              sessionId={session?.session_id}
              sessionPin={session?.session_pin}
              expectedCount={expectedCount}
              invites={invites}
              locked={session?.invites_locked || false}
              onChange={setExpectedCount}
              showConfirmButton={true}
              onInvitesUpdate={setInvites}
              onConfirm={handleModeConfirm}
            />
          </ModalWrapper>
        )}

        {/* Avatar circles with gradient - 4 slots total */}
        <div data-tour="participants-list">
          <SessionParticipantList
            participants={participants}
            hostItems={hostItems}
            hostNickname={actualHostNickname}
            hostRealName={currentParticipant?.real_name || null}
            selectedParticipant={selectedParticipant}
            onParticipantSelect={onSelectedParticipantChange}
            isHost={isHost}
            currentParticipantId={currentParticipant?.id}
            readOnly={false}
          />
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
              const veg = items.find(v => v.id === itemId);
              return (
                <ItemRow
                  key={itemId}
                  emoji={'🥬'}
                  name={getItemName(veg)}
                  subtitle={`${qty}kg`}
                  layout="horizontal"
                />
              );
            })}
          </ItemList>

          {/* Add Items button - for participants to add from host's catalog */}
          {selectedParticipant === 'host' && currentParticipant?.is_creator && Object.keys(hostItems).length === 0 && (
            <button
              onClick={onNavigateToHostCreate}
              className="mt-4 w-full border-2 border-green-600 bg-white hover:bg-green-50 text-green-700 py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={18} />
              <span className="font-semibold">Add items to your list</span>
            </button>
          )}

          {!currentParticipant?.is_creator && selectedParticipant !== 'host' && Object.keys(hostItems).length > 0 && (
            <button
              onClick={onNavigateToParticipantAddItems}
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
            <p className="text-base text-gray-900">Total weight</p>
            <p className="text-2xl text-gray-900">{getTotalWeight(allItems)}kg</p>
          </div>
        </div>

        {/* Test button removed for field testing */}
      </div>

      {/* Invite Link Status Banner - Show above Start Shopping button in constant invite mode */}
      {isHost && expectedCount === 1 && session?.constant_invite_token && checkpointComplete && (
        <div className="fixed bottom-32 left-0 right-0 max-w-md mx-auto px-6 z-40">
          <div className={`rounded-lg p-3 text-sm ${
            isInviteExpired
              ? 'bg-gray-100 border border-gray-300 text-gray-700'
              : 'bg-blue-50 border border-blue-200 text-blue-800'
          }`}>
            {isInviteExpired ? (
              <div className="flex items-center gap-2">
                <span>⏰</span>
                <span>20 minutes of joining are up! Let's go shopping</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span>🔗</span>
                <span>Invite link is open. More friends can still join.</span>
              </div>
            )}
          </div>
        </div>
      )}

      <CheckpointStatus
        checkpointComplete={checkpointComplete}
        waitingCount={waitingCount}
        participantCount={activeParticipants.length}
        confirmedParticipants={confirmedParticipants}
        hasConfirmedParticipants={hasConfirmedParticipants}
        allJoinedParticipantsConfirmed={allJoinedParticipantsConfirmed}
        autoTimedOutCount={autoTimedOutCount}
        isInviteExpired={isInviteExpired}
        expectedCount={expectedCount}
        onStartShopping={onNavigateToShopping}
        disabled={!checkpointComplete || Object.keys(allItems).length === 0 || (expectedCount > 0 && !allJoinedParticipantsConfirmed)}
        disabledReason={
          Object.keys(allItems).length === 0
            ? 'no_items'
            : !checkpointComplete
              ? 'checkpoint_incomplete'
              : (expectedCount > 0 && !allJoinedParticipantsConfirmed)
                ? 'waiting_confirmations'
                : null
        }
        isConstantLinkMode={expectedCount === 1 && !!session?.constant_invite_token}
      />
    </div>
  );
}
