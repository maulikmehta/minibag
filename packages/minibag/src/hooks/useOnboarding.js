/**
 * useOnboarding Hook
 * Manages tooltip/tour state with localStorage persistence
 *
 * Performance Note: driver.js is lazy-loaded only when tooltips are shown
 */

import { useState, useEffect, useCallback } from 'react';

// Lazy load driver.js to improve initial load performance
let driverModule = null;
let driverCSSLoaded = false;

async function loadDriver() {
  if (!driverModule) {
    // Import driver.js dynamically
    const module = await import('driver.js');
    driverModule = module.driver;

    // Load CSS if not already loaded
    if (!driverCSSLoaded) {
      await import('driver.js/dist/driver.css');
      driverCSSLoaded = true;
    }
  }
  return driverModule;
}

const STORAGE_KEY = 'minibag_onboarding';
const TOUR_VERSION = '1.0.0';

/**
 * Hook to manage onboarding tooltips and tours
 */
export function useOnboarding() {
  const [onboardingState, setOnboardingState] = useState({
    isFirstVisit: true,
    completedTooltips: [],
    tourVersion: null,
    hasSeenTour: false
  });

  // Load onboarding state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setOnboardingState({
          isFirstVisit: false,
          completedTooltips: parsed.completedTooltips || [],
          tourVersion: parsed.tourVersion || null,
          hasSeenTour: parsed.hasSeenTour || false
        });
      }
    } catch (error) {
      console.error('Failed to load onboarding state:', error);
    }
  }, []);

  // Save onboarding state to localStorage
  const saveState = useCallback((newState) => {
    try {
      const stateToSave = {
        ...onboardingState,
        ...newState,
        tourVersion: TOUR_VERSION,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      setOnboardingState(stateToSave);
    } catch (error) {
      console.error('Failed to save onboarding state:', error);
    }
  }, [onboardingState]);

  // Mark a tooltip as completed
  const markTooltipCompleted = useCallback((tooltipId) => {
    const completedTooltips = [...onboardingState.completedTooltips];
    if (!completedTooltips.includes(tooltipId)) {
      completedTooltips.push(tooltipId);
      saveState({ completedTooltips });
    }
  }, [onboardingState.completedTooltips, saveState]);

  // Check if a tooltip should be shown
  const shouldShowTooltip = useCallback((tooltipId) => {
    return !onboardingState.completedTooltips.includes(tooltipId);
  }, [onboardingState.completedTooltips]);

  // Mark tour as completed
  const markTourCompleted = useCallback(() => {
    saveState({ hasSeenTour: true, isFirstVisit: false });
  }, [saveState]);

  // Reset onboarding state (for testing/debugging)
  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setOnboardingState({
      isFirstVisit: true,
      completedTooltips: [],
      tourVersion: null,
      hasSeenTour: false
    });
  }, []);

  // Create a driver instance with custom config (async to support lazy loading)
  const createDriver = useCallback(async (config = {}) => {
    const driverFn = await loadDriver();
    return driverFn({
      showProgress: false,
      showButtons: ['next', 'close'],
      nextBtnText: '→',
      prevBtnText: '←',
      doneBtnText: '✓',
      closeBtnText: '×',
      progressText: '{{current}} of {{total}}',
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      smoothScroll: true,
      allowClose: true,
      disableActiveInteraction: false,
      ...config,
      onDestroyed: () => {
        if (config.onDestroyed) config.onDestroyed();
      }
    });
  }, []);

  // Show a single tooltip (async to support lazy loading)
  const showTooltip = useCallback(async (tooltipConfig) => {
    if (!shouldShowTooltip(tooltipConfig.id)) {
      return null;
    }

    const driverInstance = await createDriver({
      onDestroyed: () => {
        markTooltipCompleted(tooltipConfig.id);
      }
    });

    // Wait for DOM to be ready
    setTimeout(() => {
      const element = document.querySelector(tooltipConfig.element);
      if (element) {
        driverInstance.highlight({
          element: tooltipConfig.element,
          popover: {
            title: tooltipConfig.title,
            description: tooltipConfig.description,
            side: tooltipConfig.side || 'bottom',
            align: tooltipConfig.align || 'center'
          }
        });
      }
    }, tooltipConfig.delay || 500);

    return driverInstance;
  }, [shouldShowTooltip, createDriver, markTooltipCompleted]);

  // Show a guided tour with multiple steps (async to support lazy loading)
  const showTour = useCallback(async (steps, config = {}) => {
    const driverInstance = await createDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done ✓',
      closeBtnText: 'Skip Tour',
      progressText: 'Step {{current}} of {{total}}',
      ...config,
      onDestroyed: () => {
        markTourCompleted();
        if (config.onDestroyed) config.onDestroyed();
      }
    });

    // Steps are already formatted with popover structure
    driverInstance.setSteps(steps);
    driverInstance.drive();

    return driverInstance;
  }, [createDriver, markTourCompleted]);

  // Show screen-specific tour (async to support lazy loading)
  const showScreenTour = useCallback(async (steps, screenName, config = {}) => {
    if (onboardingState.completedTooltips.includes(`tour-${screenName}`)) {
      return null;
    }

    // Verify all elements exist before starting tour
    const allElementsExist = steps.every(step => {
      const element = document.querySelector(step.element);
      if (!element) {
        console.warn(`Tour element not found: ${step.element}`);
      }
      return !!element;
    });

    if (!allElementsExist) {
      console.warn(`Skipping tour ${screenName} - some elements not ready`);
      return null;
    }

    const driverInstance = await createDriver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Done ✓',
      closeBtnText: 'Skip',
      progressText: 'Step {{current}} of {{total}}',
      ...config,
      onDestroyed: () => {
        markTooltipCompleted(`tour-${screenName}`);
        if (config.onDestroyed) config.onDestroyed();
      },
      // Add hook to enable auto-progress on click
      onHighlighted: (element, step, options) => {
        const currentStep = steps[options.state.activeIndex];

        if (currentStep && currentStep.autoProgressOnClick) {
          const targetElement = document.querySelector(currentStep.element);

          if (targetElement) {
            // Add click listener to auto-progress
            const clickHandler = (e) => {
              // Small delay to let the click action complete
              setTimeout(() => {
                if (driverInstance && driverInstance.isActive()) {
                  driverInstance.moveNext();
                }
              }, 300);
            };

            targetElement.addEventListener('click', clickHandler, { once: true });

            // Store handler for cleanup
            if (!targetElement._tourClickHandler) {
              targetElement._tourClickHandler = clickHandler;
            }
          }
        }
      }
    });

    driverInstance.setSteps(steps);
    driverInstance.drive();

    return driverInstance;
  }, [createDriver, markTooltipCompleted, onboardingState.completedTooltips]);

  return {
    // State
    isFirstVisit: onboardingState.isFirstVisit,
    hasSeenTour: onboardingState.hasSeenTour,
    completedTooltips: onboardingState.completedTooltips,

    // Methods
    showTooltip,
    showTour,
    showScreenTour,
    shouldShowTooltip,
    markTooltipCompleted,
    markTourCompleted,
    resetOnboarding,
    createDriver
  };
}

export default useOnboarding;
