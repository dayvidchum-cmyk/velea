# Velea — Session Handoff

_Last updated 2026-07-24, end of a session that **rebuilt the narrative layer's architecture from the
reader backward** — reverted a night of constraint-laws that had caged the voice, and settled the
compute/render division that governs the whole reading engine. This is the "start here" note. The single
living to-do doc is `tools/working-brief/index.html` (artifact `4810c922-f34f-4c43-bf41-8d1439fa6b30`).
This file is continuity._

> **First action, before trusting anything below.** Re-run the state checks (`git status`,
> `git log --oneline -15`, `grep PROMPT_VERSION server/narrative/prompts.ts`, `npx vitest run`, and
> `curl -s https://velealor.com/healthz`) and treat their output as truth over this file.

## Current state (verify, don't remember)
- **Live: commit `ce7b229`** on velealor.com (confirmed via `/healthz` → `{version:"1.1.943", commit:"ce7b229"}`).
- **`APP_VERSION` unchanged at 1.1.943** — every change this session was server-side (prompt only), so the
  client version did NOT bump. **The deploy tell is now the `commit` field on `/healthz`, not the version
  number** (see [[velea-healthz-deploy-signal]] — added this session).
- **`PROMPT_VERSION = "2026-07-24-experiential-center"`** (bumped repeatedly this session → every surface
  regenerated). Suite 1398 pass / 4 skipped, tsc/build exit 0. Tree clean, `main` synced.

## THE THROUGH-LINE of this session (the mental model to load)
The night began in the "editorial / subtraction" frame and **ended by overturning it.** The core discovery,
ratified by David: **the voice was never the problem — we had been caging it.** Every "law" added early in
the night (Form-B migration, the narrative contract, the preparation law, register-based budget) was a
CONSTRAINT (cut / reduce / compress / develop-fewer). Stacked, they taught the model to **amputate the
truest thing** — David's own lived Saturn / lineage went present-but-hanging → thin → deleted across three
reads, and I wrongly celebrated the deletion. **We reverted all of it** back to the pre-session voice and
added only *permissive* aims.

The settled architecture (memory: [[velea-voice-architecture]], [[velea-movement-object]]):
- **The razor:** a *third-person property of reality* → **compute** it (engine). A *second-person address
  to the person* → **render** it (voice). "Compute reality, render humanity" — now operational.
- **Discipline belongs to the engine, freedom to the voice.** The engine hands the palette; the voice paints.
- **Accuracy is the value, not the liability** (David): the engine touched his real lineage; the fear came
  from naming the true heavy thing and *abandoning* it, never from naming it. The fix is always to FINISH
  the true thing — never to say fewer true things. Subtraction is the LAST resort, not the default.

## What shipped this session (all on `main`, all server-side prompt changes)
- **`db084a0`** — `/healthz` now exposes the Railway commit SHA (server-only deploys became observable).
- **`7b01247` → `9750d60` — REVERTED.** The four constraint-laws (Form-B eclipse migration, the narrative
  contract, the preparation/five-element law, register-based budget + eclipse cap 550→720). They caged the
  voice; `1814f7d` reverted `prompts.ts`+`generate.ts` to the pre-session voice. **Do not re-add cutting
  constraints.**
- **The three PERMISSIVE voice laws now in `BASE_PROMPT`** (near AGENCY / SPARSE DATA; the whole current
  narrative philosophy):
  - **`1814f7d` COMPLETE WHAT YOU OPEN** — trust the engine's selection; follow the heavy thing through;
    never name it and leave the reader hanging.
  - **`9b6ad2a` PAINT THE LIVED IMAGE, NOT THE PAINT** — sky-data is the palette (why you know), never the
    subject; render the reader's *life*; recognition = patterns they can check against their own weeks,
    never events/predictions; hierarchical (season felt-shape + 1–2 heaviest threads; beats reinforce).
  - **`ce7b229` THE EXPERIENTIAL CENTER** — render the movement's *second-person face* (what it asks of the
    reader) in whatever form best prepares them (question / recognition / warning / invitation…); never a
    theme or stated meaning; hand the fork, let them answer by living. Invariant but EMERGENT → a render
    law, NOT a computed field.

## THE NEXT WORK — the compute half (designed this session, NOT built)
The render half is shipped. The durable engine build ahead is the **universal Movement object**
([[velea-movement-object]]). The verified inconsistency: the **natal path** computes a *subject* before
generation (`facetsOf()` at `input-builder.ts:533`, canon `{subject,topic,relationship}`); the **eclipse /
arc path** (`input-builder.ts:1404`) computes only house + dispositor + hits and makes the LLM *infer* the
subject — which is why arc reads vague out where no natal hit resolves the facet.

The abstraction: every surface should emit a **Movement graph** — Movements carrying **Claim**
(subject+polarity, action+fork) · **Provenance** (evidence, confidence) · **Prominence** (salience,
relationships) · **Extent** (timing); the experiential center EMERGES (render-side). Generalize
`natalCondition`/`facetsOf` into the full Movement and compute it on EVERY surface, so no reading ever hands
the LLM a canvas without a sketch.

**Blocked on David's method rulings** before building: (1) is the eclipse LUMINARY a co-equal subject-root
or does the house lead? (2) lead-facet precedence (lean: tight hit → dispositor-colored → karaka → house);
(3) nodal-direction weight; (4) tight-hit orb / max co-leads. Salience confirmed core.

## Open acceptance test (David's eyes)
A regenerated **eclipse-season** read under all three laws: does the voice now hand him the *question*
("what still belongs in the future I'm building?") instead of explaining the sky — and does his lived
**Saturn** read whole, not trimmed? Expect it sharper where a natal hit resolves the subject (Venus/lunar),
still softer where it doesn't (solar/11th) — that residual gap closes with the compute-half build, not prose.

## New memories written this session
[[velea-voice-architecture]] (the razor + don't-cage-the-voice + the 3 laws) · [[velea-movement-object]]
(the compute-half roadmap) · [[velea-healthz-deploy-signal]] (the commit-SHA deploy tell). Corrected
[[velea-editorial-phase]] (subtraction-as-default was wrong).

## Read first — the order
1. This file's THROUGH-LINE + [[velea-voice-architecture]] (the night's core lesson).
2. `CONSTITUTION.md` — SUPREME doctrine; the razor extends P10/P15, does not replace them.
3. `CLAUDE.md` — the method (accuracy > money > cosmetics; RULE ZERO; never take a green as truth).
4. `SYSTEM_MAP.md` — architecture; `server/narrative/prompts.ts` holds `BASE_PROMPT` (the three voice laws)
   + every surface tail + `SURFACE_VERSION`/`PROMPT_VERSION`.

## Proposals still awaiting David's notes (do NOT build until he formalizes)
- The **Movement-object compute build** (above) — needs the four rulings first.
- Standing from before this session: the Constitutional Migration by literary form; **P17 (Narrative Depth)**
  and a preparedness/purpose line into `CONSTITUTION.md`; **glance-is-phantom** roadmap fix; **Form F
  (Temporal Opportunity)**; **Tithi as cadence** ([[velea-tithi-cadence]]).
