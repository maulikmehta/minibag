import React, { useMemo, useEffect, useState } from 'react';
import AppHeader from '../components/layout/AppHeader.jsx';
import UserIdentity from '../components/UserIdentity.jsx';
import { useNotification } from '../hooks/useNotification.js';
import { aggregateAllItems } from '../utils/calculateItems';
import { getBillItems } from '../services/api.js';

/**
 * ParticipantBillScreen Component
 *
 * Displays individual participant's bill after shopping is complete.
 * Shows itemized costs and payment options.
 * Accessed via WhatsApp link sent to participants.
 *
 * @param {Object} session - Session object with session_id
 * @param {Array} participants - List of participants (uses first participant)
 * @param {Object} hostItems - Items added by host with quantities
 * @param {Object} itemPayments - Payment information for each item {itemId: {amount}}
 * @param {Array} items - Catalog items array
 * @param {function} getItemName - Function to get localized item name
 * @param {function} onGoHome - Callback to navigate to home screen
 */
function ParticipantBillScreen({
  session,
  participants,
  hostItems,
  itemPayments,
  items,
  getItemName,
  onGoHome
}) {
  const notify = useNotification();

  // State for server-calculated bill
  const [billData, setBillData] = useState(null);
  const [loadingBill, setLoadingBill] = useState(true);

  // Fetch bill items from server (eliminates empty items race condition)
  useEffect(() => {
    if (!session?.session_id) {
      setLoadingBill(false);
      return;
    }

    const fetchBillData = async () => {
      try {
        setLoadingBill(true);
        const data = await getBillItems(session.session_id);

        console.log('📄 Participant Bill Screen - Server Bill Data:', {
          participantsCount: data.participants?.length,
          totalPaid: data.total_paid
        });

        setBillData(data);
      } catch (error) {
        console.error('❌ Failed to fetch bill items, falling back to client calculation:', error);
        // Fallback to client-side calculations if API fails
        setBillData(null);
      } finally {
        setLoadingBill(false);
      }
    };

    fetchBillData();
  }, [session?.session_id]);

  // Empty state - no participants
  if (participants.length === 0) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
          <p className="text-base text-gray-600 mb-4">No bill data. Create a session first.</p>
          <button
            onClick={onGoHome}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Go home
          </button>
        </div>
      </div>
      </div>
    );
  }

  // Get participant data (first participant)
  const participant = participants[0];

  // Fallback: Calculate total quantities for all items (memoized)
  const allItems = useMemo(
    () => aggregateAllItems(hostItems, participants),
    [hostItems, participants]
  );

  // Calculate participant's bill (from server data or fallback)
  const { participantCost, billItems } = useMemo(() => {
    // Try to use server-calculated bill data first
    if (billData?.participants && participant?.id) {
      const serverBill = billData.participants.find(p => p.participant_id === participant.id);

      if (serverBill) {
        console.log('✅ Using server-calculated bill for participant:', serverBill.nickname);
        return {
          participantCost: serverBill.total_cost,
          billItems: serverBill.items.map(item => ({
            name: item.name,
            qty: item.quantity,
            pricePerKg: item.price_per_kg,
            itemCost: item.item_cost,
            emoji: item.emoji || '🥬'
          }))
        };
      }
    }

    // Fallback: client-side calculation
    console.log('⚠️ Falling back to client-side bill calculation for participant:', participant?.nickname);
    let cost = 0;
    const items = [];

    Object.entries(participant.items || {}).forEach(([itemId, qty]) => {
      const veg = getItemName ? items.find(v => v.id === itemId) : null;
      const payment = itemPayments[itemId];
      if (payment) {
        const totalQty = allItems[itemId];
        const pricePerKg = payment.amount / totalQty;
        const itemCost = pricePerKg * qty;
        cost += itemCost;
        items.push({
          name: getItemName ? getItemName(veg) : `Item ${itemId}`,
          qty,
          pricePerKg: pricePerKg.toFixed(0),
          itemCost: itemCost.toFixed(0),
          emoji: veg?.emoji || '🥬'
        });
      }
    });

    return { participantCost: cost, billItems: items };
  }, [billData, participant, allItems, itemPayments, items, getItemName]);

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
      <AppHeader />
      <div className="p-6">
        <p className="text-2xl font-bold text-gray-900 mb-4">Your Bill</p>

        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-gray-600 mb-0.5">Shopping completed by Host</p>
          <p className="text-sm text-gray-900 font-medium">
            <UserIdentity
              realName={participant.real_name}
              nickname={participant.nickname || participant.name || 'Participant'}
            />
          </p>
        </div>

        {/* Compact Total at Top */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg text-center">
          <p className="text-xs text-gray-300 mb-1">Total Amount</p>
          <p className="text-4xl font-bold text-white">₹{participantCost.toFixed(0)}</p>
          <p className="text-xs text-gray-400 mt-1">{billItems.length} {billItems.length === 1 ? 'item' : 'items'}</p>
        </div>

        {/* Compact Item List */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-3">Items</p>
          <div className="space-y-2">
            {billItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <span className="text-xl">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">{item.qty}kg × ₹{item.pricePerKg}/kg</p>
                </div>
                <p className="text-sm text-gray-900 font-bold">₹{item.itemCost}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              notify.info(`UPI payment for ₹${participantCost.toFixed(0)} (Demo: would open PhonePe/GPay)`);
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors"
          >
            Pay ₹{participantCost.toFixed(0)} via UPI
          </button>

          <button
            onClick={() => {
              notify.success('Marked as paid via cash (Demo: would notify host)');
            }}
            className="w-full border-2 border-gray-900 py-4 rounded-lg text-base text-gray-900"
          >
            Paid in cash
          </button>
        </div>

        <p className="text-sm text-gray-600 text-center mt-6">
          Payment will be sent to Host's UPI
        </p>
      </div>
    </div>
  );
}

export default ParticipantBillScreen;
