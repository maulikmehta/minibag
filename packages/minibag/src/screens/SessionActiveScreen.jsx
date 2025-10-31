import React, { useMemo } from 'react';
import { Plus, Minus, Clock, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ItemList from '../components/items/ItemList.jsx';
import ItemRow from '../components/items/ItemRow.jsx';
import AppHeader from '../components/layout/AppHeader.jsx';
import ProgressBar from '../components/layout/ProgressBar.jsx';
import SessionParticipantList from '../components/session/SessionParticipantList.jsx';
import ExpectedParticipantsInput from '../components/session/ExpectedParticipantsInput.jsx';
import SessionInviteControls from '../components/session/SessionInviteControls.jsx';
import CheckpointStatus from '../components/session/CheckpointStatus.jsx';
import { useSessionNotifications } from '../hooks/useSessionNotifications.js';
import { useParticipantSync } from '../hooks/useParticipantSync.js';
import { useExpectedParticipants } from '../hooks/useExpectedParticipants.js';

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

  // Use custom hooks for state management
  const { notification, showNotification } = useSessionNotifications();

  useParticipantSync({
    session,
    currentParticipant,
    participants,
    onUpdateParticipants,
    onShowNotification: showNotification
  });

  const {
    expectedCount,
    setExpectedCount,
    checkpointComplete,
    waitingCount,
    autoTimedOutCount,
    isInviteExpired
  } = useExpectedParticipants(session, participants);

  // Compute all items from host + participants
  const allItems = { ...hostItems };
  participants.forEach(p => {
    Object.entries(p.items || {}).forEach(([id, qty]) => {
      allItems[id] = (allItems[id] || 0) + qty;
    });
  });

  // Get selected participant's items
  const selectedItems = selectedParticipant === 'host'
    ? hostItems
    : (participants.find(p => (p.nickname || p.name) === selectedParticipant)?.items || {});

  // Get session info
  const sessionCode = session?.session_id || 'loading...';

  // Determine if current user is host
  const isHost = currentParticipant?.is_creator || false;

  // Check how many participants have confirmed their lists
  // Only count participants who are actually participating (not marked as not coming)
  const activeParticipants = participants.filter(p => !p.marked_not_coming);
  const confirmedParticipants = activeParticipants.filter(p => p.items_confirmed).length;
  const hasConfirmedParticipants = confirmedParticipants > 0;

  // Check if ALL participants (including host) have confirmed their lists
  const hostConfirmed = currentParticipant?.items_confirmed || false;
  const otherParticipantsConfirmed = activeParticipants.length === 0 || activeParticipants.every(p => p.items_confirmed);
  const allParticipantsConfirmed = hostConfirmed && otherParticipantsConfirmed;

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
                <span>4 hour session</span>
              </div>
            </div>
            {currentParticipant && (
              <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                <span className="text-lg">{currentParticipant.avatar_emoji}</span>
                <p className="text-sm text-green-800">
                  You're joined as <span className="font-semibold">{myNickname}</span>
                </p>
              </div>
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

      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-6 animate-fade-in">
          <div className="bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium">{notification}</p>
          </div>
        </div>
      )}

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
              <span>4 hour session</span>
            </div>
          </div>
          {currentParticipant && (
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
              <span className="text-lg">{currentParticipant.avatar_emoji}</span>
              <p className="text-sm text-green-800">
                You're joined as <span className="font-semibold">{myNickname}</span> {isHost && '(Host)'}
              </p>
            </div>
          )}
        </div>

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
                  imageUrl={veg?.thumbnail_url || veg?.img}
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

            {/* Expected Participants Input - Item list style with +/- buttons */}
            <ExpectedParticipantsInput
              sessionId={session?.session_id}
              expectedCount={expectedCount}
              onChange={setExpectedCount}
            />

            {/* Invite buttons - WhatsApp + Copy Link */}
            <SessionInviteControls
              session={session}
              participantCount={participants.length}
              onShare={handleShare}
              disabled={!session || participants.length >= 3}
            />
          </div>
        )}

        {/* Test button removed for field testing */}
      </div>

      <CheckpointStatus
        checkpointComplete={checkpointComplete}
        waitingCount={waitingCount}
        participantCount={activeParticipants.length}
        confirmedParticipants={confirmedParticipants}
        hasConfirmedParticipants={hasConfirmedParticipants}
        allParticipantsConfirmed={allParticipantsConfirmed}
        autoTimedOutCount={autoTimedOutCount}
        isInviteExpired={isInviteExpired}
        expectedCount={expectedCount}
        onStartShopping={onNavigateToShopping}
        disabled={!checkpointComplete || Object.keys(allItems).length === 0 || (expectedCount > 0 && !allParticipantsConfirmed)}
      />
    </div>
  );
}
