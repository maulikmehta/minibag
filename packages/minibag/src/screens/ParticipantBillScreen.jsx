import React from 'react';

/**
 * ParticipantBillScreen Component
 *
 * Displays individual participant's bill after shopping is complete.
 * Shows itemized costs and payment options.
 * Accessed via WhatsApp link sent to participants.
 *
 * @param {Array} participants - List of participants (uses first participant)
 * @param {Object} hostItems - Items added by host with quantities
 * @param {Object} itemPayments - Payment information for each item {itemId: {amount}}
 * @param {Array} items - Catalog items array
 * @param {function} getItemName - Function to get localized item name
 * @param {function} onGoHome - Callback to navigate to home screen
 */
function ParticipantBillScreen({
  participants,
  hostItems,
  itemPayments,
  items,
  getItemName,
  onGoHome
}) {
  // Empty state - no participants
  if (participants.length === 0) {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center p-8">
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
    );
  }

  // Get participant data (first participant)
  const participant = participants[0];

  // Calculate total quantities for all items
  const allItems = { ...hostItems };
  participants.forEach(p => {
    Object.entries(p.items || {}).forEach(([id, qty]) => {
      allItems[id] = (allItems[id] || 0) + qty;
    });
  });

  // Calculate participant's bill
  let participantCost = 0;
  const billItems = [];

  Object.entries(participant.items || {}).forEach(([itemId, qty]) => {
    const veg = items.find(v => v.id === itemId);
    const payment = itemPayments[itemId];
    if (payment) {
      const totalQty = allItems[itemId];
      const pricePerKg = payment.amount / totalQty;
      const itemCost = pricePerKg * qty;
      participantCost += itemCost;
      billItems.push({
        name: getItemName(veg),
        qty,
        pricePerKg: pricePerKg.toFixed(0),
        itemCost: itemCost.toFixed(0)
      });
    }
  });

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
      <div className="p-6">
        <p className="text-2xl text-gray-900 mb-6">Your bill</p>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
          <p className="text-sm text-gray-600 mb-1">Shopping completed by Host</p>
          <p className="text-base text-gray-900">You are: {participant.name}</p>
        </div>

        <div className="border border-gray-300 rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-3 border-b border-gray-300">
            <p className="text-sm text-gray-900">Items purchased</p>
          </div>

          <div className="divide-y divide-gray-200">
            {billItems.map((item, idx) => (
              <div key={idx} className="py-3 px-3">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-base text-gray-900">{item.name}</p>
                  <p className="text-base text-gray-900">₹{item.itemCost}</p>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{item.qty}kg × ₹{item.pricePerKg}/kg</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-50 px-4 py-4 border-t-2 border-gray-900">
            <div className="flex justify-between items-center">
              <p className="text-base text-gray-900">Total amount due</p>
              <p className="text-3xl text-gray-900">₹{participantCost.toFixed(0)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              alert(`Opening UPI payment for ₹${participantCost.toFixed(0)}\n\nIn real app: Deep-link to PhonePe/GPay`);
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors"
          >
            Pay ₹{participantCost.toFixed(0)} via UPI
          </button>

          <button
            onClick={() => {
              alert('Marked as paid via cash.\n\nIn real app: Notify host');
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
