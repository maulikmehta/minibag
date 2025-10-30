# Minibag Experimental Features
**Documentation for Next-Generation Features**

**Last Updated:** October 25, 2025  
**Status:** Planning & Prioritization Phase

---

## 📋 Table of Contents

1. [Feature Overview & Priority](#feature-overview--priority)
2. [Approved Features (Implement Now)](#approved-features-implement-now)
3. [Deferred Features (Later)](#deferred-features-later)
4. [Rejected Features (Too Complex)](#rejected-features-too-complex)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Technical Specifications](#technical-specifications)

---

## Feature Overview & Priority

### Priority Matrix

| Feature | Complexity | Impact | Timeline | Status |
|---------|-----------|--------|----------|--------|
| **1. Rounded Bills** | ⭐☆☆☆☆ | 🔥🔥🔥 | 2 hours | ✅ APPROVED |
| **2. Voice Search** | ⭐⭐☆☆☆ | 🔥🔥🔥🔥 | 3 hours | ✅ APPROVED |
| **3. Custom Usernames** | ⭐⭐☆☆☆ | 🔥🔥🔥 | 6 hours | ✅ APPROVED |
| **4. Language Preference** | ⭐⭐☆☆☆ | 🔥🔥🔥🔥 | 6 hours | ✅ APPROVED |
| **5. In-App Notifications** | ⭐⭐⭐☆☆ | 🔥🔥🔥 | 8 hours | ✅ APPROVED |
| **6. Remove Pro Limits** | ⭐☆☆☆☆ | 🔥🔥 | 2 hours | ✅ APPROVED |
| **7. Savings Display** | ⭐⭐☆☆☆ | 🔥🔥 | 4 hours | 🟡 DEFERRED |
| **8. Broadcast Sessions** | ⭐⭐⭐⭐⭐ | 🔥🔥🔥 | 40+ hours | 🔴 DEFERRED |

**Legend:**
- Complexity: ⭐ (1-5 stars, more = harder)
- Impact: 🔥 (1-5 flames, more = bigger impact)
- Status: ✅ Approved | 🟡 Deferred | 🔴 Complex

---

## Approved Features (Implement Now)

### Sprint 1 Priority List

**Total Effort:** 27 hours (~4 days focused work)

---

## Feature 1: Rounded Bills to Clean Integers ✅

### Overview
Round participant bills up to nearest rupee for cleaner payment experience. No decimals in bills.

### Business Case
- **Problem:** Bills like ₹143.67 feel messy, awkward for UPI transfers
- **Solution:** Show ₹144 instead (round up)
- **Impact:** Cleaner UX, easier payments, social harmony
- **Trade-off:** Host absorbs small rounding loss (₹5-10 max per session)

### Technical Implementation

#### Code Changes Needed

**File:** `calculations.js` (or wherever payment split happens)

```javascript
/**
 * Calculate participant bill with clean rounding
 * Rounds UP to nearest rupee for easier payments
 */
export function calculateParticipantBill(participant, itemPayments) {
  let total = 0;
  
  participant.items.forEach(item => {
    const payment = itemPayments[item.item_id];
    if (!payment) return;
    
    const pricePerUnit = payment.amount / getTotalQuantity(item.item_id);
    const participantCost = pricePerUnit * item.quantity;
    total += participantCost;
  });
  
  // KEY CHANGE: Round UP to clean integer
  return Math.ceil(total);
}

/**
 * Calculate host's share (absorbs rounding differences)
 */
export function calculateHostBill(totalSpent, participantBills) {
  const participantsTotal = participantBills.reduce((sum, bill) => sum + bill, 0);
  
  // Host gets: Total spent - Rounded participant bills
  // This means host absorbs rounding differences
  return totalSpent - participantsTotal;
}
```

#### UI Changes

**Participant Bill Screen:**
```jsx
// BEFORE:
<p className="text-3xl">₹143.67</p>

// AFTER:
<p className="text-3xl">₹144</p>
```

**Payment Split Screen (Host):**
```jsx
// Show rounding difference (optional transparency)
<div className="text-sm text-gray-600">
  Total spent: ₹420
  Collecting: ₹418 (₹2 rounding adjustment)
  Your share: ₹140
</div>
```

### Alternative: Round to ₹5 or ₹10

If you want even cleaner numbers:

```javascript
// Round to nearest ₹5
function roundToNearestFive(amount) {
  return Math.ceil(amount / 5) * 5;
}

// Round to nearest ₹10
function roundToNearestTen(amount) {
  return Math.ceil(amount / 10) * 10;
}

// Examples:
// ₹143.67 → ₹145 (nearest ₹5)
// ₹143.67 → ₹150 (nearest ₹10)
```

**Recommendation:** Start with ₹1 rounding (simplest), consider ₹5 if users request it.

### Testing Checklist

- [ ] Bill always shows integer (no decimals)
- [ ] Multiple participants all get clean numbers
- [ ] Host's share is correct (absorbs difference)
- [ ] Total collected ≤ Total spent (host never profits)
- [ ] Edge case: Single participant (should be exact)

### Effort Estimate
**Time:** 2 hours  
**Complexity:** Very Low ⭐☆☆☆☆

---

## Feature 2: Voice Search for Catalog 🎤 ✅

### Overview
Allow users to search catalog items using voice input. Supports English, Hindi, and Gujarati.

### Business Case
- **Problem:** Typing is slow on mobile, especially for regional languages
- **Solution:** Tap mic, speak item name, auto-search
- **Impact:** 
  - Faster item discovery (3-5x faster than typing)
  - Elderly user accessibility
  - Regional language support (huge differentiator)
  - Competitive edge (most grocery apps lack this)

### Technical Implementation

#### Browser API Used
```javascript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
```

**Advantages:**
- ✅ Free (built-in browser API)
- ✅ No external dependencies
- ✅ Works offline (once page loaded)
- ✅ No backend needed

**Limitations:**
- ⚠️ Requires HTTPS
- ⚠️ Chrome/Safari only (80%+ coverage)
- ⚠️ Accuracy varies (70-85% for Hindi/Gujarati)
- ⚠️ Needs microphone permission

#### Complete Component Code

**File:** `components/VoiceSearch.jsx`

```jsx
import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

function VoiceSearch({ onSearch, userLanguage = 'english' }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Voice search not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();

    // Language mapping based on user preference
    const languageMap = {
      'english': 'en-IN',
      'hindi': 'hi-IN',
      'gujarati': 'gu-IN'
    };
    
    recognition.lang = languageMap[userLanguage] || 'en-IN';
    recognition.continuous = false; // Single phrase
    recognition.interimResults = false; // Only final results
    recognition.maxAlternatives = 1;

    // Event: Recognition started
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    // Event: Recognition succeeded
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      console.log(`Heard: "${transcript}" (${Math.round(confidence * 100)}% confident)`);
      
      // Trigger search with transcript
      onSearch(transcript);
      setIsListening(false);
    };

    // Event: Recognition error
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      // User-friendly error messages
      const errorMessages = {
        'no-speech': "Couldn't hear anything. Try again?",
        'audio-capture': "Microphone not found",
        'not-allowed': "Microphone access denied. Please allow in browser settings.",
        'network': "Network error. Check your connection.",
        'aborted': "Voice search cancelled"
      };
      
      setError(errorMessages[event.error] || "Voice search failed");
      
      // Auto-clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    };

    // Event: Recognition ended
    recognition.onend = () => {
      setIsListening(false);
    };

    // Start recognition
    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError("Couldn't start voice search");
      setIsListening(false);
    }
  };

  // Don't render if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <button
        onClick={startListening}
        disabled={isListening}
        className={`p-3 rounded-full transition-all ${
          isListening 
            ? 'bg-red-500 text-white' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        aria-label="Voice search"
      >
        {isListening ? (
          <Mic size={20} className="animate-pulse" />
        ) : (
          <Mic size={20} />
        )}
      </button>

      {/* Error toast */}
      {error && (
        <div className="absolute top-14 right-0 bg-red-100 border border-red-300 
                        text-red-800 px-4 py-2 rounded-lg text-sm whitespace-nowrap z-50">
          {error}
        </div>
      )}
    </div>
  );
}

export default VoiceSearch;
```

#### Integration into Catalog Screen

**File:** `screens/HostCreate.jsx` (or wherever catalog is)

```jsx
import VoiceSearch from '../components/VoiceSearch';

function HostCreateScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  
  // ... existing code ...

  return (
    <div className="p-6">
      {/* Search bar with voice */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg 
                       focus:border-gray-900 focus:outline-none"
          />
          
          <VoiceSearch 
            onSearch={(text) => {
              setSearchQuery(text);
              // Search happens automatically via searchQuery state
            }}
            userLanguage={user?.language_preference || 'english'}
          />
        </div>
        
        {/* Listening indicator */}
        {isListening && (
          <div className="flex items-center gap-2 mt-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <p className="text-sm text-red-600">Listening...</p>
          </div>
        )}
      </div>

      {/* Rest of catalog... */}
    </div>
  );
}
```

#### CSS Animations

**File:** `tailwind.config.js` (add custom animations)

```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    }
  }
}
```

Or in your CSS:

```css
@keyframes pulse-red {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.animate-pulse-red {
  animation: pulse-red 1.5s ease-in-out infinite;
}
```

### Language Support Details

#### Supported Languages & Accuracy

| Language | Code | Accuracy | Use Case |
|----------|------|----------|----------|
| **English (India)** | `en-IN` | 90-95% | Default, urban users |
| **Hindi** | `hi-IN` | 75-85% | Hindi belt, tier-2/3 cities |
| **Gujarati** | `gu-IN` | 70-80% | Gujarat region |

#### How Language Selection Works

**Option A: Auto-detect from user preference (Recommended)**
```javascript
// Use language preference set in profile
<VoiceSearch 
  userLanguage={user.language_preference} // 'english', 'hindi', 'gujarati'
/>
```

**Option B: Manual toggle (More control)**
```jsx
// Let user switch language for just this search
const [voiceLang, setVoiceLang] = useState('english');

<select value={voiceLang} onChange={(e) => setVoiceLang(e.target.value)}>
  <option value="english">English</option>
  <option value="hindi">हिंदी</option>
  <option value="gujarati">ગુજરાતી</option>
</select>

<VoiceSearch userLanguage={voiceLang} />
```

**Recommendation:** Option A (auto-detect) for simplicity

#### Cross-Language Search

**Important:** Even if user speaks in Hindi, search should check all language fields:

```javascript
function searchItems(query, items) {
  const lowerQuery = query.toLowerCase();
  
  return items.filter(item => 
    // Search across ALL languages
    item.name.toLowerCase().includes(lowerQuery) ||
    item.name_hi?.toLowerCase().includes(lowerQuery.toLowerCase()) ||
    item.name_gu?.includes(query) // Gujarati doesn't need toLowerCase
  );
}
```

**Example:**
- User speaks: "टमाटर" (Hindi)
- Matches: Tomatoes (item has name_hi: "टमाटर")
- Works even if user preference is English

### User Onboarding

**First-time voice search tooltip:**

```jsx
// Show on first load, hide after
const [showVoiceTip, setShowVoiceTip] = useState(
  !localStorage.getItem('voice_tip_seen')
);

{showVoiceTip && (
  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
    <div className="flex items-start gap-3">
      <span className="text-2xl">🎤</span>
      <div className="flex-1">
        <p className="text-sm text-gray-900 font-medium mb-1">
          Try voice search!
        </p>
        <p className="text-xs text-gray-600 mb-2">
          Tap the mic and say item names in English, Hindi, or Gujarati
        </p>
        <p className="text-xs text-gray-500 italic">
          Example: "टमाटर" or "Tomatoes"
        </p>
      </div>
      <button 
        onClick={() => {
          setShowVoiceTip(false);
          localStorage.setItem('voice_tip_seen', 'true');
        }}
        className="text-gray-400 hover:text-gray-600"
      >
        ✕
      </button>
    </div>
  </div>
)}
```

### Analytics Tracking

**Track voice search usage and success:**

```javascript
// On voice search start
analytics.track('voice_search_started', {
  language: userLanguage,
  screen: 'catalog',
  user_id: user.id
});

// On voice search success
analytics.track('voice_search_completed', {
  language: userLanguage,
  transcript: transcript,
  confidence: confidence,
  results_found: filteredItems.length,
  duration_ms: Date.now() - startTime
});

// On voice search error
analytics.track('voice_search_failed', {
  language: userLanguage,
  error_type: event.error,
  screen: 'catalog'
});

// On voice search → item added (conversion)
analytics.track('voice_search_conversion', {
  transcript: transcript,
  item_added: item.name,
  time_to_add_seconds: conversionTime
});
```

**Key Metrics to Watch:**
- Voice search usage rate (% of all searches)
- Success rate (recognized correctly)
- Language distribution (EN vs HI vs GU)
- Conversion rate (voice search → item added)
- Error rate by language

### Edge Cases & Handling

#### Case 1: No microphone permission
```javascript
// Browser will prompt automatically on first use
// If denied, show helpful message:

"Microphone access denied. 

To use voice search:
1. Tap address bar
2. Allow microphone permission
3. Try again"
```

#### Case 2: Background noise
```javascript
// Recognition picks up: "tomatoes kids dinner time"

Solution: 
- Use first 1-2 words only
- Ignore common filler words (kids, dinner, time)
- Show all partial matches
```

#### Case 3: Ambiguous items
```javascript
// User says: "Aloo"
// Could be: आलू (potatoes) or आलूबुखारा (plums)

Solution:
- Show both results
- User taps correct one
- Learn from selection (future: improve)
```

#### Case 4: Wrong language
```javascript
// User preference: Hindi
// User speaks: "Tomatoes" (English)

Solution:
- Search across ALL language fields (already implemented)
- Find match regardless of spoken language
- Works seamlessly
```

#### Case 5: Network failure during recognition
```javascript
// Speech API works offline once page loaded
// But initial script load needs network

Solution:
- Progressive enhancement (graceful degradation)
- If API fails to initialize, hide mic button
- User can still type
```

### Testing Checklist

- [ ] Mic button appears only on supported browsers
- [ ] Clicking mic requests permission (first time)
- [ ] Red pulsing animation while listening
- [ ] Search triggers automatically on recognition
- [ ] Works with English item names
- [ ] Works with Hindi item names
- [ ] Works with Gujarati item names
- [ ] Error message shows if recognition fails
- [ ] No crashes if user denies permission
- [ ] Graceful degradation on unsupported browsers
- [ ] Analytics events fire correctly

### Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| **Chrome (Android)** | ✅ Full | Best performance |
| **Chrome (Desktop)** | ✅ Full | Requires HTTPS |
| **Safari (iOS)** | ✅ Full | iOS 14.5+ |
| **Firefox** | ⚠️ Partial | Limited support |
| **Samsung Internet** | ✅ Full | Based on Chromium |
| **UC Browser** | ❌ None | No API support |

**Coverage:** ~85% of Indian mobile users

### Effort Estimate
**Time:** 3 hours  
**Complexity:** Low ⭐⭐☆☆☆

**Breakdown:**
- Component code: 1.5 hours
- Integration: 0.5 hours
- Testing: 0.5 hours
- Documentation: 0.5 hours

---

## Feature 3: Custom 3-Letter Usernames ✅

### Overview
Allow users to choose their own 3-letter nickname during sign-up, replacing auto-assigned names from pool.

### Business Case
- **Problem:** Auto-assigned names feel impersonal, users forget them
- **Solution:** Let users pick their own 3-letter name (RAJ, SAM, DEV)
- **Impact:**
  - Personal identity → stronger retention
  - Memorability → easier to find in groups
  - Trust → neighbors recognize same person across sessions
  - Consistency → same name everywhere

### Technical Implementation

#### Database Schema Changes

**Before:**
```javascript
// Nicknames pulled from pool, assigned randomly
nicknames_pool: {
  nickname: "Raj",
  is_available: true,
  ...
}
```

**After:**
```javascript
// Nicknames owned by users
users: {
  user_id: "uid_123",
  phone: "+919876543210",
  nickname: "RAJ", // User-chosen, unique globally
  avatar_emoji: "👑",
  language_preference: "hindi",
  is_pro: false,
  created_at: timestamp
}

// Keep pool for suggestions only
nickname_suggestions: {
  nickname: "Raj",
  category: "popular" | "available" | "suggested"
}
```

#### Validation Rules

```javascript
function validateNickname(nickname) {
  const rules = {
    // Must be exactly 3 characters
    length: nickname.length === 3,
    
    // Only letters (A-Z, case-insensitive)
    lettersOnly: /^[a-zA-Z]{3}$/.test(nickname),
    
    // Not in blacklist (offensive words)
    notBlacklisted: !BLACKLIST.includes(nickname.toUpperCase()),
    
    // Check uniqueness in database
    isUnique: await checkUniqueness(nickname)
  };
  
  return Object.values(rules).every(Boolean);
}

// Blacklist examples (add more as needed)
const BLACKLIST = [
  'ASS', 'SEX', 'FUK', 'DIK', 'GAY', 'FAG', 
  'WTF', 'DMN', 'SHT', 'BTH', 'CNT'
  // Add regional language offensive words too
];
```

#### Sign-up Flow

**File:** `screens/SignUp.jsx`

```jsx
import React, { useState, useEffect } from 'react';

function SignUpFlow() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [nickname, setNickname] = useState('');
  const [nicknameError, setNicknameError] = useState('');
  const [nicknameAvailable, setNicknameAvailable] = useState(null);
  const [avatarEmoji, setAvatarEmoji] = useState('👤');

  // Check nickname availability as user types (debounced)
  useEffect(() => {
    if (nickname.length === 3) {
      const timer = setTimeout(() => {
        checkNicknameAvailability(nickname);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [nickname]);

  const checkNicknameAvailability = async (name) => {
    // Validate format first
    if (!/^[a-zA-Z]{3}$/.test(name)) {
      setNicknameError('Only letters (A-Z)');
      setNicknameAvailable(false);
      return;
    }

    // Check blacklist
    if (BLACKLIST.includes(name.toUpperCase())) {
      setNicknameError('This name is not allowed');
      setNicknameAvailable(false);
      return;
    }

    // Check database (API call)
    try {
      const response = await fetch(`/api/nicknames/check?name=${name}`);
      const { available, suggestions } = await response.json();
      
      if (available) {
        setNicknameError('');
        setNicknameAvailable(true);
      } else {
        setNicknameError('Taken. Try these:');
        setSuggestions(suggestions); // Show alternatives
        setNicknameAvailable(false);
      }
    } catch (err) {
      setNicknameError('Could not check availability');
    }
  };

  const generateSuggestions = (baseName) => {
    // If "RAJ" is taken, suggest:
    // - Similar: RAV, RAN, ROJ, RJA
    // - With numbers: RA1, RJ2 (only if desperate)
    // - Random available: SAM, DEV, AVI
    
    return [
      baseName[0] + baseName[2] + baseName[1], // Swap last 2
      baseName[1] + baseName[0] + baseName[2], // Rotate
      // ... fetch 3-5 actually available alternatives from DB
    ];
  };

  return (
    <div className="max-w-md mx-auto p-6">
      {step === 1 && (
        <PhoneStep 
          phone={phone}
          setPhone={setPhone}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <OTPStep 
          otp={otp}
          setOtp={setOtp}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && (
        <NicknameStep
          nickname={nickname}
          setNickname={setNickname}
          nicknameError={nicknameError}
          nicknameAvailable={nicknameAvailable}
          avatarEmoji={avatarEmoji}
          setAvatarEmoji={setAvatarEmoji}
          onNext={handleSignUpComplete}
        />
      )}
    </div>
  );
}

function NicknameStep({ 
  nickname, setNickname, nicknameError, nicknameAvailable,
  avatarEmoji, setAvatarEmoji, onNext 
}) {
  return (
    <div>
      <h1 className="text-2xl text-gray-900 mb-2">Choose your name</h1>
      <p className="text-sm text-gray-600 mb-6">
        Pick a 3-letter name. This will appear on bags when you join groups.
      </p>

      {/* Nickname input */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Your Minibag name (3 letters)
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value.toUpperCase())}
            placeholder="RAJ"
            maxLength={3}
            className={`w-full px-4 py-3 border-2 rounded-lg text-xl text-center 
                       uppercase font-medium tracking-wider
                       focus:outline-none transition-colors
                       ${nicknameAvailable === true ? 'border-green-500' : ''}
                       ${nicknameAvailable === false ? 'border-red-500' : 'border-gray-300'}
                       ${nickname.length === 3 ? '' : 'border-gray-300'}`}
          />
          
          {/* Validation indicator */}
          {nickname.length === 3 && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {nicknameAvailable === true && (
                <span className="text-green-600 text-xl">✓</span>
              )}
              {nicknameAvailable === false && (
                <span className="text-red-600 text-xl">✕</span>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {nicknameError && (
          <p className="text-sm text-red-600 mt-2">{nicknameError}</p>
        )}

        {/* Character count */}
        <p className="text-xs text-gray-500 mt-1">
          {nickname.length}/3 characters
        </p>
      </div>

      {/* Suggestions if taken */}
      {nicknameAvailable === false && suggestions?.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-2">Try these instead:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map(suggestion => (
              <button
                key={suggestion}
                onClick={() => setNickname(suggestion)}
                className="px-3 py-1 bg-gray-100 text-gray-900 rounded 
                         hover:bg-gray-200 text-sm font-medium"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Avatar emoji picker (optional) */}
      <div className="mb-6">
        <label className="block text-sm text-gray-700 mb-2">
          Choose an avatar (optional)
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['👤', '👑', '⚡', '🌟', '🎯', '🔥', '💎', '🦁', '🌺', '🎨'].map(emoji => (
            <button
              key={emoji}
              onClick={() => setAvatarEmoji(emoji)}
              className={`w-12 h-12 rounded-full border-2 flex items-center 
                         justify-center text-2xl transition-all
                         ${avatarEmoji === emoji 
                           ? 'border-gray-900 bg-gray-100' 
                           : 'border-gray-300 bg-white'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Continue button */}
      <button
        onClick={onNext}
        disabled={!nicknameAvailable}
        className="w-full bg-gray-900 text-white py-4 rounded-lg text-base
                   disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        Continue
      </button>
    </div>
  );
}
```

#### Backend API

**Endpoint:** `POST /api/nicknames/check`

```javascript
export async function checkNicknameAvailability(req, res) {
  const { name } = req.query;
  
  // Validate format
  if (!/^[a-zA-Z]{3}$/.test(name)) {
    return res.json({ available: false, error: 'Invalid format' });
  }
  
  // Check blacklist
  if (BLACKLIST.includes(name.toUpperCase())) {
    return res.json({ available: false, error: 'Not allowed' });
  }
  
  // Check database
  const existingUser = await db.collection('users')
    .where('nickname', '==', name.toUpperCase())
    .limit(1)
    .get();
  
  if (!existingUser.empty) {
    // Generate suggestions
    const suggestions = await generateSuggestions(name);
    return res.json({ 
      available: false, 
      suggestions 
    });
  }
  
  return res.json({ available: true });
}

async function generateSuggestions(baseName) {
  // Strategy 1: Permutations
  const permutations = [
    baseName[0] + baseName[2] + baseName[1],
    baseName[1] + baseName[0] + baseName[2],
    baseName[2] + baseName[1] + baseName[0]
  ];
  
  // Strategy 2: Similar letters
  const similar = {
    'A': ['E', 'O'],
    'E': ['A', 'I'],
    'I': ['E', 'Y'],
    'O': ['A', 'U'],
    // ... more mappings
  };
  
  // Strategy 3: Query database for popular available names
  const popularAvailable = await db.collection('users')
    .where('nickname', 'in', POPULAR_NAMES)
    .get();
  
  // Return top 5 available suggestions
  return suggestions.slice(0, 5);
}
```

### Namespace Management

**Problem:** Only 17,576 possible 3-letter combinations (26³)

**Solutions:**

#### Option 1: Strict 3-letter limit
- First-come, first-served
- Popular names gone early (RAJ, SAM, DEV)
- Forces creativity

#### Option 2: Allow 4 letters for Pro users
- Free: 3 letters only
- Pro: Up to 4 letters (456,976 combos)
- Example: RAJA, AMIT, MAYA

#### Option 3: Emoji suffix
- If "RAJ" taken, offer "RAJ🌟"
- Increases namespace to 17,576 × emoji_count
- Visually distinct

#### Option 4: Numeric suffix (last resort)
- "RAJ1", "RAJ2" only if desperate
- Not recommended (ugly)

**Recommendation:** Start with Option 1 (strict 3-letter), upgrade to Option 2 (4-letter Pro) when namespace fills.

### Migration Strategy

**Existing users (auto-assigned nicknames):**

```javascript
// On user's first login after feature launch:

if (!user.nickname_chosen_by_user) {
  // Show modal:
  "Your current name: RAJ
   
   Want to choose a different name?
   [Keep RAJ] [Choose new name]"
  
  // If they choose new:
  → Sign-up nickname flow
  
  // If they keep:
  → Mark as chosen, lock it
}
```

### Testing Checklist

- [ ] Input accepts only letters (A-Z)
- [ ] Input auto-uppercases
- [ ] Max 3 characters enforced
- [ ] Availability check works (API call)
- [ ] Green checkmark on available
- [ ] Red X + suggestions on taken
- [ ] Blacklist prevents offensive words
- [ ] Avatar emoji picker works
- [ ] Continue button disabled until valid
- [ ] Database stores correctly
- [ ] Unique constraint prevents duplicates
- [ ] Migration flow for existing users

### Effort Estimate
**Time:** 6 hours  
**Complexity:** Medium ⭐⭐☆☆☆

**Breakdown:**
- UI components: 2 hours
- Backend API: 2 hours
- Database migration: 1 hour
- Testing: 1 hour

---

## Feature 4: Language Preference (Pro Feature) ✅

### Overview
Allow Pro users to set preferred language (English/Hindi/Gujarati). Catalog items show preferred language as primary, others as secondary.

### Business Case
- **Problem:** English-first UI alienates regional language users
- **Solution:** Flip language hierarchy based on user preference
- **Impact:**
  - Cultural appropriateness → trust
  - Accessibility → tier-2/3 city penetration
  - Pro differentiator → ₹49/month value
  - Competitive moat → most apps don't do this

**Important:** We're NOT translating the whole app UI. Only catalog item names change order.

### Technical Implementation

#### Current State
```
Tomatoes
टमाटर • ટામેટાં
```
*English always primary, others subtext*

#### With Preference

**English (default):**
```
Tomatoes
टमाटर • ટામેટાં
```

**Hindi:**
```
टमाटर
Tomatoes • ટામેટાં
```

**Gujarati:**
```
ટામેટાં
Tomatoes • टमाटर
```

#### Database Schema

**Already have multilingual data:**
```javascript
catalog_items: {
  item_id: "v001",
  name: "Tomatoes",      // English
  name_hi: "टमाटर",      // Hindi
  name_gu: "ટામેટાં",    // Gujarati
  // ... rest of item
}
```

**Add to user schema:**
```javascript
users: {
  user_id: "uid_123",
  nickname: "RAJ",
  language_preference: "hindi", // "english" | "hindi" | "gujarati"
  is_pro: true, // Required for language preference
  // ... rest of user
}
```

#### Rendering Logic

**File:** `utils/language.js`

```javascript
/**
 * Get item display name based on user's language preference
 * @param {Object} item - Catalog item with multilingual names
 * @param {String} userLanguage - User's preference: 'english' | 'hindi' | 'gujarati'
 * @returns {Object} { primary, secondary }
 */
export function getItemDisplayName(item, userLanguage = 'english') {
  const languages = {
    english: {
      primary: item.name,
      secondary: `${item.name_hi || ''} • ${item.name_gu || ''}`.trim()
    },
    hindi: {
      primary: item.name_hi || item.name,
      secondary: `${item.name} • ${item.name_gu || ''}`.trim()
    },
    gujarati: {
      primary: item.name_gu || item.name,
      secondary: `${item.name} • ${item.name_hi || ''}`.trim()
    }
  };
  
  return languages[userLanguage] || languages.english;
}

/**
 * Get WhatsApp message in user's preferred language
 */
export function getWhatsAppMessage(sessionId, userLanguage = 'english') {
  const messages = {
    english: `I'm going shopping today! 🛍️\n\nJoin my Minibag to add your items:\nminibag.in/${sessionId}\n\nWe'll split the cost after shopping.`,
    
    hindi: `मैं आज शॉपिंग करने जा रहा हूं! 🛍️\n\nअपना सामान जोड़ने के लिए मेरे Minibag में शामिल हों:\nminibag.in/${sessionId}\n\nहम शॉपिंग के बाद खर्च बांट लेंगे.`,
    
    gujarati: `હું આજે શોપિંગ કરવા જાઉં છું! 🛍️\n\nતમારી વસ્તુઓ ઉમેરવા માટે મારા Minibag માં જોડાઓ:\nminibag.in/${sessionId}\n\nઆપણે શોપિંગ પછી ખર્ચ વહેંચીશું.`
  };
  
  return messages[userLanguage] || messages.english;
}
```

#### Component Usage

**File:** `components/CatalogItem.jsx`

```jsx
import { getItemDisplayName } from '../utils/language';

function CatalogItem({ item, user, onAdd }) {
  // Get display names based on user preference
  const display = getItemDisplayName(
    item, 
    user?.language_preference || 'english'
  );

  return (
    <div className="flex items-center gap-4 p-4 border rounded-lg">
      <img 
        src={item.thumbnail_url} 
        alt={display.primary}
        className="w-16 h-16 rounded object-cover" 
      />
      
      <div className="flex-1">
        {/* Primary language (larger) */}
        <p className="text-base text-gray-900 font-medium">
          {display.primary}
        </p>
        
        {/* Secondary languages (smaller) */}
        <p className="text-xs text-gray-500">
          {display.secondary}
        </p>
      </div>
      
      <button onClick={onAdd} className="px-5 py-2 bg-gray-900 text-white rounded-lg">
        Add
      </button>
    </div>
  );
}
```

#### Settings UI

**File:** `screens/Settings.jsx`

```jsx
function LanguagePreferenceSettings({ user, onUpdate }) {
  const [language, setLanguage] = useState(user.language_preference || 'english');

  const handleSave = async () => {
    await updateUser(user.id, { language_preference: language });
    onUpdate();
  };

  // Show upgrade prompt if not Pro
  if (!user.is_pro) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-300">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-sm text-gray-900 font-medium">Language Preference</p>
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">PRO</span>
        </div>
        <p className="text-xs text-gray-600 mb-3">
          Set your preferred language for catalog items
        </p>
        <button className="text-sm text-blue-600">
          Upgrade to Pro →
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-300 rounded-lg">
      <p className="text-sm text-gray-900 font-medium mb-3">
        Language Preference
      </p>
      
      <div className="space-y-2 mb-4">
        {[
          { value: 'english', label: 'English', example: 'Tomatoes' },
          { value: 'hindi', label: 'हिंदी (Hindi)', example: 'टमाटर' },
          { value: 'gujarati', label: 'ગુજરાતી (Gujarati)', example: 'ટામેટાં' }
        ].map(option => (
          <label 
            key={option.value}
            className={`flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer
                       ${language === option.value 
                         ? 'border-gray-900 bg-gray-50' 
                         : 'border-gray-300'}`}
          >
            <input
              type="radio"
              name="language"
              value={option.value}
              checked={language === option.value}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-4 h-4"
            />
            <div className="flex-1">
              <p className="text-sm text-gray-900">{option.label}</p>
              <p className="text-xs text-gray-500">Example: {option.example}</p>
            </div>
          </label>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="w-full py-3 bg-gray-900 text-white rounded-lg text-sm"
      >
        Save Preference
      </button>
    </div>
  );
}
```

#### WhatsApp Integration

**Auto-select language for messages:**

```jsx
function ShareOnWhatsApp({ sessionId, user }) {
  // Default to user's language preference
  const [selectedLanguage, setSelectedLanguage] = useState(
    user?.language_preference || 'english'
  );

  const handleShare = () => {
    const message = getWhatsAppMessage(sessionId, selectedLanguage);
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div>
      <button onClick={handleShare} className="w-full py-4 bg-green-600 text-white rounded-lg">
        Share on WhatsApp
      </button>
      
      {/* Optional: Allow changing language for this share only */}
      <div className="mt-3 flex gap-2 text-xs">
        <button 
          onClick={() => setSelectedLanguage('english')}
          className={selectedLanguage === 'english' ? 'font-medium' : 'text-gray-600'}
        >
          EN
        </button>
        <button 
          onClick={() => setSelectedLanguage('hindi')}
          className={selectedLanguage === 'hindi' ? 'font-medium' : 'text-gray-600'}
        >
          हिं
        </button>
        <button 
          onClick={() => setSelectedLanguage('gujarati')}
          className={selectedLanguage === 'gujarati' ? 'font-medium' : 'text-gray-600'}
        >
          ગુ
        </button>
      </div>
    </div>
  );
}
```

### Search Behavior

**Critical:** Search must work across ALL languages regardless of preference

```javascript
function searchCatalog(query, items, userLanguage) {
  const lowerQuery = query.toLowerCase();
  
  // Search all language fields
  const results = items.filter(item => {
    const searchFields = [
      item.name?.toLowerCase() || '',
      item.name_hi?.toLowerCase() || '',
      item.name_gu?.toLowerCase() || ''
    ];
    
    return searchFields.some(field => field.includes(lowerQuery));
  });
  
  // Sort results: Exact match in preferred language first
  return results.sort((a, b) => {
    const preferredField = `name_${userLanguage === 'english' ? '' : userLanguage}`;
    const aMatch = a[preferredField]?.toLowerCase() === lowerQuery;
    const bMatch = b[preferredField]?.toLowerCase() === lowerQuery;
    
    if (aMatch && !bMatch) return -1;
    if (!aMatch && bMatch) return 1;
    return 0;
  });
}
```

**Example:**
- User preference: Hindi
- User searches: "tomato" (English)
- Result: Finds टमाटर (matches English field)
- Works seamlessly

### Free vs Pro Behavior

**Free Users:**
- Always see English primary
- Can't change language preference
- Upgrade prompt in settings

**Pro Users:**
- Choose any language preference
- Can switch anytime
- WhatsApp messages auto-translate

### Edge Cases

#### Case 1: Missing translation
```javascript
// If item.name_hi is null/empty, fall back to English
const primary = item[`name_${userLanguage}`] || item.name;
```

#### Case 2: New items without translations
- Show English as fallback
- Admin dashboard flags "Translation needed"
- Gradually add translations post-launch

#### Case 3: User switches language mid-session
- Takes effect immediately (just re-render)
- Other participants see their own preference
- Session data stores item IDs, not names

### Testing Checklist

- [ ] Settings shows language preference (Pro only)
- [ ] Free users see upgrade prompt
- [ ] Switching language updates catalog immediately
- [ ] Primary/secondary names flip correctly
- [ ] Search works across all languages
- [ ] WhatsApp messages use correct language
- [ ] Voice search uses correct language
- [ ] Missing translations fall back to English
- [ ] Preference persists across sessions
- [ ] Works with all catalog screens

### Effort Estimate
**Time:** 6 hours  
**Complexity:** Medium ⭐⭐☆☆☆

**Breakdown:**
- Language utility functions: 2 hours
- Settings UI: 2 hours
- Integration across screens: 1.5 hours
- Testing: 0.5 hours

---

## Feature 5: In-App Notification System ✅

### Overview
Real-time notifications for session events: participant joins, shopping starts, bill ready, etc.

### Business Case
- **Problem:** Users miss important session updates
- **Solution:** In-app indicators, toasts, and alerts
- **Impact:**
  - Better engagement → users return to app
  - Reduced confusion → always know session status
  - Urgency → encourages action (invite expires soon!)

### Notification Types

#### 1. Live Session Indicator (Persistent Banner)

**When:** User has active session  
**Where:** Top of every screen  
**Dismissible:** No (persistent until session ends)

**Design:**
```jsx
function LiveSessionBanner({ session }) {
  if (!session || session.status === 'completed') return null;

  const statusColors = {
    open: 'bg-green-100 border-green-600',
    shopping: 'bg-yellow-100 border-yellow-600',
    splitting: 'bg-blue-100 border-blue-600'
  };

  return (
    <div className={`fixed top-0 left-0 right-0 border-b-2 p-3 z-40
                    ${statusColors[session.status] || statusColors.open}`}>
      <div className="max-w-md mx-auto flex items-center gap-3">
        <span className="w-3 h-3 bg-green-600 rounded-full animate-pulse" />
        
        <div className="flex-1">
          <p className="text-sm text-gray-900 font-medium">
            {session.status === 'open' && 'Live session active'}
            {session.status === 'shopping' && 'Shopping in progress'}
            {session.status === 'splitting' && 'Ready to split costs'}
          </p>
          <p className="text-xs text-gray-600">
            {session.participant_count} people • {session.total_weight}kg
          </p>
        </div>
        
        <button 
          onClick={() => navigateToSession(session.id)}
          className="text-sm text-green-700 font-medium"
        >
          View →
        </button>
      </div>
    </div>
  );
}
```

**Usage:**
```jsx
// In main App.jsx wrapper
function App() {
  const { activeSession } = useSession();
  
  return (
    <>
      <LiveSessionBanner session={activeSession} />
      
      {/* Add padding to main content if banner visible */}
      <div className={activeSession ? 'pt-16' : ''}>
        {/* App content */}
      </div>
    </>
  );
}
```

#### 2. Toast Notifications (Temporary)

**When:** Low-priority updates  
**Where:** Top of screen  
**Duration:** 3 seconds, auto-dismiss

**Design:**
```jsx
function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const colors = {
    info: 'bg-gray-900 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white',
    warning: 'bg-yellow-600 text-white'
  };

  return (
    <div className={`fixed top-4 left-4 right-4 p-4 rounded-lg shadow-lg z-50
                    animate-slide-down ${colors[type]}`}>
      <div className="flex items-center gap-3 max-w-md mx-auto">
        {type === 'success' && <span className="text-xl">✓</span>}
        {type === 'error' && <span className="text-xl">✕</span>}
        {type === 'warning' && <span className="text-xl">⚠</span>}
        <p className="flex-1 text-sm">{message}</p>
      </div>
    </div>
  );
}

// Toast manager
function ToastManager() {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          style={{ top: `${index * 72}px` }}
          className="absolute left-0 right-0 pointer-events-auto"
        >
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
```

**Usage:**
```jsx
// Participant joins
showToast('Maya joined your session', 'info');

// Payment received
showToast('Raj paid ₹144', 'success');

// Error
showToast('Failed to save. Tap to retry.', 'error');
```

#### 3. Modal Alerts (Action Required)

**When:** Critical events needing user decision  
**Where:** Center of screen  
**Dismissible:** Only via action buttons

**Design:**
```jsx
function AlertModal({ 
  title, 
  message, 
  actions, // [{ label, onClick, primary }]
  onDismiss 
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center 
                    justify-center z-50 p-6">
      <div className="bg-white rounded-lg max-w-sm w-full p-6">
        <h2 className="text-xl text-gray-900 font-medium mb-2">
          {title}
        </h2>
        
        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>
        
        <div className="flex gap-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`flex-1 py-3 rounded-lg text-sm ${
                action.primary
                  ? 'bg-gray-900 text-white'
                  : 'border-2 border-gray-300 text-gray-900'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Usage:**
```jsx
// Session expiring
<AlertModal
  title="Session expires in 2 minutes"
  message="Only 1 person joined. Share link to get more participants."
  actions={[
    { label: 'Share', onClick: () => shareOnWhatsApp(), primary: true },
    { label: 'Close', onClick: () => closeModal(), primary: false }
  ]}
/>

// Item unavailable
<AlertModal
  title="Tomatoes unavailable"
  message="Vendor didn't have enough. Refund calculated automatically."
  actions={[
    { label: 'Got it', onClick: () => closeModal(), primary: true }
  ]}
/>
```

#### 4. Badge Counts

**When:** Unread notifications exist  
**Where:** Navigation icons, buttons

**Design:**
```jsx
function BadgeCount({ count }) {
  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 
                     text-white text-xs rounded-full flex items-center 
                     justify-center font-medium">
      {count > 9 ? '9+' : count}
    </span>
  );
}

// Usage
<div className="relative">
  <button>+ New</button>
  <BadgeCount count={activeSessions.length} />
</div>
```

### Notification Events

#### Host Notifications

| Event | Type | Message | When |
|-------|------|---------|------|
| Participant joined | Toast | "Maya joined your session" | Real-time |
| Session ready | Toast | "4 people joined! Ready for vendor" | 4+ participants |
| Session expiring | Modal | "Session expires in 2 min" | 18 min after creation |
| Payment received | Toast | "Raj paid ₹144" | Payment confirmed |
| All paid | Toast | "All participants paid!" | Last payment in |

#### Participant Notifications

| Event | Type | Message | When |
|-------|------|---------|------|
| Shopping started | Toast | "Host started shopping" | Status changes |
| Bill ready | Modal | "Your bill is ready: ₹144" | Shopping complete |
| Payment reminder | Toast | "Reminder: Pay ₹144 to Host" | 24 hours after bill |
| Session completed | Toast | "Session completed. Thanks!" | Host closes |

### Real-time Sync Strategy

**Option A: Firebase Realtime Database**
```javascript
// Listen to session changes
const sessionRef = firebase.database().ref(`sessions/${sessionId}`);

sessionRef.on('value', (snapshot) => {
  const session = snapshot.val();
  
  // Check for new participants
  if (session.participant_count > prevCount) {
    const newParticipant = getNewParticipant(session);
    showToast(`${newParticipant.nickname} joined your session`);
  }
  
  // Check for status changes
  if (session.status !== prevStatus) {
    handleStatusChange(session.status);
  }
});
```

**Option B: Polling (Fallback)**
```javascript
// Poll every 10 seconds if Firebase fails
useEffect(() => {
  const interval = setInterval(async () => {
    const session = await fetchSession(sessionId);
    checkForUpdates(session);
  }, 10000);
  
  return () => clearInterval(interval);
}, [sessionId]);
```

### Push Notifications (Optional - Phase 2)

**Only for critical events:**
- Bill ready (participant)
- Payment reminder (participant)
- Session expiring (host)

**Implementation:**
```javascript
// Request permission
const permission = await Notification.requestPermission();

if (permission === 'granted') {
  // Register service worker
  const registration = await navigator.serviceWorker.register('/sw.js');
  
  // Subscribe to push notifications
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY
  });
  
  // Save subscription to backend
  await saveSubscription(user.id, subscription);
}

// Send push (backend)
await webpush.sendNotification(subscription, JSON.stringify({
  title: 'Your bill is ready',
  body: '₹144 • Tap to view breakdown',
  data: { sessionId, participantId }
}));
```

### Notification Preferences (Settings)

```jsx
function NotificationSettings({ user, onUpdate }) {
  const [preferences, setPreferences] = useState(user.notification_preferences);

  return (
    <div className="space-y-4">
      <h3 className="text-base text-gray-900 font-medium">Notifications</h3>
      
      {/* Session updates */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Someone joins my session</span>
        <input
          type="checkbox"
          checked={preferences.participant_joined}
          onChange={(e) => updatePreference('participant_joined', e.target.checked)}
          className="w-5 h-5"
        />
      </label>
      
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Session ready (4+ people)</span>
        <input
          type="checkbox"
          checked={preferences.session_ready}
          onChange={(e) => updatePreference('session_ready', e.target.checked)}
          className="w-5 h-5"
        />
      </label>
      
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Session expiring soon</span>
        <input
          type="checkbox"
          checked={preferences.session_expiring}
          onChange={(e) => updatePreference('session_expiring', e.target.checked)}
          className="w-5 h-5"
        />
      </label>
      
      {/* Payment updates */}
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Payment received</span>
        <input
          type="checkbox"
          checked={preferences.payment_received}
          onChange={(e) => updatePreference('payment_received', e.target.checked)}
          className="w-5 h-5"
        />
      </label>
      
      <label className="flex items-center justify-between">
        <span className="text-sm text-gray-700">Payment reminder</span>
        <input
          type="checkbox"
          checked={preferences.payment_reminder}
          onChange={(e) => updatePreference('payment_reminder', e.target.checked)}
          className="w-5 h-5"
        />
      </label>
      
      {/* Push notifications */}
      <div className="pt-4 border-t">
        <label className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Push notifications</p>
            <p className="text-xs text-gray-500">Critical updates when app is closed</p>
          </div>
          <input
            type="checkbox"
            checked={preferences.push_enabled}
            onChange={(e) => togglePushNotifications(e.target.checked)}
            className="w-5 h-5"
          />
        </label>
      </div>
    </div>
  );
}
```

### Analytics Tracking

```javascript
// Track notification performance
analytics.track('notification_shown', {
  type: 'toast',
  event: 'participant_joined',
  session_id: sessionId
});

analytics.track('notification_clicked', {
  type: 'banner',
  event: 'view_session',
  session_id: sessionId
});

analytics.track('notification_dismissed', {
  type: 'modal',
  event: 'session_expiring',
  action_taken: 'shared_link'
});
```

### Testing Checklist

- [ ] Live banner shows when session active
- [ ] Banner updates in real-time
- [ ] Toasts auto-dismiss after 3 seconds
- [ ] Multiple toasts stack correctly
- [ ] Modals block background interaction
- [ ] Badge counts update correctly
- [ ] Notification preferences save
- [ ] Push notifications work (if enabled)
- [ ] No notification spam (max 1 per 30 sec)
- [ ] Graceful degradation if sync fails

### Effort Estimate
**Time:** 8 hours  
**Complexity:** Medium ⭐⭐⭐☆☆

**Breakdown:**
- Component development: 3 hours
- Real-time sync integration: 2 hours
- Event handling logic: 2 hours
- Testing: 1 hour

---

## Feature 6: Remove Pro Limits ✅

### Overview
Pro users get unlimited weight capacity, unlimited participants, and extended invite windows.

### Business Case
- **Problem:** Free tier limits (10kg, 4 people, 20 mins) block power users
- **Solution:** Remove all limits for Pro subscribers
- **Impact:**
  - Clear Pro value → justifies ₹49/month
  - Enables larger group orders → more savings
  - Vendor confirmations more valuable → higher demand

### Technical Implementation

#### Limit Changes

**Free Tier:**
- 10kg bag limit
- 4 participants max
- 20-minute invite window
- Standard catalog only
- No vendor confirmations

**Pro Tier:**
- ❌ ~~10kg limit~~ → **Unlimited** (or soft cap at 100kg)
- ❌ ~~4 participants~~ → **Unlimited** (or soft cap at 20)
- ❌ ~~20 minutes~~ → **2 hours invite window**
- ✅ Custom items enabled
- ✅ Vendor confirmations guaranteed
- ✅ Analytics dashboard
- ✅ Session scheduling

#### Code Changes

**File:** `utils/limits.js`

```javascript
/**
 * Get session limits based on user tier
 */
export function getSessionLimits(user) {
  if (user?.is_pro) {
    return {
      maxWeight: null, // Unlimited (or 100 for sanity)
      maxParticipants: null, // Unlimited (or 20)
      inviteWindowMinutes: 120, // 2 hours
      customItemsEnabled: true,
      vendorConfirmation: true,
      analytics: true
    };
  }
  
  // Free tier limits
  return {
    maxWeight: 10,
    maxParticipants: 4,
    inviteWindowMinutes: 20,
    customItemsEnabled: false,
    vendorConfirmation: false,
    analytics: false
  };
}

/**
 * Check if user can add item (weight limit)
 */
export function canAddItem(session, item, quantity, user) {
  const limits = getSessionLimits(user);
  
  if (!limits.maxWeight) return true; // Unlimited for Pro
  
  const currentWeight = getTotalWeight(session);
  const newWeight = currentWeight + quantity;
  
  return newWeight <= limits.maxWeight;
}

/**
 * Check if participant can join (participant limit)
 */
export function canJoinSession(session, user) {
  const limits = getSessionLimits(user);
  
  if (!limits.maxParticipants) return true; // Unlimited for Pro
  
  return session.participant_count < limits.maxParticipants;
}
```

#### UI Changes

**Host Create Screen (Capacity Indicator):**

```jsx
function CapacityIndicator({ session, user }) {
  const limits = getSessionLimits(user);
  const totalWeight = getTotalWeight(session);

  // Free user: Show limit
  if (!user.is_pro) {
    return (
      <div className="mb-6">
        <p className="text-base text-gray-600">
          {totalWeight}kg of {limits.maxWeight}kg
        </p>
        
        {/* Warning when nearing limit */}
        {totalWeight >= 8 && (
          <p className="text-sm text-orange-600 mt-1">
            ⚠️ Nearing capacity. Upgrade to Pro for unlimited.
          </p>
        )}
      </div>
    );
  }

  // Pro user: No limit shown
  return (
    <div className="mb-6 flex items-center gap-2">
      <p className="text-base text-gray-600">{totalWeight}kg added</p>
      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
        PRO
      </span>
    </div>
  );
}
```

**Session Active Screen (Participant Count):**

```jsx
function ParticipantCount({ session, user }) {
  const limits = getSessionLimits(user);
  const count = session.participant_count;

  // Free user: Show limit
  if (!user.is_pro) {
    return (
      <p className="text-sm text-gray-600">
        {count} of {limits.maxParticipants} people
      </p>
    );
  }

  // Pro user: Just show count
  return (
    <p className="text-sm text-gray-600">
      {count} {count === 1 ? 'person' : 'people'} joined
    </p>
  );
}
```

**Upgrade Prompts (Free Users Hitting Limits):**

```jsx
// When adding item at 10kg limit
function WeightLimitModal({ onUpgrade, onDismiss }) {
  return (
    <AlertModal
      title="Reached 10kg limit"
      message="Want to add more items? Upgrade to Pro for unlimited capacity."
      actions={[
        { 
          label: 'Upgrade to Pro (₹49/month)', 
          onClick: onUpgrade, 
          primary: true 
        },
        { 
          label: 'Not now', 
          onClick: onDismiss, 
          primary: false 
        }
      ]}
    />
  );
}

// When 5th person tries to join
function ParticipantLimitModal({ onUpgrade, onDismiss }) {
  return (
    <AlertModal
      title="Session is full (4/4)"
      message="This session reached the free tier limit. Ask the host to upgrade to Pro for unlimited participants."
      actions={[
        { 
          label: 'Tell Host', 
          onClick: () => shareUpgradeRequest(), 
          primary: true 
        },
        { 
          label: 'Maybe later', 
          onClick: onDismiss, 
          primary: false 
        }
      ]}
    />
  );
}
```

**Session Expiry Timer:**

```jsx
function ExpiryTimer({ session, user }) {
  const limits = getSessionLimits(user);
  const createdAt = new Date(session.created_at);
  const expiresAt = new Date(createdAt.getTime() + limits.inviteWindowMinutes * 60000);
  const now = new Date();
  const minutesLeft = Math.floor((expiresAt - now) / 60000);

  if (minutesLeft < 0) return <p className="text-sm text-red-600">Expired</p>;
  
  // Free user: Show urgency
  if (!user.is_pro && minutesLeft <= 5) {
    return (
      <div className="bg-orange-50 border border-orange-300 rounded-lg p-3">
        <p className="text-sm text-orange-800 font-medium">
          ⏰ Expires in {minutesLeft} {minutesLeft === 1 ? 'minute' : 'minutes'}
        </p>
        <button className="text-xs text-orange-600 mt-1">
          Upgrade to Pro for 2-hour window →
        </button>
      </div>
    );
  }

  // Pro user: Relaxed messaging
  if (user.is_pro) {
    return (
      <p className="text-xs text-gray-500">
        {Math.floor(minutesLeft / 60)}h {minutesLeft % 60}m left to invite
      </p>
    );
  }

  return null;
}
```

#### Backend Validation

**Important:** Always validate limits server-side (don't trust client)

```javascript
// API endpoint: POST /sessions/:id/items/add
export async function addItemToSession(req, res) {
  const { sessionId, itemId, quantity } = req.body;
  const user = req.user;
  
  // Fetch session
  const session = await getSession(sessionId);
  
  // Check if user is host
  if (session.creator_id !== user.id) {
    return res.status(403).json({ error: 'Only host can add items' });
  }
  
  // Get user limits
  const limits = getSessionLimits(user);
  
  // Validate weight limit
  if (limits.maxWeight) {
    const currentWeight = session.total_weight || 0;
    const newWeight = currentWeight + quantity;
    
    if (newWeight > limits.maxWeight) {
      return res.status(400).json({ 
        error: 'Weight limit exceeded',
        current: currentWeight,
        max: limits.maxWeight,
        upgrade_required: true
      });
    }
  }
  
  // Add item...
  await addItem(sessionId, itemId, quantity);
  
  res.json({ success: true });
}
```

### Pro Badge Display

**Show Pro indicator subtly:**

```jsx
// On session card
<div className="flex items-center gap-2">
  <h2 className="text-lg text-gray-900">Fresh Vegetables</h2>
  {session.is_pro && (
    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded 
                     border border-yellow-300">
      PRO
    </span>
  )}
</div>

// On user profile
<div className="flex items-center gap-2">
  <p className="text-base text-gray-900">RAJ</p>
  {user.is_pro && (
    <span className="text-yellow-600">👑</span>
  )}
</div>
```

### Testing Checklist

- [ ] Free users see 10kg limit
- [ ] Pro users see no weight limit
- [ ] Free users blocked at 4 participants
- [ ] Pro users can add unlimited participants
- [ ] Free sessions expire at 20 minutes
- [ ] Pro sessions expire at 2 hours
- [ ] Upgrade prompts show when hitting limits
- [ ] Server validates limits (security)
- [ ] Pro badge displays correctly
- [ ] Analytics track limit hits (conversion funnel)

### Effort Estimate
**Time:** 2 hours  
**Complexity:** Low ⭐☆☆☆☆

**Breakdown:**
- Limit logic: 1 hour
- UI updates: 0.5 hours
- Backend validation: 0.5 hours

---

## Deferred Features (Later)

### Feature 7: Savings Display 🟡

**Why Deferred:**
- Requires price database (don't have yet)
- Need multiple sessions to establish baseline
- Complexity vs value trade-off

**Future Implementation:**
- Phase 1: Show estimated 5% savings
- Phase 2: Collect actual prices from hosts
- Phase 3: Build local pricing database
- Phase 4: Show accurate "You saved ₹X" on bills

**Effort:** 4 hours (simple estimate) → 20+ hours (accurate tracking)

---

### Feature 8: Broadcast Sessions 🔴

**Why Deferred:**
- Major feature (40+ hours development)
- Needs vendor network (not built yet)
- Privacy/trust concerns to solve
- Marketplace dynamics complex

**Future Roadmap:**
- Month 6-9: Test with 5-10 vendors only
- Month 10-12: Open to Pro buyers
- Month 13+: Full public marketplace

**Defer until:**
- 200+ active users
- 30+ vendors onboarded
- Core coordination working well

---

## Rejected Features (Too Complex)

### ❌ Real-time Chat Between Participants

**Why Rejected:**
- WhatsApp already exists (don't reinvent)
- Moderation nightmare
- Not core to value prop (coordination, not communication)
- Increases scope 10x

**Alternative:** Deep-link to WhatsApp group if needed

---

### ❌ In-App Payment Processing

**Why Rejected:**
- Regulatory complexity (RBI, KYC, escrow)
- Trust liability (we become middleman)
- Not core value prop (coordination, not payments)
- Increases cost structure massively

**Alternative:** UPI deep-linking + payment tracking only

---

### ❌ Vendor Ratings & Reviews

**Why Rejected:**
- Opens abuse vector (fake reviews)
- Damages vendor relationships
- Not needed for MVP coordination
- Requires moderation team

**Alternative:** Internal quality score (not public)

---

## Implementation Roadmap

### Sprint 1 (This Week - 27 hours)

**Priority Order:**

1. **Rounded Bills** (2 hours) ✅
   - Update calculation logic
   - Test edge cases

2. **Voice Search** (3 hours) ✅
   - Build component
   - Integrate into catalog
   - Test languages

3. **Custom Usernames** (6 hours) ✅
   - Sign-up flow
   - Validation API
   - Database migration

4. **Language Preference** (6 hours) ✅
   - Settings UI
   - Rendering logic
   - WhatsApp integration

5. **Remove Pro Limits** (2 hours) ✅
   - Update limit checks
   - UI messaging
   - Upgrade prompts

6. **In-App Notifications** (8 hours) ✅
   - Live banner
   - Toast system
   - Modal alerts
   - Real-time sync

**Total:** 27 hours (~4 days focused work)

---

### Sprint 2 (Next Week - Backend Integration)

Focus on connecting frontend to Firebase:
- Database schema setup
- API endpoints
- Real-time listeners
- Authentication flow

---

### Sprint 3 (Week 3 - Testing & Polish)

- End-to-end testing
- Bug fixes
- Performance optimization
- Analytics setup

---

## Technical Specifications

### Development Environment

**Frontend:**
- React 18+
- Tailwind CSS 3+
- Vite build tool
- Firebase SDK 9+

**Backend:**
- Firebase Firestore (database)
- Firebase Functions (serverless)
- Firebase Auth (optional, for Pro users)

**Deployment:**
- Frontend: Vercel
- Backend: Firebase Hosting

### Performance Budget

**Page Load:**
- Initial load: < 2 seconds (3G)
- Time to interactive: < 3 seconds
- Bundle size: < 200KB gzipped

**Runtime:**
- Voice recognition: < 2 seconds
- Search results: < 100ms
- Real-time updates: < 500ms

### Browser Support

**Target:**
- Chrome 90+ (Android/Desktop)
- Safari 14+ (iOS)
- Samsung Internet 15+

**Graceful Degradation:**
- Voice search: Hide if unsupported
- Push notifications: Optional
- Real-time sync: Fall back to polling

### Analytics Events

**Track these for all new features:**

```javascript
// Voice search
analytics.track('voice_search_used', { language, success });

// Custom nickname
analytics.track('nickname_chosen', { length, attempt_count });

// Language preference
analytics.track('language_preference_set', { language, user_tier });

// Pro limit hit
analytics.track('limit_reached', { limit_type, user_tier });

// Notification interaction
analytics.track('notification_clicked', { type, event });
```

---

## Success Metrics

### Feature Adoption

| Feature | Target Adoption | Measurement |
|---------|----------------|-------------|
| Voice Search | 30% of searches | % searches using voice |
| Custom Nicknames | 80% choose custom | % users with custom names |
| Language Preference | 50% non-English | % users choosing HI/GU |
| Notifications | 60% engagement | Click-through rate |

### Business Impact

| Metric | Baseline | Target | Timeline |
|--------|----------|--------|----------|
| Pro Conversion | 2% | 5% | 30 days |
| Session Completion | 70% | 80% | 30 days |
| User Retention | 40% | 60% | 60 days |
| Feature Usage | N/A | 50%+ | 90 days |

---

## Risk Mitigation

### Technical Risks

**Risk 1: Voice recognition accuracy**
- Mitigation: Fallback to typing always available
- Test thoroughly across languages
- Show error messages clearly

**Risk 2: Real-time sync failures**
- Mitigation: Polling fallback
- Offline queue for actions
- Clear error states

**Risk 3: Database performance at scale**
- Mitigation: Proper indexing
- Pagination for lists
- Caching strategies

### Product Risks

**Risk 1: Features don't drive Pro conversion**
- Mitigation: Track analytics closely
- A/B test upgrade prompts
- Iterate on value messaging

**Risk 2: Notification fatigue**
- Mitigation: Conservative defaults
- User preferences
- Max 1 notification per 30 seconds

**Risk 3: Language preference confuses users**
- Mitigation: Clear onboarding
- Easy to switch back
- Default to English (safe)

---

## Documentation Updates Needed

After implementing these features:

1. **Update README.md** - Add new features to list
2. **Update minibag-dev-doc.md** - Screen flows with new UI
3. **Update API docs** - New endpoints
4. **Create user guide** - How to use voice search, etc.
5. **Update Pro marketing** - Highlight new Pro benefits

---

## Next Steps

**Immediate (Today):**
1. Review this document with team
2. Prioritize any changes
3. Set up development branches
4. Begin Sprint 1 implementation

**This Week:**
1. Complete Sprint 1 features
2. Daily progress check-ins
3. Update this doc with learnings

**Next Week:**
1. Backend integration
2. Testing with beta users
3. Iterate based on feedback

---

**Document Status:** ✅ Complete & Ready for Implementation  
**Last Updated:** October 25, 2025  
**Next Review:** After Sprint 1 completion  
**Owner:** Product & Engineering Team
