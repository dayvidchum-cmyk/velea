# Velea — Session Handoff

_Last updated 2026-07-23, end of a long build session (v932–v936 + the STATES DOCTRINE). This is the
"start here" note. The single living to-do doc is `tools/working-brief/index.html` (artifact
`4810c922-f34f-4c43-bf41-8d1439fa6b30`). This file is continuity._

> **First action, before trusting anything below.** Re-run the state checks (`git status`,
> `git log --oneline -12`, `grep APP_VERSION client/src/lib/version.ts`, `npx vitest run`) and treat
> their output as truth over this file. Prod runtime state (feature-flag audience, the Anthropic
> wallet) is NOT in these files — verify against prod, never assume.

## Current state (verify, don't remember)
- **Live: v936** (`APP_VERSION = "1.1.936"`, `sw.js` cache `velea-cache-v936`). Deployed on velealor.com.
- **Suite 1385 pass / 4 skipped, tsc 0, build 0.** Re-run to reconfirm. Tree clean, `main` synced.
- **`day_read` surface version = `2026-07-23-solar-relationship`.** The day read regenerates with the
  combustion state. Other prose (deep/year/cast) unchanged.

## Read first
1. `CLAUDE.md` — the method (accuracy > money > cosmetics; RULE ZERO: never state a value you haven't printed).
2. `SYSTEM_MAP.md` — architecture; read before exploring.
3. **`server/vedic/canon/METHOD.md`** — the doctrine spine. NEW this session: **the design principle** —
   *"the engine computes objective conditions; the narrative expresses lived states."*
4. **`tools/working-brief/index.html` — THE single doc** (guarded by `docs-claims.test.ts`).
5. Memories: `velea-states-not-labels` (THE new doctrine + the 7-item list), `velea-dignity-environment-and-recovery`,
   `velea-rulings-22jul-night`.

## THE BIG NEW DIRECTION — the states doctrine (David, ratified 2026-07-23)
Binaries → continua. *"The sky behaves like states."* Enshrined in METHOD.md. Two binding rules:
**(1) layer, don't replace** — the classical term stays in the engine + glossary, the graded state
rides on top; **(2) give the model nuanced DATA, not prompt-engineered nuance** — a boolean traps the
LLM into "weakened"; a graded field makes it write nuance itself. This is `data-is-the-source-of-truth`
taken to its end: **the fix for flat prose is a richer field, not a louder instruction.**

**The 7-item conversion list + status:**
- **#1 Combustion → the Solar Relationship — BUILT + WIRED LIVE (v936).** 7 states incl. cazimi (the
  throne) & heart-of-the-sun (the coronation) — the INVERSION (empowered, not burnt). `affliction.ts`
  + wired into the day read's transits. **SHOWCASE: Jupiter CAZIMI 2026-07-29** (0.01° from Sun; window
  7/27–7/31) — David to open the 7/29 day read and confirm Jupiter reads as *the throne*, not weakened.
  Find more demo dates: `npx tsx server/scripts/find-vivid-combustion.ts 2026-07-23 160`.
- **#2 Retrograde → all five planets — BUILT (dormant).** `planetRxState` in `sky/retrograde-phase.ts`;
  per-planet station thresholds (Saturn-always-stationing bug fixed). Not wired to prose yet.
- **#5 Moon brightness — BUILT (dormant).** `panchang/moon-brightness.ts` — illumination + paksha +
  strength dial, zero new astronomy (off the elongation the tithi uses). **Wire this NEXT** — it's the
  easy one: the Moon is in EVERY read, so no rare demo date needed.
- **Dignity / neecha bhanga → recovery continuum — BUILT (dormant, step ① of the dignity work).**
  `dignity.ts` `gradeRecovery`/`recoveryState` — 5 bands, NBRY engine-resolved. Tune the first curve
  via `server/scripts/recovery-scan.ts` (David tunes by looking). Then wire + the environment-language
  rebrand + glossary.
- **Still open (David's takes recorded):** #3 planetary war (grade by orb + natural strength, NO
  winners) · #4 aspects (drishti strength + forming/separating) · #6 yoga loudness (participants'
  dignity/angularity into payload) · #7 bhava strength ("which rooms are lit", cusps too — high enthusiasm).

**HOW TO WIRE each (the pattern, learned this session — NOT one big pass):** add the graded field to the
payload beside its boolean + a short prompt line that reads it (the data does the work) + a scan to hand
David a vivid demo date + bump the surface version. Incremental, one before/after each. David poked the
"one big rebrand pass" plan and was right — wiring is low-effort DATA per his own doctrine.

## What else shipped this session (all pushed to `main`)
- **v932** — the life-area chip → "Roots & Ancestry" (parents-key = ancestry/roots; parents-as-people
  stay in the Family shelf + knots).
- **v933** — the locked price list surfaced: PREMIUM_PRICING → 3 ruled tiers ($2.99 near-sight / $4.99
  all-access / $1.49 pick-a-date), every locked card routed. Nothing charges yet (Stripe waits on Mercury).
- **v934** — the veiled-year SPLIT REVEAL: free users see past→today real & tappable, future veiled,
  crown/caution lists past-only; future stripped SERVER-SIDE (no leak). **Awaiting David's eyes.**
- **v935** — two hidden DAY-READ nudges: the **agenda** (revived from parked v906, re-voiced as a hidden
  tilt — the v906 lead-voice is now banned + guarded) + the **precision layer** (`day-read-signals`, ask
  #14 CLOSED — was dead, now feeds the 1–2 tightest transit-to-natal contacts). David judged the 7/23
  before/after: **PASS** (agenda landed as a tilt, no hijack). Both gated to the day read via `dayNudges`.
- **The probe harness trap** — a `trap … EXIT INT TERM` restores the in-flight mutation on any kill
  (a killed probe run once left `golden-moment.ts` mutated → read as a phantom hand-edit; can't recur).

## Rulings received this session
- Prices: surface all three. · Veiled year: split reveal, past-only lists. · Precision layer: WIRE (as a
  hidden nudge). · Agenda: rebuild as a hidden nudge (done, passed). · The states doctrine + all its
  sub-rulings (Planet × Environment; NB as a graded continuum, dasha = VOLUME not gate per ruling B; NBRY
  engine-resolved; combustion states; **cazimi = the throne, heart-of-the-sun = the coronation**; keep
  classical terms in the glossary).

## Method lessons this session (do not repeat)
- **After an interrupted/timed-out probe run, check `git status` for a stray un-restored mutation** — a
  killed `npm run probe` left golden-moment.ts mutated and I wrongly blamed David for the edit. Never
  attribute a dirty file to him without proof (grep the harness — a distinctive string is one command away).
- **Wiring is DATA, not a big pass.** I over-scoped the state-doctrine wiring as "one rebrand pass later";
  per David's own doctrine the fix is a richer payload field, so wire incrementally with before/afters.
- **Hand David the demo date; don't make him guess.** The engines can SCAN for the vivid dates (cazimi,
  deep-combust, full/new Moon) — that's the payoff of building them.

## Proposals still awaiting David's notes (do NOT build until he formalizes)
- **Tithi as cadence** (`velea-tithi-cadence`). He's writing notes.
