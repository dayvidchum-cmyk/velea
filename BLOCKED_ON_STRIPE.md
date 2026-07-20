# PARKED — BLOCKED ON STRIPE

*Written 2026-07-20, at David's instruction: "I know if it requires stripe it is not happening
right now… leave the stripe connected things alone for now and communicate that."*

**This is the list of everything an audit will keep finding that I am deliberately NOT fixing,
because the fix is a payment integration, not a bug fix.** If a finding is on this list, it is
parked on purpose — not missed. The build plan for all of it is `STRIPE_PLAN.md` (blessed
2026-07-16, executes in ONE stretch right before launch when David says "go stripe").

Everything NOT on this list is fair game and gets fixed now.

---

## What is parked

| # | Parked item | What it looks like today | Why Stripe is the blocker |
|---|---|---|---|
| 1 | **Tier enforcement** | Entitlement is an allowlist (`server/feature-flags.ts`, `hasFeature`) — testers are flagged in by hand. | There is no subscriber to check. The allowlist IS the right shape; only its *source* changes (flag → Stripe subscription status). |
| 2 | **The Time Gate horizons** | Everyone entitled sees everything; the free/near-sight/year-sight horizons (past free · next month rented · full year precious) are documented, not enforced per tier. | The gate only means something once a tier can be bought. `STRIPE_PLAN.md` Phase 3. |
| 3 | **Pick-a-date charge** | `guardedDate` correctly LOCKS deeper dates for the non-entitled, but an entitled user's reveal is free and rate-limited only (40 / 15 min). | À-la-carte purchase = a Stripe one-off. Until then the rate limit is the wallet guard. |
| 4 | **Referral credits** | Codes + redemptions are recorded and counted (`server/routers.ts:332`); the actual free month / 10% off is NOT applied. | The credit is a Stripe Coupon / Promotion Code. Recording now is correct — the ledger is what gets replayed at switch-on. |
| 5 | **"↻ update to the moment"** | Shown as a premium preview; no real charge (`client/src/pages/Planner.tsx:2424` "coming soon"). | It is a paid refresh. Priced, not chargeable. |
| 6 | **Per-surface entitlement shape** | `canYearSight` (year read) and `hasFeature` gates are per-surface and inconsistent between endpoints and their UI. | Worth unifying — but the unification should be written ONCE against the real subscription object, not twice. Parked deliberately to avoid doing it twice. |
| 7 | **IAP vs Stripe (App Store)** | Undecided. | Apple takes 15–30% on digital goods bought in-app; the decision changes the whole billing surface. David's call, not mine. |
| 8 | **Advisor-tool pilot on paid readings** | Not started. | It is a cost-per-reading upgrade justified by revenue. Nothing to justify it against yet. |

## What is NOT parked (and has been fixed)

The billing-adjacent things that are pure correctness — money leaking or reads re-billing — are
NOT waiting for Stripe, because they cost real wallet dollars **today**:

- v776 — the pin billed a whole generation of prose the user never sees; refresh re-billed pinned
  reads. Fixed.
- The daily generation cap (50/profile/day) + the $20 wallet ceiling are live and are the real
  money guards until tiers exist.

## Where else this is written

- The audit sheet (permanent URL) carries this same block, so a future audit doesn't re-raise it.
- The Working Brief carries the one-line version in its Open Picks.
