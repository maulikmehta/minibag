import React, { useState } from 'react';
import { Plus, Minus, Check } from 'lucide-react';

const VEGETABLES = [
  { id: 'v1', name: 'Tomatoes', name_gu: 'ટામેટાં', name_hi: 'टमाटर', img: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200&h=200&fit=crop', category: 'veggies' },
  { id: 'v2', name: 'Onions', name_gu: 'ડુંગળી', name_hi: 'प्याज', img: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=200&h=200&fit=crop', category: 'veggies' },
  { id: 'v3', name: 'Potatoes', name_gu: 'બટાકા', name_hi: 'आलू', img: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200&h=200&fit=crop', category: 'veggies' },
  { id: 's1', name: 'Rice', name_gu: 'ચોખા', name_hi: 'चावल', img: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200&h=200&fit=crop', category: 'staples' },
  { id: 's2', name: 'Wheat Flour', name_gu: 'લોટ', name_hi: 'गेहूं का आटा', img: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=200&h=200&fit=crop', category: 'staples' },
  { id: 's3', name: 'Lentils', name_gu: 'દાળ', name_hi: 'दाल', img: 'https://images.unsplash.com/photo-1596040033229-a0b78e1f93e7?w=200&h=200&fit=crop', category: 'staples' },
  { id: 'm1', name: 'Milk', name_gu: 'દૂધ', name_hi: 'दूध', img: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=200&h=200&fit=crop', category: 'dairy' },
  { id: 'm2', name: 'Yogurt', name_gu: 'દહીં', name_hi: 'दही', img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200&h=200&fit=crop', category: 'dairy' },
  { id: 'm3', name: 'Paneer', name_gu: 'પનીર', name_hi: 'पनीर', img: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200&h=200&fit=crop', category: 'dairy' }
];

const CATEGORIES = [
  { id: 'veggies', name: 'Veggies', emoji: '🥬', color: 'bg-green-100' },
  { id: 'staples', name: 'Staples', emoji: '🌾', color: 'bg-yellow-100' },
  { id: 'dairy', name: 'Dairy', emoji: '🥛', color: 'bg-blue-100' }
];

const INDIAN_NAMES = ['Raj', 'Maya', 'Amit', 'Priya'];

export default function MinibagPrototype() {
  const [currentScreen, setCurrentScreen] = useState('home');
  const [hostItems, setHostItems] = useState({});
  const [participants, setParticipants] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('veggies');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState('host');
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [signUpContext, setSignUpContext] = useState('');
  const [itemPayments, setItemPayments] = useState({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState(null);

  const getTotalWeight = (items) => {
    return Object.values(items).reduce((sum, qty) => sum + qty, 0);
  };

  // SCREEN 0: HOME
  if (currentScreen === 'home') {
    return (
      <div className="max-w-md mx-auto bg-white min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-12">
          <div className="w-24 h-24 mb-12">
            <span className="text-7xl opacity-15">🛍️</span>
          </div>
          <div className="text-center space-y-4">
            <p className="text-3xl font-normal text-gray-900 leading-tight">
              Track your shopping,<br />split with neighbors
            </p>
            <p className="text-lg text-gray-600 mt-6">
              Simple lists that work alone or together
            </p>
          </div>
        </div>

        <div className="fixed bottom-8 right-8 z-40">
          {showPlusMenu && (
            <div className="absolute bottom-20 right-0 bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden mb-3 w-48">
              <button
                onClick={() => { setShowPlusMenu(false); setCurrentScreen('host-create'); }}
                className="w-full px-5 py-4 text-left hover:bg-gray-50 border-b border-gray-200"
              >
                <p className="text-base text-gray-900">New run</p>
              </button>
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  setSignUpContext('past-runs');
                  setShowSignUpModal(true);
                }}
                className="w-full px-5 py-4 text-left hover:bg-gray-50 border-b border-gray-200"
              >
                <p className="text-base text-gray-900">Past runs</p>
              </button>
              <button
                onClick={() => {
                  setShowPlusMenu(false);
                  setSignUpContext('pro');
                  setShowSignUpModal(true);
                }}
                className="w-full px-5 py-4 text-left hover:bg-gray-50"
              >
                <p className="text-base text-gray-900">Go Pro</p>
              </button>
            </div>
          )}

          <button
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`w-16 h-16 bg-gray-900 rounded-full shadow-lg flex items-center justify-center transition-transform ${
              showPlusMenu ? 'rotate-45' : ''
            }`}
          >
            <Plus size={32} className="text-white" strokeWidth={2} />
          </button>
        </div>

        {showPlusMenu && (
          <div onClick={() => setShowPlusMenu(false)} className="fixed inset-0 z-30" />
        )}

        {/* Sign up modal */}
        {showSignUpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
            <div className="bg-white rounded-lg max-w-sm w-full p-6">
              <p className="text-xl text-gray-900 mb-4">
                {signUpContext === 'past-runs' ? 'Sign up to view history' : 'Sign up for Pro'}
              </p>
              <p className="text-sm text-gray-600 mb-6">
                {signUpContext === 'past-runs' 
                  ? 'Create an account to save and view your shopping history across all devices.'
                  : 'Unlock unlimited participants, vendor confirmations, and advanced analytics.'}
              </p>
              
              <div className="space-y-3 mb-6">
                <button className="w-full py-3 bg-gray-900 text-white rounded-lg text-base">
                  Sign up with Phone
                </button>
                <button className="w-full py-3 border-2 border-gray-300 text-gray-900 rounded-lg text-base">
                  Log in
                </button>
              </div>

              <button
                onClick={() => setShowSignUpModal(false)}
                className="w-full text-sm text-gray-600"
              >
                Maybe later
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // SCREEN 1: CREATE SESSION
  if (currentScreen === 'host-create') {
    const totalWeight = getTotalWeight(hostItems);
    const filteredItems = VEGETABLES.filter(v => {
      const matchesCategory = v.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.name_gu.includes(searchQuery) ||
        v.name_hi.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        <div className="p-6">
          <button onClick={() => setCurrentScreen('home')} className="text-base text-gray-600 mb-4">← Back</button>
          
          <div className="mb-6">
            <p className="text-2xl text-gray-900 mb-2">New run</p>
            <p className="text-base text-gray-600">{totalWeight}kg of 10kg</p>
          </div>

          {/* Category circles */}
          <div className="mb-6 -mx-2">
            <div className="flex gap-4 overflow-x-auto pb-4 px-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className="flex flex-col items-center flex-shrink-0"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                    selectedCategory === cat.id 
                      ? 'border-4 border-gray-900 ' + cat.color
                      : 'border-2 border-gray-300 bg-gray-50'
                  }`}>
                    <span className="text-2xl">{cat.emoji}</span>
                  </div>
                  <p className={`text-xs ${selectedCategory === cat.id ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {cat.name}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-gray-900 focus:outline-none"
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            {filteredItems.map(veg => {
              const quantity = hostItems[veg.id] || 0;
              const isSelected = quantity > 0;

              return (
                <div 
                  key={veg.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg ${
                    isSelected ? 'border-gray-900' : 'border-gray-300'
                  }`}
                >
                  <img src={veg.img} alt={veg.name} className="w-16 h-16 rounded object-cover" />
                  <div className="flex-1">
                    <p className="text-base text-gray-900">{veg.name}</p>
                    <p className="text-xs text-gray-500">{veg.name_gu} • {veg.name_hi}</p>
                  </div>

                  {isSelected ? (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          const newVal = Math.max(0, quantity - 0.5);
                          if (newVal === 0) {
                            const { [veg.id]: _, ...rest } = hostItems;
                            setHostItems(rest);
                          } else {
                            setHostItems({ ...hostItems, [veg.id]: newVal });
                          }
                        }}
                        className="w-10 h-10 rounded-full border border-gray-400 flex items-center justify-center"
                      >
                        <Minus size={18} strokeWidth={2} />
                      </button>
                      <span className="text-base text-gray-900 w-16 text-center">{quantity}kg</span>
                      <button
                        onClick={() => {
                          if (totalWeight < 10) {
                            setHostItems({ ...hostItems, [veg.id]: quantity + 0.5 });
                          }
                        }}
                        disabled={totalWeight >= 10}
                        className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center disabled:bg-gray-400"
                      >
                        <Plus size={18} className="text-white" strokeWidth={2} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (totalWeight < 10) {
                          setHostItems({ ...hostItems, [veg.id]: 0.5 });
                        }
                      }}
                      disabled={totalWeight >= 10}
                      className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:bg-gray-400"
                    >
                      Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {Object.keys(hostItems).length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
              <button
                onClick={() => setCurrentScreen('session-active')}
                className="w-full bg-gray-900 text-white py-4 rounded-lg text-base flex items-center justify-center gap-2"
              >
                <Check size={20} strokeWidth={2} />
                Create session
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // SCREEN 2: SESSION ACTIVE (with avatar circles)
  if (currentScreen === 'session-active') {
    const allItems = { ...hostItems };
    participants.forEach(p => {
      Object.entries(p.items || {}).forEach(([id, qty]) => {
        allItems[id] = (allItems[id] || 0) + qty;
      });
    });

    const selectedItems = selectedParticipant === 'host' 
      ? hostItems 
      : (participants.find(p => p.name === selectedParticipant)?.items || {});

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        <div className="p-6">
          <button onClick={() => setCurrentScreen('home')} className="text-base text-gray-600 mb-4">← Back</button>
          <div className="mb-6">
            <p className="text-2xl text-gray-900 mb-2">Session active</p>
            <p className="text-base text-gray-600">minibag.in/abc123</p>
          </div>

          {/* Avatar circles with gradient */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-4">{participants.length + 1} of 4 people</p>
            <div className="flex gap-4 overflow-x-auto pb-4 px-2 -mx-2">
              <button
                onClick={() => setSelectedParticipant('host')}
                className="flex flex-col items-center flex-shrink-0"
              >
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                  selectedParticipant === 'host'
                    ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]'
                    : Object.keys(hostItems).length > 0
                    ? 'border-2 border-gray-900'
                    : 'border-2 border-gray-300'
                } bg-white`}>
                  <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-900">You</span>
                  </div>
                </div>
                <p className={`text-xs ${selectedParticipant === 'host' ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                  Host
                </p>
              </button>

              {participants.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedParticipant(p.name)}
                  className="flex flex-col items-center flex-shrink-0"
                >
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 transition-all ${
                    selectedParticipant === p.name
                      ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 p-[2px]'
                      : Object.keys(p.items || {}).length > 0
                      ? 'border-2 border-gray-900'
                      : 'border-2 border-gray-300'
                  } bg-white`}>
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-900">
                        {p.name.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <p className={`text-xs ${selectedParticipant === p.name ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                    {p.name}
                  </p>
                </button>
              ))}

              {[...Array(3 - participants.length)].map((_, idx) => (
                <div key={`empty-${idx}`} className="flex flex-col items-center flex-shrink-0">
                  <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-300 bg-white mb-2"></div>
                  <p className="text-xs text-gray-400">Empty</p>
                </div>
              ))}
            </div>
          </div>

          {/* Selected participant's items */}
          <div className="mb-6">
            <p className="text-base text-gray-900 mb-4">
              {selectedParticipant === 'host' ? 'Your items' : `${selectedParticipant}'s items`}
            </p>
            
            {Object.keys(selectedItems).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(selectedItems).map(([itemId, qty]) => {
                  const veg = VEGETABLES.find(v => v.id === itemId);
                  return (
                    <div key={itemId} className="flex items-center gap-4 p-4 border border-gray-300 rounded-lg">
                      <img src={veg.img} alt={veg.name} className="w-12 h-12 rounded object-cover" />
                      <div className="flex-1">
                        <p className="text-base text-gray-900">{veg.name}</p>
                        <p className="text-sm text-gray-600">{qty}kg</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">
                  {selectedParticipant === 'host' ? 'No items added' : 'Selecting items...'}
                </p>
              </div>
            )}
          </div>

          {/* Group total */}
          <div className="border-t-2 border-gray-900 pt-4 mb-6">
            <div className="flex justify-between items-center">
              <p className="text-base text-gray-900">Group total</p>
              <p className="text-2xl text-gray-900">{getTotalWeight(allItems)}kg</p>
            </div>
          </div>

          {/* Test button */}
          <button 
            onClick={() => {
              if (participants.length < 4) {
                const nickname = INDIAN_NAMES[participants.length];
                setParticipants([...participants, { name: nickname, items: { v1: 1, v2: 0.5 } }]);
                setSelectedParticipant(nickname);
              }
            }}
            className="w-full border-2 border-gray-900 py-4 rounded-lg text-base text-gray-900 mb-4"
            disabled={participants.length >= 4}
          >
            + Test add participant
          </button>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
          <button 
            onClick={() => setCurrentScreen('shopping')}
            className="w-full bg-gray-900 text-white py-4 rounded-lg text-base"
          >
            Start shopping
          </button>
        </div>
      </div>
    );
  }

  // SCREEN 3: SHOPPING
  if (currentScreen === 'shopping') {
    const allItems = { ...hostItems };
    participants.forEach(p => {
      Object.entries(p.items || {}).forEach(([id, qty]) => {
        allItems[id] = (allItems[id] || 0) + qty;
      });
    });

    const totalPaid = Object.values(itemPayments).reduce((sum, p) => sum + (p?.amount || 0), 0);
    const allItemsPaid = Object.keys(allItems).every(id => itemPayments[id]);

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-32">
        <div className="p-6">
          <button onClick={() => setCurrentScreen('session-active')} className="text-base text-gray-600 mb-4">
            ← Back
          </button>
          
          <div className="mb-6">
            <p className="text-2xl text-gray-900 mb-4">Shopping</p>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Total spent</p>
                <p className="text-3xl text-gray-900">₹{totalPaid}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Items paid</p>
                <p className="text-base text-gray-900">
                  {Object.keys(itemPayments).length}/{Object.keys(allItems).length}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {Object.entries(allItems).map(([itemId, totalQty]) => {
              const veg = VEGETABLES.find(v => v.id === itemId);
              const payment = itemPayments[itemId];
              const isPaid = !!payment;

              return (
                <div 
                  key={itemId}
                  className={`flex items-center gap-4 p-4 border rounded-lg ${
                    isPaid ? 'border-gray-900' : 'border-gray-300'
                  }`}
                >
                  <img src={veg.img} alt={veg.name} className="w-16 h-16 rounded object-cover" />
                  
                  <div className="flex-1">
                    <p className="text-base text-gray-900">{veg.name}</p>
                    <p className="text-sm text-gray-600">{totalQty}kg needed</p>
                    {isPaid && (
                      <p className="text-sm text-gray-900 mt-1">
                        ₹{payment.amount} • {payment.method === 'upi' ? 'UPI' : 'Cash'}
                      </p>
                    )}
                  </div>

                  {isPaid ? (
                    <button 
                      onClick={() => {
                        setSelectedItemForPayment(itemId);
                        setShowPaymentModal(true);
                      }}
                      className="text-sm text-gray-600 px-4 py-2"
                    >
                      Edit
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedItemForPayment(itemId);
                        setShowPaymentModal(true);
                      }}
                      className="px-5 py-2 bg-gray-900 text-white rounded-lg text-sm"
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
            onClose={() => {
              setShowPaymentModal(false);
              setSelectedItemForPayment(null);
            }}
            onConfirm={(method, amount) => {
              setItemPayments({
                ...itemPayments,
                [selectedItemForPayment]: { method, amount: parseFloat(amount) }
              });
              setShowPaymentModal(false);
              setSelectedItemForPayment(null);
            }}
          />
        )}

        {/* Done button */}
        {allItemsPaid && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
            <button
              onClick={() => setCurrentScreen('payment-split')}
              className="w-full bg-gray-900 text-white py-4 rounded-lg text-base flex items-center justify-center gap-2"
            >
              <Check size={20} strokeWidth={2} />
              Done shopping
            </button>
          </div>
        )}
      </div>
    );
  }

  // SCREEN 4: PAYMENT SPLIT (Host View)
  if (currentScreen === 'payment-split') {
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

    return (
      <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
        <div className="p-6">
          <button onClick={() => setCurrentScreen('home')} className="text-base text-gray-600 mb-4">← Home</button>
          
          <p className="text-2xl text-gray-900 mb-6">Split costs</p>

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

          <p className="text-base text-gray-900 mb-4">Collect from others</p>
          <div className="space-y-4 mb-6">
            {participants.map(p => {
              const owes = participantCosts[p.name];
              return (
                <div key={p.name} className="border border-gray-300 rounded-lg p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-900 text-sm">
                        {p.name.slice(0, 2).toUpperCase()}
                      </div>
                      <p className="text-base text-gray-900">{p.name}</p>
                    </div>
                    <p className="text-2xl text-gray-900">₹{owes.toFixed(0)}</p>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1 pt-3 border-t border-gray-200 mb-4">
                    {Object.entries(p.items || {}).map(([itemId, qty]) => {
                      const veg = VEGETABLES.find(v => v.id === itemId);
                      const payment = itemPayments[itemId];
                      if (!payment) return null;
                      const totalQty = allItems[itemId];
                      const pricePerKg = payment.amount / totalQty;
                      const itemCost = pricePerKg * qty;
                      return (
                        <div key={itemId} className="flex justify-between">
                          <span>{veg.name} {qty}kg @ ₹{pricePerKg.toFixed(0)}/kg</span>
                          <span>₹{itemCost.toFixed(0)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => {
                      const itemsList = Object.entries(p.items || {})
                        .map(([itemId, qty]) => {
                          const veg = VEGETABLES.find(v => v.id === itemId);
                          const payment = itemPayments[itemId];
                          if (!payment) return null;
                          const totalQty = allItems[itemId];
                          const pricePerKg = payment.amount / totalQty;
                          const itemCost = pricePerKg * qty;
                          return `${veg.name} ${qty}kg - ₹${itemCost.toFixed(0)}`;
                        })
                        .filter(Boolean)
                        .join('%0A');

                      const message = `Hi ${p.name}! Shopping done 🛍️%0A%0AYour bill:%0A${itemsList}%0A%0ATotal: ₹${owes.toFixed(0)}%0A%0AView & pay: minibag.in/bill/abc123-${p.name.toLowerCase()}`;
                      
                      window.open(`https://wa.me/?text=${message}`, '_blank');
                    }}
                    className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm"
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
              onClick={() => setCurrentScreen('home')}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg text-base"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SCREEN 5: PARTICIPANT BILL (accessed via WhatsApp link)
  if (currentScreen === 'participant-bill') {
    if (participants.length === 0) {
      return (
        <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center p-8">
          <div className="text-center">
            <p className="text-base text-gray-600 mb-4">No bill data. Create a session first.</p>
            <button
              onClick={() => setCurrentScreen('home')}
              className="bg-gray-900 text-white px-6 py-3 rounded-lg"
            >
              Go home
            </button>
          </div>
        </div>
      );
    }

    const participant = participants[0];
    const allItems = { ...hostItems };
    participants.forEach(p => {
      Object.entries(p.items || {}).forEach(([id, qty]) => {
        allItems[id] = (allItems[id] || 0) + qty;
      });
    });

    let participantCost = 0;
    const billItems = [];

    Object.entries(participant.items || {}).forEach(([itemId, qty]) => {
      const veg = VEGETABLES.find(v => v.id === itemId);
      const payment = itemPayments[itemId];
      if (payment) {
        const totalQty = allItems[itemId];
        const pricePerKg = payment.amount / totalQty;
        const itemCost = pricePerKg * qty;
        participantCost += itemCost;
        billItems.push({
          name: veg.name,
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
            
            <div className="p-4 space-y-3">
              {billItems.map((item, idx) => (
                <div key={idx} className="pb-3 border-b border-gray-200 last:border-0">
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
              className="w-full bg-gray-900 text-white py-4 rounded-lg text-base"
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
  function PaymentModal({ itemId, onClose, onConfirm }) {
    const [method, setMethod] = useState('upi');
    const [amount, setAmount] = useState('');
    const veg = VEGETABLES.find(v => v.id === itemId);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-6">
        <div className="bg-white rounded-lg max-w-sm w-full p-6">
          <p className="text-xl text-gray-900 mb-6">Record payment</p>
          <p className="text-sm text-gray-600 mb-4">for {veg?.name}</p>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">Payment method</p>
            <div className="flex gap-3">
              <button
                onClick={() => setMethod('upi')}
                className={`flex-1 py-3 rounded-lg border-2 text-base ${
                  method === 'upi' 
                    ? 'bg-gray-900 text-white border-gray-900' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              >
                UPI
              </button>
              <button
                onClick={() => setMethod('cash')}
                className={`flex-1 py-3 rounded-lg border-2 text-base ${
                  method === 'cash' 
                    ? 'bg-gray-900 text-white border-gray-900' 
                    : 'bg-white text-gray-900 border-gray-300'
                }`}
              >
                Cash
              </button>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-3">Amount paid</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-600 text-lg">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg text-lg focus:border-gray-900 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border-2 border-gray-300 rounded-lg text-base text-gray-900"
            >
              Cancel
            </button>
            <button
              onClick={() => amount && onConfirm(method, amount)}
              disabled={!amount}
              className="flex-1 py-3 bg-gray-900 text-white rounded-lg text-base disabled:bg-gray-400"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DEFAULT
  return (
    <div className="max-w-md mx-auto bg-white min-h-screen flex items-center justify-center p-8">
      <div className="text-center">
        <p className="text-base text-gray-600 mb-4">Screen: {currentScreen}</p>
        <button
          onClick={() => setCurrentScreen('home')}
          className="bg-gray-900 text-white px-6 py-3 rounded-lg"
        >
          Go home
        </button>
      </div>
    </div>
  );
}