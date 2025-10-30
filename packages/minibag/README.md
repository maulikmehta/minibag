# Minibag

> Personal shopping list that happens to support collaboration

**Tagline:** "Track your shopping, split with neighbors"

[![Status](https://img.shields.io/badge/status-pre--launch-yellow)]()
[![Version](https://img.shields.io/badge/version-0.2.0-blue)]()
[![Launch](https://img.shields.io/badge/launch-november%202025-green)]()

---

## 🎯 What is Minibag?

Minibag is a micro-coordination tool for Indian vegetable shopping. It's **disguised as a personal shopping list app** that happens to enable group purchasing - not the other way around.

### Key Insight

> "Digitally enable the ways people already help each other."

**Solo use:** Shopping list + payment tracker  
**Group use:** Bonus cost-splitting with neighbors

**The host gets value even if zero people join.**

---

## ✨ Features

### Core Features (v0.2.0)

- ✅ **Shopping List** - Add items, track quantities
- ✅ **Payment Tracking** - Record what you paid, where
- ✅ **Payment Splits** - Auto-calculate who owes what
- ✅ **Anonymous Sharing** - No phone numbers, auto-generated nicknames
- ✅ **Multi-vendor** - Track purchases from different vendors
- ✅ **Item-level tracking** - Not just session totals

### Smart Features (v0.2.0)

- ✅ **Price Memory** - Shows last paid price for each item
- ✅ **Quick Re-run** - Reuse last week's list in one tap
- ✅ **Past Runs** - Searchable history with stats
- ✅ **Sign-up Prompts** - Smart triggers (after sessions 2 & 3)

### Multilingual (v0.2.0)

- ✅ **English** - Primary language
- ✅ **ગુજરાતી (Gujarati)** - Full translation
- ✅ **हिंदी (Hindi)** - Full translation
- ⏳ Tamil, Telugu, Bengali (planned)

---

## 🚀 Quick Start

### For Users

**Try it now:**
1. Open: https://dev.minibag.in (development)
2. Click + → New run
3. Add items (Tomatoes, Onions, etc.)
4. Create session
5. Share link with neighbors (optional)

**Production URL (coming soon):**
https://minibag.in

### For Developers

```bash
# Clone parent repository
git clone https://github.com/yourusername/localloops.git
cd localloops/packages/minibag

# Install dependencies
npm install

# Start dev server
npm run dev

# Open browser
# http://localhost:5173
```

**Access from phone:**
```
Setup Cloudflare Tunnel (see docs/DEVELOPMENT.md)
Then open: https://dev.minibag.in
```

---

## 📱 User Flow

### Scenario: Host (Riya)

**Step 1: Create Session**
```
Opens app → Click + → New run
Adds items: Tomatoes 2kg, Onions 1kg, Potatoes 3kg
Click "Create session"
```

**Step 2: Share (Optional)**
```
Click "Share on WhatsApp"
Select language: English / ગુજરાતી / हिंदी
WhatsApp opens with pre-filled message
Send to building WhatsApp group
```

**Step 3: Shopping**
```
Goes to market tomorrow 6pm
Buys from Vendor A: Tomatoes ₹120
Buys from Vendor B: Onions ₹80
Buys from Vendor C: Potatoes ₹150
Records each payment in app
```

**Step 4: Split**
```
App calculates splits automatically
Raj owes: ₹145 (Tomatoes 1kg, Onions 0.5kg)
Maya owes: ₹180 (Potatoes 2kg, Onions 1kg)
Sends payment request via WhatsApp
```

### Scenario: Participant (Raj)

**Step 1: Join**
```
Receives WhatsApp message
Clicks link: minibag.in/abc123
Opens app (no sign-up needed)
Auto-assigned nickname: "Raj"
```

**Step 2: Add Items**
```
Sees what host is buying (social proof)
Adds own items: Tomatoes 1kg, Onions 0.5kg
Click "Lock order"
```

**Step 3: Pay**
```
After host finishes shopping:
Receives WhatsApp notification
Opens bill: minibag.in/bill/abc123-raj
Sees itemized bill: ₹145
Pays via UPI or marks "Paid in cash"
```

---

## 🎨 Design Philosophy

### Principles

1. **Zero learning curve** - If it needs explanation, redesign it
2. **Graceful degradation** - Works alone, better together
3. **Privacy-first** - Anonymous by default
4. **Daylight-optimized** - High contrast for Indian sunlight
5. **Elder-friendly** - Large text, simple interactions

### Visual Style

- **Google Keep aesthetic** - Minimal, note-like
- **Instagram patterns** - Familiar interactions (stories circles)
- **No bright colors** - Black/white/gray only
- **No emojis** - Professional, not playful
- **No animations** - Fast, instant feedback

---

## 🛠️ Tech Stack

**Frontend:**
- React 18 + Hooks
- Vite 5 (build tool)
- TailwindCSS (utility-first styling)
- Lucide React (icons)

**State Management:**
- React useState/useEffect
- localStorage (v0.2.0 - single device)
- WebSocket sync (v2.0.0 - multi-device)

**Development:**
- Cloudflare Tunnel (https://dev.minibag.in)
- Hot Module Replacement (HMR)
- Mobile testing over internet

**Production:**
- Vercel (auto-deploy from GitHub)
- Global CDN
- HTTPS by default

---

## 📦 Project Structure

```
packages/minibag/
├── src/
│   ├── components/          # React components
│   ├── hooks/              # Custom hooks (useSession, useCatalog)
│   ├── utils/              # Utilities (calculations, config)
│   ├── config.js           # Environment config
│   ├── App.jsx             # Main app
│   └── main.jsx            # Entry point
│
├── public/                 # Static assets
│   ├── images/            # Item images
│   └── favicon.ico
│
├── minibag-dev-doc.md     # Detailed product docs
├── README.md              # This file
├── package.json
├── vite.config.js
└── .env.development       # Dev environment variables
```

---

## 🧪 Development

### Available Scripts

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Variables

**`.env.development`**
```bash
VITE_WS_URL=https://dev-ws.minibag.in
VITE_API_URL=https://dev-api.minibag.in
VITE_ENV=development
```

**`.env.production`**
```bash
VITE_WS_URL=https://ws.minibag.in
VITE_API_URL=https://api.minibag.in
VITE_ENV=production
```

---

## 📊 Status

### Completed ✅

**UI (95%):**
- [x] Home screen
- [x] Create session screen
- [x] Session active screen (with avatar circles)
- [x] Shopping screen (with payment modal)
- [x] Payment split screen
- [x] Participant bill screen
- [x] Past runs screen

**Smart Features:**
- [x] Price memory
- [x] Quick re-run
- [x] Searchable history
- [x] Sign-up prompts

**Multilingual:**
- [x] English/Gujarati/Hindi catalog
- [x] WhatsApp messages in all 3 languages

### In Progress 🚧

**Backend (Week 3-4):**
- [ ] WebSocket server (Node.js + Socket.io)
- [ ] Real-time multi-device sync
- [ ] Session CRUD operations
- [ ] Nickname pool management

**Integration (Week 5):**
- [ ] React Router (URL routing)
- [ ] Replace localStorage with WebSocket
- [ ] WhatsApp share (actual integration)
- [ ] Session expiry logic

### Planned ⏳

**Polish (Week 6):**
- [ ] Error handling
- [ ] Loading states
- [ ] Expand catalog (30+ items)
- [ ] 3G performance optimization

**Optional (Post-launch):**
- [ ] Phone authentication
- [ ] Pro subscription
- [ ] Vendor dashboard
- [ ] Analytics

---

## 🎯 Roadmap

### Week 3-4: Backend Integration
- Build WebSocket server
- Test multi-device coordination
- Deploy via Cloudflare Tunnel

### Week 5: Session Sharing
- Add URL routing
- WhatsApp integration
- Session expiry

### Week 6: Launch
- Deploy to production (minibag.in)
- First user pilot (1 neighborhood)
- Collect feedback

### Month 2-6: Scale
- Expand to 3-5 neighborhoods
- Add Pro features
- Vendor partnerships

---

## 🔐 Privacy

### What We Collect
- Nickname (anonymous, auto-generated)
- Items & quantities  
- Payment amounts (for calculations)

### What We DON'T Collect
- ❌ No phone numbers (stored)
- ❌ No email addresses
- ❌ No GPS location
- ❌ No payment card details
- ❌ No device tracking

### Security
- HTTPS everywhere
- No payment processing (app doesn't handle money)
- Sessions auto-expire (2 hours)
- Data deleted after 30 days (free tier)

---

## 💰 Pricing

### Free Tier (Forever)
- 4 participants max
- 10kg bag limit
- 20-minute invite window
- Basic catalog
- localStorage-based

### Pro Tier (₹49/month) - Coming Soon
- Unlimited participants
- Unlimited bag size
- No time limits
- Guaranteed vendor arrival
- Custom items
- Analytics
- Priority support

---

## 📖 Documentation

- **[Product Vision & Roadmap](minibag-dev-doc.md)** - Detailed product docs
- **[Development Setup](../../docs/DEVELOPMENT.md)** - Infrastructure setup
- **[Parent README](../../README.md)** - LocalLoops ecosystem overview
- **[Changelog](../../CHANGELOG.md)** - Version history

---

## 🧪 Testing

### Manual Testing Checklist

**Solo Flow:**
- [ ] Create session
- [ ] Add items
- [ ] Record payments
- [ ] View split (even with 0 participants)
- [ ] Check past runs

**Group Flow:**
- [ ] Create session on Device A
- [ ] Share link
- [ ] Join on Device B
- [ ] Both add items
- [ ] Device A records payments
- [ ] Device B sees bill

**Features:**
- [ ] Price memory shows last price
- [ ] Quick re-run loads previous list
- [ ] Past runs search works
- [ ] Language selector works
- [ ] WhatsApp share generates message

---

## 🐛 Known Issues

**Current (v0.2.0):**
1. **No multi-device sync** - Everything in localStorage
2. **Hardcoded session ID** - Always "abc123"
3. **Limited catalog** - Only 9 items
4. **No error handling** - Happy path only
5. **No loading states** - Instant transitions

**Fix Timeline:**
- Issues 1-2: Week 3-4 (backend)
- Issue 3: Week 6 (catalog expansion)
- Issues 4-5: Week 5 (polish)

---

## 🤝 Contributing

Currently in private development.

**Want to help?**
- **Beta testing:** If you're in Vadodara, DM for early access
- **Translation:** We need Tamil, Telugu, Bengali
- **Feedback:** Use the app, tell us what's broken

---

## 📞 Support

**Questions?**
- Technical: See [DEVELOPMENT.md](../../docs/DEVELOPMENT.md)
- Product: See [minibag-dev-doc.md](minibag-dev-doc.md)
- Bugs: (Issue tracker coming soon)

**Resources:**
- [React Docs](https://react.dev/)
- [Tailwind Docs](https://tailwindcss.com/)
- [Vite Docs](https://vitejs.dev/)

---

## 🎉 Success Criteria

**MVP Success (Week 6):**
- ✅ 10+ sessions completed
- ✅ 40%+ repeat usage rate
- ✅ Vendor confirms coordination value
- ✅ No critical bugs

**Product-Market Fit (Month 6):**
- ✅ 1,500+ monthly active users
- ✅ 60%+ session completion rate
- ✅ 5+ neighborhoods active

---

## 📈 Analytics (Future)

**Key Metrics to Track:**
- Sessions created per week
- Participation rate (% sessions with 2+ people)
- Completion rate (created → shopping → split)
- Repeat usage (weekly active users)
- Solo vs group usage ratio

---

## 🌟 What Makes Minibag Different

**Not a group-buying app:**
- Works solo (just as useful alone)
- No minimum order requirements
- No delivery/logistics
- Host goes to market themselves

**Not a marketplace:**
- No vendor lock-in
- Buy from multiple vendors
- Traditional haggling preserved
- Cash/UPI direct to vendor

**Just coordination:**
- When are you going shopping?
- Want to add items to my list?
- I'll tell you what you owe
- That's it!

---

**Built with ❤️ for Indian neighborhoods**

---

**Last Updated:** October 13, 2025  
**Version:** 0.2.0  
**Launch:** November 2025 (Target)