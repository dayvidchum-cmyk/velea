# Stage engine — wiring plan (for David's approval)

_2026-07-22. You built the Cast/Camera/Tension engine on 7/21 ("the engine decides, the model
narrates") and it was never wired into a reading. This plan says exactly where it goes and how,
with test+probe. **No code until you approve.** Every file:line below was verified against HEAD._

## 1. The finding (why it's unwired, and the catch)

`server/sky/stage.ts` — `computeStage()` / `findTension()` — is imported ONLY by two scripts
(`stage-today.ts`, `venus-three.ts`). `git log -S` across the narrative pipeline, routers, and
client is empty: never wired, never reverted. Today the reading makes the **LLM improvise the
stage** — `prompts.ts:1910` literally says _"DISSOLVE THE CHART INTO STORY — CHARACTERS,
TERRITORIES, A STAGE."_ That is the model inventing the cast, which your engine-decides law forbids.

**The catch that changes the target:** the `slow`-mode narrative reading (the one whose cache label
is "stage") is **year-scoped and forbidden from talking about the day** — it deliberately strips the
day layer (`input-builder.ts:966`, `personalApex` removed, logged as a real money leak). But
`sky/stage.ts` is **day-scoped**: its Camera IS the transiting Moon, its Tension is today's aspects,
its sceneLead is "who the Moon highlights TODAY." So the engine must NOT go into the year "stage"
path — it belongs where the day's cast is read.

## 2. The target surface: the "cast" read (already exists, already improvises)

There is already a day-scoped **"cast" reading**:
- `getCastCached(profileId, date, refresh, dayLoc)` — `service.ts:721`. Builds input via
  `buildNarrativeInput(profileId, date, { dayLoc })` (the day/full path), caches under
  `("cast", date)`, salted by `SURFACE_VERSION.cast`, hashed `dayStableHash(input, "cast")`.
- `generateCast(input)` — `generate.ts:970`: `callGuarded({ tail: CAST_TAIL, toolName: "cast",
  schema: CAST_SCHEMA, maxTokens: 320, maxWords: 130 })` → returns `{ read: string }`, one ~120-word
  paragraph.
- `CAST_TAIL` (`prompts.ts:2343`) currently tells the model to DECIDE who's loud from raw markers:
  `:2360` _"A planet earns the stage only when the input marks it — spotlight:true, or combust, or
  nodal."_ That is precisely what `computeStage` pre-computes.

`computeStage` output maps 1:1 onto what CAST_TAIL asks the model to invent:
`CastSheet.chapterLead` (the annual Time Lord), `sceneLead` (lord of the lit house), `supportingCast`,
the single `Primary` `Character`, `Camera.illuminates {theme, specifics}`, and `StageTension
{name, between, because}`.

## 3. The naming collision (so we're wiring the right "stage")

"Stage" means four different things in this repo. We are wiring **(d) into (c):**
- (a) `sky.stage` router + `StageSheet.tsx` — the older "Golden Moment" weather sheet. Not this.
- (b) the `slow`-mode narrative "stage" reading — YEAR-scoped, day-forbidden. Not this (the catch above).
- (c) the **"cast" day reading** (`CAST_TAIL`, `toolName:"cast"`) — the day's characters. **THE TARGET.**
- (d) `sky/stage.ts` `computeStage` — the day Cast/Camera/Tension engine. **THE SOURCE.**

## 4. The wiring (three touch-points, all additive)

1. **Compute the Stage in the cast input path.** In `buildNarrativeInput` (day/full path), assemble a
   `StageInput` from values already in scope — `lagna`, `dasha` (dashaBase), `annualTimeLord =
   pf.timeLord` (`input-builder.ts:295`), retrograde/combust flags — plus the day's **transit**
   longitudes. Call `computeStage(...)` and attach the result as `input.stage`.
   - _One build-time detail to confirm (the only open code question):_ the exact source of the day's
     transit longitudes in the cast path. The `sky.stage` router uses `getCurrentSky(ctx.subject)`
     (`routers.ts:2938`); the day read already resolves current sky via `dayLoc`. I'll confirm which
     is in scope and thread the sidereal `transitLon` from it — no new data source, per the audit.
2. **Rewrite `CAST_TAIL` to narrate the handed structure**, not decide it. Replace the "a planet earns
   the stage only when the input marks it" instruction (`:2360`) with "narrate `input.stage`: the
   Camera's lit ground, the Primary character, the one Tension — do not choose who is loud, it is
   given." Keep the 130-word guard, the machinery scrub, the plain-language rules.
3. **Fix the #2 aggressor bug at the source** (rides along): `findTension` (`stage.ts:384`) writes
   `${o} presses on ${p}` even when only `aspects(p,o)` fired (p is the aggressor). Fix: name the true
   aggressor and orient the `${X} under ${Y}` frame to match (Y = aggressor). This is now correct at
   the moment it first reaches a reader.

## 5. Cache + cost

- Bump `SURFACE_VERSION.cast` once (busts ONLY cast rows — `service.ts:719`). The cast read is LAZY
  (fires only when THE READ is tapped), so regeneration cost is bounded to opted-in taps, not a fleet.
- The cast is day-scoped, so `input.stage` legitimately changes daily — that's correct here (unlike
  the year path, where a daily-changing field was the money leak). Confirm `dayStableHash` treats the
  stage fields as day-stable-within-the-day (they derive from the day's sky, which is the day's key).

## 6. Test + probe (a green is not enough — each guard gets a probe)

- **Unit (extend `stage.test.ts`):** a known chart+sky → assert `Primary` count == 1
  (`assertOnePrimary`), the Camera is the Moon, and the Tension names the TRUE aggressor (control both
  directions: o→p and p→o). This is where the #2 fix is locked.
- **Wiring test:** `buildNarrativeInput(cast path)` returns `input.stage` with the CAST_SCHEMA-relevant
  fields populated for a real profile+date.
- **Probes (same commit):** (i) break `findTension` direction → the aggressor test fails; (ii) drop
  `input.stage` from the cast input → the wiring test fails; (iii) revert the CAST_TAIL rewrite → a
  prompt-structure assertion fails. Confirm the probe COUNT rises by 3.
- **Then look at the rendered cast read** on the deployed app before calling it done — the paragraph
  must read as one coherent scene, not a fielded dump.

## 7. What needs your call

- **Scope.** Recommend wiring the **"cast" day surface first** (exact match, lazy, contained). The
  month stage (`MONTH_TAIL`) and the general day "dissolve into story" bar (`prompts.ts:1910`) are
  separate, larger surfaces — do them only after the cast wiring proves out. OK to start with cast?
- **Voice.** The rewrite hands the model structure but keeps YOUR voice rules. If you want the cast
  paragraph to change shape (not just source), that's a voice decision for you, not this plan.
