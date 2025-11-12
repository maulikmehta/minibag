import React from 'react';
import { Plus, Minus } from 'lucide-react';
import { QUANTITY_LIMITS, roundQuantity } from '../../../../../shared/constants/limits';

/**
 * ItemCard - Optimized item display and quantity selector
 * Wrapped with React.memo to prevent unnecessary re-renders
 */
const ItemCard = React.memo(({
  item,
  quantity,
  isSelected,
  getItemName,
  getItemSubtitles,
  onQuantityChange,
  onIncrement,
  onDecrement,
  maxWeight = 10
}) => {
  return (
    <div
      key={item.id}
      className={`flex items-center gap-3 py-3 px-2 ${
        isSelected ? 'bg-gray-50' : ''
      }`}
    >
      {/* Item Emoji Icon */}
      <div
        className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl"
      >
        {item.emoji || '🥬'}
      </div>

      {/* Item Info */}
      <div className="flex-1 min-w-0">
        <p className="text-base text-gray-900">{getItemName(item)}</p>
        <p className="text-xs text-gray-500 truncate">{getItemSubtitles(item)}</p>
      </div>

      {/* Quantity Controls or Add Button */}
      {isSelected ? (
        <div className="flex items-center gap-2">
          <button
            onClick={onDecrement}
            className="w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0"
          >
            <Minus size={16} strokeWidth={2} />
          </button>
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="decimal"
              step={QUANTITY_LIMITS.STEP_SIZE}
              min={QUANTITY_LIMITS.MIN_QUANTITY}
              max={QUANTITY_LIMITS.MAX_QUANTITY}
              value={quantity}
              onChange={onQuantityChange}
              onBlur={(e) => {
                // Use shared rounding logic for consistency
                const rounded = roundQuantity(e.target.value);
                onQuantityChange({ target: { value: rounded.toFixed(QUANTITY_LIMITS.DECIMAL_PLACES) } });
              }}
              className="w-14 h-9 text-center text-base border border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none appearance-none"
            />
            <span className="text-xs text-gray-500 flex-shrink-0">kg</span>
          </div>
          <button
            onClick={onIncrement}
            className="w-9 h-9 rounded-full border border-gray-400 flex items-center justify-center flex-shrink-0"
          >
            <Plus size={16} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => onQuantityChange({ target: { value: '0.5' } })}
          className="w-9 h-9 rounded-full border-2 border-gray-900 flex items-center justify-center flex-shrink-0"
        >
          <Plus size={20} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
});

ItemCard.displayName = 'ItemCard';

export default ItemCard;
