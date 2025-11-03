import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import PaymentModal from '../components/PaymentModal.jsx';
import AppHeader from '../components/layout/AppHeader.jsx';
import ProgressBar from '../components/layout/ProgressBar.jsx';
import { aggregateAllItems } from '../utils/calculateItems';
import { getShoppingItems } from '../services/api.js';

// Feature flag: Set to false to disable skip items feature
const ENABLE_SKIP_ITEMS = true;

/**
 * ShoppingScreen Component
 *
 * Screen for recording payments for purchased items.
 * Host records payment method (UPI/Cash) and amount for each item.
 *
 * @param {Object} session - Session object
 * @param {Object} hostItems - Items added by host with quantities
 * @param {Array} participants - List of participants with their items
 * @param {Object} itemPayments - Payment information for each item {itemId: {id, method, amount}}
 * @param {Array} items - Catalog items array
 * @param {function} getItemName - Function to get localized item name
 * @param {Object} currentParticipant - Current participant object
 * @param {boolean} showPaymentModal - Whether payment modal is open
 * @param {function} setShowPaymentModal - Toggle payment modal
 * @param {string} selectedItemForPayment - Currently selected item ID for payment
 * @param {function} setSelectedItemForPayment - Set selected item for payment
 * @param {function} onRecordPayment - Callback when payment is recorded (itemId, payment) => void
 * @param {function} onDoneShopping - Callback when done button clicked
 * @param {function} onUpdateSessionStatus - Update session status callback
 * @param {boolean} showSessionMenu - Whether session menu is open
 * @param {function} onShowSessionMenuChange - Toggle session menu
 * @param {function} onEndSession - End session handler
 * @param {function} handleLanguageChange - Language change handler
 * @param {Object} i18n - i18n instance
 * @param {function} onHelpClick - Help icon click handler
 * @param {function} onLogoClick - Logo click handler
 */
function ShoppingScreen({
  session,
  hostItems,
  participants,
  itemPayments,
  skippedItems = {},
  items,
  getItemName,
  currentParticipant,
  showPaymentModal,
  setShowPaymentModal,
  selectedItemForPayment,
  setSelectedItemForPayment,
  onRecordPayment,
  onSkipToggle,
  onDoneShopping,
  onUpdateSessionStatus,
  showSessionMenu,
  onShowSessionMenuChange,
  onEndSession,
  handleLanguageChange,
  i18n,
  onHelpClick,
  onLogoClick
}) {
  // Track if we've already updated status to prevent duplicate calls
  const statusUpdatedRef = useRef(false);

  // State for server-aggregated items
  const [allItems, setAllItems] = useState({});
  const [itemParticipants, setItemParticipants] = useState({}); // Per-participant quantities
  const [loadingItems, setLoadingItems] = useState(true);

  // Update session status to 'shopping' when component mounts
  useEffect(() => {
    if (session?.session_id && onUpdateSessionStatus && !statusUpdatedRef.current) {
      statusUpdatedRef.current = true;
      onUpdateSessionStatus('shopping');
    }
  }, [session?.session_id, onUpdateSessionStatus]);

  // Fetch aggregated items from server (eliminates empty items race condition)
  useEffect(() => {
    if (!session?.session_id) return;

    const fetchShoppingItems = async () => {
      try {
        setLoadingItems(true);
        const data = await getShoppingItems(session.session_id);

        // Transform API response to match expected format: {itemId: totalQty}
        const aggregated = {};
        const participantBreakdown = {};

        Object.entries(data.aggregatedItems || {}).forEach(([itemId, itemData]) => {
          aggregated[itemId] = itemData.totalQuantity;
          participantBreakdown[itemId] = itemData.participantQuantities || [];
        });

        console.log('🛒 Shopping Screen - Server Aggregated Items:', {
          raw: data.aggregatedItems,
          transformed: aggregated,
          participantBreakdown,
          participantsCount: data.participants?.length
        });

        setAllItems(aggregated);
        setItemParticipants(participantBreakdown);
      } catch (error) {
        console.error('❌ Failed to fetch shopping items, falling back to client aggregation:', error);
        // Fallback to client-side aggregation if API fails
        const fallbackAggregated = aggregateAllItems(hostItems, participants);
        setAllItems(fallbackAggregated);
        setItemParticipants({}); // No participant breakdown in fallback
      } finally {
        setLoadingItems(false);
      }
    };

    fetchShoppingItems();
  }, [session?.session_id, hostItems, participants]);

  const hostNickname = currentParticipant?.nickname || 'You';
  const totalPaid = Object.values(itemPayments).reduce((sum, p) => sum + (p?.amount || 0), 0);
  const allItemsHandled = Object.keys(allItems).every(id =>
    itemPayments[id] || (ENABLE_SKIP_ITEMS && skippedItems[id])
  );

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-32">
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
        {/* Progress Bar */}
        <ProgressBar
          currentStep={3}
          canNavigate={false}
        />

        {/* Live indicator - Shows shopping session is active */}
        <div className="flex items-center justify-end gap-1.5 mb-4" data-tour="live-indicator">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <p className="text-sm text-green-600 font-medium">Live</p>
        </div>

        <div className="mb-6">
          <p className="text-lg font-semibold text-gray-900 mb-3">Record Payments</p>
          <div className="flex justify-between items-center text-sm">
            <p className="text-gray-600">Items paid: {Object.keys(itemPayments).length}/{Object.keys(allItems).length}</p>
          </div>
        </div>

        <div className="divide-y divide-gray-200 mb-6">
          {Object.entries(allItems).map(([itemId, totalQty]) => {
            const veg = items.find(v => v.item_id === itemId || v.id === itemId);
            const payment = itemPayments[itemId];
            const isPaid = !!payment;
            const isSkipped = !!skippedItems[itemId];

            // Skip if vegetable not found
            if (!veg) return null;

            return (
              <div
                key={itemId}
                className={`relative flex items-start gap-3 py-3 px-2 ${
                  isPaid ? 'bg-gray-50' : isSkipped ? 'bg-yellow-50' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl mt-1">
                  {veg.emoji || '🥬'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className={`text-base ${isSkipped && ENABLE_SKIP_ITEMS ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {getItemName(veg)}
                    </p>
                    {ENABLE_SKIP_ITEMS && isSkipped && (
                      <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded">
                        SKIPPED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    Total: {totalQty} {veg.unit}
                  </p>
                  {/* Per-participant breakdown for bag management */}
                  {itemParticipants[itemId] && itemParticipants[itemId].length > 0 && (
                    <p className="text-sm text-gray-700 mt-0.5">
                      {itemParticipants[itemId]
                        .map(p => `${p.nickname} (${p.quantity}${veg?.unit || 'kg'})`)
                        .join(', ')}
                    </p>
                  )}
                  {isPaid && !isSkipped && (
                    <p className="text-sm text-gray-900 mt-1">
                      ✓ ₹{payment.amount} • {payment.method === 'upi' ? 'UPI' : 'Cash'}
                    </p>
                  )}
                  {ENABLE_SKIP_ITEMS && isSkipped && (
                    <p className="text-sm text-gray-600 italic mt-1">
                      {skippedItems[itemId]?.reason || 'Item wasn\'t good enough to buy'}
                    </p>
                  )}
                </div>

                {isPaid && !isSkipped ? (
                  <button
                    onClick={() => {
                      setSelectedItemForPayment(itemId);
                      setShowPaymentModal(true);
                    }}
                    className="text-sm text-gray-600 px-4 py-2 flex-shrink-0"
                  >
                    Edit
                  </button>
                ) : !isSkipped ? (
                  <div className="flex gap-2 flex-shrink-0 mt-1">
                    {/* Skip button - X mark */}
                    {ENABLE_SKIP_ITEMS && (
                      <button
                        onClick={() => onSkipToggle && onSkipToggle(itemId)}
                        className="w-12 h-12 flex items-center justify-center bg-white border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-600 rounded-lg transition-colors"
                        title="Skip this item (didn't buy)"
                        aria-label="Skip this item"
                      >
                        <X size={20} strokeWidth={2.5} />
                      </button>
                    )}
                    {/* Pay button */}
                    <button
                      onClick={() => {
                        setSelectedItemForPayment(itemId);
                        setShowPaymentModal(true);
                      }}
                      className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                      Pay
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedItemForPayment && (
        <PaymentModal
          itemId={selectedItemForPayment}
          items={items}
          existingPayment={itemPayments[selectedItemForPayment]}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedItemForPayment(null);
          }}
          onConfirm={(method, amount) => {
            onRecordPayment(selectedItemForPayment, method, amount);
            setShowPaymentModal(false);
            setSelectedItemForPayment(null);
          }}
        />
      )}

      {/* Done button */}
      {allItemsHandled && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
          <button
            onClick={onDoneShopping}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Check size={20} strokeWidth={2.5} />
            Done shopping
          </button>
        </div>
      )}
    </div>
  );
}

export default ShoppingScreen;
