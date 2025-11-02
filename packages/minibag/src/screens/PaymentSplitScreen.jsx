import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import AppHeader from '../components/layout/AppHeader.jsx';
import ProgressBar from '../components/layout/ProgressBar.jsx';
import UserIdentity from '../components/UserIdentity.jsx';
import { aggregateAllItems, calculateAllParticipantCosts, formatPrice } from '../utils/calculateItems';

/**
 * PaymentSplitScreen Component
 *
 * Final screen showing cost split among host and participants.
 * Displays itemized bills and allows sending payment requests via WhatsApp.
 *
 * @param {Object} hostItems - Items added by host with quantities
 * @param {Array} participants - List of participants with their items
 * @param {Object} itemPayments - Payment information for each item {itemId: {amount, method}}
 * @param {Array} items - Catalog items array
 * @param {function} getItemName - Function to get localized item name
 * @param {Object} session - Session object with session_id
 * @param {Object} currentParticipant - Current participant object
 * @param {function} onUpdateSessionStatus - Update session status callback
 * @param {boolean} showSessionMenu - Whether session menu is open
 * @param {function} onShowSessionMenuChange - Toggle session menu
 * @param {function} onEndSession - End session handler
 * @param {function} handleLanguageChange - Language change handler
 * @param {Object} i18n - i18n instance
 * @param {function} onHelpClick - Help icon click handler
 * @param {function} onLogoClick - Logo click handler
 * @param {function} onDone - Callback when done button clicked
 */
function PaymentSplitScreen({
  hostItems,
  participants,
  itemPayments,
  skippedItems = {},
  items,
  getItemName,
  session,
  currentParticipant,
  onUpdateSessionStatus,
  showSessionMenu,
  onShowSessionMenuChange,
  onEndSession,
  handleLanguageChange,
  i18n,
  onHelpClick,
  onLogoClick,
  onDone
}) {
  // State for expanded participants in compact view
  const [expandedParticipants, setExpandedParticipants] = useState({});

  // Update session status to 'completed' when component mounts
  useEffect(() => {
    if (session?.session_id && onUpdateSessionStatus) {
      onUpdateSessionStatus('completed');
    }
  }, [session?.session_id, onUpdateSessionStatus]);

  // Calculate total quantities for all items (memoized for performance)
  const allItems = useMemo(
    () => aggregateAllItems(hostItems, participants),
    [hostItems, participants]
  );

  // Calculate total paid amount
  const totalPaid = useMemo(
    () => Object.values(itemPayments).reduce((sum, p) => sum + (p?.amount || 0), 0),
    [itemPayments]
  );

  // Calculate host cost (memoized)
  const hostCost = useMemo(() => {
    let cost = 0;
    Object.entries(hostItems).forEach(([itemId, qty]) => {
      const payment = itemPayments[itemId];
      if (payment) {
        const totalQty = allItems[itemId];
        const pricePerKg = payment.amount / totalQty;
        cost += pricePerKg * qty;
      }
    });
    return cost;
  }, [hostItems, allItems, itemPayments]);

  // Calculate participant costs with item details (memoized)
  const participantCosts = useMemo(() => {
    const costs = {};
    participants.forEach(p => {
      const pName = p.nickname || p.name || 'Participant';
      let cost = 0;
      const itemDetails = [];

      Object.entries(p.items || {}).forEach(([itemId, qty]) => {
        const payment = itemPayments[itemId];
        if (payment) {
          const totalQty = allItems[itemId];
          const pricePerKg = payment.amount / totalQty;
          const itemCost = pricePerKg * qty;
          cost += itemCost;

          const veg = items.find(v => v.id === itemId);
          itemDetails.push({
            id: itemId,
            name: getItemName(veg),
            qty,
            pricePerKg,
            cost: itemCost,
            emoji: veg?.emoji || '🥬'
          });
        }
      });

      costs[pName] = { total: cost, items: itemDetails };
    });
    return costs;
  }, [participants, allItems, itemPayments, items, getItemName]);

  const totalToReceive = useMemo(
    () => Object.values(participantCosts).reduce((sum, data) => sum + data.total, 0),
    [participantCosts]
  );

  const handleSendPaymentRequest = (participant) => {
    const pName = participant.nickname || participant.name || 'Participant';
    const costData = participantCosts[pName];
    if (!costData) return;

    const itemsList = costData.items
      .map(item => `${item.name} ${item.qty}kg - ₹${Math.round(item.cost)}`)
      .join('%0A');

    const billUrl = `${window.location.origin}/bill/${session.session_id}/${participant.id || pName.toLowerCase()}`;
    const message = encodeURIComponent(`Hi! Your shopping bill is ready.\n\nBag tag: "${pName}"\n\n${itemsList.replace(/%0A/g, '\n')}\n\nTotal: ₹${Math.round(costData.total)}\n\nView & pay: ${billUrl}`);

    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const toggleParticipantExpand = (pName) => {
    setExpandedParticipants(prev => ({
      ...prev,
      [pName]: !prev[pName]
    }));
  };

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
      <div className="p-6 pt-20">
        {/* Progress Bar */}
        <ProgressBar
          currentStep={4}
          canNavigate={false}
        />

        <div className="mb-4">
          <p className="text-lg font-semibold text-gray-900">Bill Summary</p>
        </div>

        {/* Compact Summary Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
            <p className="text-xs text-gray-600 mb-1">Total Spent</p>
            <p className="text-2xl font-bold text-gray-900">₹{totalPaid.toFixed(0)}</p>
          </div>
          <div className="border border-gray-300 rounded-lg p-4 bg-green-50">
            <p className="text-xs text-gray-600 mb-1">Your Cost</p>
            <p className="text-2xl font-bold text-green-700">₹{hostCost.toFixed(0)}</p>
          </div>
          {participants.length > 0 && (
            <div className="border border-gray-300 rounded-lg p-4 bg-blue-50 col-span-2">
              <p className="text-xs text-gray-600 mb-1">You'll Receive</p>
              <p className="text-2xl font-bold text-blue-700">₹{totalToReceive.toFixed(0)}</p>
              <p className="text-xs text-gray-500 mt-1">from {participants.length} {participants.length === 1 ? 'person' : 'people'}</p>
            </div>
          )}
        </div>

        {/* Show different text for solo vs group shopping */}
        <p className="text-base text-gray-900 mb-4">
          {participants.length === 0 ? 'Your shopping summary' : 'Collect from others'}
        </p>

        {/* Solo shopper summary */}
        {participants.length === 0 && (
          <div className="border border-gray-300 rounded-lg p-4 mb-6">
            <div className="text-sm text-gray-600 space-y-2">
              {Object.entries(hostItems).map(([itemId, qty]) => {
                const veg = items.find(v => v.id === itemId);
                const payment = itemPayments[itemId];
                if (!payment) {
                  return (
                    <div key={itemId} className="flex justify-between items-center py-2">
                      <div>
                        <p className="text-base text-gray-900">{getItemName(veg)}</p>
                        <p className="text-xs text-gray-500">{qty}kg</p>
                      </div>
                      <p className="text-sm text-gray-400">-</p>
                    </div>
                  );
                }
                const totalQty = allItems[itemId];
                const pricePerKg = payment.amount / totalQty;
                const itemCost = pricePerKg * qty;
                return (
                  <div key={itemId} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-base text-gray-900">{getItemName(veg)}</p>
                      <p className="text-xs text-gray-500">{qty}kg × ₹{pricePerKg.toFixed(0)}/kg</p>
                    </div>
                    <p className="text-base text-gray-900 font-medium">₹{itemCost.toFixed(0)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3 mb-6">
          {participants.map(p => {
            const pName = p.nickname || p.name || 'Participant';
            const costData = participantCosts[pName];
            const isHost = currentParticipant?.is_creator || false;
            const isExpanded = expandedParticipants[pName];

            return (
              <div key={p.id || pName} className="border border-gray-300 rounded-lg overflow-hidden">
                {/* Compact Header */}
                <div
                  className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleParticipantExpand(pName)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 text-xs font-medium flex-shrink-0">
                        {pName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {isHost ? (
                            <UserIdentity realName={p.real_name} nickname={pName} />
                          ) : (
                            pName
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {costData?.items.length || 0} {(costData?.items.length || 0) === 1 ? 'item' : 'items'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-gray-900">₹{costData?.total.toFixed(0) || 0}</p>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-gray-500" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-500" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible Item Details */}
                {isExpanded && costData && (
                  <div className="border-t border-gray-200">
                    <div className="p-4 bg-white space-y-2">
                      {costData.items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          <span className="text-lg">{item.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.qty}kg × ₹{item.pricePerKg.toFixed(0)}/kg</p>
                          </div>
                          <p className="text-gray-900 font-medium">₹{item.cost.toFixed(0)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSendPaymentRequest(p);
                        }}
                        className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                      >
                        Send payment request
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Skipped Items Section */}
        {Object.keys(skippedItems).length > 0 && (
          <div className="border border-yellow-300 bg-yellow-50 rounded-lg p-4 mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="text-yellow-600">⚠️</span>
              Skipped Items
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              {Object.entries(skippedItems).map(([itemId, skipData]) => {
                const veg = items.find(v => v.id === itemId);
                if (!veg) return null;
                return (
                  <div key={itemId} className="flex justify-between items-start py-2 border-b border-yellow-200 last:border-0">
                    <div className="flex-1">
                      <p className="text-base text-gray-900">{getItemName(veg)}</p>
                      <p className="text-xs text-gray-600 italic mt-1">
                        {skipData.reason || 'Item wasn\'t good enough to buy'}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs font-semibold rounded ml-2">
                      SKIPPED
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">You'll receive</p>
            <p className="text-2xl text-gray-900">₹{totalToReceive.toFixed(0)}</p>
          </div>
          <button
            onClick={onDone}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg text-base font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentSplitScreen;
