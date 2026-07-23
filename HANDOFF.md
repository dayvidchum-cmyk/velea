# Velea — Session Handoff

_Last updated 2026-07-23, end of a session that completed the Day Read's Constitutional migration (v943)
and then produced the **migration roadmap for every other reading surface**. This is the "start here"
note. The single living to-do doc is `tools/working-brief/index.html` (artifact
`4810c922-f34f-4c43-bf41-8d1439fa6b30`). This file is continuity._

> **First action, before trusting anything below.** Re-run the state checks (`git status`,
> `git log --oneline -15`, `grep APP_VERSION client/src/lib/version.ts`, `npx vitest run`) and treat
> their output as truth over this file. Prod runtime state (feature-flag audience, the Anthropic
> wallet) is NOT in these files — verify against prod, never assume.

## Current state (verify, don't remember)
- **Live: v943** (`APP_VERSION = "1.1.943"`, `sw.js` cache `velea-cache-v943`). Deployed on velealor.com
  (prod `/healthz` confirmed 1.1.943).
- **Suite 1398 pass / 4 skipped, tsc 0, build exit 0, probes caught** (incl. the new scrub over-scrub
  guard — proven by mutation). Re-run to reconfirm. Tree clean, `main` synced.
- **`SURFACE_VERSION.day_read = 2026-07-23-revelation-migration-complete`** (v943 bumped it → every day
  read regenerates). `PROMPT_VERSION` unchanged from v942 (`2026-07-23-narrative-economy`).

## THE THROUGH-LINE of this session (the mental model to load)
The math is stable; the work is now **editorial, not engineering**. David's framing, ratified across the
session: *"the remaining work is no longer about exposing more of the computation — it is refining the
reading through subtraction, unity, and resolution."* Evaluate every reading against the **Constitution**
(does it read as ONE understanding?), NOT against implementation completeness. **Think like an editor, not
an engineer.** Memory: `velea-editorial-phase`, `velea-baseline-before-tuning`, `velea-audit-report-format`.

## What shipped this session — v943 (all on `main`)
An audit of the v942 day read found the revelation rewrite was **half done**: the top of `DAY_READ_TAIL`
was P14/P15-compliant but the bottom still carried the legacy **CAST roll-call** ("THE LOADED PLANETS ARE
NOT OPTIONAL… take a roll call: every loaded planet present") — the exact recitation the read was told NOT
to do. The block was premised on a FALSE claim ("the Cast surface is GONE" — it is a LIVE surface:
`service.ts getCastRead`, its own cache row, `SURFACE_VERSION.cast`, `router.ts`). So deleting it was a
factual correction, not a method call. v943 (all neutral, David held every method change):
- **Deleted the CAST roll-call block** (STORY IS THE CAST / LOADED PLANETS NOT OPTIONAL / THE VOICE /
  FIVE LAWS), keeping OPEN WINDOWS between them. Tail is now revelation-only end-to-end.
- **Migrated the retired mode vocabulary in the day-read tail to `input.dayFilter`** (BASE already retires
  the four mode names when dayFilter present). Fixed the SCOPE line, MANDATE pt 1, the SCENE atmosphere,
  the "not one thing" law, the gold example, two illustrative names.
- **Fixed the `SIGN_SCRUB` overreach** in `generate.ts` — it was mangling ordinary prose ("recovering from
  cancer" → "…from that ground", "Leo asked" → " asked"). Now scrubs only never-a-word signs
  (Taurus/Scorpio/Sagittarius/Capricorn/Pisces); homographs are guarded upstream. +2 guards, probe-proven.
- **NOT changed (deliberate):** `panchang.hora` stays null — that null is the mechanism enforcing the
  no-hora law (`velea-day-read-no-hora`); Leg D mis-flagged it as dead, the comment shows it's a guard.

## David's #1 test — PASSED, then editorially audited
David read the deployed v943 day read and ruled: **"the first version that satisfies the Constitution
structurally."** Then requested a pure **editorial audit** of it against the Constitution (no engineering).
Verdict: the governing idea is strong ("Complete the mending; close it with care"), but a second theme
(Saturn's identity-pivot / "the making of beautiful work") competes and never resolves; the closeLine
recaps three conditions instead of landing one; two nakshatra names leak. The lapse is ~10% — subtraction,
not rewrite. (Full audit is in the transcript; not re-pasted here.)

## THE NEXT WORK — the Constitutional Migration Roadmap
The Day Read is **V1 of the Constitutional framework**. Every OTHER surface predates the Constitution
(prompts dated Jul 12–22) and still shows the coverage-and-recite pattern. This session produced the
migration strategy — **artifact: https://claude.ai/code/artifact/8b5079a3-7814-4dfe-9719-b3cda85184f6**
(source: `scratchpad/migration-roadmap.html`; republish same path to keep the URL).

**Core insight — migrate by LITERARY FORM, not by surface.** ~18 surfaces, 5 forms, each with one
editorial contract + one migration recipe. Pilot the recipe on a form's easiest member, then batch siblings.
- **Form A — Daily Card** (`glance`, `day_read`✓, `cast`, `verdict`)
- **Form B — Period Arc** (`month`, `eclipse_season`, `mercury_rx`, `planet_rx`, `tl_window`, `window_read`)
- **Form C — Standing Structure** (`deep`/`deep_full` the year, `house_read`, `dasha_read`/`chapter`)
- **Form D — Relational** (`combined_read`)
- **Form E — Pointed/Topical** (`life_area`, `atlas_read`, `yoga_read`)

**Recommended order (risk-ramping, learning-compounding):** 1) `glance` · 2) `eclipse_season` (Form B
pilot) · 3) `month` + rx/window batch · 4) `cast` + `verdict` · 5) the **year** (`deep`, Form C flagship —
hardest, most trapped quality, highest regression, do last with most learning banked) · 6) `house` +
`dasha`/`chapter` · 7) `combined` · 8) `life_area` + `atlas` + `yoga`. **`glance` is step 1** (fast, most-
seen, low blast radius; retires the mode-name leak). The two concrete debts retire inside this order: the
**glance mode-names** at step 1, the **year's `why`-machinery** at step 5.

**When migration begins (NOT yet — David has not greenlit editing prompts):** each surface ships one at a
time, observe the DEPLOYED output, then the next. One variable, one observation.

## Cross-surface audit findings (from reading 20+ cached readings)
- The **lived-voice translation is a solved problem brand-wide** — the growth edge everywhere is subtraction.
- **Recap endings are systemic** (month "three beats", day "rare alignment, hard-won strength…").
- **Two machinery leaks:** the `glance` opens on the retired mode name ("A Productive Restraint Saturday");
  the `deep`/year read has a two-voice split — a lived `synthesis` and a machinery `why` (house numbers,
  raw Sanskrit: "9th house", "Swati", "gandanta", "moolatrikona").
- **Formula in the year read:** every `developmentalTask` opens "Stop X and start Y"; every read glosses
  "mahadasha (the long, years-long cycle)" verbatim.

## OPEN — method decisions David is HOLDING (do NOT act until he rules)
Deliberately deferred until the day read's coherence is confirmed and the doctrine is stable:
- **Aspect materiality floor** — engine hands ~median 8 (max 23) material aspects/house (`MATERIAL` =
  moderate/≥24 virupas = 40.9% of the arc). Raise toward `strong` (≥36 → median 5) / ≥42 (→ median 3)? His
  tuning call. (`aspect-strength.ts` `INFLUENCE_BANDS`; the gate in `input-builder.ts` ~859.)
- **The `ontoRole:"return"` label** — can never tag a real return (sputaDrishti=0 in the conjunction band);
  it only fires on self-opposition/trine. Rename to `self`/`own-ground`, or make arc-aware?
- **Rahu/Ketu graded drishti** — nodes gate on the same curve, ~22% of aspect volume. Same gate or
  different? (Also the Transparency-of-Departure method to finalize.)
- **The mode-fallback subsystem** — on a `dayFilter` compute failure the read still falls back to retired
  mode vocabulary (`input-builder.ts` empty catch ~1027 + BASE mode refs). Keep the fallback or retire modes
  on all paths? A degradation-design call. (The day-read tail is already fully off modes; this is cross-surface.)

## Tools / how to see any surface's real output
`scripts/dump-readings.ts` (read-only, no LLM spend) dumps the latest CACHED reading per surface for a
user's profiles:
`DATABASE_URL='<railway url>' npx tsx scripts/dump-readings.ts David@velealor.com [surfaceFilter]`
Note: `cast`/`chapter`/`dasha_read`/`house_read`/`window_read`/`yoga_read` printed only their `question`
(nested content shape the extractor's `PROSE_KEYS` didn't unpack) — extend `printContent` if those bodies
are needed. This is how to observe each surface before/after migration.

## New memories written this session
`velea-editorial-phase` (subtraction/unity/resolution; editor not engineer) · `velea-baseline-before-tuning`
(fix contradictions first, hold method) · `velea-audit-report-format` (exec summary + deployed output +
his-call decisions only).

## Read first — the order
1. `CONSTITUTION.md` — SUPREME doctrine (16 principles + 2 standing rules). The migration measures every
   surface against this. Memory `velea-constitution`.
2. This file's THROUGH-LINE + the migration roadmap artifact (the next work).
3. `CLAUDE.md` — the method (accuracy > money > cosmetics; RULE ZERO; never take a green as truth).
4. `SYSTEM_MAP.md` — architecture; `server/narrative/prompts.ts` holds every surface tail + `SURFACE_VERSION`.
5. `NARRATIVE_AUDIT.md` — north star: "the engine's job is to know everything; the reader's job is to
   understand one thing."

## Proposals still awaiting David's notes (do NOT build until he formalizes)
- **Tithi as cadence** (`velea-tithi-cadence`). He's writing notes.
