# Velea — Session Handoff

_Last updated 2026-07-24 (evening), end of the session that **built the Orientation Layer** and then,
by tracing real readings sentence-by-sentence, found the app's true frontier: the reading has clean
facts but **no spine**. The session ended on the fix — *the engine writes the scene; the LLM expands
it* — and a proposed experiment to prove it. This is the "start here" note. The single living to-do
doc is `tools/working-brief/index.html` (artifact `4810c922-f34f-4c43-bf41-8d1439fa6b30`)._

> **First action, before trusting anything below.** Re-run the state checks (`git status`,
> `git log --oneline -12`, `grep APP_VERSION client/src/lib/version.ts`, `grep eclipse_season
> server/narrative/prompts.ts`, `npx vitest run`, `curl -s https://velealor.com/healthz`) and treat
> their output as truth over this file. Prod runtime state is NOT in these files — verify against prod.

## Current state (verify, don't remember)
- **Live: v1.1.944, commit `93955f1`** (`/healthz` confirmed; `= origin/main`). This is Orientation **v0.4**.
- **Local HEAD is `52e1e2e`** — David's "Gloock is the TITLE face only" commit — **committed but UNPUSHED
  (not live).** So live still renders Gloock across all display; the title-only restriction is David's call
  to push. `APP_VERSION = 1.1.944`, `sw.js` cache `velea-cache-v944`.
- `SURFACE_VERSION.eclipse_season = "2026-07-24-orientation-v0.4"`. Suite 1398 pass / 4 skipped, build
  exit 0 (last run at v0.4). The deploy tell for server-only changes is the `commit` field on `/healthz`.
- **Uncommitted in the tree (all David's / awaiting his hand):** `CONSTITUTION.md` (the new P17/P18),
  `tools/working-brief/index.html`, `server/_core/index.ts`. **Untracked:** `ORIENTATION_SPEC.md` and three
  dev scripts. **`stash@{0}`** = the 24-Jul eclipse voice rework, recoverable.

## THE THROUGH-LINE (the mental model to load)
The math is stable; the reading isn't the engine. We built **THE ORIENTATION LAYER** — the missing middle:
*engine LOCATES facts → orientation RELATES them (locates the movement in the person's running timeline) →
LLM VOICES.* Then we validated it the only honest way — pulling real app readings and **tracing every
sentence back to its deterministic provenance** (untraceable sentence = hallucination candidate → tighten
→ pull again). That loop closed the provenance leaks. But it revealed the real edge: **even with perfectly
clean facts, the reading reads as a true LIST, not ONE understanding.** It has no SPINE. David's own rewrite
(Jyeshtha as the Moon's enduring sister, soul-as-light, "she needs her allies to act") HAS a spine the
engine's lacks — and a spine is a *synthesis move, not a constraint*. You cannot constrain your way to one.
This is the Constitution's actual frontier (**P15: revelation, not coverage**).

## What shipped this session (all on `main`, unless noted)
- **`9c021ef` Orientation v0** — `server/layers/orientation.ts`; attaches `input.orientation` for the
  eclipse arc with three contexts: **Timeline** (running dasha + profection), **Authority** (which running
  lord each eclipse engages, via dispositor/strike — identity match), **Personal** (each engaged actor
  re-sourced from `natalCondition`, so the Moon reads cancelled/hard-won, not thin "Debilitated").
- **`f2f61fb` Gloock** — self-hosted display serif replaced Didot as `--font-serif` (client change, bumped
  to v1.1.944 + sw cache). Later restricted to title-only by David in `52e1e2e` (unpushed).
- **`3c25799` v0.1** — **Canon Context**: the dispositor-activated planet-in-house facet narrows the flat
  house gloss (Moon/11th → "Popularity in Groups"; Saturn/6th → "Overcoming Debts and Diseases"). + renderer
  constraint (no invented future resolution/closure). Reuses the existing planet-in-house canon; invents nothing.
- **`cd2b9f8` v0.2** — (a) **no invented computed events** (nothing named that's nowhere in the payload —
  killed "Mercury's station"); (b) **temporal input-prune** (un-parked): every arc surface now sheds the
  DAY layer — `panchang` / crown (`natal.personalApex`) / `dayFilter` — via non-mutating omit. Killed
  "today's gentleness" bleeding into a multi-week season. Day read (no arc flag) untouched.
- **`cd109ad` v0.3 → `93955f1` v0.4** — the causal rule, then its **correction**. v0.3 cut a planet's
  current ambient state; David caught that this strips an ACTOR's weather, which is *how the actor plays
  its role* (states-not-labels). v0.4 splits it clean: **Invention** = named but nowhere in the payload
  (cut). **Selection** = which in-payload fact earns a place — "whose fact is this?": an actor's (a lord
  that governs/disposes/strikes via orientation) keeps its weather (motion, near-station, the house it
  moves through); a non-participant's "happening now" fact is cut.

## Constitution — two new principles (UNCOMMITTED, awaiting David's ratification)
Added to `CONSTITUTION.md` (now 18 principles), left uncommitted for David to commit under his own name:
- **P17 — Identity Qualifies, Relationship Activates.** Being something (ruler/significator/karaka) only
  qualifies; activation requires a relationship (occupancy/aspect ≥24 virūpas/conjunction/strike/convergence).
  Measured in `life-areas.ts` over 14,400 area-days. The one law the days-long investigation reduces to.
- **P18 — Assume the Doctrine Already Exists.** Before authoring a rule, assume the engine already computes
  it; exhaust the search first. Held 5× (Subject, Recognition, Authority Stack, `facetsOf`, canon activation).
  A read-only inventory found the engine already performs canon-activation in ~15 places. Full design in
  **`ORIENTATION_SPEC.md`**.

## THE NEXT WORK — the spine, and the experiment to find it (NOT built)
The fix, ratified by David at session's end: **the engine writes the SCENE.** Not a paragraph — ONE
deterministic spine-sentence, computed from orientation (the convergence), that the LLM's only job is to
*open into a room* using the payload. Spine from the engine (grounded, no invention); dimension from the LLM.
Stop begging the model to *find* the one thing; HAND it the one thing.
- **For the eclipse read specifically:** the Moon is a natural spine — for David it is *camera + mahadasha
  lord + solar-eclipse dispositor + the physical cause of the eclipse + the theme (light)*. Narrate THROUGH
  the camera (the Moon). Velea is an **oracle / scrying mirror**; the reading is about time / the horizon.
- **THE EXPERIMENT (David's idea, agreed, not yet built):** strip all the constraint machinery, give ~1400
  words of room, set the oracle frame + the Moon-as-lens scene, and let the LLM generate FREELY — then map
  the data backward. Diagnostic, NOT shippable (it will invent without the guards). Purpose: see the ceiling
  and watch which data it reaches for → that's what the engine should compute into the scene. This is the
  next move. Cleanest build: a throwaway `ECLIPSE_SEASON_TAIL_EXPERIMENT` behind a one-line swap in
  `generate.ts`, deploy, pull, look, revert.

## Open / deferred (do NOT patch these in isolation — fold into the spine work)
- **Canon fitness gate — DEFERRED** (David: exhaust provenance/renderer first). Cross-chart trace found the
  planet-in-house table is a grab-bag: some activated facets are off-theme or alarming — "Pets" (4th/Saturn),
  "Prisons, Imprisonment" (12th/Saturn), "Father's Popularity" (9th/Moon), "Lack of Empathy" (7th/Saturn).
  Revisit ONLY if it still misfires after the spine rework. No new heuristic until then.
- **Two prose defects David called band-aids (NOT fixed on purpose):** "background weather" jargon leaked
  into the closeLine from our design talk; the "if you let it / lay low" contradiction (the *letting* IS the
  action). Resolve inside the spine rework, not as word-patches.
- **The 9th under-served:** David's profection year IS the 9th (fortune), Venus rules his 9th + 2nd; the read
  only voiced "worth/craft" (2nd) and never named his year's own house.
- **Ratify P17/P18** (commit `CONSTITUTION.md`). **Push (or not) `52e1e2e`** (Gloock title-only).

## Tools (untracked; David runs with the Railway URL in his terminal)
- `scripts/dump-eclipse-data.ts` — the full eclipse payload + THE ORIENTATION PAYLOAD (timeline/authority/
  personal/canon) per profile. The trace instrument.
- `scripts/clear-eclipse-cache.ts` — force one profile's eclipse read to regenerate.
- `scripts/dump-dasha.ts` — a profile's antardasha timeline with exact dates.

## Read first — the order
1. `CONSTITUTION.md` — 18 principles (P17/P18 new). Memory `velea-constitution`.
2. `ORIENTATION_SPEC.md` — the layer's responsibility, invariant (`Facts → Movements → Orientation →
   Rendering`), 6 contexts. Memories `velea-orientation-layer`, `velea-complete-message-not-hanging`.
3. This file's THROUGH-LINE + NEXT WORK (the spine + the experiment).

## Personal (memory: `david-lineage-and-father`)
David's father passed ~2022; his lineage work (memoir, Khmer myth retellings, Velea itself) is ancestral.
Handle 9th/father/lineage in readings with weight — complete the message, never touch-and-leave. Proof-log
candidate (offered, not yet written): Moon–Saturn antardasha began **27 May 2025** — David: "knew it,
spring 2025, felt it before I checked."
