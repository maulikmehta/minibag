import React from 'react';
import AppHeader from '../components/layout/AppHeader.jsx';
import ProgressBar from '../components/layout/ProgressBar.jsx';

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
  items,
  getItemName,
  session,
  currentParticipant,
  showSessionMenu,
  onShowSessionMenuChange,
  onEndSession,
  handleLanguageChange,
  i18n,
  onHelpClick,
  onLogoClick,
  onDone
}) {
  // Calculate total quantities for all items
  const allItems = { ...hostItems };
  participants.forEach(p => {
    Object.entries(p.items || {}).forEach(([id, qty]) => {
      allItems[id] = (allItems[id] || 0) + qty;
    });
  });

  const totalPaid = Object.values(itemPayments).reduce((sum, p) => sum + (p?.amount || 0), 0);

  // Calculate host cost
  let hostCost = 0;
  Object.entries(hostItems).forEach(([itemId, qty]) => {
    const payment = itemPayments[itemId];
    if (payment) {
      const totalQty = allItems[itemId];
      const pricePerKg = payment.amount / totalQty;
      hostCost += pricePerKg * qty;
    }
  });

  // Calculate participant costs
  const participantCosts = {};
  participants.forEach(p => {
    let cost = 0;
    Object.entries(p.items || {}).forEach(([itemId, qty]) => {
      const payment = itemPayments[itemId];
      if (payment) {
        const totalQty = allItems[itemId];
        const pricePerKg = payment.amount / totalQty;
        cost += pricePerKg * qty;
      }
    });
    participantCosts[p.name] = cost;
  });

  const totalToReceive = Object.values(participantCosts).reduce((sum, cost) => sum + cost, 0);

  const handleSendPaymentRequest = (participant) => {
    const owes = participantCosts[participant.name];

    const itemsList = Object.entries(participant.items || {})
      .map(([itemId, qty]) => {
        const veg = items.find(v => v.id === itemId);
        const payment = itemPayments[itemId];
        if (!payment) return null;
        const totalQty = allItems[itemId];
        const pricePerKg = payment.amount / totalQty;
        const itemCost = pricePerKg * qty;
        return `${getItemName(veg)} ${qty}kg - ₹${Math.round(itemCost)}`;
      })
      .filter(Boolean)
      .join('%0A');

    const billUrl = `${window.location.origin}/bill/${session.session_id}/${participant.id || participant.name.toLowerCase()}`;
    const message = encodeURIComponent(`Hi! Your shopping bill is ready.\n\nBag tag: "${participant.name}"\n\n${itemsList.replace(/%0A/g, '\n')}\n\nTotal: ₹${Math.round(owes)}\n\nView & pay: ${billUrl}`);

    window.open(`https://wa.me/?text=${message}`, '_blank');
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

        <div className="mb-6">
          <p className="text-lg font-semibold text-gray-900">Split Costs</p>
        </div>

        <div className="border-2 border-gray-900 rounded-lg p-6 mb-6 text-center">
          <p className="text-sm text-gray-600 mb-2">Total spent</p>
          <p className="text-4xl text-gray-900">₹{totalPaid.toFixed(0)}</p>
        </div>

        <div className="mb-6 py-4 border-t border-b border-gray-300">
          <div className="flex justify-between items-center">
            <p className="text-base text-gray-900">Your cost</p>
            <p className="text-2xl text-gray-900">₹{hostCost.toFixed(0)}</p>
          </div>
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
            const owes = participantCosts[p.name];
            return (
              <div key={p.name} className="border border-gray-300 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 text-xs flex-shrink-0">
                      {p.name.slice(0, 2).toUpperCase()}
                    </div>
                    <p className="text-base text-gray-900">{p.name}</p>
                  </div>
                  <p className="text-xl text-gray-900">₹{owes.toFixed(0)}</p>
                </div>

                <div className="text-sm text-gray-600 space-y-1 pt-3 border-t border-gray-200 mb-4">
                  {Object.entries(p.items || {}).map(([itemId, qty]) => {
                    const veg = items.find(v => v.id === itemId);
                    const payment = itemPayments[itemId];
                    if (!payment) return null;
                    const totalQty = allItems[itemId];
                    const pricePerKg = payment.amount / totalQty;
                    const itemCost = pricePerKg * qty;
                    return (
                      <div key={itemId} className="flex justify-between">
                        <span>{getItemName(veg)} {qty}kg @ ₹{pricePerKg.toFixed(0)}/kg</span>
                        <span>₹{itemCost.toFixed(0)}</span>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => handleSendPaymentRequest(p)}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Send payment request
                </button>
              </div>
            );
          })}
        </div>
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
