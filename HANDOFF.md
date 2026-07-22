# Velea — Session Handoff

_Last updated 2026-07-22, end of the Stage-wiring / doc-merge session. This is the "start here" note.
The single living to-do doc is now `tools/working-brief/index.html` (the merged Brief). This file is
continuity._

> **First action, before trusting anything below.** Re-run the state checks (`git status`,
> `git log --oneline -5`, `grep APP_VERSION client/src/lib/version.ts`, `npx vitest run`) and treat
> their output as truth over this file. Prod runtime state (feature-flag audience, the Anthropic
> wallet) is NOT in these files — verify against prod, never assume.

## Current state (verify, don't remember)
- **Live: v930** (`APP_VERSION = "1.1.930"`, `sw.js` cache `velea-cache-v930`). Deployed on velealor.com.
- **Suite 1310 passed / 4 skipped, tsc 0, build 0, probes all catch.** Re-run to reconfirm.
- Tree clean, `main` synced.

## Read first
1. `CLAUDE.md` — the method (accuracy > money > cosmetics; RULE ZERO: never state a value you haven't printed).
2. `SYSTEM_MAP.md` — architecture; read before exploring.
3. **`tools/working-brief/index.html` — THE single doc** (app + work + his calls, each with a ruling box).
   The old audit sheet is a "folded in" stub. The brief shows the LIVE VERSION at the top, always
   (self-enforced by a docs-claims test coupled to APP_VERSION — bump the app → update the brief).
4. `NARRATIVE_AUDIT.md` — the 16-point engine→LLM contract (gate 2).
5. `RELEASE_GATES.md` — David's framework: 18 audits under 5 gates (Astrological Fidelity, Narrative
   Fidelity, Engineering Integrity, Visual & UX Excellence, Business Excellence). Run the **Deterministic
   Astrology Audit** before anything else. The earlier 5 standing audits are absorbed + mapped there.

## What shipped this session
- **v929 — "Aligned for Today" fixed.** Was collapsing to 1 task of 89 (the `diagnose-aligned.ts` autopsy
  measured it). Mode is now a SOFT rank (not a hard filter); the low-drive gate is whole-check-in aware.
  `shared/motivation-gate.ts`. **Awaiting David's eyes** on the deployed list. "capable" threshold
  (mental≥4 & emotional≥4) is his to retune.
- **v930 — the Stage engine wired into the cast read.** The Cast/Camera/Tension engine (`sky/stage.ts`),
  built 7/21, was never wired — the LLM chose who's loud. Now the engine hands the protagonist + the one
  tension (`input.stage`), CAST_TAIL narrates them. `findTension` aggressor bug fixed (both-directions
  test + probe). SURFACE_VERSION.cast bumped. **Awaiting David's eyes** on The Read (the cast paragraph).
- **Docs merged into one** + the release-gates framework enshrined.

## Awaiting David's eyes (the two verifications that close open items)
- **The Read** (cast paragraph, v930) — tap it; the protagonist/tension are now chart-decided. Cache-salted, easy to adjust.
- **The Aligned list** (v929) — full Restraint-led list now.

## Open work — all in the Brief's "Your calls" (each has a ruling box)
- His calls (16): Siddha loudness, eclipse before/after, knot thresholds, crown-mark spec, palette calls,
  Futura-vs-Optima (make the mock on his go), Karaka/Tara (scrub vs glossary — issue #10), 27-star
  consolidate-vs-guarded (issue #2), chapter-read Door-Law exception (#6), price, Stripe keys, pick-a-date.
- Open issues mine to build: Day Headline (#7, blessed), welcome card two-buttons (#9), the money-durability
  items (#4/#5). Copy sweep is 6/7 DONE.
- The UI/brand batch (comet mark, diamond, gate-glyph, yogas copy) — his 7-item spec, in the Brief.

## Method lessons this session (do not repeat)
- **Measure before concluding.** The copy sweep was already 5/6 fixed (v901–v905); the "Stage 19% wrong"
  bug was in unwired script-only code. Both found by verifying at HEAD, not trusting the docs.
- **Don't over-dramatise.** "improvise", "amputating", "damning" — David flagged the tone. The engine
  already marks the loud planets; the gap was narrower. Be precise and calm.
- **The docs drift.** Correct them the moment reality diverges; the merged Brief is now the one source.
- **Long sessions degrade.** This one ran very long; David called it. Start fresh terminals sooner.
