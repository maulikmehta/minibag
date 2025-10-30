# Minibag Product Roadmap v2.0
**Integrated Feature Plan - October 25, 2025**

**Major Revision:** Merges experimental features into core roadmap
**Target Launch:** November 10, 2025 (MVP)
**Status:** Active Development

---

## 🎯 Product Vision

### Core Value Proposition
Minibag is a **personal shopping list that happens to support collaboration**. The host gets value immediately even if zero people join:
- **Solo use:** Shopping list + payment tracker + price memory
- **Group use:** Bonus cost-splitting with neighbors

### Key Principle
> "Digitally enable the ways people already help each other."

---

## 📅 Release Timeline

### 🚀 MVP Launch (Nov 10, 2025) - **16 Days**

**Core Features** (Must-have for launch):
- ✅ Session creation (DONE)
- ✅ Catalog browsing (DONE)
- ✅ Real-time updates (DONE)
- 🟡 Join session flow (IN PROGRESS)
- 🟡 Shopping & payment tracking (IN PROGRESS)
- ⚪ Payment split calculation (TODO)
- ⚪ WhatsApp sharing (TODO)

**Quick Win Features** (Week 1 - 8 hours):
- ⚪ Rounded bills
- ⚪ Voice search
- ⚪ Auto-detect language
- ⚪ Remove Pro limits

**Status:** 70% complete, on track

---

### 🌟 V1.1 Launch (Nov 20, 2025) - **+10 Days**

**Identity Features** (Week 2-3 - 12 hours):
- ⚪ Custom 3-letter usernames (MKM, ILU style)
- ⚪ Language preference (free for all)
- ⚪ Avatar emoji picker

**Engagement Features** (Week 3 - 8 hours):
- ⚪ In-app notifications (banners, toasts)
- ⚪ Live session indicator
- ⚪ Payment reminders

**Status:** Design complete, ready for implementation

---

### 🚀 V1.5 (Dec 2025) - **Smart Features**

**Price Intelligence:**
- ⚪ Price memory (per item, per user)
- ⚪ Quick re-run (one-tap last week's list)
- ⚪ Vendor price comparison

**Pro Features:**
- ⚪ Unlimited weight & participants
- ⚪ Extended invite window (2 hours)
- ⚪ Cross-device sync
- ⚪ Analytics dashboard

**Status:** Planned, specs ready

---

### 🎉 V2.0 (Jan 2026) - **Marketplace**

**Deferred (40+ hours):**
- Broadcast sessions (public shopping runs)
- Vendor network onboarding
- Vendor confirmations
- Savings display

**Status:** Deferred until 200+ active users

---

## 🏗️ Feature Breakdown

### Phase 1: MVP Core (95% Complete)

#### ✅ Session Creation (DONE)
**Status:** Live in production
**Completion:** Oct 24, 2025

**Features:**
- Create session with items
- 10kg limit (free tier)
- 20-minute invite window
- Unique 6-char session ID
- Auto-assigned nickname (Raj, Maya, etc.)

**Screens:**
- Home screen
- Create session (catalog browsing)
- Session active

#### 🟡 Join Session Flow (IN PROGRESS)
**Status:** Frontend ready, backend 60% complete
**Target:** Oct 28, 2025

**Features:**
- Join via link (minibag.in/abc123)
- Add items to shared bag
- Real-time participant sync
- Nickname assignment

**Screens:**
- Join landing page
- Add items (participant view)

#### 🟡 Shopping & Payment (IN PROGRESS)
**Status:** UI complete, backend 40%
**Target:** Oct 30, 2025

**Features:**
- Mark items as paid
- Record payment method (UPI/Cash)
- Track total spent
- Calculate per-item costs

**Screens:**
- Shopping screen (host)
- Payment modal

#### ⚪ Payment Split (TODO)
**Status:** Design complete
**Target:** Nov 2, 2025
**Effort:** 4 hours

**Features:**
- Auto-calculate participant bills
- Show itemized breakdown
- WhatsApp payment request
- Host collects from participants

**Screens:**
- Payment split (host view)
- Participant bill (viewer)

---

### Phase 2: Quick Wins (Week 1 - 8 Hours)

#### ⚪ Rounded Bills
**Priority:** P0 (Launch blocker)
**Effort:** 2 hours
**Target:** Oct 27, 2025

**Implementation:**
```javascript
// Round UP to nearest rupee
participantBill = Math.ceil(exactAmount);

// Host absorbs rounding difference
hostBill = totalSpent - sum(participantBills);
```

**Value:**
- Cleaner UX (no decimals)
- Easier UPI payments
- Social harmony (no awkward ₹143.67)

**Trade-off:** Host absorbs ₹5-10 max per session

---

#### ⚪ Voice Search
**Priority:** P1 (High impact)
**Effort:** 3 hours
**Target:** Oct 28, 2025

**Implementation:**
- Web Speech API (free, built-in)
- Supports English, Hindi, Gujarati
- Fallback to typing if unsupported

**UI:**
```jsx
<div className="flex gap-2">
  <input type="text" placeholder="Search items..." />
  <button className="p-3 bg-gray-100 rounded-full">
    <Mic size={20} />
  </button>
</div>
```

**Value:**
- 3-5x faster than typing
- Accessibility (elderly users)
- Competitive differentiator

**Browser Support:** 85% (Chrome, Safari, Samsung Internet)

---

#### ⚪ Auto-Detect Language
**Priority:** P1 (Frictionless UX)
**Effort:** 1 hour
**Target:** Oct 27, 2025

**Implementation:**
```javascript
// Detect browser language
const browserLang = navigator.language; // "hi-IN", "gu-IN", "en-IN"

if (browserLang.startsWith('hi')) {
  setLanguage('hindi'); // Show टमाटर first
} else if (browserLang.startsWith('gu')) {
  setLanguage('gujarati'); // Show ટામેટાં first
} else {
  setLanguage('english'); // Show Tomatoes first
}
```

**Value:**
- Zero friction (no signup step)
- Culturally appropriate (respects user's language)
- Works immediately

**Alternative:** 🌐 button to toggle (EN → हिं → ગુ)

---

#### ⚪ Remove Pro Limits
**Priority:** P2 (Pro value prop)
**Effort:** 2 hours
**Target:** Oct 29, 2025

**Changes:**

| Feature | Free | Pro |
|---------|------|-----|
| Weight limit | 10kg | Unlimited* |
| Participants | 4 max | Unlimited* |
| Invite window | 20 min | 2 hours |
| Custom items | ❌ | ✅ |
| Vendor confirm | ❌ | ✅ |
| Analytics | ❌ | ✅ |

*Soft caps: 100kg, 20 participants

**Upgrade Prompts:**
- When hitting 10kg: "Upgrade to Pro for unlimited capacity"
- When 5th person joins: "Session full. Ask host to upgrade."

---

### Phase 3: Identity Features (Week 2-3 - 12 Hours)

#### ⚪ Custom 3-Letter Usernames
**Priority:** P2 (Personalization)
**Effort:** 6 hours
**Target:** Nov 5, 2025

**Design:**
- 3-letter names only: MKM, ILU, LOL, RAJ
- Supports initials + abbreviations
- Unique globally (first-come, first-served)
- Blacklist offensive words

**Sign-up Flow:**
```
1. Enter phone number
2. Verify OTP
3. Choose 3-letter name
   - Input: [M] [K] [M]
   - Check availability in real-time
   - Suggestions if taken: MKA, KMM, RAJ
4. Pick avatar emoji (optional)
5. Done!
```

**Validation:**
- Exactly 3 characters
- Letters only (A-Z)
- Check database for uniqueness
- Blacklist check

**Namespace:**
- Total possible: 17,576 (26³)
- When full: Allow 4 letters for Pro users

**Value:**
- Personal identity (not random)
- Memorable across sessions
- Trust (same person every time)

---

#### ⚪ Language Preference (Free)
**Priority:** P1 (Regional expansion)
**Effort:** 6 hours
**Target:** Nov 6, 2025

**Scope:**
- ✅ Catalog items show preferred language first
- ✅ WhatsApp messages auto-translate
- ✅ Voice search uses correct language
- ❌ Not full app translation (just item names)

**Current Display:**
```
English:  Tomatoes
          टमाटर • ટામેટાં

Hindi:    टमाटर
          Tomatoes • ટામેટાં

Gujarati: ટામેટાં
          Tomatoes • टमाटर
```

**Pro Perk:**
- Free: Language preference saves in localStorage (device-only)
- Pro: Syncs across devices permanently

**Value:**
- Cultural respect
- Tier-2/3 city penetration
- No paywall for regional users

---

### Phase 4: Engagement (Week 3 - 8 Hours)

#### ⚪ In-App Notifications
**Priority:** P2 (Engagement)
**Effort:** 8 hours
**Target:** Nov 8, 2025

**Notification Types:**

**1. Live Session Banner** (Persistent)
```jsx
<div className="fixed top-0 bg-green-100 border-b-2 border-green-600 p-3">
  <div className="flex items-center gap-3">
    <span className="w-3 h-3 bg-green-600 rounded-full animate-pulse" />
    <p>Live session active • 3 people • 7.5kg</p>
    <button>View →</button>
  </div>
</div>
```

**2. Toast Notifications** (3-sec auto-dismiss)
- "Maya joined your session"
- "Raj paid ₹144"
- "Session expiring in 2 min"

**3. Modal Alerts** (Action required)
- "Your bill is ready: ₹144"
- "Session expires in 2 min - Share link?"

**Real-time Sync:**
- WebSocket for live updates
- Fallback to polling (10-sec intervals)

**User Preferences:**
- Toggle notifications in settings
- Control frequency (max 1 per 30 sec)

**Value:**
- Keep users engaged
- Reduce missed updates
- Urgency for action

---

## 🚫 Rejected Features

### ❌ In-App Chat
**Reason:** WhatsApp already exists, don't reinvent
**Alternative:** Deep-link to WhatsApp group

### ❌ In-App Payments
**Reason:** Regulatory complexity (RBI, KYC, escrow)
**Alternative:** UPI deep-linking + tracking only

### ❌ Vendor Ratings
**Reason:** Abuse vector, damages relationships
**Alternative:** Internal quality score (not public)

---

## 📊 Success Metrics

### MVP Launch (Nov 10)

**Functionality:**
- [ ] 100% core features working
- [ ] < 2 sec page load (3G)
- [ ] Zero critical bugs
- [ ] 95%+ test coverage

**User Experience:**
- [ ] 10 beta users complete full flow
- [ ] Average session creation < 60 sec
- [ ] 80%+ successful session completions
- [ ] NPS > 8/10

**Technical:**
- [ ] Uptime > 99%
- [ ] Error rate < 1%
- [ ] Mobile responsive (360px+)

### V1.1 Launch (Nov 20)

**Adoption:**
- [ ] 30% of searches use voice
- [ ] 50% users choose Hindi/Gujarati
- [ ] 80% users pick custom nickname
- [ ] 60% notification click-through rate

**Business:**
- [ ] 5% Pro conversion rate
- [ ] 80% session completion rate
- [ ] 60% D7 retention
- [ ] 50%+ feature usage

---

## 🛣️ Development Workflow

### Sprint Planning (Weekly)

**Week 1 (Oct 26-Nov 1):**
- Mon-Tue: Rounded bills + Auto-detect language
- Wed-Thu: Voice search component
- Fri: Remove Pro limits + testing

**Week 2 (Nov 2-8):**
- Mon-Tue: Payment split screen
- Wed-Thu: Custom usernames
- Fri: Language preference

**Week 3 (Nov 9-15):**
- Mon-Wed: In-app notifications
- Thu: Bug bash
- Fri: MVP launch prep

**Week 4 (Nov 16-20):**
- Mon: Deploy MVP
- Tue-Thu: Beta testing
- Fri: V1.1 launch

---

## 🔄 Feedback Loop

### User Testing
- Beta group: 10-15 users from target neighborhood
- Weekly feedback sessions
- Bug reporting via WhatsApp group

### Metrics Tracking
- Google Analytics (page views, events)
- Mixpanel (funnels, retention)
- Sentry (error tracking)

### Iteration Cycle
1. **Weekly:** Review metrics, prioritize fixes
2. **Bi-weekly:** Feature experiments (A/B tests)
3. **Monthly:** Roadmap review, pivot if needed

---

## 📞 Team Coordination

### Roles
- **Product:** Feature prioritization, UX decisions
- **Engineering:** Implementation, technical decisions
- **Design:** UI/UX, styling consistency

### Communication
- **Daily:** Async updates in Slack/WhatsApp
- **Weekly:** Video sync (30 min)
- **Milestone:** Team review (1 hour)

### Documentation
- Update CHANGELOG.md after each feature
- Tag git commits by feature
- Keep PROJECT_STATUS.md current

---

## 🎯 Launch Checklist

### Pre-Launch (Nov 1-9)

**Technical:**
- [ ] Production database setup
- [ ] Domain configured (minibag.in)
- [ ] SSL certificate installed
- [ ] CDN configured for images
- [ ] Error tracking (Sentry)
- [ ] Analytics (Google + Mixpanel)
- [ ] Performance testing (Lighthouse)

**Content:**
- [ ] Privacy policy
- [ ] Terms of service
- [ ] FAQ page
- [ ] Help documentation
- [ ] WhatsApp support group

**Marketing:**
- [ ] Landing page live
- [ ] Demo video (30 sec)
- [ ] Screenshots for sharing
- [ ] Social media posts drafted
- [ ] Beta user outreach

### Launch Day (Nov 10)

**Checklist:**
- [ ] All MVP features deployed
- [ ] Beta users invited
- [ ] Support team ready
- [ ] Monitoring dashboards active
- [ ] Rollback plan ready

**Success Criteria:**
- [ ] 10 sessions created (Day 1)
- [ ] Zero critical bugs reported
- [ ] < 2 sec average load time
- [ ] 90%+ uptime

---

## 📚 References

### Related Documents
- `PROGRESS_REPORT.md` - Current achievements
- `STYLING_GUIDE.md` - Design system
- `experimental_features.md` - Detailed feature specs
- `MINIBAG-DEV-DOC.md` - Technical documentation
- `PROJECT_STATUS.md` - Real-time status

### External Resources
- Tailwind CSS: https://tailwindcss.com
- Lucide Icons: https://lucide.dev
- Web Speech API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
- Firebase/Supabase: Backend docs

---

**Document Version:** 2.0
**Last Updated:** October 25, 2025
**Next Review:** November 1, 2025
**Owner:** Product Team

🚀 **On track for November 10 MVP launch!**

---

## 🗓️ Quick Timeline View

```
Oct 25 ────┐
           │ ✅ Styling complete
           │ ✅ Feature planning done
           │
Oct 26-29  ┼─ Week 1: Quick Wins (8h)
           │  • Rounded bills
           │  • Voice search
           │  • Auto-detect language
           │  • Remove Pro limits
           │
Oct 30-    │
Nov 5      ┼─ Week 2: Identity (12h)
           │  • Custom usernames
           │  • Language preference
           │
Nov 6-8    ┼─ Week 3: Engagement (8h)
           │  • In-app notifications
           │  • Bug fixes
           │
Nov 9      ┼─ Final testing
           │
Nov 10 ────┼─ 🚀 MVP LAUNCH
           │
Nov 11-19  ┼─ Beta testing
           │
Nov 20 ────┴─ 🎉 V1.1 RELEASE
```

**Total Development:** 28 hours over 16 days
**Status:** ✅ On Track
