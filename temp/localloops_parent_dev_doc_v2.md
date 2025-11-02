# LocalLoops Developer Architecture Guide (v2.0)

**Project:** LocalLoops Micro-Coordination Platform  
**Version:** 2.0.0  
**Last Updated:** October 2025  
**Status:** Unified Architecture Document | Replaces Parent Dev Doc v1.1.0

---

## 🎯 Vision & Essence

### **Core Idea**
LocalLoops is not a super-app — it’s a **federated mesh of standalone micro-apps** (Minibag, StreetHawk, Partybag, Fitbag…) powered by an **invisible shared core**. Each app operates independently but learns and evolves collectively through shared layers of intelligence and trust.

### **Philosophy**
> "Digitally enable the ways people already help each other."

LocalLoops doesn’t create new behaviors — it **digitizes existing, trust-based community coordination**: the informal, local acts of cooperation that already happen across Indian neighborhoods.

---

## 🏗️ Ecosystem Overview

```
LocalLoops Platform
├── Shared Core Infrastructure (invisible, brand-silent)
│   ├── Identity Layer
│   ├── Catalog Layer
│   ├── Geo & Locality Layer
│   ├── Event & Telemetry Layer
│   ├── Trust & Reputation Layer
│   ├── Insights & Data Products Layer
│   └── Payments & Settlement Layer
│
├── Product Layer (visible, brand-led)
│   ├── Minibag – Vegetable coordination
│   ├── StreetHawk – Vendor discovery & trust
│   ├── Partybag – Celebration coordination
│   └── Fitbag – Wellness coordination
│
└── Governance & Labs Layer (internal)
    ├── Data ethics, audit, and consent
    ├── Feature configuration service
    └── LocalLoops Labs (metrics, insights)
```

---

## 🧩 The Seven Foundational Shared Layers

| Layer | Purpose | What It Enables | Visibility |
|--------|----------|----------------|-------------|
| **1. Identity Layer** | Manages universal user/vendor IDs, nicknames, trust weights, and OTP auth | Single, persistent understanding of “who” without breaking anonymity | Invisible |
| **2. Catalog Layer** | Unified taxonomy of products/services | Consistent categories, seasonal items, and behavioral tagging | Invisible |
| **3. Geo & Locality Layer** | Maps clusters, vendor routes, and NDS (Neighborhood Density Score) | Predictive vendor routing, neighborhood-based coordination | Invisible |
| **4. Event & Telemetry Layer** | Collects standardized session, purchase, and behavior data | Learning loops across all apps | Invisible |
| **5. Trust & Reputation Layer** | Computes reliability scores and contextual reputation | Powers discovery, prioritization, and eligibility | Partially visible |
| **6. Insights & Data Products Layer** | Aggregates anonymized metrics and builds internal dashboards | Market intelligence and ethical data monetization | Internal-only |
| **7. Payments & Settlement Layer** | Handles wallet, deferred, or group payments (optional) | Vendor settlement, ledger consistency | Invisible |

---

## 🔁 Optional Shared Modules

| Layer | Role | Future Use |
|--------|------|-------------|
| **Notification & Messaging Layer** | Shared message bus for reminders, confirmations, and updates | WhatsApp / Push / SMS under app brand |
| **Translation & Voice Layer** | Shared multilingual dictionary + speech-to-intent | Natural language + voice input for Gujarati/Hindi |
| **Pricing & Trend Engine** | Tracks historical price movement | Seasonal analytics and fairness insights |
| **Micro-Credit / Assurance Layer** | Wraps Trust Layer for pay-later eligibility | Fintech integration and vendor insurance |
| **Governance & Audit Layer** | Tracks data access and consent events | Transparency and accountability |
| **Policy & Config Service** | Dynamic config for feature toggles | Instant threshold tuning without redeploy |

---

## 🧠 Behavioral & UX Foundation

### **Core Behavioral Insight**
Minibag (and by extension, LocalLoops) isn’t e-commerce — it’s **social infrastructure** for informal commerce.

> The user isn’t buying online — they’re coordinating an existing neighborhood habit.

### **Human Patterns Anchoring the Design**
- 88% of Indian informal economy relies on **trust-based exchanges**.
- 25% of informal transactions have **social motives**, not economic.
- WhatsApp commerce thrives because it **mirrors real conversation**, not forms.

### **Design Implications**
| Area | Principle | Implementation |
|-------|------------|----------------|
| **Session Creation** | Should feel like “I’m going to buy vegetables” | One-tap creation → conversational share link |
| **Item Addition** | Voice-first, not catalog-first | “Add 2 kilo pyaaz” → parsed + auto-confirmed |
| **Payment View** | Trust-based framing | “Ravi bought for you ₹125” (rounded, informal) |
| **Vendor View** | Heatmap, not orders | Show clusters: 5 families near Gate 3 |
| **Visual Language** | Familiar, community-first | WhatsApp-like layout, mixed Hindi-English tone |

---

## 💬 Conversational UX Layer

The user interface should mimic the tone and structure of an **annotated chat** .

**UI Flow Example:**
```
1️⃣ “I’m going to Raju Bhaiya’s cart at 5pm.”
2️⃣ “Add items if you need → [Join Link]”
3️⃣ Neighbor adds: “2kg potatoes” → Auto entry
4️⃣ Vendor sees: “6 families near Gate 3, ₹4,500 demand.”
```
**Key:** Friction must be lower than a WhatsApp group baseline.

---

## 🏗️ Technical Stack (Unified)

### **Frontend**
```
React 18+, Vite, Tailwind CSS
Hosting: Vercel
Icons: lucide-react
Date: date-fns
State: React Query (planned)
```

### **Backend**
```
Supabase (PostgreSQL + Auth + Storage)
Auth: Phone OTP via MSG91
Functions: Supabase Edge (Deno)
Realtime: Supabase Channels
Payments: Razorpay (Pro tier)
```

### **Infrastructure**
```
CDN: Vercel Edge Network
Monitoring: Sentry + Vercel Analytics
SMS: MSG91 API
Dev Tunnel: Cloudflare
```

---

## 📊 Data Architecture (Shared Core)

**Tables:** `sessions`, `participants`, `participant_items`, `catalog_items`, `catalog_categories`, `user_patterns`.

Each app (Minibag, StreetHawk, etc.) uses the same base schema — filtered by `session_type`.

```sql
session_type IN ('minibag', 'partybag', 'fitbag', 'streethawk')
```

**Example:** Minibag and StreetHawk both read from `catalog_items`, but with different `applicable_types` filters.

---

## ⚙️ Shared Runtime Architecture

```
┌───────────────────────────────┐
│   LocalLoops Core Services    │
│───────────────────────────────│
│ Identity  | Catalog  | Geo    │
│ Trust     | Events   | Insights│
│ Payments  | Messaging| Config │
└───────────────────────────────┘
             ▲
   SDKs (Auth, Catalog, Events)
             ▲
 ┌──────────┬──────────┬──────────┐
 │ Minibag  │ StreetHawk│ Fitbag  │
 └──────────┴──────────┴──────────┘
```

Each app connects only to the services it needs. The internal event bus connects layers horizontally (e.g., Events → Trust → Insights).

---

## 📈 StreetHawk Integration (Vendor Intelligence)

**Role:** Child app to LocalLoops Core, partner to Minibag.

- **Purpose:** Single source of truth for vendor data, reliability, and participation history.
- **Feeds:** Vendor trust index → visible in Minibag vendor suggestions.
- **Inputs:** Vendor confirmations, arrival times, neighborhood clusters.
- **Outputs:** Demand Heatmaps + Vendor Reliability Dashboard.

**Example Metric:**
```
Gate 3 (Laxmi Apts): 6 families • ₹4,500 total • 5:30pm slot
Vendor: Raju Bhaiya • Reliability: 9.2/10 (13 confirmed visits)
```

---

## 🔒 Governance & Data Ethics

| Aspect | Guideline |
|--------|------------|
| **Isolation by default** | Data partitioned logically per app |
| **Consent inheritance** | Captured once, applied platform-wide |
| **Audit-first design** | All API calls logged via Governance Layer |
| **Config-driven control** | Kill-switch any shared layer per app |
| **Transparency** | Federated aggregation only — never raw data sharing |

---

## 🧭 Build Order (Recommended)

| Phase | Shared Layer | Key Outcome |
|--------|---------------|--------------|
| **Phase 1** | Geo & Locality | Enable NDS and vendor mapping |
| **Phase 2** | Event & Telemetry | Unified event ingestion |
| **Phase 3** | Trust & Reputation | Behavioral reliability signals |
| **Phase 4** | Messaging & Voice | Shared outbound and translation |
| **Phase 5** | Insights Layer | Data Product APIs + Labs |
| **Phase 6** | Payments Layer | Unified ledgering |
| **Phase 7** | Governance Layer | Compliance and observability |

---

## 🚀 Strategic Advantages

| Benefit | Enabled By |
|----------|-------------|
| **Rapid app creation** | Shared SDKs + Catalog + Auth |
| **Localized intelligence** | Geo + Events + Trust |
| **Vendor monetization** | Trust + Payments |
| **Operational resilience** | Config + Audit |
| **Ethical data licensing** | Insights Layer |
| **Multilingual scaling** | Translation + Voice |

---

## 🧩 Summary

LocalLoops Core = Invisible infrastructure for visible impact.

It makes each app — Minibag, StreetHawk, Partybag, Fitbag — **self-sufficient yet interoperable**.  
Its shared layers make the ecosystem agile, ethical, and contextually Indian.

# LocalLoops — Developer Guide - Invisible Core Platform

**Goal:** retire the superficial admin demo and build the *invisible, brand-silent* LocalLoops Core that powers standalone apps (Minibag, StreetHawk, Fitbag, future apps). This guide gives a practical, end-to-end blueprint: architecture, APIs, data models, infra, product/metrics products, privacy rules, rollout plan and a prioritized engineering roadmap.

(Reference: your current admin demo HTML used for concept and KPI layout — we’ll replace it with Core-backed internal consoles and app-scoped dashboards. See the demo file for layout / metric examples. )

---

# 1 — Design principles (rules of the road)

1. **Brand-silent Core:** Core services are headless and invisible to end users. Apps keep distinct UX/branding; Core provides only backend APIs/SDKs.
2. **Federated data model:** Apps own their UX and app-scoped data; Core aggregates anonymized structural signals for analytics & data products.
3. **Privacy first:** No identity-level resale. Monetisation must be on aggregated, non-identifying signals and infrastructure licensing.
4. **Behavioral fidelity:** Catalog, UX hints and APIs reflect real neighborhood behavior (voice aliases, local names, repeat cycles).
5. **Low friction:** Phone-first auth, minimal opt-in exposures, progressive profile enrichments.
6. **Operational simplicity:** Admin tools are internal (LocalLoops Labs) — not exposed to users/apps casually.

---

# 2 — High level architecture

```
 ┌────────────┐     ┌──────────────┐     ┌─────────────┐
 │  Minibag   │     │  StreetHawk  │     │   Fitbag    │  (Apps: unique branding/UI)
 └────┬───────┘     └────┬─────────┘     └────┬────────┘
      │                  │                  │
      └── App SDK/API ───┴─── App SDK/API ──┴─── App SDK/API ──> (scoped tokens)
                       ↑
                 ┌─────┴─────┐
                 │ LocalLoops│  (Core services: headless, invisible)
                 │   Core    │
                 └─────┬─────┘
           ┌──────────┴──────────┐
           │ Identity | Catalog  │
           │ Trust     Geo       │
           │ Analytics | Data-Products │
           └──────────┬──────────┘
                      │
            Internal Admin (LocalLoops Labs) — internal consoles & data product UI
```

**Core components**

* **Identity Service (LLID):** phone OTP auth, universal `user_id` (not exposed), verified flags, roles. Issues app-scoped JWTs.
* **Shared Catalog Service:** canonical items, aliases, seasonality, repeat cycle, per-region variants.
* **Trust & Neighborhood Graph:** trust score, neighbor relationships, vendor affiliations, density indexes.
* **Geo / Clustering service:** neighborhood density score (NDS), demand clusters, vendor zones.
* **Analytics / Data Products engine:** CRI, DSM, LCP, SWI, VNI — aggregated metrics for licensing.
* **API Gateway & App SDKs:** app-scoped RBAC; SDKs for sign-in, catalog search, price memory, session reporting.
* **Internal Admin UIs:** LocalLoops Labs — internal dashboards for partners, product managers and for selling anonymized data products.

---

# 3 — Data model (core tables / contracts)

### Shared `users` (core)

```sql
users (
  id UUID PRIMARY KEY,            -- LL universal id (never shown to user)
  primary_phone text UNIQUE,      -- used for OTP
  display_name text,
  display_name_local jsonb,       -- {en, hi, gu}
  photo_url text,
  user_type text,                 -- 'individual','vendor','community','staff'
  languages text[],
  verified_flags jsonb,           -- { phone: true, vendor: false }
  trust_score int DEFAULT 50,
  created_at timestamptz,
  updated_at timestamptz
)
```

### App-specific `app_profiles`

Each app maintains app-scoped profile (keeps branding/autonomy):

```sql
app_profiles (
  id uuid,
  user_id uuid REFERENCES users(id),
  app_id text,       -- 'minibag', 'streethawk', ...
  app_role jsonb,    -- e.g. {"minibag":"host"}
  preferences jsonb, -- app-only preferences
  created_at...
)
```

### Shared `shared_catalog`

(see earlier draft; simplified)

```sql
shared_catalog (
  id uuid, item_name text,
  item_name_local jsonb,
  category text,
  subcategory text,
  aliases text[],           -- voice/text variants
  unit text,                -- kg, piece
  seasonality text,         -- High/Medium/Low
  repeat_cycle text,        -- Daily/Weekly/Monthly
  is_perishable boolean,
  is_bulk_sensitive boolean,
  ecosystem_fit text[],     -- which app backends use it
  created_at...
)
```

### Neighborhood & vendor

```sql
neighborhoods (id, name, geo_polygon, city, created_at)
vendor_profiles (id, user_id, vendor_type, route_json, availability_windows, created_at)
demand_clusters (id, neighborhood_id, item_ids[], cluster_score, time_window)
```

### Session & Participation (app-shared contract)

Each app writes session events to Core in a minimal schema for aggregation:

```sql
sessions (id, app_id, host_user_id, neighborhood_id, scheduled_time, created_at, metadata jsonb)
participants (id, session_id, user_id, items jsonb, payment_state, created_at)
participant_items (id, participant_id, item_id, quantity, price_paid, price_per_unit, paid_at)
```

**Important:** apps may store full session details in their own DBs, but they must `POST` summaries/events to Core for aggregation (see API below).

---

# 4 — APIs & SDKs (contract, not implementation)

### Authentication

* `POST /core/auth/otp/request` → send OTP (phone)
* `POST /core/auth/otp/verify` → returns Core `user_id` + app-scoped JWT (issued to app only)

  * **Behavior:** Core returns `unexposed` universal `user_id` in token claims *only* for backend use. App UI never shows "LocalLoops".

### Catalog

* `GET /core/catalog/search?q=tomato&locale=hi&app=minibag&neighborhood=...`
  → returns canonical item id, aliases, unit, seasonality, repeat_cycle.
* `POST /core/catalog/sync`
  → app can push newly detected alias or an inferred item (Core approval flow via LocalLoops Labs).

### Sessions / Events (app → core)

* `POST /core/events/session_created` {session_id, app_id, host_user_id (app id), neighborhood_id, scheduled_time, items_summary}
* `POST /core/events/session_completed` {session_id, completion_status, vendor_confirmed, participants_summary}

(Core will accept minimal aggregated payloads — no personal PII beyond user_id pseudonym).

### Trust & Reputation (internal)

* `GET /core/trust/score?neighborhood_id=...&user_segment=...`
* `POST /core/trust/event` (app posts user behavior: host_completed, vendor_confirmed, dispute, late_cancel)

### Data Products (internal only)

* `GET /core/analytics/ndr?neighborhood=...&since=...` (NDS, CRI, DSM)
* `GET /core/market-pulse?category=vegetables&city=...`

**API security model**

* App registers `app_id` & `app_secret`. Each API call carries app JWT (scoped).
* Endpoint rate limits, field-level ACLs (apps only see app-scoped data unless internal admin token).

---

# 5 — Data products & monetisation (what to sell, how to package)

**Principle:** sell *aggregated, anonymized *structural* signals* (no identities)

1. **Local Category Pulse (LCP)** — frequency & velocity by neighborhood and time window. (Buyer: FMCG sales teams)
2. **Neighborhood Density Score (NDS)** — households active per 100m radius (Buyer: logistics, vendor onboarding teams)
3. **Category Recurrence Index (CRI)** — repeat tendency for items at neighborhood level (Buyer: supply chain forecasts)
4. **Vendor Network Intelligence (VNI)** — vendor reliability, response times, cluster service success rates (Buyer: vendor-finance, microloans)
5. **Seasonality & Waste Index (SWI)** — predicted surplus/deficit windows (Buyer: civic, NGO, wholesale markets)

**Delivery modes**

* Dashboard in LocalLoops Labs (internal)
* Scheduled CSV/Parquet exports via secure portal
* API access with tiered quotas
* White-label data feeds (for strategic partners) with strict contract and audit

**Pricing model suggestions**

* Subscription for operational partners (StreetHawk vendors, aggregator dashboards)
* Pay-per-query / data-feed for FMCG/NGO partners (per city / per dataset)
* Plugin: “vendor onboarding pack” (one-time) — access to local NDS & VNI for deployment planning

---

# 6 — Privacy & compliance

1. **No identity resale:** Never sell PII. Data products must be aggregated to an anonymity threshold (k-anonymity; e.g., >8 households per cluster).
2. **Opt-in for richer signals:** If an app wants to share more granular telemetry, explicit user opt-in required and recorded.
3. **Data retention policy:** Keep minimum identity-level logs only as required (e.g., 90 days room for dispute resolution), aggregated signals longer.
4. **Logging & audit:** All data product extractions logged; admin access monitored.
5. **Legal:** Prepare DPA & Privacy policy templates that pledge non-identifying, aggregated sales; compliance per India data laws and best practices (consent, opt-out).

---

# 7 — Replacing the demo dashboard — internal admin UX strategy

Your HTML demo (metrics, charts, insights) is a good layout for **internal** product KPI dashboards — but:

* Replace it with two distinct UIs:

  1. **LocalLoops Labs (internal)** — for product, ops, and data licensing teams. Shows anonymized cross-app aggregated metrics, data product builder and sell interface.
  2. **App Admins (scoped)** — each app retains its own admin dashboard for brand-level operations (Minibag admin, StreetHawk admin) that show only app data plus *sanitized Core insights* (e.g., NDS for their city).

**Key internals to include (mirroring demo but with Core signals):**

* Platform overview: aggregated active households, revenue from data products, vendor network coverage (NDS).
* Product performance: per-app active users, sessions/week (but only app-level).
* Cross-app behavior: anonymized overlap % and conversion funnels (shown as aggregated signals).
* Geo clusters: NDS map & suggested vendor deployment heatmaps.
* Data products sales & consumption (who has access, quota, revenue).

---


# 8 — Tech stack recommendations (practical)

* **Core DB:** PostgreSQL (logical), hosted on Supabase or managed Postgres (good for auth + realtime). Use Postgres + Timescale for temporal analytics if needed.
* **Auth:** Supabase Auth or Auth0 (phone OTP) for fast shipping; issue app-scoped JWTs.
* **API layer:** Node/TypeScript (NestJS or Fastify) or Go; GraphQL optional for internal analytics explorer.
* **Analytics / Data pipeline:** Airflow / Prefect for ETL, or serverless functions for lightweight. Store aggregates in materialized views.
* **Vectorization / ML:** Python microservices for predictions (DSM, seasonality).
* **Storage:** S3 (Parquet exports) for data product deliveries.
* **Internal dashboard:** React + Tailwind (Vercel), reuse patterns from your HTML demo but with authentication and ACL.
* **App SDKs:** lightweight JS/TS SDK + Android/iOS wrappers for token management and catalog lookups.
* **Observability:** Prometheus + Grafana, Sentry, Log aggregation (ELK).
* **CI/CD:** GitHub Actions → Vercel for frontends; Terraform for infra.
* **Dev tunnels:** Cloudflared (as in your dev docs) for local testing.

---

# 9 — Metrics & instrumentation (how to measure success)

**Platform KPIs (internal)**

* NDS coverage % (neighborhoods with sufficient density)
* CRI accuracy (prediction vs realized repeat)
* Data Product Revenue (MRR)
* Data Product retention (churn)
* Time-to-onboard vendor in NDS zones
* Trust propagation impact (improvement in completion rates where trust used)

**App KPIs (per app; app-owned)**

* MAU, Sessions/week, Session completion (vendor confirmed), Guest→signup conversion
* Price memory usage, quick re-run adoption
* App retention (30/90 day)
* App revenue (Pro subscriptions) — apps own this

**Data product KPIs (Core)**

* Number of paying partners
* Queries / API usage per partner
* Avg revenue per city
* Anonymity threshold breach incidents (should be zero)

**Instrumentation guidelines**

* Event taxonomy: define canonical event types and fields (session_created, session_completed, vendor_confirm, price_recorded, trust_event).
* Use schema registry for event shapes.
* Enforce app tokens and field-level validation at API gateway.

---

# 10 — Security & access control

* **App tokens + RBAC** — each app gets `app_id`, `app_secret`, and scoped JWT with `app_id` claim; Core enforces access policy: apps can only access `app_profiles` for that app or aggregated signals.
* **Admin roles:** LocalLoops Labs users: `data_admin`, `product_admin`, `sales` — field-level access control.
* **Encryption:** TLS everywhere; at-rest encryption for DB and buckets.
* **Audit logs:** Admin actions & data product exports logged for compliance.
* **Pen tests & vulnerability scanning** before public data product release.

---


# 12 — Example developer API call flows

**1) Minibag creates a session**

* App: `POST /core/events/session_created` with `{ session_id, app_id: "minibag", host_user_token, neighborhood_id, items_summary }`
* Core: validates app token, records event, increments NDS counts for neighborhood/time window.

**2) Session completion**

* App: `POST /core/events/session_completed` with `{ session_id, vendor_confirmed: true/false, participants_summary }`
* Core: updates aggregated metrics (completion_rate per NDS cluster) and trust events.

**3) Partner requests NDS**

* Partner (paid) calls `GET /core/analytics/nds?city=Vadodara&period=30d`
* Core applies priv rules, returns aggregated NDS data (no PII).

---

You already have the **two foundational shared layers** —
✅ **Shared Catalog** (what is traded)
✅ **Core Identity Layer** (who interacts)

and you’ve redefined them brilliantly as *invisible*, brand-silent infrastructure.

To make the ecosystem **agile yet robust**, there are several more layers that can quietly sit beneath the apps, improving scalability, consistency, and cross-domain learning — without ever showing themselves to end users.

Let’s map them out systematically 👇

---

# 🧩 The 7 Foundational Shared Layers of LocalLoops Core

| Layer                                         | Purpose                                                                                       | What It Enables                                                                       | Visibility                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------ |
| **1. Identity Layer**                         | Manages universal user/vendor IDs, roles, trust, and phone-based authentication               | Single, consistent understanding of “who” without breaking app identity               | Invisible                                        |
| **2. Catalog Layer**                          | Manages all products, categories, seasonality, and aliases                                    | Shared taxonomy, behavioral tagging, cross-app insights                               | Invisible                                        |
| **3. Geo & Locality Layer**                   | Maps neighborhoods, vendor routes, cluster boundaries, and NDS (Neighborhood Density Score)   | Demand prediction, vendor discovery, and logistics overlays                           | Invisible                                        |
| **4. Event & Telemetry Layer**                | Collects behavioral data from all apps (sessions, purchases, attendance) in a standard schema | Aggregation, learning, and metric consistency                                         | Invisible                                        |
| **5. Trust & Reputation Layer**               | Computes trust scores, reliability indices, and contextual badges                             | Improves UX (sorting, recommendations), powers financial eligibility, vendor matching | Partially visible (as trust hints)               |
| **6. Insights & Data Products Layer**         | Aggregates and packages anonymized metrics for internal and external stakeholders             | Data monetization, market intelligence, ecosystem health metrics                      | Internal-visible only                            |
| **7. Payments & Settlement Layer (Optional)** | Unified wallet or accounting microservice for informal, deferred, or group payments           | Consistent vendor ledgering, cross-app reconciliation, minimal friction               | Invisible to users (white-label under app brand) |

---

# 🧱 Supporting / Optional Shared Modules

These can be introduced gradually once the above 7 are stable:

| Layer                              | Role                                                                                | Future Use                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Notification & Messaging Layer** | Unified message bus for reminders, vendor confirmations, and event updates          | Reusable templates and rate-limiting; supports WhatsApp/Push/SMS under each app’s branding                |
| **Translation & Voice Layer**      | Maintains shared multilingual dictionary and speech-to-intent aliases               | Improves voice input accuracy and text normalization for Gujarati/Hindi users                             |
| **Pricing & Trend Engine**         | Stores historical price movement and “price memory” by locality                     | Enables price predictions, fairness checks, and seasonal trend analytics                                  |
| **Micro-Credit / Assurance Layer** | Wraps around Trust Layer to compute eligibility for “pay-later” or “float” features | Potential partnership with fintechs, StreetHawk vendor insurance                                          |
| **Governance & Audit Layer**       | Logs cross-app events, consent records, and data product accesses                   | Compliance, transparency, and internal trustworthiness                                                    |
| **Policy & Configuration Service** | Holds dynamic config for feature toggles, thresholds, and rate limits               | Allows instant tuning of trust weights, anonymity thresholds, or metric cut-offs without redeploying apps |

---

# 🔗 How They Work Together

### Core Runtime Stack

```
        ┌───────────────────────────────┐
        │   LocalLoops Core Services    │
        │───────────────────────────────│
        │ Identity  | Catalog  | Geo    │
        │ Trust     | Events   | Insights│
        │ Payments  | Messaging| Config │
        └───────────────────────────────┘
                     ▲
          App SDKs (Auth, Catalog, Events, Price)
                     ▲
      ┌──────────┬──────────┬──────────┬──────────┐
      │ Minibag  │ StreetHawk│ Fitbag   │ Future… │
      └──────────┴──────────┴──────────┴──────────┘
```

* Each app plugs into only what it needs.
* Core services are modular; a new app can use just two (e.g., Auth + Catalog) and ignore the rest.
* Internal APIs and data pipelines glue layers horizontally (e.g., Events feed into Trust, Trust feeds into Payments eligibility).

---

# ⚙️ Example Use-Cases

| Shared Layer        | Example Feature in Apps                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| **Geo Layer**       | StreetHawk auto-suggests vendors within 300 m radius of a Minibag host             |
| **Trust Layer**     | A reliable vendor is prioritized in “Find me a vendor” searches                    |
| **Event Layer**     | Fitbag tracks meal plans, feeding “Consistency Score” back into Trust              |
| **Catalog Layer**   | Minibag and StreetHawk refer to same “Tomato” item ID despite language differences |
| **Payments Layer**  | Optional “settle later” feature across Minibag sessions, tracked in unified ledger |
| **Messaging Layer** | Reminder pings and “Delivery window starting” alerts, consistent throttling        |
| **Insights Layer**  | Generates NDS/CRI dashboards, fueling LocalLoops Labs analytics                    |

---

# 🔐 Governance Model

| Aspect                   | Guideline                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Isolation by default** | Each app’s data partitioned logically; shared only at anonymized layer                                        |
| **Consent inheritance**  | Consent captured once at app level but standardized schema for Core                                           |
| **Audit-first design**   | Every export, API call, and admin action logged in Governance Layer                                           |
| **Kill-switch ready**    | Any shared service can be disabled per app without downtime                                                   |
| **Config-driven**        | Use the Configuration Service to tune anonymity thresholds, trust weights, or price-volatility caps centrally |

---

# 🧠 Strategic Advantages

| Benefit                       | Enabled By                                |
| ----------------------------- | ----------------------------------------- |
| **Rapid new app creation**    | Common SDKs + Catalog + Auth              |
| **Localized intelligence**    | Geo + Events + Catalog                    |
| **Vendor trust monetisation** | Trust + Payments                          |
| **Operational resilience**    | Config + Audit + Messaging                |
| **Ethical data licensing**    | Insights Layer with federated aggregation |
| **Multilingual scaling**      | Translation Layer                         |

---

# 🗺️ Suggested Build Order (Post-Core MVP)

| Phase       | New Shared Layer      | Purpose                                        |
| ----------- | --------------------- | ---------------------------------------------- |
| **Phase 1** | Geo & Locality        | Enables NDS, vendor mapping, cluster logic     |
| **Phase 2** | Event & Telemetry     | Standardize session/purchase event ingestion   |
| **Phase 3** | Trust & Reputation    | Start using behavioral signals for reliability |
| **Phase 4** | Notifications & Voice | Shared outbound queue + translation dictionary |
| **Phase 5** | Insights Layer        | Build Data Product APIs + Labs dashboards      |
| **Phase 6** | Payments / Settlement | Optional financial backbone once trust stable  |
| **Phase 7** | Governance & Config   | Harden compliance and internal observability   |

---

# 🧩 Summary

> LocalLoops is not a super-app.
> It’s a **federated mesh of standalone apps**, quietly powered by a **modular invisible core**.

The shared infrastructure stack — Identity, Catalog, Geo, Events, Trust, Insights, and Messaging — gives you:

* **Agility** to launch or pivot apps quickly.
* **Robustness** through shared standards and telemetry.
* **Monetisation** through anonymized, structural data products.
* **Privacy & brand autonomy** through complete UI and data isolation.

---
# 🧭 LocalLoops Shared Catalog Framework

**Version:** 1.0
**Last Updated:** October 2025
**Applies to:** LocalLoops, Minibag, StreetHawk, Fitbag, and future child apps

---

## 1. 🎯 Purpose

The **LocalLoops Shared Catalog (LL-Catalog)** is a central repository of products, categories, and tags that power all apps within the LocalLoops ecosystem.

It ensures:

* **Consistency:** Shared data definitions across Minibag, StreetHawk, Fitbag, etc.
* **Relevance:** Products reflect *real neighborhood buying behavior*, not e-commerce abstraction.
* **Scalability:** New apps (e.g., HomeCook, CommunityCart) can plug into the same taxonomy.
* **Discoverability:** Enables LocalLoops to map cultural, seasonal, and behavioral patterns across India.

---

## 2. 🏗️ Catalog Structure

Each item in the catalog is defined by six core dimensions:

| Field           | Description                            | Example                                  |
| --------------- | -------------------------------------- | ---------------------------------------- |
| `item_name`     | Human-readable name                    | “Tomatoes”                               |
| `category`      | Logical group                          | “Vegetables”                             |
| `subcategory`   | Optional refinement                    | “Leafy / Root / Fruit Vegetables”        |
| `seasonality`   | Seasonal pattern (High / Medium / Low) | “High (Nov–Feb)”                         |
| `repeat_cycle`  | Average household frequency            | “Weekly”                                 |
| `unit`          | Standard unit for aggregation          | “kg”, “litre”, “packet”, “piece”         |
| `aliases`       | Local spellings & voice input variants | “tamatar”, “tameta”, “tomato”            |
| `behavior_tag`  | Label for social buying behavior       | “common-share”, “occasional”, “solo-use” |
| `ecosystem_fit` | Which apps use it                      | “Minibag, StreetHawk”                    |

---

## 3. 🧩 Category Architecture

### A. **Core Household Categories (High Fit)**

Repeat, low-barrier, socially shareable, hyperlocal delivery friendly.
Used by: Minibag, StreetHawk, Fitbag (Phase 2)

| Category                  | Sub-Examples                             | Repeat Cycle       | Ecosystem Use            |
| ------------------------- | ---------------------------------------- | ------------------ | ------------------------ |
| **Vegetables & Fruits**   | Potatoes, Onions, Tomatoes, Methi, Mango | Weekly             | ✅ Minibag / ✅ StreetHawk |
| **Groceries & Staples**   | Atta, Rice, Dal, Oil, Salt, Sugar        | Monthly            | ✅ Minibag / ✅ StreetHawk |
| **Dairy & Bakery**        | Milk, Paneer, Bread, Eggs                | Daily–Weekly       | ✅ Minibag / ✅ Fitbag     |
| **Home Essentials**       | Detergent, Soap, Agarbatti, Candles      | Monthly            | ✅ StreetHawk             |
| **Water & Beverages**     | Water cans, Soda, Tea, Coffee            | Weekly–Fortnightly | ✅ StreetHawk / ⚙️ Fitbag |
| **Flowers & Puja Items**  | Garland, Diya, Camphor                   | Seasonal           | ✅ StreetHawk             |
| **Snacks & Ready-to-Eat** | Farsan, Khakhra, Sev, Papad              | Occasional         | ✅ Minibag / ⚙️ Fitbag    |

---

### B. **Lifestyle & Community Categories (Medium Fit)**

Culturally relevant, moderate repeat rate, optional for StreetHawk.

| Category                        | Sub-Examples                      | Frequency | Use                    |
| ------------------------------- | --------------------------------- | --------- | ---------------------- |
| **Tiffin & Home Cooked Meals**  | Local dabbas, homemade food       | Daily     | ✅ Fitbag / ⚙️ Minibag  |
| **Health & Wellness**           | Ayurvedic tonics, protein powders | Monthly   | ⚙️ Fitbag              |
| **Festive & Seasonal Specials** | Sweets, Rangoli, Diyas            | Seasonal  | ✅ StreetHawk (pop-ups) |
| **Cleaning & Refill Services**  | Gas refill, ironing, car wash     | Variable  | ⚙️ StreetHawk          |

---

### C. **Excluded / Low-Fit Categories**

Not suitable for LocalLoops ecosystem (wrong buying pattern, brand-centric, low repeatability).

| Category                             | Reason for Exclusion                                  |
| ------------------------------------ | ----------------------------------------------------- |
| **Electronics / Mobile Accessories** | One-time purchase, non-local                          |
| **Fashion / Apparel**                | High choice complexity, brand variance                |
| **Luxury Packaged FMCG**             | Price-driven, better suited for e-commerce            |
| **Pharma / OTC Drugs**               | Legal compliance required                             |
| **Books / Stationery / Gifts**       | Irregular, individual use                             |
| **Restaurant Deliveries**            | Fulfilled by third-party apps, not neighborhood loops |

---

## 4. 🛠️ Data Standards

| Field               | Type                               | Required | Notes                           |
| ------------------- | ---------------------------------- | -------- | ------------------------------- |
| `item_id`           | UUID                               | ✅        | Shared across ecosystem         |
| `item_name_local`   | Text (multi-language)              | ✅        | For Gujarati/Hindi/English UIs  |
| `voice_aliases`     | Array                              | ⚙️       | For speech-to-text              |
| `vendor_tag`        | Enum (“Cart”, “Kirana”, “Service”) | ✅        | Used by StreetHawk              |
| `price_range`       | Min–Max                            | ⚙️       | Optional for Minibag trends     |
| `seasonality_tag`   | Enum                               | ✅        | “High”, “Medium”, “Low”         |
| `is_perishable`     | Boolean                            | ✅        | Affects vendor scheduling       |
| `is_bulk_sensitive` | Boolean                            | ✅        | Helps Minibag aggregation logic |

---

## 5. 🔄 Ecosystem Integration

| Layer                    | Function                  | Uses Catalog For                                                |
| ------------------------ | ------------------------- | --------------------------------------------------------------- |
| **Minibag**              | Consumer-facing app       | Item suggestions, price memory, quick re-run                    |
| **StreetHawk**           | Vendor coordination layer | Inventory tagging, demand clustering, route planning            |
| **LocalLoops Core**      | Governance + Insights     | Category-level metrics, vendor–buyer mapping, seasonal analysis |
| **Fitbag / Future Apps** | Specialized verticals     | Select categories with “health”, “routine” tags                 |

---

## 6. 🌱 Eligibility Matrix

| Criterion                | High Fit                | Medium Fit | Low Fit           |
| ------------------------ | ----------------------- | ---------- | ----------------- |
| **Repeat frequency**     | Weekly–Monthly          | Quarterly  | Rare              |
| **Local supply**         | Available within 2 km   | Semi-local | Requires shipping |
| **Bulk benefit**         | Shared transport / rate | Low        | None              |
| **Storage life**         | < 30 days               | 30–90 days | > 90 days         |
| **Cultural association** | Everyday / seasonal     | Occasional | None              |
| **Vendor type**          | Cart, Kirana, Service   | Franchise  | Brand-only        |

---

## 7. 🧮 Catalog Maintenance & Governance

| Process                 | Description                                           | Frequency                   |
| ----------------------- | ----------------------------------------------------- | --------------------------- |
| **Data updates**        | Add or merge items, update aliases, correct spellings | Weekly                      |
| **Seasonality tagging** | Adjust availability window per region                 | Quarterly                   |
| **Vendor alignment**    | Map vendors to catalog categories                     | Continuous (via StreetHawk) |
| **App sync**            | API-level sync between LL-Core and app catalogs       | Real-time                   |
| **Audit log**           | Record who edited what                                | Auto-managed                |

---

## 8. 📦 Technical Setup (Simplified Schema)

```sql
CREATE TABLE shared_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT NOT NULL,
  item_name_local JSONB, -- { "en": "Tomatoes", "hi": "टमाटर", "gu": "ટમેટાં" }
  category TEXT NOT NULL,
  subcategory TEXT,
  seasonality TEXT CHECK (seasonality IN ('High', 'Medium', 'Low')),
  repeat_cycle TEXT CHECK (repeat_cycle IN ('Daily','Weekly','Monthly')),
  unit TEXT,
  behavior_tag TEXT,
  is_perishable BOOLEAN DEFAULT true,
  is_bulk_sensitive BOOLEAN DEFAULT true,
  vendor_tag TEXT,
  ecosystem_fit TEXT[],
  aliases TEXT[],
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

---

## 9. 🔗 Example Catalog Entries

| item_name      | category   | repeat_cycle | ecosystem_fit             | vendor_tag      |
| -------------- | ---------- | ------------ | ------------------------- | --------------- |
| Tomatoes       | Vegetables | Weekly       | ["Minibag", "StreetHawk"] | Cart            |
| Rice           | Staples    | Monthly      | ["Minibag", "StreetHawk"] | Kirana          |
| Milk           | Dairy      | Daily        | ["Minibag", "Fitbag"]     | Delivery        |
| Diyas          | Festive    | Seasonal     | ["StreetHawk"]            | Seasonal Vendor |
| Protein Powder | Wellness   | Monthly      | ["Fitbag"]                | Retail          |

---

## 10. 🚀 Future Expansion

Planned extensions to LL-Catalog:

* **Cultural Context Layer:** e.g., “Navratri Fasting Items”, “Monsoon Greens”
* **Regional Variants:** same item, different name or price norms per state
* **Sustainability Tagging:** “plastic-free”, “local-origin”
* **Vendor Ratings (Internal Only):** for data quality, not public reviews
* **API Registry:** `/api/catalog/:category` for app consumption

---

## 11. ✅ Governance Principles

1. **Single Source of Truth** — No app maintains a private catalog copy.
2. **Low Entry Threshold** — Vendors can operate with partial catalog match.
3. **Continuous Localization** — Always support multilingual and voice-first input.
4. **Behavioral Fidelity > Taxonomic Precision** — Mirror real usage (“tamatar” = “tomato”).
5. **Seasonal Fluidity** — Let categories evolve regionally.

---
## 🧱 How the Shared Identity Works Without Ecosystem Leakage

| Aspect             | End-User Experience                                                                        | Under-the-Hood Logic                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| **Signup/Login**   | Each app has its own branded login flow (colors, text, UI).                                | Core Identity Layer issues a universal `user_id` silently.                                |
| **Data Ownership** | User thinks data lives in that app.                                                        | Core securely stores user metadata and roles in shared DB.                                |
| **Cross-App Use**  | If the same user later installs another app, they sign in independently (not auto-linked). | Core silently recognizes returning `user_id` and merges trust graph, but doesn’t show it. |
| **Brand Privacy**  | User never sees “LocalLoops” or cross-app hints.                                           | Only backend analytics know the overlap.                                                  |

So:

> Apps don’t share users — **they share the same user backbone.**

---

## 🔒 User Management Reimagined (for Standalone Apps)

### 1. Invisible Common Identity

* Every app registers its users independently, but the **Core assigns a universal `user_id`** in the backend.
* This allows shared trust, behavior insights, and address mapping **without cross-brand exposure**.

### 2. Context-Specific Roles

Each app maintains **its own role dictionary**.
Example:

```json
{
  "app": "minibag",
  "roles": ["host", "participant"]
}
```

No need to expose that a user has any role in another app (e.g., StreetHawk vendor).

### 3. Decoupled Branding

* Minibag users see “Minibag Community”.
* StreetHawk vendors see “StreetHawk Network”.
* Both actually operate on **shared backend tables**:

  * `users`
  * `addresses`
  * `catalog_items`
  * `trust_scores`

Each app queries with scoped filters and branding tokens.

---

## 🧩 Core Identity Layer (Revised Overview)

| Function                         | Shared | Visible to User                          |
| -------------------------------- | ------ | ---------------------------------------- |
| Universal user_id                | ✅      | ❌                                        |
| Phone/email verification         | ✅      | ✅ (app-branded UI)                       |
| Local address map                | ✅      | ✅ (custom UI per app)                    |
| Trust & reliability score        | ✅      | ❌ (used indirectly for sorting, routing) |
| Role mapping                     | ✅      | ❌ (scoped to each app)                   |
| Profile data (name, lang, photo) | ✅      | ✅                                        |
| App preferences                  | ❌      | ✅ (unique to app)                        |

---

## 🧭 Implementation Summary

| Layer                        | Description                                                                            | Example                                            |
| ---------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **LocalLoops Core**          | Backend microservice cluster that handles identity, catalog, trust, and locality APIs. | `/core/identity`, `/core/catalog`, `/core/geo`     |
| **App Identity Layer (SDK)** | Lightweight library per app for login, fetch, and role sync.                           | MinibagAuthSDK, StreetHawkAuthSDK                  |
| **Data Access Model**        | Scoped API tokens so each app only sees its own subset of user data.                   | Role-based access via `app_id` key                 |
| **Analytics Layer**          | Combines anonymized cross-app insights for ecosystem learnings.                        | “Active vendor density” or “household repeat rate” |

---

## 🎨 Brand Autonomy, Core Harmony

| Area                 | Owned by App    | Shared by Core                  |
| -------------------- | --------------- | ------------------------------- |
| Branding, UI, copy   | ✅               | ❌                               |
| User onboarding flow | ✅               | ✅ (uses Core API in background) |
| Data storage         | ✅ (frontend)    | ✅ (backend sync)                |
| Identity token       | ✅ (app-branded) | ✅ (Core-valid)                  |
| Analytics / insights | ✅ (local)       | ✅ (anonymized aggregate)        |

---

## 🚀 Why This Architecture Works for You

✅ **Independent branding & UX** — each app can grow its own audience.
✅ **Shared intelligence** — Core sees pattern-level data across apps.
✅ **Plug-and-play new products** — any new app can onboard users via the same invisible service.
✅ **Silent continuity** — same person, different apps, unified data quality.
✅ **Future monetization flexibility** — Core can power vendor-side or locality insights without breaking brand walls.

---
Suggested Tech Stack alternatives for performance and scalability

| **Language**                 | **Strengths (for LocalLoops)**                                             | **Resource Utilisation**                  | **Scalability Fit**                                          | **Integration Ease**                              | **Best Used For**                                             | **Key Trade-offs**                                                   |
| ---------------------------- | -------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Kotlin (Baseline)**        | Strong Android native integration; modern syntax; interoperable with Java. | Moderate (JVM overhead).                  | Good (JVM threading + coroutines).                           | High for Android; medium for Supabase APIs.       | Vendor mobile apps, shared multiplatform code.                | Higher runtime memory; slower cold start; less ideal for serverless. |
| **Go (Golang)** 🏆           | Designed for concurrency; low memory footprint; minimal runtime.           | **Excellent** (lightweight threads).      | **Excellent** (tens of thousands of concurrent connections). | ✅ Works easily with Supabase via REST/WebSocket.  | Event brokers, micro-APIs, Streethawk backend services.       | Simpler syntax (less expressive); less ideal for Android.            |
| **Rust** ⚡                   | Memory-safe, no GC, near-C performance; predictable runtime cost.          | **Outstanding** (zero-cost abstractions). | **High** (async runtime scales well).                        | API integration possible; mobile binding via FFI. | High-load vendor data sync, offline processors, edge workers. | Steep learning curve; slower iteration.                              |
| **Elixir (BEAM VM)**         | Fault-tolerant concurrency (Erlang heritage); ideal for real-time systems. | Very good (lightweight processes).        | **Excellent** (millions of lightweight threads).             | Easy REST/GraphQL integration; WebSocket-ready.   | Minibag’s real-time session hub, chat-like coordination.      | Less mobile-friendly; smaller hiring pool.                           |
| **Nim**                      | Compiles to C; fast and memory-efficient; Python-like syntax.              | **Excellent** (C-level performance).      | High (depends on async model).                               | Moderate (HTTP libs available).                   | Vendor app micro-core, embedded clients.                      | Niche ecosystem; smaller community.                                  |
| **Zig**                      | Designed for safety and performance; replaces C in many contexts.          | **Outstanding** (manual control).         | Moderate (still evolving async story).                       | Low (manual integration).                         | Edge devices, minimal vendor-side runtime.                    | Low-level; limited ecosystem.                                        |
| **Scala**                    | JVM-based; strong FP & concurrency; proven at scale.                       | Good (same JVM cost as Kotlin).           | **Excellent** (Akka, Spark heritage).                        | Easy if already in JVM stack.                     | Large-scale analytics or data flow systems.                   | Complex syntax; slower team onboarding.                              |
| **Deno / Bun (JS runtimes)** | Ultra-fast modern JS runtimes; built for edge/serverless.                  | **Very good** (micro-VMs).                | **High** (instant cold starts).                              | Native for your Vercel + Supabase stack.          | Extending your React frontend with edge logic.                | JS type safety weaker than Kotlin/Rust.                              |

🔍 Summary for LocalLoops Architecture
| **Use Case**                                                                   | **Best Language Choice** | **Why**                                                                 |
| ------------------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------- |
| **Backend microservices (real-time session broker, vendor clustering engine)** | **Go or Elixir**         | Concurrency, fault-tolerance, and low memory usage per connection.      |
| **Offline vendor client or low-power device agent**                            | **Rust or Nim**          | Predictable performance, minimal footprint, safe memory usage.          |
| **High-density analytics or route optimization service**                       | **Scala or Go**          | Strong parallel computation, battle-tested libraries.                   |
| **Edge functions or lightweight APIs (serverless)**                            | **Deno / Bun**           | Instant cold starts, native JS environment fits Supabase/Vercel easily. |
| **Native Android vendor app**                                                  | **Kotlin**               | Tight OS integration, existing Android toolchain support.               |

🧩 Suggested Hybrid Stack Evolution
| **Layer**                             | **Short-Term (MVP)**         | **Mid-Term (Scale)**                                | **Rationale**                                    |
| ------------------------------------- | ---------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| **Frontend (User, Vendor)**           | React + Vite + Supabase Auth | Add PWA Offline + Android (Kotlin)                  | Low-friction MVP, extend to native later.        |
| **Core Coordination Engine**          | Supabase Edge Functions (JS) | Replace with Go microservice (via Cloud Run/Fly.io) | Go gives better concurrency for session traffic. |
| **Data Processing / Vendor Heatmaps** | Supabase SQL Functions       | Rust worker or Elixir pipeline                      | Efficient computation at city-level data scale.  |
| **Notifications / Messaging**         | Supabase Realtime (Postgres) | Elixir Phoenix Channels                             | Native real-time performance at lower cost.      |
| **Infrastructure**                    | Vercel + Supabase            | Multi-runtime hybrid (Vercel Edge + Go APIs)        | Combine agility with scale.                      |

---
