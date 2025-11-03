import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * ProgressBar Component
 *
 * Shows 4-step progress: List → Join → Bag → Bill
 * - All completed steps are highlighted/filled
 * - Current step is active
 * - Sequential navigation only (can tap previous steps, not future)
 * - When on step 2+, step 1 becomes a back arrow for navigation
 *
 * @param {number} currentStep - Current step (1-4)
 * @param {function} onStepClick - Callback when step is tapped (step: number)
 * @param {boolean} canNavigate - Whether navigation is allowed
 */
function ProgressBar({ currentStep = 1, onStepClick, canNavigate = true }) {
  const steps = [
    { number: 1, label: 'List' },
    { number: 2, label: 'Join' },
    { number: 3, label: 'Bag' },
    { number: 4, label: 'Bill' }
  ];

  const handleStepClick = (stepNumber) => {
    if (!canNavigate || !onStepClick) return;

    // Can only navigate to current or previous steps (sequential)
    if (stepNumber <= currentStep) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isFuture = step.number > currentStep;
          const canTap = canNavigate && !isFuture;

          return (
            <React.Fragment key={step.number}>
              {/* Step 1: Show back arrow when on step 2+, otherwise show normal circle */}
              {step.number === 1 && currentStep >= 2 ? (
                <button
                  onClick={() => handleStepClick(1)}
                  disabled={!canNavigate}
                  className={`flex flex-col items-center ${canNavigate ? 'cursor-pointer' : 'cursor-not-allowed'} relative`}
                >
                  {/* Back Arrow Circle */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-600 text-white transition-all">
                    <ArrowLeft size={20} />
                  </div>
                  {/* Label */}
                  <p className="text-xs mt-1.5 font-medium whitespace-nowrap text-gray-900">
                    {step.label}
                  </p>
                </button>
              ) : (
                <button
                  onClick={() => handleStepClick(step.number)}
                  disabled={!canTap}
                  className={`flex flex-col items-center ${canTap ? 'cursor-pointer' : 'cursor-not-allowed'} relative`}
                >
                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                      isCompleted
                        ? 'bg-green-600 text-white'
                        : isCurrent
                        ? 'bg-green-600 text-white ring-4 ring-green-100'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? '✓' : step.number}
                  </div>
                  {/* Label */}
                  <p
                    className={`text-xs mt-1.5 font-medium whitespace-nowrap ${
                      isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </button>
              )}

              {/* Connector Line - thin and touching circles */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 relative">
                  <div
                    className={`h-full transition-all ${
                      step.number < currentStep ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressBar;
