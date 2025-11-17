import React from 'react';
import { ArrowLeft } from 'lucide-react';

/**
 * ProgressBar Component - Thin Bar Design
 *
 * Shows 4-step progress: List → Join → Bag → Bill
 * - Thin horizontal bars with numbers and labels above
 * - All completed steps are highlighted/filled
 * - Current step is active with subtle glow
 * - Sequential navigation only (can tap previous steps, not future)
 * - When on step 2+, step 1 shows back arrow instead of number
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
    <div className="mb-4">
      {/* Numbers and Labels - Single Line */}
      <div className="flex items-center justify-between mb-2">
        {steps.map((step) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isFuture = step.number > currentStep;
          const canTap = canNavigate && !isFuture;

          return (
            <button
              key={step.number}
              onClick={() => handleStepClick(step.number)}
              disabled={!canTap}
              className={`flex items-center gap-1 flex-1 justify-center ${canTap ? 'cursor-pointer' : 'cursor-not-allowed'} py-1 transition-opacity ${
                !canTap ? 'opacity-50' : ''
              }`}
            >
              {/* Step 1: Back arrow when on step 2+ */}
              {step.number === 1 && currentStep >= 2 ? (
                <div className="flex items-center gap-1.5">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                    isCompleted || isCurrent ? 'bg-green-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    <ArrowLeft size={12} strokeWidth={2.5} />
                  </div>
                  <span className={`text-sm font-semibold uppercase transition-colors ${
                    isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  {/* Number or Checkmark with Circle Background */}
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                    isCompleted ? 'bg-green-600 text-white animate-pop' :
                    isCurrent ? 'bg-green-600 text-white animate-progress-glow' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? '✓' : step.number}
                  </div>
                  {/* Label */}
                  <span className={`text-sm font-semibold whitespace-nowrap uppercase transition-colors ${
                    isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Thin Progress Bars */}
      <div className="flex items-center gap-1">
        {steps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;

          return (
            <React.Fragment key={step.number}>
              {/* Progress Bar Segment - Thinner */}
              <div
                className={`flex-1 h-1 rounded-full transition-all ${
                  isCompleted
                    ? 'bg-green-600'
                    : isCurrent
                    ? 'bg-green-600 animate-progress-glow'
                    : 'bg-gray-200'
                }`}
              />
              {/* Small Gap between bars (except last one) */}
              {index < steps.length - 1 && <div className="w-1" />}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export default ProgressBar;
