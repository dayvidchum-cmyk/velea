# Velea — Session Handoff

_Last updated 2026-07-22, end of the meridian-axis / Venus-canon session. This is the "start here" note.
The single living to-do doc is `tools/working-brief/index.html` (the merged Brief, artifact
`4810c922-f34f-4c43-bf41-8d1439fa6b30`). This file is continuity._

> **First action, before trusting anything below.** Re-run the state checks (`git status`,
> `git log --oneline -6`, `grep APP_VERSION client/src/lib/version.ts`, `npx vitest run`) and treat
> their output as truth over this file. Prod runtime state (feature-flag audience, the Anthropic
> wallet) is NOT in these files — verify against prod, never assume.

## Current state (verify, don't remember)
- **Live: v930** (`APP_VERSION = "1.1.930"`, `sw.js` cache `velea-cache-v930`). Deployed on velealor.com.
- **This session shipped SERVER-ONLY changes** (prompt + canon), so APP_VERSION/sw.js did NOT change —
  the cache lever was `PROMPT_VERSION` (bumped to `2026-07-22-meridian-register-not-content`). Readings
  regenerate lazily on next open. Don't read the unchanged version as "the deploy didn't land."
- **Suite 1316 passed / 4 skipped, tsc 0, build 0, probes all catch.** Re-run to reconfirm.
- Tree clean, `main` synced (last pushed commit `15d82e9`).

## Read first
1. `CLAUDE.md` — the method (accuracy > money > cosmetics; RULE ZERO: never state a value you haven't printed).
2. `SYSTEM_MAP.md` — architecture; read before exploring.
3. **`tools/working-brief/index.html` — THE single doc.** Republish to the SAME artifact URL on any
   "update the brief" (pass the URL as `url`). Guarded by `docs-claims.test.ts` (version == APP_VERSION;
   open-issue tile == tag rows; ruling boxes intact).
4. `NARRATIVE_AUDIT.md` — the engine→LLM contract (gate 2). `RELEASE_GATES.md` — the 18 audits under 5 gates.

## What shipped this session (all pushed to `main`)
- **The meridian axis names the REGISTER, not the content** (`80439e8`). David's governing rule: the
  MC/IC axis is a structural polarity (outward/visible vs inward/rooted), NEVER a life-domain — it must
  never collapse to career-vs-home. The prompt now carries the anti-collapse law ("the MC does NOT mean
  career and the IC does NOT mean home"), the breadth of manifestations (marriage, parenthood, caregiving,
  lineage, community, service…), and defers the concrete domain to the engine's resolved story (dasha,
  knots, life-area lens, `input.vocation`) — vocational language stays gated on `input.vocation`. Also
  **de-collided the vocabulary**: meridian poles are now **outward/inward**; the DIRECTIONAL axis
  (Rahu/Ketu) keeps **reach/release** (nodal `_how` relabeled THE SPINE → THE DIRECTION). 10th-house
  doctrine no longer leads with "career"; 4th gained lineage/ancestry. Regression test
  `server/narrative/meridian-register.test.ts` guards both directions (control-verified: it fails the
  instant the collapse OR an over-correction of the directional axis returns). **No activation logic
  touched — that was explicitly David's scope line.** `PROMPT_VERSION` bumped.
- **Venus is REFINEMENT, not mere beauty** (`eb9c6e3`). David's ruling: Venus at its best distills many
  possibilities until the result feels effortless. In `server/vedic/canon/karakas.json` (signifies) and
  the Venus temperament portrait in `prompts.ts`.
- **Brief updated + republished** (`15d82e9`) — both items logged in the record; the meridian read added
  to "Awaiting your eyes" (tile 2→3).
- **Proof log** (`PROOF_LOG.md`, gitignored/private) — 2026-07-22 entry: the maker's own dashas authored
  the work (Saturn antardasha = discipline, Mercury pre/retro/post = the revision, Venus time lord =
  refinement to effortless; Saturn Rx as the concentrated amplifier).

## Awaiting David's eyes — NOT blocking
- **The meridian voice (register, not content)** — DONE FOR NOW, under **multi-day observation**. David:
  "my eyes needs to see it for a few days over time." A reading-changing prompt edit is judged by living
  with it across days and charts, not one render. Do NOT re-open or re-litigate it as unverified — it's
  shipped and soaking; he'll drop a note in the Brief's ruling box if a read is off. (See
  `velea-review-deployed-full-ux` memory.)
- **The Read** (cast paragraph, v930) and **the Aligned list** (v929) — still parked for his eyes, same as before.

## Open work — all in the Brief's "Your calls" (each has a ruling box)
- His calls (16): Siddha loudness, eclipse before/after, knot thresholds, crown-mark spec + gold-on-gold,
  parchment ink, chip rename, Futura-vs-Optima mock, Karaka/Tara (scrub vs glossary), 27-star consolidate,
  chapter-read Door-Law exception, price, Stripe keys, pick-a-date precision layer.
- Open issues mine to build: **the Day Headline (#7, blessed canon ladder — the second register; `verdict.ts`
  is the reference implementation)**, welcome-card two-buttons (#9), the money-durability items (#4 per-process
  re-bill guard; #5 needs an `engineVersion` schema script David runs).
- The UI/brand batch (comet mark, diamond, gate-glyph, yogas copy) — his 7-item spec, in the Brief.

## Method lessons this session (do not repeat)
- **An axis is geometry, not an event.** The MC/IC and Rahu/Ketu axes were treated like transits ("fires
  when a lord touches it"); they are standing structure. David's frame: define the narrative ROLE first,
  then derive activation from it — Rahu/Ketu = DIRECTION (a temporal vector), MC/IC = REGISTER (a structural
  orientation). Don't reverse-engineer a trigger and back-fill a meaning.
- **Register, not content.** A structural axis names WHERE a story is lived, never WHAT form it takes; the
  engine supplies the form. Guard the classical breadth against modern (career/home) narrowing.
- **Verify against HEAD, print what you find.** Both axes turned out to be ALREADY in the payload and
  ALREADY conditional — the question was never "is it there" but "is this the right condition." Measured,
  didn't remember.
- **Control both directions on every guard.** The meridian test was watched failing (re-introduced the
  collapse → 2 red) before being trusted green.
