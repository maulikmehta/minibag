import React from 'react';
import { Plus, X, Clock, Users, Share2, Copy, MoreVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import ParticipantAvatar from '../components/session/ParticipantAvatar.jsx';
import ItemList from '../components/items/ItemList.jsx';
import ItemRow from '../components/items/ItemRow.jsx';

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
  onEndSession,
  items,
  getItemName,
  getTotalWeight,
  handleShare,
  handleLanguageChange
}) {
  const { t, i18n } = useTranslation();

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
              onClick={() => currentParticipant?.is_creator && onNavigateToHostCreate()}
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
                  onClick={() => onShowSessionMenuChange(!showSessionMenu)}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical size={18} className="text-gray-600" />
                </button>

                {showSessionMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div
                      onClick={() => onShowSessionMenuChange(false)}
                      className="fixed inset-0 z-30"
                    />

                    {/* Menu dropdown */}
                    <div className="absolute right-0 top-8 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-40 w-48">
                      <button
                        onClick={() => {
                          onShowSessionMenuChange(false);
                          onEndSession();
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
              onClick={() => onSelectedParticipantChange('host')}
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
                    onClick={() => onSelectedParticipantChange(participant.name)}
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
          onClick={onNavigateToShopping}
          disabled={Object.keys(allItems).length === 0}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          Start shopping
        </button>
      </div>
    </div>
  );
}
