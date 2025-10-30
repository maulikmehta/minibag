import React from 'react';

/**
 * ProgressBar Component
 *
 * Shows 4-step progress: Add Items → Session Active → Shopping → Bills
 * - All completed steps are highlighted/filled
 * - Current step is active
 * - Sequential navigation only (can tap previous steps, not future)
 *
 * @param {number} currentStep - Current step (1-4)
 * @param {function} onStepClick - Callback when step is tapped (step: number)
 * @param {boolean} canNavigate - Whether navigation is allowed
 */
function ProgressBar({ currentStep = 1, onStepClick, canNavigate = true }) {
  const steps = [
    { number: 1, label: 'Add Items' },
    { number: 2, label: 'Session' },
    { number: 3, label: 'Shopping' },
    { number: 4, label: 'Bills' }
  ];

  const handleStepClick = (stepNumber) => {
    if (!canNavigate || !onStepClick) return;

    // Can only navigate to current or previous steps (sequential)
    if (stepNumber <= currentStep) {
      onStepClick(stepNumber);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((step, index) => {
        const isCompleted = step.number < currentStep;
        const isCurrent = step.number === currentStep;
        const isFuture = step.number > currentStep;
        const canTap = canNavigate && !isFuture;

        return (
          <React.Fragment key={step.number}>
            {/* Step Circle */}
            <button
              onClick={() => handleStepClick(step.number)}
              disabled={!canTap}
              className={`flex flex-col items-center ${canTap ? 'cursor-pointer' : 'cursor-not-allowed'}`}
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
                className={`text-xs mt-1.5 font-medium ${
                  isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                {step.label}
              </p>
            </button>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div className="flex-1 h-1 mx-2 relative top-[-12px]">
                <div
                  className={`h-full rounded-full transition-all ${
                    step.number < currentStep ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default ProgressBar;
