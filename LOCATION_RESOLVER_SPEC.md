# Location Resolver — spec for review (David decides; nothing built yet)

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
- **Q2 — Per-profile current:** today "current" is one value per account. When you read a friend's
  chart, should the day-layer use *your* current location, *their* hometown, or ask? (My lean:
  a non-owner profile ignores the owner's "current" and uses hometown → birth. The owner's own
  chart uses current. But your call.)
- **Q3 — "Current" staleness:** a stored current location is only true near today. For a date
  more than a few days out, should the resolver skip "current" and fall to hometown? (My lean:
  yes — current applies only within a small window of today; older/future dates use hometown.)
- **Q4 — Per-date override UX:** is this a pick-a-date-only "where were you on this day?" prompt,
  or a full editable travel log? MVP could be just the pick-a-date prompt.
- **Q5 — Backfill:** on migration, seed every profile's hometown from its birth location (so
  nothing changes for non-travelers until they set a hometown)? (My lean: yes.)
