# Golden Moment × Panchapakshi — the decision matrix (scope, draft)

Draft 2026-07-01. The remaining piece of the Golden Moment concept: fuse the
UNIVERSAL signal (the Stage / slow-planet weather) with the PERSONAL signal (the
Check-In, i.e. Panchapakshi embodied in the vessel) into one go/hold verdict.
See references/velea-concept.md (the original matrix) and
golden-moment-spec.md (the universal layer, already built).

INTERNAL naming rule holds: never label the output "Golden Moment" /
"Panchapakshi" to users (see [[velea-universal-vs-chart-internal]]). The verdict
itself (act / wait / etc.) can be user-facing; the machinery names stay internal.

## Inputs (both already exist)

- PERSONAL readiness ← today's Check-In (5 measures 1-5: physical, mental,
  emotional, creative, motivation). Server: `getTodayCheckIn`, `checkIn` router
  (routers.ts:1090). May be ABSENT (no check-in today).
- UNIVERSAL favorability ← the Stage signals from `computeGoldenMoment`
  (server/sky/golden-moment.ts), each carrying direction (favor/caution) + weight.

## Step 1 — reduce each side to favorable / neutral / unfavorable

**Personal (from Check-In):** average the 5 measures (1-5).
- avg ≥ ~3.7 → favorable; ≤ ~2.3 → unfavorable; else neutral.
- No check-in today → UNKNOWN (prompt to check in; treat as neutral for the verdict).

**Universal (from Stage signals):** net = Σ(weight·+1 for favor) − Σ(weight for caution).
- net > +0.4 → favorable; net < −0.4 → unfavorable; else neutral.
- (Eclipse windows and stations push caution; Jupiter/lit-house push favor.)

## Step 2 — the verdict (2×2, from velea-concept.md)

|                       | Universal favorable | Universal unfavorable |
|-----------------------|---------------------|------------------------|
| **Personal favorable**   | GO ALL IN — strongest day to act, inner + outer aligned | Trust yourself: fine for high-stakes/personal acts; hold collective launches |
| **Personal unfavorable** | The moment carries it: send what's ready / collective acts, even if you feel muted; avoid high-stakes personal | WAIT — or do quiet behind-the-scenes work |

Neutral on either axis → soften to a "proceed with judgment" reading leaning toward
whichever axis is stronger.

## Step 3 — task-type nuance (the key subtlety)

The matrix's off-diagonal cells depend on WHAT the act is:
- HIGH-STAKES / PERSONAL (signing, confronting, posting something vulnerable) →
  weight PERSONAL readiness.
- EXTERNAL / COLLECTIVE (launching, sending something already prepared, attending) →
  weight UNIVERSAL.
So the output isn't one flat verdict — it's a verdict + a one-line "for personal
high-stakes: … / for launches & sends: …" split when the two axes disagree.

## Step 4 — output & placement (options, decide below)

- A compact verdict line/indicator (act / go-all-in / hold), plain-language, no
  internal labels, near the day mode or inside the Stage panel on Today.
- When there's no check-in: show the universal read + a nudge to check in for the
  full call.
- Display-only vs also feeding ranking: v1 display-only (it's guidance), like the
  matrix. Ranking already uses the universal signals via goldenMomentEffect.

## Open decisions

1. Placement: its own small "Today's call" card, or a line inside "The Stage"?
2. Flat verdict vs verdict + task-type split (personal vs collective)?
3. Display-only, or also let a strong "wait" further damp Action-launch task ranking?
4. No-check-in behavior: universal-only read + prompt, or hold the verdict entirely?
5. Thresholds (personal 3.7/2.3, universal ±0.4) — tune later.

## Phasing

- P1: a pure `computeVerdict(personal, universalSignals, opts)` → { call, personalLevel,
  universalLevel, forPersonal, forCollective, summary } + unit tests. No UI.
- P2: a `sky.verdict` (or extend `sky.stage`) endpoint combining Check-In + signals.
- P3: the Today display.
