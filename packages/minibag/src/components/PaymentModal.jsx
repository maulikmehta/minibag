import React, { useState } from 'react';
import { IndianRupee, Check, ChevronUp, ChevronDown } from 'lucide-react';
import ModalWrapper from './shared/ModalWrapper.jsx';

/**
 * PaymentModal Component
 *
 * Modal for recording payments for purchased items.
 * Allows selection of payment method (UPI/Cash) and entering amount.
 *
 * @param {string} itemId - ID of the item being paid for
 * @param {Array} items - Array of all items
 * @param {Object} existingPayment - Existing payment data for editing (optional)
 * @param {function} onClose - Callback when modal is closed
 * @param {function} onConfirm - Callback when payment is confirmed (method, amount, paymentId)
 */
function PaymentModal({ itemId, items, existingPayment = null, onClose, onConfirm }) {
  // If editing a skipped payment, default to 'upi' instead of 'skip'
  const initialMethod = existingPayment?.method === 'skip' ? 'upi' : (existingPayment?.method || 'upi');
  const [method, setMethod] = useState(initialMethod);
  const [amount, setAmount] = useState(existingPayment?.amount?.toString() || '');
  const veg = items.find(v => v.id === itemId);

  return (
    <ModalWrapper isOpen={true} onClose={onClose}>
      <p className="text-xl text-gray-900 mb-2">Record payment</p>
      <p className="text-sm text-gray-600 mb-6">for {veg?.name}</p>

      <div className="mb-6">
        <p className="text-sm text-gray-600 mb-3">Total amount paid</p>
        <div className="flex gap-3">
          <div className="relative flex-1">
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
          <div className="flex items-center justify-between border-2 border-gray-300 rounded-lg px-4 py-3 w-32">
            <span className="text-base font-semibold text-gray-900">
              {method === 'upi' ? 'UPI' : 'Cash'}
            </span>
            <div className="flex flex-col -space-y-2">
              <button
                onClick={() => setMethod(method === 'upi' ? 'cash' : 'upi')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                type="button"
              >
                <ChevronUp size={20} strokeWidth={2} />
              </button>
              <button
                onClick={() => setMethod(method === 'cash' ? 'upi' : 'cash')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
                type="button"
              >
                <ChevronDown size={20} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => amount && onConfirm(method, amount, existingPayment?.id)}
          disabled={!amount}
          className="w-10 h-10 flex items-center justify-center bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400 rounded-full text-white transition-all duration-150 active:scale-90 disabled:active:scale-100"
          title="Confirm payment"
        >
          <Check size={20} strokeWidth={2} />
        </button>
      </div>
    </ModalWrapper>
  );
}

export default PaymentModal;
