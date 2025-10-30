/**
 * Tooltip Configurations for Minibag Onboarding
 * Defines all tooltip/tour steps with their target elements and content keys
 */

/**
 * Priority 1: Critical Onboarding Tooltips
 * These appear on first-time user visit
 */
export const PRIORITY_1_TOOLTIPS = {
  FAB_MENU: {
    id: 'fab-menu',
    element: '[data-tour="fab-menu"]',
    titleKey: 'tooltips.fabMenu.title',
    descriptionKey: 'tooltips.fabMenu.description',
    side: 'left',
    align: 'end',
    delay: 800,
    screen: 'home'
  },

  BACK_NAVIGATION: {
    id: 'back-navigation',
    element: '[data-tour="back-button"]',
    titleKey: 'tooltips.backNavigation.title',
    descriptionKey: 'tooltips.backNavigation.description',
    side: 'bottom',
    align: 'start',
    delay: 500,
    screen: 'host-create'
  },

  VOICE_SEARCH: {
    id: 'voice-search',
    element: '[data-tour="voice-search"]',
    titleKey: 'tooltips.voiceSearch.title',
    descriptionKey: 'tooltips.voiceSearch.description',
    side: 'bottom',
    align: 'end',
    delay: 1000,
    screen: 'host-create'
  },

  QUANTITY_CONTROLS: {
    id: 'quantity-controls',
    element: '[data-tour="quantity-controls"]',
    titleKey: 'tooltips.quantityControls.title',
    descriptionKey: 'tooltips.quantityControls.description',
    side: 'left',
    align: 'center',
    delay: 600,
    screen: 'host-create'
  },

  CATEGORY_FILTERS: {
    id: 'category-filters',
    element: '[data-tour="category-filters"]',
    titleKey: 'tooltips.categoryFilters.title',
    descriptionKey: 'tooltips.categoryFilters.description',
    side: 'bottom',
    align: 'center',
    delay: 500,
    screen: 'host-create'
  }
};

/**
 * Priority 2: Feature Discovery Tooltips
 * These appear contextually during usage
 */
export const PRIORITY_2_TOOLTIPS = {
  LANGUAGE_SWITCHER: {
    id: 'language-switcher',
    element: '[data-tour="language-switcher"]',
    titleKey: 'tooltips.languageSwitcher.title',
    descriptionKey: 'tooltips.languageSwitcher.description',
    side: 'bottom',
    align: 'end',
    delay: 5000, // Show after 5s if not clicked
    screen: 'home'
  },

  SHOPPING_HISTORY: {
    id: 'shopping-history',
    element: '[data-tour="shopping-history"]',
    titleKey: 'tooltips.shoppingHistory.title',
    descriptionKey: 'tooltips.shoppingHistory.description',
    side: 'left',
    align: 'start',
    delay: 500,
    screen: 'home',
    condition: 'secondVisit' // Only show on second visit
  },

  GO_PRO: {
    id: 'go-pro',
    element: '[data-tour="go-pro"]',
    titleKey: 'tooltips.goPro.title',
    descriptionKey: 'tooltips.goPro.description',
    side: 'left',
    align: 'end',
    delay: 500,
    screen: 'home'
  },

  PARTICIPANTS_LIST: {
    id: 'participants-list',
    element: '[data-tour="participants-list"]',
    titleKey: 'tooltips.participantsList.title',
    descriptionKey: 'tooltips.participantsList.description',
    side: 'bottom',
    align: 'center',
    delay: 1000,
    screen: 'session-active'
  },

  SHARE_BUTTON: {
    id: 'share-button',
    element: '[data-tour="share-button"]',
    titleKey: 'tooltips.shareButton.title',
    descriptionKey: 'tooltips.shareButton.description',
    side: 'bottom',
    align: 'center',
    delay: 800,
    screen: 'session-active'
  }
};

/**
 * Guided Tour: First-time user experience
 * Sequential walkthrough of key features with navigation
 */
export const GUIDED_TOUR_STEPS = [
  {
    element: '[data-tour="fab-menu"]',
    popover: {
      title: 'Welcome to Minibag',
      description: 'Tap the green button to create a new shopping session, view your history, or upgrade to Pro.',
      side: 'left',
      align: 'end'
    },
    autoProgressOnClick: true // Progress when user clicks this element
  }
];

/**
 * Host Create Screen Tour Steps
 * These steps are shown when user enters the host-create screen during the tour
 */
export const HOST_CREATE_TOUR_STEPS = [
  {
    element: '[data-tour="language-switcher"]',
    popover: {
      title: 'Multiple Languages',
      description: 'Switch between English, Gujarati, and Hindi anytime. Items will be shown in your selected language.',
      side: 'bottom',
      align: 'end'
    },
    autoProgressOnClick: true
  },
  {
    element: '[data-tour="category-filters"]',
    popover: {
      title: 'Browse Categories',
      description: 'Currently vegetables are available. More categories like fruits and dairy coming soon.',
      side: 'bottom',
      align: 'center'
    },
    autoProgressOnClick: true
  },
  {
    element: '[data-tour="voice-search"]',
    popover: {
      title: 'Voice Search',
      description: 'Tap the mic icon to search for items using your voice in any language.',
      side: 'bottom',
      align: 'end'
    },
    autoProgressOnClick: true
  },
  {
    element: '[data-tour="quantity-controls"]',
    popover: {
      title: 'Add Items',
      description: 'Tap "Add" to add items. Then use + and - buttons to adjust quantity in 0.5kg increments.',
      side: 'left',
      align: 'center'
    },
    autoProgressOnClick: true
  }
];

/**
 * Session Active Screen Tour Steps
 */
export const SESSION_ACTIVE_TOUR_STEPS = [
  {
    element: '[data-tour="back-button"]',
    popover: {
      title: 'Edit Anytime',
      description: 'You can go back to edit your list before starting the shopping session. Just tap this button.',
      side: 'bottom',
      align: 'start'
    },
    autoProgressOnClick: true
  },
  {
    element: '[data-tour="live-indicator"]',
    popover: {
      title: 'You\'re Live!',
      description: 'This session is active. Others can join anytime by clicking your shared link.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="participants-list"]',
    popover: {
      title: 'Live Collaboration',
      description: 'See who\'s in your session in real-time. Up to 4 people can join.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="share-button"]',
    popover: {
      title: 'Invite Friends',
      description: 'Share this session link via WhatsApp to invite your neighbors. Shopping is better together.',
      side: 'bottom',
      align: 'center'
    },
    autoProgressOnClick: true
  }
];

/**
 * Participant Join Screen Tour Steps
 * Shown when a user joins via shared link
 */
export const PARTICIPANT_JOIN_TOUR_STEPS = [
  {
    element: '[data-tour="participant-nickname-selection"]',
    popover: {
      title: 'Pick Your Avatar',
      description: 'Choose a fun nickname and avatar. This is how other shoppers will see you in the session.',
      side: 'bottom',
      align: 'center'
    }
  }
];

/**
 * Participant Session Active Tour Steps
 * Shown when participant first enters the active session
 */
export const PARTICIPANT_SESSION_TOUR_STEPS = [
  {
    element: '[data-tour="live-indicator"]',
    popover: {
      title: 'You\'re Connected!',
      description: 'You\'re now in a live shopping session. Everything updates in real-time.',
      side: 'bottom',
      align: 'end'
    }
  },
  {
    element: '[data-tour="participants-list"]',
    popover: {
      title: 'Your Shopping Team',
      description: 'See everyone in the session. Tap any avatar to see what they\'re buying.',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: '[data-tour="participant-add-items-button"]',
    popover: {
      title: 'Add Your Items',
      description: 'Tap here to select items from the host\'s list. You can only add items the host has chosen.',
      side: 'top',
      align: 'center'
    },
    autoProgressOnClick: true
  }
];

/**
 * Participant Add Items Screen Tour Steps
 */
export const PARTICIPANT_ADD_ITEMS_TOUR_STEPS = [
  {
    element: '[data-tour="participant-catalog-info"]',
    popover: {
      title: 'Choose From Host\'s List',
      description: 'These are the items your host selected. Pick what you need and adjust quantities.',
      side: 'bottom',
      align: 'start'
    }
  }
];

/**
 * Complete guided tour configuration
 */
export const COMPLETE_GUIDED_TOUR = {
  id: 'complete-tour',
  home: GUIDED_TOUR_STEPS,
  hostCreate: HOST_CREATE_TOUR_STEPS,
  sessionActive: SESSION_ACTIVE_TOUR_STEPS
};

/**
 * Participant guided tour configuration
 */
export const PARTICIPANT_GUIDED_TOUR = {
  id: 'participant-tour',
  join: PARTICIPANT_JOIN_TOUR_STEPS,
  sessionActive: PARTICIPANT_SESSION_TOUR_STEPS,
  participantAddItems: PARTICIPANT_ADD_ITEMS_TOUR_STEPS
};

/**
 * Get tooltip configuration by ID
 */
export function getTooltipById(tooltipId) {
  const allTooltips = { ...PRIORITY_1_TOOLTIPS, ...PRIORITY_2_TOOLTIPS };
  return Object.values(allTooltips).find(tooltip => tooltip.id === tooltipId);
}

/**
 * Get tooltips for a specific screen
 */
export function getTooltipsForScreen(screenName) {
  const allTooltips = { ...PRIORITY_1_TOOLTIPS, ...PRIORITY_2_TOOLTIPS };
  return Object.values(allTooltips).filter(tooltip => tooltip.screen === screenName);
}

/**
 * Get Priority 1 tooltips (critical onboarding)
 */
export function getPriority1Tooltips() {
  return Object.values(PRIORITY_1_TOOLTIPS);
}

/**
 * Get Priority 2 tooltips (feature discovery)
 */
export function getPriority2Tooltips() {
  return Object.values(PRIORITY_2_TOOLTIPS);
}

export default {
  PRIORITY_1_TOOLTIPS,
  PRIORITY_2_TOOLTIPS,
  GUIDED_TOUR_STEPS,
  HOST_CREATE_TOUR_STEPS,
  SESSION_ACTIVE_TOUR_STEPS,
  PARTICIPANT_JOIN_TOUR_STEPS,
  PARTICIPANT_SESSION_TOUR_STEPS,
  PARTICIPANT_ADD_ITEMS_TOUR_STEPS,
  COMPLETE_GUIDED_TOUR,
  PARTICIPANT_GUIDED_TOUR,
  getTooltipById,
  getTooltipsForScreen,
  getPriority1Tooltips,
  getPriority2Tooltips
};
