# Location Resolver — APPROVED 2026-07-18 (David's answers in §7; build in progress)

_Written 2026-07-18 (v752). The apex David named: "where location is entered, changed, lives
in the UX, and where it is stored is the apex of the issue." This specs the single source of
truth that was scoped at v1.1.428 and deferred. NO code until David approves; the migration is
a David-run script, never auto ([[velea-no-auto-force-migrate]])._

---

## 1. The problem, precisely

The day-layer (panchang / day-mode / crown / tara / transit sampling — the ONLY
location-sensitive parts; transit longitudes, dashas, and natal houses are location-independent)
needs to know **"which sky, sampled where, for this profile on this date."** That decision —
the precedence **current → hometown → birth** — was decided at v1.1.428 but **never built as one
function.** Consequences, all confirmed today:

- **Three independent re-derivations** of the precedence: `dayLocFromUser` (narrative router),
  the panchang router's own inline block (`today`/`byDate`), and `input-builder`'s birth-lat
  leaf fallback. They can drift from each other.
- **`dayLoc` is an OPTIONAL parameter** that silently falls back to Boston (42.36/−71.06) when a
  caller forgets it. So every new consumer is a latent divergence, caught only by audit — v742
  fixed it once, v752 fixed two more, and three more unlocated sites remain
  (`testReadingForUser`, `subjectPersonalDay`, a calendar `majorityDayStarIdx`).
- **Storage mismatch:** current location lives on the **user** row (one per account), but a
  reading is per **profile**. Reading for Simone's chart uses *David's* current location. Fine
  when David travels with his own chart; wrong when the profile is someone elsewhere.

**Fixing leaf call sites is the band-aid. The fix is one resolver + a required parameter so the
compiler catches an omission instead of a far-from-UTC user catching it a day in five.**

---

## 2. The data model (schema — YOUR call, needs a reviewed migration)

Three locations doing three jobs (your 2026-07-13 model, unchanged):

| Tier | Job | Stored today | Proposed |
|---|---|---|---|
| **Birth** | builds the natal chart; fixed forever | per-profile (`birthLocation*`) | unchanged |
| **Hometown** | the soul's home base; the day-layer default when not traveling | **does not exist** | new per-profile fields |
| **Current** | "where did the body wake up today"; transient | one per **user** (`location*`) | keep, but see Q2 |
| **Per-date override** | "on THIS date I was in Tokyo" (pick-a-date, travel history) | **does not exist** | new per-profile-per-date rows |

### Proposed schema (for review — not run)
```
-- new per-profile hometown (the day-layer default)
ALTER TABLE profiles ADD COLUMN hometownCity     VARCHAR(128) NULL;
ALTER TABLE profiles ADD COLUMN hometownLat      VARCHAR(24)  NULL;
ALTER TABLE profiles ADD COLUMN hometownLon      VARCHAR(24)  NULL;
ALTER TABLE profiles ADD COLUMN hometownTimezone VARCHAR(64)  NULL;

-- new per-date override history (sparse; only dates the user pinned a place)
CREATE TABLE profile_day_locations (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  profileId  INT NOT NULL,
  onDate     VARCHAR(10) NOT NULL,     -- 'YYYY-MM-DD'
  city       VARCHAR(128) NOT NULL,
  lat        VARCHAR(24)  NOT NULL,
  lon        VARCHAR(24)  NOT NULL,
  timezone   VARCHAR(64)  NOT NULL,
  createdAt  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_profile_date (profileId, onDate)
);
```
Delivered as `scripts/add-location-model.ts` (idempotent, David-run), mirroring
`scripts/create-push-subscriptions.ts`. Schema.ts updated in the same commit.

---

## 3. The resolver (the one source — this is the actual fix)

```ts
// server/panchang/resolve-day-sky.ts — the ONLY place the precedence lives.
export type DaySky = { lat: number; lon: number; utcOffset: number;
                       source: "override" | "current" | "hometown" | "birth" | "default" };

export async function resolveDaySky(
  profile: { id, birthLocationLat, birthLocationLon, birthTimezone, hometown*, ... },
  ownerUser: { locationLat, locationLon, locationTimezone } | null,  // the current tier
  dateStr: string,
): Promise<DaySky>
```
Precedence, in order, first hit wins:
1. **override** — a `profile_day_locations` row for (profile, date). (Powers pick-a-date "where
   were you" + travel history.)
2. **current** — the owner user's `location*`, **but only for the owner's own profile** (see Q2)
   and **only for near-today dates** (a stored "current" is meaningless for a date last March —
   see Q3).
3. **hometown** — the profile's `hometown*`.
4. **birth** — the profile's `birthLocation*` (the chart's own place; today's last-resort).
5. **default** — Boston, ONLY if a profile somehow has no birth location. Logged as a warning,
   never silent.

`utcOffset` is always computed for the READING's date (DST-correct), via the shared
`getTimezoneOffset`. The resolver is the single home of that too.

---

## 4. Killing the class (why this ends the audits)

- **Make `dayLoc` required**, not optional, in `buildNarrativeInput` and every service function.
  Then `currentTransits`, `testReadingForUser`, `subjectPersonalDay` — every current and future
  caller — become **compile errors** if they omit it. TypeScript enforces the invariant the
  audits currently enforce by hand.
- **Delete the three re-derivations.** `dayLocFromUser`, the panchang inline block, and the
  input-builder birth fallback all call `resolveDaySky` instead. One precedence, one place.
- **The panchang router (`today`/`byDate`) uses it too** — so the hero and the reading can never
  again name different modes; they read one resolver.

---

## 5. Rollout (each phase shippable, verified, reversible)

1. **Schema** — you run `add-location-model.ts`; I wire schema.ts. (No behavior change yet.)
2. **Resolver** — build `resolveDaySky`, unit-tested against every precedence branch + DST +
   hemisphere. Route all THREE current derivations through it. `dayLoc` still optional this phase
   (pure refactor, identical output for located users — verify by diff).
3. **Make it required** — flip the signature; fix the compile errors (that's the audit, done by
   the compiler). This is the phase that ends the class.
4. **Hometown UX** — a field in the profile/birth editor. *(Needs your UX call — see Q1.)*
5. **Per-date override UX** — "where were you?" on the pick-a-date reading + a travel log.
   *(Needs your UX call — Q4.)*

Phases 1–3 fix the accuracy bug with ZERO new UX. Phases 4–5 are the features on top.

---

## 6. Open questions — YOUR decisions before I build (never-assume-UX law)

- **Q1 — Hometown entry:** where does hometown live in the UX? A field next to birth location in
  the profile editor? Auto-seeded from birth location on first save (edit later)? Or a row in the
  LocationSheet next to "current"?
- **Q2 — Per-profile current: ANSWERED (David, 7/18).** "Current location is [the] current
  account, which is owned by a current user. When viewing another profile, pop-up to change
  location. I have lived this need many times." → current stays ONE value on the user/account
  (not per-profile). The trigger: **switching to view another profile pops a prompt to
  change/confirm the location** (the reading needs the place the *chart's person* is, not the
  owner's). MVP = prompt on profile-switch; the answer is stored back to the single current-
  location slot for that session. (This is a UX prompt, not new per-profile storage — simpler
  than the earlier per-profile-current idea.)
  NOTE: GPS never changes location silently today — it's manual (LocationSheet "use my location"
  button) or the LocationNudge toast (already-granted users, >150km drift, throttled 2h) that
  OFFERS a one-tap update. The profile-switch prompt is a NEW, separate trigger from GPS drift.
- **Q3 — "Current" staleness:** a stored current location is only true near today. For a date
  more than a few days out, should the resolver skip "current" and fall to hometown? (My lean:
  yes — current applies only within a small window of today; older/future dates use hometown.)
- **Q4 — Per-date override UX:** is this a pick-a-date-only "where were you on this day?" prompt,
  or a full editable travel log? MVP could be just the pick-a-date prompt.
- **Q5 — Backfill:** on migration, seed every profile's hometown from its birth location (so
  nothing changes for non-travelers until they set a hometown)? (My lean: yes.)

---

## 7. David's decisions (2026-07-18, in-session) — the build directive

Direct quotes: "a pop-up should appear when the location isn't even entered" · "the issue is
that the location was being recorded above the calendars, in the profile, etc. etc. you need to
find every band-aid involving this and fix permanently. i want it all in one location, editable
by the user/owner of the account. and yeah a pop-up during onboarding when they first sign in
that asks for birth and location info" · "it remains an option in readings and on the today card
to adjust quickly if need be."

Resolved:
- **One editing surface, owner-editable.** LocationSheet is the single home of current
  location. Every other touchpoint (Settings row, Today-card chip, reading chips, calendar
  header) is a SATELLITE that opens the same sheet — it may display, it may never own logic.
- **Quick-adjust satellites stay** on the Today card and in readings (the existing
  LocationChip → `velea-open-location` pattern is the right shape; keep it).
- **Missing-location pop-up:** when a reading is requested and no location is entered, pop the
  sheet — never a silent Boston fallback.
- **Onboarding pop-up:** first sign-in collects birth + current location inline (upgrade
  FirstRunWelcome from "points elsewhere" to "collects here").
- **Q1** subsumed by the one-surface rule: hometown (when it lands) lives in the same surface.
- **Q2** answered earlier: prompt to confirm/change location on profile-switch; stored back to
  the single account-level slot.
- **Q3/Q5** proceed on the spec leans (current = near-today only; seed hometown from birth).
  NOTE: the Q3 near-today window is implemented WITH the hometown tier (post-migration) — stale
  "current" must fall to hometown, which doesn't exist until `add-location-model.ts` runs.
- **Q4** MVP: pick-a-date prompt only.

## 8. The band-aid map (full sweep, 2026-07-18)

What "every band-aid" turned out to be — all to collapse into `resolveDaySky` + one surface:

**Server precedence derivations (8):** `dayLocFromUser` (narrative/router.ts:13) · inline
blocks in routers.ts at 200 (almanac), 1400 (today), 1422 (byDate), ~1489 (today deep), 1562
(whyToday) · life-area/arc inline blocks routers.ts:2610–2748 · input-builder.ts:660-663
(current→birth→Boston with srcV) · `userLatLon` + input.lat override pattern (Master Mode,
routers.ts:335/2278/2314).

**Boston hardcodes (7 files/sites):** routers.ts:201-202, 2279, 2315 · crown.ts:296 ·
input-builder.ts:149-150 ("42.36"/"-71.06") and 661-662 · service.ts:22-23 (PLANNER_LAT/LON —
the canonical constant; the resolver becomes the only reader).

**Unlocated call sites (3):** `subjectPersonalDay` (routers.ts:70; call sites 88, 1413, 1435,
1501, 1576, 3057) · `testReadingForUser` (routers.ts:571) · calendar `majorityDayStarIdx`
(routers.ts:1604).

**Client — two divergent birth editors:** Profiles.tsx (geocoder + resolveTimezone auto-fill,
COMMON_TIMEZONES) vs BirthChartSheet.tsx (manual lat/lon, no geocoder, separate
TIMEZONE_OPTIONS list). Merge on the Profiles.tsx conventions.

**Client — entry/display satellites (already correct shape, keep):** LocationChip
(Horoscope.tsx:390, Planner.tsx:1450), Settings.tsx:651-672 row, LocationNudge toast,
FirstRunWelcome/Onboarding first-run card.
