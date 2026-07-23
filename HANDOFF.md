# Velea — Session Handoff

_Last updated 2026-07-22, end of a long build+doctrine session (v931 + the ruling batch). This is the
"start here" note. The single living to-do doc is `tools/working-brief/index.html` (the merged Brief,
artifact `4810c922-f34f-4c43-bf41-8d1439fa6b30`). This file is continuity._

> **First action, before trusting anything below.** Re-run the state checks (`git status`,
> `git log --oneline -8`, `grep APP_VERSION client/src/lib/version.ts`, `npx vitest run`) and treat
> their output as truth over this file. Prod runtime state (feature-flag audience, the Anthropic
> wallet) is NOT in these files — verify against prod, never assume.

## Current state (verify, don't remember)
- **Live: v931** (`APP_VERSION = "1.1.931"`, `sw.js` cache `velea-cache-v931`). Deployed on velealor.com.
- **`PROMPT_VERSION` unchanged** (`2026-07-22-meridian-register-not-content`) — tonight's doctrine went into
  `METHOD.md`, NOT the prompt, so readings did not regenerate. Wiring the doctrine into the prompt is queued.
- **Suite 1317 pass / 4 skipped, tsc 0.** Re-run to reconfirm. Tree clean, `main` synced (last commit `a593399`).
- **The Brief artifact is one republish behind:** the repo Brief (`tools/working-brief/index.html`) has the tithi
  cost/friction fold; the hosted artifact does not (David declined the last republish). Republish it next session
  (pass the URL as `url`, `force:true` — it's owned by us and other-session writes are just older versions).

## Read first
1. `CLAUDE.md` — the method (accuracy > money > cosmetics; RULE ZERO: never state a value you haven't printed).
2. `SYSTEM_MAP.md` — architecture; read before exploring.
3. **`server/vedic/canon/METHOD.md`** — the Lens Router + the doctrine enshrined tonight (counting law, the
   narrative-authority hierarchy, Temporal Amplifiers, confidence-by-surface). This is now the spine doc for how
   layers rank and speak.
4. **`tools/working-brief/index.html` — THE single doc.** Guarded by `docs-claims.test.ts` (version == APP_VERSION;
   open-issue tile == tag rows). The "Rulings received — 22 July" card holds the batch dispositions.

## What shipped this session (all pushed to `main`)
- **v931 — the money seam (chain #3).** The year calendar no longer VANISHES for a free user: the "Year ↗" door
  shows for everyone with the gate glyph, and a non-entitled tap lands on a **veiled year** (blurred grid + "Unlock
  your year" card). `crown.forYear` stays server-gated so no paid compute leaks. Kept-readings pitch modernized to
  Subscribe→notify. **Awaiting David's eyes on device.**
- **27-star consolidation (issue #2, CLOSED).** Measured **21 modules** (brief said ~7) each with its own copy of
  the sidereal-order names — one (`narrative-input.ts`) had a live "Dhanishta" misspelling. All now import one
  canonical `shared/nakshatra-names.ts`; `server/vedic/nakshatra-names.ts` is a re-export shim. The guard flipped
  to a **fork-detector** (control-verified both directions) + a Glossary-terms guard. Name-KEYED maps (dasha→lord,
  panchapakshi birds) left untouched — keyed by the names is not a fork.
- **Doctrine enshrined in `METHOD.md` (no engine change — the prompt wiring is queued):**
  - **"Weight ranks, lords gate"** — the counting law: convergence = count of distinct tied period-lords, gates
    lighting; the heavy-lord axis bonus (David's ratified Simone law) feeds `weight` which only RANKS. The count is
    private authority; the reader never hears the score.
  - **Confidence is surface-dependent** — shown on prediction/deep reads (the point of a prediction), fully internal
    on the daily tone. Already structural (day payload strips convergence/weight).
  - **The narrative-authority hierarchy** — Time Lord → Agenda → Knot → Crown/Caution → Tara/Chandra → Shubha Tithi
    → Siddha → **Temporal Amplifiers** (station, eclipse). One question per layer; synthesize into ONE tone; the
    **anti-stacking law** (many favorable flags never inflate to "extraordinary"). Amplifiers amplify authority,
    never create it (volume, not topic). 3rd vs 11th = siblings not twins (build/start vs harvest/collect).

## Closed this session
- **#7 The Day Headline — CLOSED, superseded, NO code written.** The v930 Stage engine already resolves one
  protagonist top-down (authority produces the lead, not a vote); `LEAD_SPEC.md` had already retired the axis/transit
  "ladder"; the 37%-no-convergence days are reality, not a defect. Do NOT reopen unless day-read openings read as
  surveys. (See `velea-authority-produces-the-lead` memory.)

## David's 22-July ruling batch — dispositions (full record in the Brief's "Rulings received" card)
- **Built:** 27-star consolidation.
- **Enshrined (doctrine):** Siddha-amplifier, Temporal Amplifiers, hierarchy + anti-stacking, 3rd/11th, confidence,
  Shubha-Tithi-as-family-classification.
- **Mine to build next (not yet done):** Full Spectrum → follow the mode · chip → "Roots & Ancestry" · "Karaka" →
  scrub-list + tappable glossary (like Tara) · **the veiled-year PAST-VISIBLE fix** (per the time-gate doctrine —
  v931 over-gated: past→today should render, only the future veiled) · **the locked price list** ($2.99 near-sight /
  $4.99 all-access / $1.49 pick-a-date; kept-readings $2.99) as its own money unit (PREMIUM_PRICING only has one
  slot today — expand + route each locked feature to its tier; mapping is in `velea-pricing-philosophy`) · verify
  the pick-a-date precision layer & report · the Futura vs Optima mock (+ a 3rd elegant serif/sans, he misses
  Playfair) · **wire the amplifier/hierarchy doctrine into the prompt** (doctrine's written; the prose must obey it).
- **Deferred (recorded):** dark-mode pass, crown gold-on-gold, parchment ink (all post-visual-audit) · Stripe keys
  (waiting on Mercury) · chapter-read auto-fire (exception stands, safe).

## Proposals awaiting David's notes (do NOT build until he formalizes)
- **Tithi as cadence** (`velea-tithi-cadence` memory + Brief). "The Knot supplies the noun; the Tithi supplies the
  verb." Five families as a 5-beat pulse (Nanda/Bhadra/Jaya/Rikta/Purna = Begin→Build→Break-through→Empty→Complete).
  It's a NARRATIVE REFRAME of an existing detector (day-filter/auspiciousness already compute the families as
  favorability) — Rikta = release, not "bad." Cost/friction already checked: ~2 tithis/day, always adjacent families
  (a single pulse-step), near-zero cost. **He's writing notes.**
- **Two engine threads — confirm, don't rebuild** (Brief): the agenda layer (parked `@535fcd5`, rebuild as a hidden
  nudge) and addresses/contacts (believed done v884/v885, one live look confirms it).

## Method lessons this session (do not repeat)
- **Authority produces the lead, not a vote.** Almost built `computeLead` (a house-vote scorer) for a problem the
  Stage engine already solved. New systems must fix a MEASURED problem, not a hypothetical one. (See the memory.)
- **Measure at HEAD; the brief undercounted.** The 27-star duplication was 21 files, not "~7" — the scan found the
  truth the doc had guessed. Same as the copy-sweep stale items. Always scan, never trust a count from a doc.
- **A "failing" algorithm may be reporting reality** — 37% of days have no convergence, and that's fine; don't
  engineer a fallback for an invented requirement.
- **Watch the guard fail.** The new fork-detector was proven by injecting a real fork (→ red, named the file) then
  reverting — never trusted green.
