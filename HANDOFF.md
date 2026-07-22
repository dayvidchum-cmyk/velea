# Velea — Session Handoff

_Last updated 2026-07-22, end of the reader-gate / ruling-B session. This is the "start here" note for
the next session. The living to-do list stays in `tools/working-brief/index.html`; the open-issue
catalogue in `tools/audit-sheet/index.html`. This file is continuity, not a second backlog._

---

## Current state (verified, not remembered)

- **Live version: v928** on velealor.com (`APP_VERSION = "1.1.928"`, `sw.js` cache `velea-cache-v928`).
- **Tree clean, `main` in sync with `origin/main`.** Last commit `c63f9e7`.
- **Suite 1300 passed / 4 skipped (125 files), tsc exit 0, build exit 0** — run `npx vitest run`,
  `npx tsc --noEmit`, `npm run build` to reconfirm. The 4 skips are the known date-drift tests
  (`KNOWN_ISSUES.md`), not failures.

## Read these first

1. `CLAUDE.md` — the method. Non-negotiable. Priority order: (1) reading-data accuracy, (2) money/
   gating, (3) cosmetics. RULE ZERO: never state a value you haven't printed.
2. `SYSTEM_MAP.md` — architecture; read before exploring, update in the same commit as any change.
3. `tools/working-brief/index.html` — the live to-do list ("the chain", "Pick back up", decisions).
4. `tools/audit-sheet/index.html` — 15 open issues, 11 decisions, the fixed record (collapsed).

## What shipped this session (v926–v928)

- **v926 — the reader gate.** A free user's House Reader + Chapter Reader read "the room/chapter is
  quiet" (an outage message) instead of a lock. Root, proven by the readings autopsy: the
  `houseReader`/`chapterReader` feature-off returns (`narrative/router.ts:167`, `:196`) sent
  `available:false` with no `locked`. Fixed both to `locked:true`; strengthened `billing-gate.test.ts`
  to check each refusal *return*, not the whole body (probed). **Verified on the deployed app** (a
  free profile's rooms read, the paid rooms lock) — David confirmed with test user tom@wolf.com.
- **v927 — the silent catches.** The two room-gate catches (`router.ts:181`, `:227`) swallowed a
  thrown error with no log; now call `recordServerError` so a real research-throw shows in the admin
  black box. M20 behaviour unchanged (a transient hiccup returns unavailable, never a false lock).
- **v928 — ruling B (cancelled fall = supportive always).** David ruled a cancelled debilitation
  (neecha bhanga) is a standing structural quality, acting as exalted always — NOT dasha-gated.
  Removed the running-lords gate from `labelWithCancellation` (`dignity.ts`); `life-areas` + `day-frame`
  now read it as supportive always; the narrative was already correct. Retired `CANCELLED_LATENT_LABEL`
  + plumbing; test rewritten to B and probed. This resolved audit **issue #1** (the engine over-gated,
  not the prose) — moved to the fixed record, open list renumbered 1–15.

## Method lessons re-cemented this session (do not repeat these)

- **Prod config ≠ code defaults.** The `houseReader` default in `feature-flags.ts` is `"everyone"`,
  but the prod `feature_flags` DB row overrides it. Reading the default and asserting the flag was on
  cost real laps. Print the real value (the autopsy did).
- **Measure before concluding.** Two hypotheses for the "quiet" bug — the door gate, then a self-heal
  asymmetry — were built on unverified runtime assumptions and **both were wrong**. The instrument that
  actually named it: `scripts/diagnose-readings.ts` (read-only, runs the real pipeline by email against
  a prod `DATABASE_URL`, David runs it in his terminal). Use it for any reading-failure diagnosis.
- **Admin bypasses `hasFeature`** (`feature-flags.ts:65`) — a free-user gating bug will NOT reproduce
  from the owner/admin account. Diagnose against the actual user.
- **Don't reopen a settled ruling, and don't overthink.** The cancelled-fall gate mechanism, its
  labels, and the ruling were already encoded; asking David to re-ratify them + a prose-wording choice
  was over-caution. Build what's written; fix what takes no side; flag only what needs his authority.
- **The docs are the record.** `LIVE_QUEUE.md` (a stray file) was created and correctly deleted —
  everything belongs in the brief + audit sheet, not a second list.

## Open work, prioritized

### 1. Copy sweep — the correctness cluster (audit issues 1–6, in accuracy order)
The fix run was authorised and paused. All six are live. Verify each still bites at HEAD before fixing
(line numbers drift). **Data first:**
- **#1 "Business Partners" read as spouse** — `input-builder.ts:485`, the spouse regex swallows the
  plural so the business-partners rule is unreachable. **This is next.**
- **#2 The Stage names the wrong aggressor 19%** — `sky/stage.ts:384` writes `${o} presses on ${p}`
  regardless of direction (measured 20/103 wrong).
- **#3–6 read-contradictions** — `day-filter.ts:638` ("your star" tara-1 branch never fires),
  `day-filter.ts:618` ("THE DAY OFFERS IT" over "start nothing"), `sky/golden-moment.ts:154` (eclipse
  ahead announced past), `:119` (station up to 3 days old announced "just now").

### 2. "Aligned for Today" audit (audit issue #15) — David flagged 22 Jul, biting in daily use
The interaction between a task's mode flag (set on create/edit), the real-life check-in, the current
day's mode, and the mode orbs is off; the Aligned list shows the wrong tasks. **Diagnosis-first, like
#7** — measure the chain (task mode → check-in weighting / gold-dots / rest-gate → day mode → orb
counts → Aligned filter) before touching. Not started.

### 3. The UI / brand batch — David's original 8 items (2026-07-22); #7 (the reader bug) is DONE
Brief chain items 2 (money seam) and 4 (the look). His exact requirements, verbatim intent:
- **Comet becomes the brand mark** ("just do it"): replace the Lakshmi star mark with the comet —
  the brand mark, the spinning **loading** mark, AND the **Today** nav icon.
- **Readings nav → a diamond** (square turned 45°) with a **bindi dot** in the centre (frees the star).
- **Gated premium shown-but-locked, not hidden** (money seam, #4/#8): the hero card's **↻ refresh
  reading** and the **year calendar** are currently *completely hidden* for a free user — they must
  appear with the gate. And for **all** locked features, the **gate glyph sits next to the caret/button**
  that opens the feature.
- **Life Atlas: "open" → a caret** (the yogas row says "open"; it just needs a caret).
- **Yogas: remove "taste"**, make them free-pickable; a caret opens the card; the bubble button that
  picks a yoga as the free reading — **remove the words** ("This choice keeps …" is weird English),
  replace with something elegant, and **don't repeat the yoga's name**.
- **Futura vs Optima? (DECISION, David's)** — DCPC's brand font is Futura; would Futura + Inter be weird
  vs the current Optima + Inter? Build a side-by-side mock for his eyes; ship only if he blesses it.
  Cosmetic + jarring-redesign-risky → last.

### 4. Feature directions (brief "Pick back up")
The productivity Planner roadmap (10-point neurodivergent-UX + Pomodoro; #2/#3 shipped per record,
confirm), the **prana reading** (engine computes prana-level periods, no surface voices them), the
**agenda layer** rebuilt as a hidden nudge (code parked `@535fcd5`), **addresses & contacts** (built
v884/885, confirm on a live reading).

## Pending David decisions
- The **11 open calls** in the audit sheet (Siddha Yoga loudness, Lang's birth data, eclipse-day
  guidance, knot thresholds, crown mark spec, palette calls, price, Stripe keys, pick-a-date layer).
- **Futura vs Optima** (above).
- **Next priority:** copy sweep (correctness) vs the Aligned-for-Today audit (live UX bug) — he was
  choosing between these when the session ended.
- The **feature-flag launch decision**: `houseReader`/`chapterReader` are global — set to "everyone"
  launches the Readers to every free signup (real LLM spend). Held at "testers" for verification.
