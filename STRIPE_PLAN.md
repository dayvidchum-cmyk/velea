# STRIPE PLAN — billing, tiers, and the Time Gate

*Blessed 2026-07-16 ("ok. plan it with stripe" … "and right before launch"). The doctrine:
the past is free because it builds faith · the near future is rented because it's lived in ·
the far future is precious because it's destiny · pick-a-date pierces any single date for a price.*

**WHEN: RIGHT BEFORE LAUNCH.** This plan sits parked until the pre-launch window (ahead of
the Aug 20 apex candidate). Nothing here builds early — testers stay unclamped and trusting
until the doors are about to open. David says "go stripe" and Phases 1–5 execute in one
stretch, dark-shipped behind the switchboard; Phase 6 flips on launch day.

---

## The tiers (proposal — names/prices are David's Phase-0 call)

| | FREE | **VELEA** (monthly sub) | **VELEAL'OR** (master monthly) |
|---|---|---|---|
| Calendar horizon | today + 7 days | through end of NEXT month | the full ranked year |
| Calendar past | unlimited | unlimited | unlimited |
| Today's Read | ✓ | ✓ | ✓ |
| Monthly reading | — | ✓ | ✓ |
| Seasonal reading (when built) | — | ✓ | ✓ |
| Year page | crown COUNTS per month, dates veiled | same thirst shape | full, dated |
| Life Atlas | themes + window counts (thirst) | dates visible, prose locked | full prose |
| Chapter Reader | running maha only | running maha + antar | all chapters |
| House Reader | 1st + Sun's + Moon's rooms | same | all rooms |
| Time Master / Hora / ↻ to-the-moment | — | — | ✓ |
| Pick-a-date reveal | — | à la carte | à la carte (+ N free/month, David picks N) |
| Special readings (eclipse, rx, yogas) | locked cards visible | ✓ | ✓ |
| Profiles | 1 | 1 | multi-profile (the second-chart seam) |

À la carte: **pick-a-date reveals** (any single date, any distance — the telescope that
pierces the Time Gate; the gate is what makes it enticing).

## Phase 0 — David's decisions (nothing builds until these)
1. Tier names + monthly prices (+ pick-a-date price; N free reveals for master).
2. Stripe account created; keys go **directly into Railway env** (never in chat):
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_VELEA`, `STRIPE_PRICE_VELEALOR`, `STRIPE_PRICE_DATE`.
3. Referral rework findings → Stripe Coupons/Promotion Codes (1 free month = coupon;
   birth-data fingerprint stays the one-per-person guard).
4. App Store: launch WEB-FIRST on Stripe. Capacitor/IAP decision deferred; the
   subscriptions table below stays the single source of truth either way (an IAP webhook
   would later write the same rows).

## Phase 1 — schema (pause-point scripts, run by David's hand; NO auto-migrate)
- `scripts/create-subscriptions-table.ts` → `subscriptions`
  (id, userId, stripeCustomerId, stripeSubscriptionId, tier enum('velea','velealor'),
  status enum('active','past_due','canceled'), currentPeriodEnd, cancelAtPeriodEnd,
  createdAt, updatedAt; unique userId).
- `scripts/create-purchases-table.ts` → `purchases`
  (id, userId, profileId, kind enum('pick_a_date'), refKey e.g. `2058-06-01·wealth`,
  stripePaymentIntentId, amountCents, createdAt; unique (userId, kind, refKey)).

## Phase 2 — server
- `server/billing/stripe.ts`: SDK client; `billing.checkout` (subscription mode, tier) and
  `billing.buyDate` (payment mode) → **hosted Stripe Checkout** (least code, PWA-safe
  redirect); `billing.portal` → Stripe Billing Portal (cancel/card).
- `/api/stripe/webhook` (raw body + signature verify, idempotent by event id):
  `checkout.session.completed` · `customer.subscription.updated/deleted` ·
  `invoice.paid/payment_failed` → upsert `subscriptions` / insert `purchases`.
  `past_due` keeps access until `currentPeriodEnd` (grace), then falls to free.
- `server/entitlements.ts` — THE ONE RESOLVER: `tierOf(user)` = admin → velealor ·
  tester flag → per-switchboard (beta override) · active subscription → its tier · else free.
  Exports capability map `{ horizon, yearSight, masterMode, atlasProse, monthlyRead,
  chapterDepth, roomDepth, multiProfile, freeReveals }`. Every existing `hasFeature`
  call site re-points here; the flags switchboard remains the TESTER override lane.
- Fails closed everywhere (no row = free), per the flag system's law.

## Phase 3 — THE TIME GATE (the doctrine, enforced server-side)
- Month/ranked queries clamp the forward cursor by `tier.horizon`
  (free: today+7 · velea: end of next month · velealor: the solar year).
  Past: unclamped for everyone.
- Client: the calendar's forward arrow stops at the veil — the edge month renders its
  first veiled days as quiet gold-hazed coins + one chip: "The horizon opens with Velea"
  → checkout. (No wall of locks; one chip. The mantra.)
- Year page swaps its admin/flag gate for `tier.yearSight`; sub tiers keep the thirst
  shape (real crown counts, dates veiled) already built in the Atlas grammar.
- Pick-a-date beyond the horizon → `billing.buyDate` flow; inside the horizon for paid
  tiers it stays included-on-generation as today. Reveals remain IMMUTABLE snapshots.

## Phase 4 — client surfaces
- `LockedFeatureCard` grows a real "Unlock" → checkout; Settings gets
  "Manage subscription" (portal) + a quiet tier chip; success/cancel return routes.
- Beach-ball law on every checkout redirect; nana-grade copy on every upsell card.

## Phase 5 — tests & safety
- Webhook signature + idempotency tests; entitlement matrix table-test (tier × surface);
  grace-period clock tests; the standing audits #2 (LLM-cost: tiers protect spend),
  #8 (isolation), #9 (migration safety) run on the whole seam.

## Phase 6 — launch sequencing
1. Ship dark: billing live behind the switchboard, testers unaffected (flags override).
2. David runs the two schema scripts; webhook smoke-tested with Stripe CLI.
3. Referral coupons wired; tester codes reissued in the new shape.
4. **Aug 20 apex candidate** — flags flip: free tier + checkout open to the public.

**David-owned checklist:** Stripe account · names/prices · keys into Railway · run 2
scripts · pick N free reveals for master · referral shape · bless the veiled-coin edge design.
