# Velea — Session Handoff

_Last updated 2026-07-23, end of a session that started as states-doctrine wiring and became the writing
of a **Constitution**. This is the "start here" note. The single living to-do doc is
`tools/working-brief/index.html` (artifact `4810c922-f34f-4c43-bf41-8d1439fa6b30`). This file is continuity._

> **First action, before trusting anything below.** Re-run the state checks (`git status`,
> `git log --oneline -15`, `grep APP_VERSION client/src/lib/version.ts`, `npx vitest run`) and treat
> their output as truth over this file. Prod runtime state (feature-flag audience, the Anthropic
> wallet) is NOT in these files — verify against prod, never assume.

## Current state (verify, don't remember)
- **Live: v942** (`APP_VERSION = "1.1.942"`, `sw.js` cache `velea-cache-v942`). Deployed on velealor.com
  (prod `/healthz` confirmed 1.1.942).
- **Suite 1396 pass / 4 skipped, tsc 0, all probes caught.** Re-run to reconfirm. Tree clean, `main` synced.
- **`PROMPT_VERSION = 2026-07-23-narrative-economy`** (v942 bumped it → **every reading regenerated**).
  `day_read` surface = `2026-07-23-narrative-economy`.

## Read first — THE ORDER CHANGED THIS SESSION
1. **`CONSTITUTION.md` (repo root) — THE SUPREME DOCTRINE, NEW this session.** 16 principles + 2 standing
   rules + the implementation rule. Every feature answers to it (Principle 13). **Read the implementation
   rule first:** these are design constraints, NOT algorithms — *preserve the principle while designing,
   do not rush to translate it into logic.* Memory: `velea-constitution`.
2. `CLAUDE.md` — the method (accuracy > money > cosmetics; RULE ZERO: never state a value you haven't printed).
3. `SYSTEM_MAP.md` — architecture; read before exploring.
4. `server/vedic/canon/METHOD.md` — the doctrine spine (now explicitly *serves* the Constitution).
5. `NARRATIVE_AUDIT.md` — the engine→LLM contract. Its north star (top of the file): **"The engine's job
   is to know everything. The reader's job is to understand one thing."**
6. `tools/working-brief/index.html` — THE single to-do doc (guarded by `docs-claims.test.ts`).

## THE BIG THING — the Constitution (David, ratified 2026-07-23)
An audit meant to check the aspect feature uncovered that the day read was drifting toward a data-dump,
and that turned into David writing the constitutional articles that had been implicit. **The inflection
he named: the math is now stable enough that the remaining work is no longer "how do we calculate this?"
but "how do we communicate it without losing meaning?"** The 16 principles (full text in `CONSTITUTION.md`):
1 Reality before narrative · 2 Comprehension over completeness · 3 One governing idea · 4 Theme before
evidence · 5 Authority top-down · 6 The engine computes more than it says · 7 Evidence corroborates
(never votes) · 8 Model reality not terminology · 9 Respect the shape of reality · 10 States represent
experience · 11 Functional over textual · 12 Editorial judgment is a feature · 13 Internal consistency
is law · **14 Narrative Economy** (finite COHERENCE budget — a coherence budget, NOT a count) · **15 The
Engine Is Not the Reading** (optimize for REVELATION, not coverage) · **16 Structural Axes** (Rahu/Ketu,
MC/IC are structural geometry, first-class, modeled per their own ontology). Plus standing rules:
**Transparency of Departure** (document intentional departures from classical authority) and **Never
Simplify the Ontology to Simplify the Implementation** (the Rahu/Ketu ruling).

**The recurring lesson of the session (the one to internalize):** I kept reaching for a number, a rank,
a filter, an exclusion — *simplifying*; David kept pulling back to quality, coherence, revelation,
ontology. Twice he caught me measuring by weight when it was a matter of quality. The Constitution exists
so that reflex is now a *violation*, not a style choice. When handed a principle: hold it, design against
it, show the design — do not compile it into logic.

## What shipped this session (v939–v942, all on `main`)
- **v939 — Didot, the brand display face.** FOUND (by building + grepping emitted CSS) that `--font-serif`
  was a dead self-reference — the app serif had been silently **Inter**, so "Optima all" (7/22) never
  rendered. Fixed on `:root`; Didot now renders across ~30 display surfaces (Apple system faces).
  **Awaiting David's eyes on device.** Memory: `velea-display-face-didot`.
- **v940–v941 — the aspect layer (states doctrine #4).** Engine `server/vedic/aspect-strength.ts`
  (`aspectInfluence` → Influence state weak/growing/moderate/strong/dominant + forming/separating off the
  sputa-drishti curve; David ruled option A). Wired into the day read's `panchang.activatedAspects` under
  *theme-then-evidence*: the activated house owns the frame, an aspect surfaces only when it materially
  touches that house's lord/occupant. v941 corrected it to select by QUALITY not weight (David's
  correction — no sort, no rank, no virupas to the narrative). Memory: `velea-states-not-labels`.
- **v942 — THE DAY READ REBUILT AROUND REVELATION (the coherence pass, P14/P15/P16).** The prompt's
  governing block is now the north star; every state-layer is a candidate that earns a place only by
  deepening the one idea. Removed the "MUST be in the read" mandate. Rewrote the three "mention-it" layers
  (combustion/retrograde/moon) to P14. Retired the loudness-earned aria (it was the sharpest violation —
  a solo beat earned by *standout condition*). Self-aspects labeled as **returns** (`ontoRole:"return"`,
  never "X aspects X"). Closed the jargon-scrub gap in the **`SCRUB` table** (cazimi/drishti/stationing/
  pre-shadow/pakshabala — NOT MACHINERY, which is only the detector; control-tested). Rahu/Ketu KEPT as
  first-class aspecters, documented as an intentional method-under-review.

## The audit (4 parallel agents + hands-on, 7/23)
Ran the shipped work against RELEASE_GATES + the Constitution. **Correctness solid** (astrology correct &
deterministic, no conjunction double-count; engineering pass; constitution compliant). The real finding —
only visible by RUNNING it (a synthetic-chart harness), not reading the diff — was **accumulation**: the
aspect layer over-surfaced (5–11 material aspects/house) AND the prompt *mandated* the state-layers. v942
is the fix. Verdict now: the day read optimizes for revelation.

## OPEN — for David's eyes / next session
- **★ David's #1 test on the deployed v942 day read: does it read as ONE understanding, or still recite
  conditions?** That is what P14 exists for. Hard-refresh the PWA (SW cache v942).
- **Also awaiting his eyes (older):** Didot on device (v939); the veiled year (v934); The Read/cast (v930);
  the Aligned list (v929); the meridian register prose.
- **Tune by looking (his call):** the aspect **Influence bands + the material floor** (`aspect-strength.ts`
  `INFLUENCE_BANDS` / the `MATERIAL` set in input-builder) — first curve is an even 0–60 split. Recovery
  calibration is RULED (partial floor is correct — "recovery = restored FUNCTION, not textual validity").
- **Method to finalize:** the **Rahu/Ketu aspect tradition** (nodes stay first-class; the exact node-aspect
  method is under review → document + apply consistently when chosen — Transparency of Departure).
- **Low-severity audit notes (not blocking):** Moon-trend near a same-day exact aspect (net-daily vs
  instantaneous — a defensible daily-card tradeoff); the METHOD.md "interpretive lens" pipeline diagram
  could mislead a future implementer (the wired domain IS the activated house — one-line clarify); no
  dedicated probe on the aspect materiality gate.
- **States doctrine still to build (David's takes recorded):** #3 planetary war (orb + strength, no
  winners) · #6 yoga loudness (participants' dignity/angularity) · #7 bhava strength (rooms lit, cusps).
- **The dignity feature (recovery ruled, calibration locked):** wire the recovery continuum into prose +
  the environment-language rebrand ("debilitated" → "against the grain of its surroundings") + the glossary
  bridge. Memory: `velea-dignity-environment-and-recovery`.
- **Deferred (visual batch, ruled to wait):** Full Spectrum → follow the mode, dark-mode pass, crown
  gold-on-gold, parchment ink. **Stripe** waits on Mercury. **Futura** → resolved to Didot.

## How to wire a state-layer (the pattern, and now the constitutional guard)
Add the graded field beside its boolean + a short prompt read + a scan for a vivid demo date + bump the
surface version — incremental, one before/after each. **AND** it must pass the Constitution: the layer's
prompt doc says *when it earns a place*, NEVER *must mention* (P14); it selects by quality not weight
(P2/P7/P12); it stays subordinate to the activated house (P4/P5). A new "always mention…" line is now
literally unconstitutional.

## Proposals still awaiting David's notes (do NOT build until he formalizes)
- **Tithi as cadence** (`velea-tithi-cadence`). He's writing notes.
