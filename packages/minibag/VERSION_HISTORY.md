# Minibag Version History

Track all changes to the Minibag UI implementation.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [Unreleased]

### Experimental
- See `EXPERIMENTAL_FEATURES.md` for ongoing experiments

---

## [0.4.1] - 2025-10-24

### Changed
- **[EXPERIMENT]** Fixed navigation hierarchy and information architecture
  - Removed auto-skip logic for returning users
  - Landing pages are always shown (not bypassed)
  - Removed admin links from Minibag pages (platform vs product separation)
  - Added "← LocalLoops" back link in Minibag footer
  - See: `EXPERIMENTAL_FEATURES.md` - Experiment #4

### Removed
- Auto-skip localStorage tracking (`minibag_visited`)
- Admin dashboard links from product pages

### Technical
- Simplified `MinibagLandingWrapper` component
- Cleaner, stateless navigation
- Proper separation of concerns: Platform (LocalLoops) vs Product (Minibag)

### Information Architecture
```
Platform Level:
  / → LocalLoops (with admin access)

Product Level:
  /minibag → Minibag Landing
  /app → Minibag App

Navigation Rules:
  ✅ Platform → Products
  ✅ Products → Platform
  ❌ Products → Platform Admin
```

### Files Modified
- `src/App.jsx` - Removed auto-skip
- `src/LandingPage.jsx` - Removed admin, added back link

### Restore Points
- `RESTORE_POINTS/2025-10-24_fix-navigation-hierarchy.tsx.bak`
- `RESTORE_POINTS/2025-10-24_fix-navigation-hierarchy.meta.txt`

---

## [0.4.0] - 2025-10-24

### Added
- **[EXPERIMENT]** LocalLoops platform landing page
  - Central homepage showcasing product ecosystem
  - Product cards for Minibag (Live), Partybag, Fitbag (Coming Soon)
  - Color-coded product differentiation (Green/Purple/Red)
  - Mission statement and comprehensive footer
  - See: `EXPERIMENTAL_FEATURES.md` - Experiment #3

### Changed
- **[EXPERIMENT]** Minibag icon changed from shopping cart to bag
  - Better brand alignment with product name
  - Updated in all components (landing page, app home)
  - See: `EXPERIMENTAL_FEATURES.md` - Experiment #3

### Changed
- **[EXPERIMENT]** Restructured routing hierarchy
  - Platform landing on `/` (LocalLoops homepage)
  - Minibag landing moved to `/minibag`
  - Main app remains at `/app`
  - Admin dashboard at `/admin`

### Technical
- Created `LocalLoopsLanding.jsx` component
- Updated `ShoppingCart` → `ShoppingBag` icon throughout
- Renamed `LandingPageWrapper` → `MinibagLandingWrapper`
- Established color system: Gray (platform), Green (Minibag), Purple (Partybag), Red (Fitbag)

### Files Created
- `src/LocalLoopsLanding.jsx`

### Files Modified
- `src/LandingPage.jsx` - Icon change
- `minibag-ui-prototype.tsx` - Icon change
- `src/App.jsx` - Routing structure

### Restore Points
- `RESTORE_POINTS/2025-10-24_localloops-landing-and-bag-icon.tsx.bak`
- `RESTORE_POINTS/2025-10-24_localloops-landing-and-bag-icon.meta.txt`

---

## [0.3.0] - 2025-10-24

### Added
- **[EXPERIMENT]** Dedicated landing page for first-time visitors
  - Professional hero section with value proposition
  - "How it works" 3-step visual guide
  - Group shopping feature explanation
  - Trust signals (free, no signup, works offline)
  - Clean footer with admin dashboard link
  - See: `EXPERIMENTAL_FEATURES.md` - Experiment #2

### Changed
- **[EXPERIMENT]** Updated routing structure
  - Landing page on `/` (first-time visitors)
  - Main app moved to `/app`
  - Admin dashboard remains at `/admin`
  - Removed floating navigation component

### Technical
- Created new `LandingPage.jsx` component
- Added smart navigation with localStorage-based returning user detection
- Returning users automatically skip landing page
- Green accent color scheme (#22c55e) for brand differentiation

### Files Created
- `src/LandingPage.jsx`

### Files Modified
- `src/App.jsx`

### Restore Points
- `RESTORE_POINTS/2025-10-24_add-landing-page.tsx.bak`
- `RESTORE_POINTS/2025-10-24_add-landing-page.meta.txt`

---

## [0.2.1] - 2025-10-24

### Changed
- **[EXPERIMENT]** Merged shopping checklist and payment screens into unified flow
  - Removed redundant checklist step
  - Payment action now implies item is "bought"
  - Added participant breakdown directly to payment screen
  - Reduced screen count from 6 to 5
  - See: `EXPERIMENTAL_FEATURES.md` - Experiment #1

### Technical
- Removed `boughtItems` state variable
- Deleted Shopping Checklist screen (Screen 3)
- Enhanced Payment screen with breakdown display
- Updated navigation: "Start shopping" → Shopping screen (was → Checklist)
- Fixed PaymentModal component scoping issue

### Files Modified
- `minibag-ui-prototype.tsx` (lines 40, 601, 612-734, 1006)

### Restore Points
- `RESTORE_POINTS/2025-10-24_post-merge.tsx.bak`
- `RESTORE_POINTS/checklist_screen_snippet.txt`

---

## [0.2.0] - 2025-10-14

### Added
- Complete UI prototype with 6 screens
- Category-based browsing (Veggies, Staples, Dairy)
- Multi-language support (English, Hindi, Gujarati)
- Payment tracking (UPI + Cash)
- Cost splitting calculations
- WhatsApp bill sharing integration
- Admin dashboard with analytics

### Features
- Session creation with 10kg limit
- Real-time participant tracking (up to 4 people)
- Item aggregation across participants
- Automatic price-per-kg calculation
- Payment modal with method selection
- Bill generation and sharing

---

## [0.1.0] - 2025-10-12

### Added
- Initial React + Vite setup
- Tailwind CSS configuration
- Basic component structure
- i18n support framework
- Development environment

---

## Version Format

`[MAJOR.MINOR.PATCH]`

- **MAJOR**: Complete redesign or breaking changes
- **MINOR**: New features, screen additions
- **PATCH**: Bug fixes, small improvements, experiments

### Tags
- `[EXPERIMENT]` - Spontaneous feature, may be reverted
- `[CORE]` - Part of main development plan
- `[FIX]` - Bug fix
- `[BREAKING]` - Breaks compatibility with previous version

---

**Last Updated:** October 24, 2025
