# Golden Moment — engine behavior spec (draft)

Draft 2026-06-30. What the engine DOES with all-planet tracking (from
`server/sky/current-sky.ts`). "Golden Moment" is the INTERNAL name for the
universal/collective layer — see [[velea-universal-vs-chart-internal]]; it is not
surfaced to users by that name. Grounds: [[velea-moon]] (Moon = trigger),
velea-concept.md (universal vs personal).

## 1. First principle (non-negotiable)

The **Moon is the trigger** and sets the day mode. It moves at the speed life
changes. The slow planets are the **stage** the day plays on — they **modulate,
never override**. Concretely: the Golden Moment MUST NOT flip the base day mode
(Action/Build/Selective/Restraint). It colors, cautions, and re-weights — it does
not change which mode the Moon named.

## 2. Inputs (already computed, per user)

From `getCurrentSky(subject)`:
- Every planet's sign, house-from-Lagna, retrograde flag, speed.
- `hits`: each planet's conjunctions (≤4°) to the native's natal points.
- `station`: nearest retrograde/direct turn per planet.
- `eclipses`: next solar/lunar, with `daysAway`.

Universal events (an eclipse, Mercury Rx) are the same sky for everyone, but they
land in a **different house and hit different natal points per person** — that is
what makes the Golden Moment personal.

## 3. Signal catalog (what counts)

Each signal has: relevance (universal vs personal-hit), a **direction**
(favor / caution), a **domain** (a planet's nature → task types), and a **weight**.
Proposed set, small on purpose:

| Signal | Trigger | Direction | Notes |
|---|---|---|---|
| Retrograde slow planet | Mercury/Venus/Mars/Jupiter/Saturn currently Rx | caution on that planet's *forward* domain; favor *review* | Mercury Rx → favor edit/review over launch/contract |
| Station | a planet within ±3 days of turning | heightened emphasis on its domain | stations are the loudest days of a retro cycle |
| Slow transit hits natal point | slow planet conj natal Sun/Moon/Lagna/ruler (≤4°) | favor/caution by planet nature | Saturn→consolidate; Jupiter→expand; personal |
| Slow planet in a lit house | slow planet transiting the activated profection house or 1/10 | emphasis on that house's affairs | ties the stage to the year's topic |
| Eclipse window | solar/lunar eclipse within ~10 days | caution on major beginnings; favor release/finish | universal; stronger the closer |

Planet → domain/nature (reuse existing PLANET nature language): Sun authority,
Moon mind/mood, Mercury communication/contracts, Venus love/money/value, Mars
drive/conflict, Jupiter faith/expansion/counsel, Saturn discipline/limit/time,
Rahu hunger/ambition, Ketu detachment/release.

## 4. What the engine does with it

Three touch-points, in order of confidence:

**(a) Advisory line on the day — NOT a mode change.** Compute a short list of
active Golden Moment signals ("Mercury retrograde — favor review over launch",
"Solar eclipse in 8 days — hold major beginnings"). Display alongside the mode
(phase 3 UI). Does not alter the mode or qualifier value; it's a sibling readout.

**(b) Task ranking — extend the existing soft multiplier.** Today `task-scorer.ts`
multiplies only the SOFT subscore (floors for pinned/overdue/due stay untouchable),
and Layer 3 uses only Saturn/Rahu/Ketu vs natal S/M/L. Extend it:
  - Widen transit pressure to all slow planets hitting natal points (from
    current-sky `hits`), mapped to favored/opposed modes like the current
    `TRANSIT_MODE_EFFECT`.
  - Retrograde planets nudge their *review-flavored* tasks up (×1.1) and their
    *launch-flavored* tasks down (×0.9), within the domain.
  - Eclipse window applies a small global damping (×0.9) to Action-launch tasks
    and a small lift (×1.1) to finish/release tasks.
  - Keep every effect a bounded multiplier on the soft score only. The Moon-led
    mode still HARD-FILTERS which tasks are eligible. Golden Moment never promotes
    a task above the pinned/overdue/due floors.

**(c) Narrative read — weave, don't list.** The narrative already receives all
nine current transits. Add prompt guidance: when a Golden Moment signal is strong
(station, eclipse window, slow hit to a chart-defining point), name it as the
"stage" beneath the Moon's daily trigger — one clause, not a transit dump.

## 5. Bounds & safeguards

- **Bounded aggregate:** total Golden Moment multiplier on any task clamped to
  ~[0.7, 1.4] so it can re-order but never dominate. Mode filter + floors are
  never touched.
- **No fear-mongering:** eclipse/retro advisories are practical ("favor review"),
  never doom. Consistent with the VOICE rules in the narrative prompt.
- **Silent downrank stays silent:** opposed effects lower a task without a "why"
  bubble (existing convention).
- **Moon primacy visible:** wherever the Golden Moment shows, the day mode is
  bigger/first. Stage under trigger, always.

## 6. Open decisions (need owner input)

1. **Mode influence:** confirm the Golden Moment never changes the base mode
   (recommended), OR may it shift only the *qualifier* (e.g., push toward the
   "cautious/review" qualifier on a Mercury-Rx day)?
2. **Scope of "slow":** treat Jupiter+Saturn+nodes as the stage, or include
   Mars/Venus/Mercury retrogrades too (recommended: include their retrogrades as
   caution signals, since Mercury Rx is the canonical example)?
3. **Eclipse window length** (proposed ~10 days) and strength.
4. **Ranking aggression:** the [0.7, 1.4] clamp — looser or tighter?

## 7. Phasing

- Phase 1 (done): `current-sky` data layer + `sky.current`.
- Phase 2 (this spec): agree behavior → implement the signal derivation
  (`server/sky/golden-moment.ts`: `computeGoldenMoment(sky, subject) → Signal[]`).
- Phase 3: display (the "stage" readout) + wire ranking multipliers + narrative
  prompt clause.
