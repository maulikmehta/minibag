import React, { useMemo, useEffect, useState } from 'react';
import { Share2, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppHeader from '../components/layout/AppHeader.jsx';
import UserIdentity from '../components/UserIdentity.jsx';
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
 * @param {function} onExitSession - Callback to exit session with full cleanup
 * @param {Object} i18n - i18n instance for language management
 * @param {function} handleLanguageChange - Language change handler
 */
function ParticipantBillScreen({
  session,
  participants,
  hostItems,
  itemPayments,
  items,
  getItemName,
  onGoHome,
  onExitSession,
  i18n,
  handleLanguageChange
}) {
  const { t } = useTranslation();

  // State for server-calculated bill
  const [billData, setBillData] = useState(null);
  const [loadingBill, setLoadingBill] = useState(true);
  const [messageCopied, setMessageCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  // FIX: Calculate participant's bill from server data only
  const { participantCost, billItems } = useMemo(() => {
    // Use server-calculated bill data
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

    // No fallback - return empty if server data unavailable
    return { participantCost: 0, billItems: [] };
  }, [billData, participant]);

  // Handler for sending thank you message to host via WhatsApp
  const handleMessageHost = () => {
    const message = encodeURIComponent(t('whatsapp.thankYouMessage'));
    window.open(`https://api.whatsapp.com/send?text=${message}`, '_blank');
  };

  // Handler for copying thank you message to clipboard
  const handleCopyMessage = async () => {
    try {
      const message = t('whatsapp.thankYouMessage');
      await navigator.clipboard.writeText(message);
      setMessageCopied(true);
      setTimeout(() => setMessageCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
      <AppHeader
        i18n={i18n}
        onLanguageChange={handleLanguageChange}
        showEndSessionMenu={true}
        endSessionMenuOpen={menuOpen}
        onEndSessionMenuToggle={setMenuOpen}
        onEndSession={onExitSession}
        menuLabel="Close Bill"
      />
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
        <div className="mb-6 p-4 border border-gray-300 rounded-lg bg-blue-50 text-center">
          <p className="text-xs text-gray-600 mb-1">Total Amount</p>
          <p className="text-3xl font-bold text-blue-700">₹{participantCost.toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-1">{billItems.length} {billItems.length === 1 ? 'item' : 'items'}</p>
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

        {/* Message Host Buttons - Styled like Send Invite */}
        <div className="flex gap-3">
          {/* WhatsApp Share Button */}
          <button
            onClick={handleMessageHost}
            className="flex-1 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-900 py-3.5 px-4 rounded-xl transition-colors"
          >
            <div className="flex items-center justify-center gap-2">
              <Share2 size={18} strokeWidth={2} />
              <span className="font-semibold">Message Host</span>
            </div>
          </button>

          {/* Copy Message Icon Button */}
          <button
            onClick={handleCopyMessage}
            className="w-14 h-14 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-600 rounded-xl transition-colors flex items-center justify-center"
            title="Copy message"
          >
            {messageCopied ? (
              <Check size={20} className="text-green-600" />
            ) : (
              <Copy size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ParticipantBillScreen;
