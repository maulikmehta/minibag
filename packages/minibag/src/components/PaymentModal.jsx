import React, { useState } from 'react';
import { X, IndianRupee, Check } from 'lucide-react';

/**
 * PaymentModal Component
 *
 * Modal for recording payments for purchased items.
 * Allows selection of payment method (UPI/Cash) and entering amount.
 *
 * @param {string} itemId - ID of the item being paid for
 * @param {Array} items - Array of all items
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onConfirm - Callback when payment is confirmed (method, amount)
 */
function PaymentModal({ itemId, items, onClose, onConfirm }) {
  const [method, setMethod] = useState('upi');
  const [amount, setAmount] = useState('');
  const veg = items.find(v => v.id === itemId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
      <div className="bg-white rounded-lg max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <p className="text-xl text-gray-900 mb-2">Record payment</p>
        <p className="text-sm text-gray-600 mb-6">for {veg?.name}</p>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Payment method</p>
          <div className="flex gap-3">
            <button
              onClick={() => setMethod('upi')}
              className={`flex-1 py-3 rounded-lg border-2 text-base font-semibold transition-all ${
                method === 'upi'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-green-600 hover:text-green-600'
              }`}
            >
              UPI
            </button>
            <button
              onClick={() => setMethod('cash')}
              className={`flex-1 py-3 rounded-lg border-2 text-base font-semibold transition-all ${
                method === 'cash'
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-900 border-gray-300 hover:border-green-600 hover:text-green-600'
              }`}
            >
              Cash
            </button>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Amount paid</p>
          <div className="relative">
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <IndianRupee size={20} className="text-gray-600" strokeWidth={2.5} />
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-gray-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-300 rounded-lg text-base text-gray-900 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => amount && onConfirm(method, amount)}
            disabled={!amount}
            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-base font-semibold disabled:bg-gray-400 disabled:hover:bg-gray-400 flex items-center justify-center gap-2 transition-colors"
          >
            <Check size={18} strokeWidth={2.5} />
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;
