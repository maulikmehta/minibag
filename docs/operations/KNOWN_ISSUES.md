# Known Issues & Technical Debt
**Project:** LocalLoops
**Last Updated:** October 25, 2025

---

## 🚨 Critical Business Logic Issues

### 1. Revenue Calculation is Incorrect ⚠️
**Priority:** HIGH
**Discovered:** October 25, 2025
**Status:** Documented, not yet fixed

**Problem:**
The analytics API currently calculates "revenue" from the `payments` table. This is **fundamentally wrong**.

**What payments table actually tracks:**
- Grocery/shopping payments between users
- Host paying vendors
- Participants reimbursing hosts
- This is peer-to-peer money flow, **NOT LocalLoops revenue**

**What actual LocalLoops revenue is:**
- Minibag Pro subscriptions (₹490/month)
- Partybag Pro subscriptions
- Fitbag Pro subscriptions
- Monthly Recurring Revenue (MRR) from paying users

**Current Impact:**
- Admin dashboard shows ₹200 "revenue" from test grocery payments
- This misleads about actual business performance
- Real MRR = ₹0 (no subscriptions implemented yet)

**What Needs to Be Fixed:**

1. **Create subscriptions table:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  product_type TEXT NOT NULL, -- 'minibag', 'partybag', 'fitbag'
  plan TEXT NOT NULL, -- 'pro', 'free'
  amount DECIMAL NOT NULL, -- ₹490
  status TEXT NOT NULL, -- 'active', 'cancelled', 'expired'
  billing_cycle TEXT, -- 'monthly', 'yearly'
  started_at TIMESTAMPTZ NOT NULL,
  next_billing_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

2. **Update analytics API** (`packages/shared/api/analytics.js`):
```javascript
// Change getRevenueAnalytics() to query subscriptions table
const { data: subscriptions } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('status', 'active');

const totalRevenue = subscriptions.reduce((sum, s) => sum + s.amount, 0);
```

3. **Keep payments table for different metrics:**
   - Transaction volume (how much money flows through platform)
   - Session completion indicators
   - User engagement
   - BUT NOT revenue

**Files to Update:**
- `database/006_add_subscriptions_table.sql` (new migration)
- `packages/shared/api/analytics.js` (revenue calculation)
- `packages/minibag/src/AdminDashboard.jsx` (label as "MRR" not "Revenue")

**Estimated Fix Time:** 30 minutes

---

## 📋 Other Known Issues

### 2. No Pro Subscription Implementation
**Priority:** MEDIUM
**Status:** Feature not built yet

Currently there's no way for users to actually subscribe to Pro plans:
- No payment gateway integration (Razorpay/Stripe)
- No Pro features unlocked in UI
- No subscription management UI
- No billing system

**Required for production:**
- Payment gateway setup
- Subscription flow in frontend
- Pro feature gating
- Billing management

---

### 3. Admin Dashboard Has Demo Data in Charts
**Priority:** LOW
**Status:** Partial implementation

Only the top 4 metric cards show real data. The rest of the dashboard still has hardcoded values:
- Weekly trends chart (static data)
- Product comparison table (demo numbers)
- Geographic distribution (hardcoded cities)
- Vendor metrics (placeholder data)

**Fix:** Connect remaining sections to analytics APIs once more data is available.

---

### 4. No Authentication on Admin Dashboard
**Priority:** MEDIUM
**Status:** Security gap

Analytics endpoints at `/api/analytics/*` are completely public:
- Anyone can access sensitive business metrics
- No login required
- No role-based access control

**Required for production:**
- Admin authentication
- Protected routes
- Role-based permissions

---

## 🧪 Test Data Clarification

**Current Database State:**
- 19 sessions - **test data from development**
- 19 participants - **test users**
- ₹200 in payments - **test grocery payments**
- 0 real users
- 0 real subscriptions
- 0 actual revenue

The analytics system **works correctly** and pulls real-time data from Supabase, but the database contains development/test data, not production user activity.

---

## 📝 Technical Debt

### Minor Issues
1. **No historical trends** - Only current snapshot, no week-over-week comparison
2. **No caching** - Every dashboard refresh hits database
3. **Completion rate always 0%** - Sessions never marked as "completed" in current flow
4. **Session expiry not enforced** - Old sessions stay "active" forever

---

## ✅ Recently Fixed Issues

- ✅ Payment recording (fixed Oct 25)
- ✅ WhatsApp emoji rendering (fixed Oct 25)
- ✅ UI terminology "run" → "shopping" (fixed Oct 25)
- ✅ Missing payments table (fixed Oct 25)

---

## 🎯 Recommended Fix Priority

**Before Launch:**
1. Fix revenue calculation (subscriptions table)
2. Add admin authentication
3. Implement Pro subscription flow
4. Add payment gateway

**Post-Launch:**
1. Complete dashboard with real data
2. Add historical trends
3. Implement caching
4. Session lifecycle management

---

**End of Known Issues Document**
