import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Plus, Minus, Clock, Users } from 'lucide-react';
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

  // Show one-time "You're joined" notification when session loads
  useEffect(() => {
    if (currentParticipant && session && !hasShownJoinedNotification.current) {
      const isHost = currentParticipant?.is_creator || false;
      const displayName = currentParticipant?.nickname || currentParticipant?.real_name?.split(' ')[0] || 'You';

      const message = `You're joined as ${displayName}${isHost ? ' (Host)' : ''}`;
      notify.success(message);

      hasShownJoinedNotification.current = true;
    }
  }, [currentParticipant, session, notify]);

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

  // Determine if current user is host (needed early for invites fetch)
  const isHost = currentParticipant?.is_creator || false;

  // Modal state for shopping mode selection
  const [showModeModal, setShowModeModal] = useState(false);
  // Track if host has confirmed their mode choice (clicked OK)
  const [modeConfirmed, setModeConfirmed] = useState(false);

  // Initialize modeConfirmed if mode was already chosen (page refresh scenario)
  // Either timeout started OR solo mode was selected
  useEffect(() => {
    if (session?.expected_participants_set_at || session?.expected_participants === 0) {
      setModeConfirmed(true);
    }
  }, [session?.expected_participants_set_at, session?.expected_participants]);

  // Fetch invites for the session
  const [invites, setInvites] = useState([]);
  useEffect(() => {
    if (!session?.session_id || !isHost) return;

    const fetchInvites = async () => {
      try {
        const response = await fetch(`/api/sessions/${session.session_id}/invites`);
        const data = await response.json();
        if (data.success) {
          setInvites(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch invites:', error);
      }
    };

    fetchInvites();

    // Poll for invite status updates every 3 seconds
    const interval = setInterval(fetchInvites, 3000);
    return () => clearInterval(interval);
  }, [session?.session_id, isHost, expectedCount]);

  // Compute all items from host + participants (memoized for performance)
  const allItems = useMemo(
    () => aggregateAllItems(hostItems, participants),
    [hostItems, participants]
  );

  // Get selected participant's items
  const selectedItems = selectedParticipant === 'host'
    ? hostItems
    : (participants.find(p => (p.nickname || p.name) === selectedParticipant)?.items || {});

  // Get session info
  const sessionCode = session?.session_id || 'loading...';

  // Check how many participants have confirmed their lists
  // Only count participants who are actually participating (not marked as not coming)
  const activeParticipants = participants.filter(p => !p.marked_not_coming);
  const confirmedParticipants = activeParticipants.filter(p => p.items_confirmed).length;
  const hasConfirmedParticipants = confirmedParticipants > 0;

  // Check if ALL JOINED participants (not host, not declined) have confirmed their lists
  // Host already confirmed when clicking "Start List" button
  // participants array already excludes host (is_creator is filtered out in sessionTransformers.js)
  const joinedParticipants = participants.filter(p => !p.marked_not_coming);
  const allJoinedParticipantsConfirmed = joinedParticipants.length === 0 ||
                                         joinedParticipants.every(p => p.items_confirmed);

  // Get the actual host's nickname (for display in Host avatar slot)
  // If current user is host, show their nickname; otherwise show "Host" placeholder
  const actualHostNickname = isHost
    ? (currentParticipant?.nickname || 'Host')
    : (session?.creator_nickname || 'Host');

  // Get current user's nickname (for "You're joined as..." message)
  const myNickname = currentParticipant?.nickname || 'You';

  // Get current participant's items (for non-host users)
  const myParticipantData = !isHost
    ? participants.find(p => p.id === currentParticipant?.id)
    : null;
  const myItems = myParticipantData?.items || {};

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

  // Handle item quantity changes for participants
  const updateMyItemQuantity = (itemId, newQuantity) => {
    if (!myParticipantData) return;

    const updatedParticipants = participants.map(p => {
      if (p.id === currentParticipant?.id) {
        const newItems = { ...p.items };
        if (newQuantity === 0) {
          delete newItems[itemId];
        } else {
          newItems[itemId] = newQuantity;
        }
        return { ...p, items: newItems };
      }
      return p;
    });
    onUpdateParticipants(updatedParticipants);
  };

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
          <div className="mb-6">
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
                  const isSelected = quantity > 0;

                  return (
                    <div
                      key={veg.id}
                      className={`flex items-center gap-3 py-3 px-2 ${
                        isSelected ? 'bg-gray-50' : ''
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl">
                        {veg.emoji || '🥬'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-900">{getItemName(veg)}</p>
                        {getItemSubtitles && getItemSubtitles(veg) && (
                          <p className="text-xs text-gray-500 truncate">{getItemSubtitles(veg)}</p>
                        )}
                      </div>

                      {isSelected ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newVal = Math.max(0, quantity - 0.5);
                              updateMyItemQuantity(veg.id, newVal);
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
                                  const otherItemsWeight = myTotalWeight - quantity;
                                  if (otherItemsWeight + val <= 10) {
                                    updateMyItemQuantity(veg.id, val);
                                  }
                                } else if (e.target.value === '') {
                                  // Allow empty for editing
                                  updateMyItemQuantity(veg.id, 0.25);
                                }
                              }}
                              onBlur={(e) => {
                                // Ensure valid value on blur
                                const val = parseFloat(e.target.value);
                                if (isNaN(val) || val <= 0) {
                                  updateMyItemQuantity(veg.id, 0.25);
                                }
                              }}
                              className="w-14 text-base text-gray-900 text-center border-b-2 border-gray-300 focus:border-gray-900 focus:outline-none py-1"
                            />
                            <span className="text-sm text-gray-600">kg</span>
                          </div>
                          <button
                            onClick={() => {
                              if (myTotalWeight < 10) {
                                updateMyItemQuantity(veg.id, quantity + 0.5);
                              }
                            }}
                            disabled={myTotalWeight >= 10}
                            className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center disabled:bg-gray-400 disabled:hover:bg-gray-400 flex-shrink-0 transition-colors"
                          >
                            <Plus size={16} className="text-white" strokeWidth={2.5} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            if (myTotalWeight < 10) {
                              updateMyItemQuantity(veg.id, 0.5);
                            }
                          }}
                          disabled={myTotalWeight >= 10}
                          className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold disabled:bg-gray-400 disabled:hover:bg-gray-400 transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
                <Users size={32} className="text-gray-400 mx-auto mb-2" />
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
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
        {/* Progress Bar - Only show for host */}
        {currentParticipant?.is_creator && (
          <ProgressBar
            currentStep={2}
            onStepClick={(step) => onNavigateToStep && onNavigateToStep(step)}
            canNavigate={true}
          />
        )}

        <div className="mb-6">
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

        {/* Shopping Preference Prompt - Only for Host */}
        {currentParticipant?.is_creator && !modeConfirmed && (
          <div className="mb-6">
            <button
              onClick={() => setShowModeModal(true)}
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
            onClose={() => setShowModeModal(false)}
            title="Choose shopping mode"
            maxWidth="max-w-md"
          >
            <InviteTabsSelector
              sessionId={session?.session_id}
              expectedCount={expectedCount}
              invites={invites}
              locked={session?.invites_locked || false}
              onChange={setExpectedCount}
              showConfirmButton={true}
              onInvitesUpdate={setInvites}
              onConfirm={(selectedMode) => {
                setShowModeModal(false);
                setModeConfirmed(true); // Mark mode as confirmed - hide prompt
                notify.success(
                  selectedMode === 0
                    ? 'Ready to shop solo!'
                    : `Waiting for ${selectedMode} friend${selectedMode > 1 ? 's' : ''} to join`
                );
              }}
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
                  emoji={veg?.emoji || '🥬'}
                  name={getItemName(veg)}
                  subtitle={`${qty}kg`}
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
      />
    </div>
  );
}
