import React from 'react';
import { Package, ShoppingCart, CreditCard, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import AppHeader from '../components/layout/AppHeader.jsx';
import ItemRow from '../components/items/ItemRow.jsx';
import UserIdentity from '../components/UserIdentity.jsx';
import { extractFirstName } from '../utils/sessionTransformers.js';

/**
 * ParticipantTrackingScreen Component
 *
 * Courier-style tracking screen for participants after they submit their list.
 * Shows real-time progress through 3 phases:
 * 1. List submitted to host (always checked)
 * 2. Host is shopping now (updates via WebSocket)
 * 3. Shopping complete - ready to pay (updates via WebSocket)
 *
 * @param {Object} session - Session data
 * @param {Object} participant - Current participant data
 * @param {Array} participants - All participants (including host)
 * @param {Array} items - Item catalog
 * @param {Function} getItemName - Get item name helper
 * @param {Function} getTotalWeight - Calculate total weight helper
 * @param {Function} onViewBill - Navigate to bill screen
 * @param {Function} onLanguageChange - Language change handler
 * @param {Function} onHelpClick - Help click handler
 * @param {Function} onLogoClick - Logo click handler
 */
export default function ParticipantTrackingScreen({
  session,
  participant,
  participants,
  items,
  getItemName,
  getTotalWeight,
  onViewBill,
  onLanguageChange,
  onHelpClick,
  onLogoClick
}) {
  const { t, i18n } = useTranslation();

  // Session status from API: 'active', 'shopping', 'completed'
  const sessionStatus = session?.status || 'active';

  // Find the host participant
  const host = participants?.find(p => p.is_creator);
  const hostFirstName = extractFirstName(host?.real_name) || host?.nickname || 'Host';
  const hostNickname = host?.nickname || 'Host';

  // Participant's items
  const myItems = participant?.items || {};
  const myTotalWeight = getTotalWeight(myItems);
  const itemCount = Object.keys(myItems).length;

  // Tracking steps - descriptions will use UserIdentity component inline
  const steps = [
    {
      id: 1,
      label: 'List shared with host',
      descriptionTemplate: 'has your list',
      showIdentity: true,
      icon: Package,
      status: 'completed', // Always completed if we're on this screen
    },
    {
      id: 2,
      label: 'Shopping in progress',
      description: 'Picking up your items',
      icon: ShoppingCart,
      status: sessionStatus === 'shopping' || sessionStatus === 'completed' ? 'completed' : 'pending',
    },
    {
      id: 3,
      label: 'All done!',
      description: 'Ready to collect & pay',
      icon: CreditCard,
      status: sessionStatus === 'completed' ? 'completed' : 'pending',
    },
  ];

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen pb-24">
      <AppHeader
        i18n={i18n}
        onLanguageChange={onLanguageChange}
        showEndSessionMenu={false}
        onHelpClick={onHelpClick}
        onLogoClick={onLogoClick}
      />

      <div className="p-6 pt-20">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Your List Status</h1>
          <p className="text-sm text-gray-600">
            See where your items are
          </p>
        </div>

        {/* Progress Tracker - Courier Style */}
        <div className="mb-8">
          <div className="relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = step.status === 'completed';
              const isLast = index === steps.length - 1;

              return (
                <div key={step.id} className="relative">
                  {/* Timeline line */}
                  {!isLast && (
                    <div className={`absolute left-6 top-12 w-0.5 h-16 ${
                      steps[index + 1].status === 'completed' ? 'bg-green-600' : 'bg-gray-300'
                    }`} />
                  )}

                  {/* Step row */}
                  <div className="flex items-start gap-4 pb-6">
                    {/* Icon circle */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {isCompleted ? (
                        <Check size={24} strokeWidth={3} />
                      ) : (
                        <Icon size={24} />
                      )}
                    </div>

                    {/* Step content */}
                    <div className="flex-1 pt-1">
                      <p className={`text-base font-semibold ${
                        isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {step.showIdentity ? (
                          <>
                            <UserIdentity
                              realName={host?.real_name}
                              nickname={hostNickname}
                              className="text-sm"
                            />{' '}
                            {step.descriptionTemplate}
                          </>
                        ) : (
                          step.description
                        )}
                      </p>
                      {isCompleted && (
                        <div className="mt-1">
                          <span className="inline-flex items-center text-xs text-green-700 font-medium">
                            <Check size={14} className="mr-1" />
                            Done
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="mb-6">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Your Items</h2>
              <div className="text-sm text-gray-600">
                {itemCount} {itemCount === 1 ? 'item' : 'items'}
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-2 mb-3">
              {Object.entries(myItems).map(([itemId, qty]) => {
                const item = items.find(v => v.id === itemId);
                return (
                  <ItemRow
                    key={itemId}
                    imageUrl={item?.thumbnail_url || item?.img}
                    name={getItemName(item)}
                    subtitle={`${qty}kg`}
                  />
                );
              })}
            </div>

            {/* Total weight */}
            <div className="border-t border-gray-300 pt-3 flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Weight</span>
              <span className="text-base font-bold text-gray-900">{myTotalWeight}kg</span>
            </div>
          </div>
        </div>

        {/* Info message based on status */}
        {sessionStatus === 'active' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Sit tight!</span>
              <br />
              <UserIdentity
                realName={host?.real_name}
                nickname={hostNickname}
                className="text-sm text-blue-900"
              /> will head to the store soon. We'll update you when shopping starts.
            </p>
          </div>
        )}

        {sessionStatus === 'shopping' && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-800">
              <span className="font-semibold">On it!</span>
              <br />
              <UserIdentity
                realName={host?.real_name}
                nickname={hostNickname}
                className="text-sm text-amber-900"
              /> is at the store picking up your items right now.
            </p>
          </div>
        )}

        {sessionStatus === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              <span className="font-semibold">All set!</span>
              <br />
              Your items are ready. Check your bill to see what you owe.
            </p>
          </div>
        )}
      </div>

      {/* Fixed bottom button */}
      {sessionStatus === 'completed' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-6 max-w-md mx-auto">
          <button
            onClick={onViewBill}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-lg text-base font-semibold transition-colors"
          >
            View Bill & Pay
          </button>
        </div>
      )}
    </div>
  );
}
