# Velea Launch Status — audit vs the 7/29 scope

_Audited 2026-07-04 against David's scope. **Surprise headline: Phase 1 is already built.** Most remaining work is your Railway config, four pause-point items awaiting your review, and Stripe (needs your keys). Only one pure code gap (geocoder) is safe to build unattended._

Legend: ✅ done · 🟡 partial/needs config · 🟥 missing (buildable) · ⏸ PAUSE POINT (needs your sign-off) · 🔑 needs your Stripe keys · ⚙️ Railway config (yours, not code)

## Phase 1 — Stranger can get in  → ESSENTIALLY DONE
- ✅ **1.1 auth.register** — public endpoint EXISTS (`server/routers.ts:122`). Invite-only (requires `inviteCode` == `SIGNUP_INVITE_CODE` env, default `velea-0f585f1d`), email valid ≤320, password 8–128, name 1–120 optional, **rate-limited 5/15min**, lowercases+dedupes email, hashes password, auto-logs-in. ⏸ *This IS pause-point #1 — see proposal below; recommend keeping invite-only, it's your testers gate.*
- ✅ **1.2 Signup UI** — `Login.tsx` has signin/signup modes; the signup form appears only when arriving via an invite link (`?code=...`). Wired to `auth.register`.
- ✅ **1.3 getLoginUrl → /login** — `const.ts` returns `/login`; the Manus OAuth redirect is already removed.
- 🟡 **1.4 LOCAL_DEV off in prod** — already force-disabled in code: `LOCAL_DEV === "true" && NODE_ENV !== "production"`. Safe as long as ⚙️ `NODE_ENV=production` is set on Railway (Phase 6).
- ✅ **1.5 Sessions migration on Railway** — `sessions` table is in `schema.ts`; Railway `preDeployCommand` runs `drizzle-kit push --force`, so it auto-applies.

## Phase 2 — Onboarding completes
- ✅ **2.6 Geocoder → Nominatim** — DONE (verified 2026-07-13). Both geocode paths already use OpenStreetMap Nominatim with no key: birth location (`Profiles.tsx` `handleGeocode` → `/search`) and current location (`LocationSheet.tsx` forward + reverse). Timezone is fully offline (`server/geo/timezone.ts` `timezoneForCoords`). The Google proxy `server/_core/map.ts` is now DEAD CODE — nothing imports `makeRequest` — harmless, left in place per the no-cleanup-spiral rule (its `forgeApi*` env vars are still shared by storage/llm/etc., so don't remove those).
- 🟡 **2.7 Empty-state routing** — new user, no birth data → redirect to Profiles with one banner. Needs verification of the Today entry path; likely a small addition.

## Phase 3 — Waitlist  ⏸ (schema needs review)
- 🟥 **8. /waitlist route + email capture** · **9. waitlist_signups table** · **10. admin view + mark-invited.** Table auto-migrates on push, so I am NOT applying it unattended — see proposal.

## Phase 4 — Comped tester access  ⏸ (schema needs review)
- 🟥 **11. subscription_status on users** · **12. comped bypass** · **13. admin flip endpoint.** Schema proposed below, not applied.

## Phase 5 — Payment infrastructure  ⏸🔑 (your review + test keys; ships flag-off)
- 🟥 **14–21.** No Stripe code exists yet. Needs your test-mode keys and webhook-structure sign-off. Builds flag-gated (`PAYMENTS_ENABLED=false` at 7/29). Webhook structure proposed below.

## Phase 6 — Production hygiene  ⚙️ (mostly your Railway settings)
- ⚙️ **22. JWT_SECRET** — it's the cookie-signing secret (`env.ts` `cookieSecret`). Set a strong one on Railway.
- ⚙️ **23. NODE_ENV=production** — also what force-disables the LOCAL_DEV backdoor.
- ⚙️ **24. VITE_* vars at build time** — Railway build env.
- 🟡 **25. /manus-storage/* refs** — STILL PRESENT (`server/storage.ts`, `server/_core/storageProxy.ts`) serving uploads via a proxy. Per your "30-sec grep, no cleanup spiral": they're live and functional; leave unless uploads are being cut.

---

# Pause-point proposals (drafted for your approval — nothing below is applied)

### ⏸ 1. auth.register — REVIEW (already live)
Keep as-is. Validation: email (valid, ≤320) · password **8–128 chars, length-only** (no complexity rule — length beats symbols for usability) · rate-limit **5 per 15 min per IP**. **Invite-only** is already your "testers-only, no open public signup" gate — for August waves, rotate `SIGNUP_INVITE_CODE` per wave (or per-tester codes later). Open question for you: keep length-only, or want a breached-password check later? Recommend length-only for launch.

### ⏸ 2. waitlist_signups — SCHEMA (proposed)
```
waitlist_signups
  id          int PK autoincrement
  email       varchar(320) NOT NULL, UNIQUE
  source      varchar(48)  NULL      -- 'landing' | 'referral' | ...
  createdAt   timestamp    defaultNow
  invitedAt   timestamp    NULL      -- set when an invite is sent
```
Endpoints: public `waitlist.join({email, source?})` (rate-limited, dedupes) · admin `waitlist.list` · admin `waitlist.markInvited({id})`. UI: a `/waitlist` route with a single email field.

### ⏸ 3. subscription_status — SCHEMA (proposed)
Add to `users`: `subscriptionStatus varchar(16) NOT NULL default 'none'` — values `comped | trial | active | expired | none`. **Which routes eventually check it:** only the Phase-5 paywall middleware, itself behind `PAYMENTS_ENABLED`. Bypass for `comped | active | trial`; block `expired | none`. Until Phase 5 nothing enforces it — you just set testers to `comped`. Admin `users.setSubscriptionStatus({userId, status})` (or SQL to start).

### ⏸ 4. Stripe webhook — STRUCTURE (Phase 5, test-mode only)
`POST /api/stripe/webhook` — raw body, verify `STRIPE_WEBHOOK_SECRET` signature, idempotent by event id. Handle: `checkout.session.completed` → mark user `active`, link customer/subscription · `customer.subscription.updated` → sync status + `currentPeriodEnd` · `customer.subscription.deleted` → `expired` · `invoice.payment_failed` → start grace period. New `subscriptions` table (user_id, stripe_customer_id, stripe_subscription_id, status, price_id, current_period_end). One Product, four Prices (monthly $19.99 / 3-mo $50.97 / 6-mo $89.94 / yearly $119.88). **All test-mode until you confirm live keys.**

---

_Built this session: nothing schema/Stripe (all await your review). Next safe build: 2.6 geocoder. Everything else is your Railway config, the four pause points above, or Stripe keys._
