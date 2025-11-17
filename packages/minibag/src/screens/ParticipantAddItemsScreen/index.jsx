import React, { useMemo } from 'react';
import { Plus, Minus, Users } from 'lucide-react';
import AppHeader from '../../components/layout/AppHeader.jsx';

export default function ParticipantAddItemsScreen({
  participants,
  selectedParticipant,
  hostItems,
  items,
  getItemName,
  getItemSubtitles,
  getTotalWeight,
  onUpdateParticipants,
  onBack
}) {
  // Get current participant's items
  const currentParticipantItems = participants.find(p => (p.nickname || p.name) === selectedParticipant)?.items || {};

  // Calculate total weight for current participant
  const totalWeight = useMemo(
    () => getTotalWeight(currentParticipantItems),
    [currentParticipantItems, getTotalWeight]
  );

  // Only show items that the host has selected
  const hostSelectedItems = useMemo(
    () => items.filter(v => hostItems[v.id]),
    [items, hostItems]
  );

  // Handle item quantity changes
  const updateItemQuantity = (itemId, newQuantity) => {
    const updatedParticipants = participants.map(p => {
      if (p.name === selectedParticipant) {
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

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-32">
      <AppHeader />
      <div className="p-6">
        {/* Header */}
        <div className="mb-6" data-tour="participant-catalog-info">
          <button
            onClick={onBack}
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
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl">
                  {veg.emoji || '🥬'}
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
                        updateItemQuantity(veg.id, newVal);
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
                          updateItemQuantity(veg.id, quantity + 0.5);
                        }
                      }}
                      disabled={totalWeight >= 10}
                      className="w-9 h-9 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center disabled:bg-gray-500 disabled:hover:bg-gray-500 flex-shrink-0 transition-colors"
                    >
                      <Plus size={16} className="text-white" strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (totalWeight < 10) {
                        updateItemQuantity(veg.id, 0.5);
                      }
                    }}
                    disabled={totalWeight >= 10}
                    className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center flex-shrink-0 disabled:bg-gray-500 disabled:cursor-not-allowed transition-all duration-150 active:scale-90"
                  >
                    <Plus size={20} className="text-white" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {hostSelectedItems.length === 0 && (
          <div className="text-center py-8 border border-dashed border-gray-300 rounded-card">
            <Users size={32} className="text-gray-400 mx-auto mb-2 animate-pulse-glow" />
            <p className="text-gray-500">Host hasn't selected any items yet</p>
            <p className="text-xs text-gray-400 mt-1">You'll see items appear here</p>
          </div>
        )}
      </div>

      {/* Done button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
        <button
          onClick={onBack}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
