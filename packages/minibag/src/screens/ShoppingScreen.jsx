import React from 'react';
import { Check } from 'lucide-react';
import PaymentModal from '../components/PaymentModal.jsx';

/**
 * ShoppingScreen Component
 *
 * Screen for recording payments for purchased items.
 * Host records payment method (UPI/Cash) and amount for each item.
 *
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
 */
function ShoppingScreen({
  hostItems,
  participants,
  itemPayments,
  items,
  getItemName,
  currentParticipant,
  showPaymentModal,
  setShowPaymentModal,
  selectedItemForPayment,
  setSelectedItemForPayment,
  onRecordPayment,
  onDoneShopping
}) {
  // Calculate total quantities for all items
  const allItems = { ...hostItems };
  participants.forEach(p => {
    Object.entries(p.items || {}).forEach(([id, qty]) => {
      allItems[id] = (allItems[id] || 0) + qty;
    });
  });

  const hostNickname = currentParticipant?.nickname || 'You';
  const totalPaid = Object.values(itemPayments).reduce((sum, p) => sum + (p?.amount || 0), 0);
  const allItemsPaid = Object.keys(allItems).every(id => itemPayments[id]);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-32">
      <div className="p-6">
        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-900">Step 3 of 4</p>
            <p className="text-sm text-gray-600">₹{totalPaid} paid</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-green-600 h-1.5 rounded-full" style={{width: '75%'}}></div>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-lg font-semibold text-gray-900 mb-3">Record Payments</p>
          <div className="flex justify-between items-center text-sm">
            <p className="text-gray-600">Items paid: {Object.keys(itemPayments).length}/{Object.keys(allItems).length}</p>
          </div>
        </div>

        <div className="divide-y divide-gray-200 mb-6">
          {Object.entries(allItems).map(([itemId, totalQty]) => {
            const veg = items.find(v => v.id === itemId);
            const payment = itemPayments[itemId];
            const isPaid = !!payment;

            // Skip if vegetable not found
            if (!veg) return null;

            // Calculate participant breakdown
            const breakdown = [];
            if (hostItems[itemId]) {
              breakdown.push({ name: hostNickname, qty: hostItems[itemId] });
            }
            participants.forEach(p => {
              if (p.items && p.items[itemId]) {
                breakdown.push({ name: p.name, qty: p.items[itemId] });
              }
            });

            return (
              <div
                key={itemId}
                className={`flex items-start gap-3 py-3 px-2 ${
                  isPaid ? 'bg-gray-50' : ''
                }`}
              >
                {veg.thumbnail_url || veg.img ? (
                  <img
                    src={veg.thumbnail_url || veg.img}
                    alt={veg.name}
                    loading="lazy"
                    className="w-10 h-10 rounded-full object-cover bg-gray-100 flex-shrink-0 mt-1"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-xl mt-1" style={{display: (veg.thumbnail_url || veg.img) ? 'none' : 'flex'}}>
                  🥬
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-base text-gray-900 mb-1">{getItemName(veg)}</p>
                  <p className="text-sm text-gray-500">
                    {breakdown.map((b, idx) => (
                      <span key={idx}>
                        {b.name}: {b.qty}kg{idx < breakdown.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                  {isPaid && (
                    <p className="text-sm text-gray-900 mt-1">
                      ✓ ₹{payment.amount} • {payment.method === 'upi' ? 'UPI' : 'Cash'}
                    </p>
                  )}
                </div>

                {isPaid ? (
                  <button
                    onClick={() => {
                      setSelectedItemForPayment(itemId);
                      setShowPaymentModal(true);
                    }}
                    className="text-sm text-gray-600 px-4 py-2 flex-shrink-0"
                  >
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedItemForPayment(itemId);
                      setShowPaymentModal(true);
                    }}
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex-shrink-0 mt-1 transition-colors"
                  >
                    Pay
                  </button>
                )}
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
      {allItemsPaid && (
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
