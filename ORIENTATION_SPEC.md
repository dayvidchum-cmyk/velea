# The Orientation Layer — design specification

_Status: DESIGN (implementation-independent). Authored with David, 24 Jul 2026. No code yet.
This document is the durable architectural boundary; a `CONVERGENCE_LAYER` was the working name and
is retired — "convergence" is one pattern this layer may find, never the layer itself._

---

## Responsibility (canonical)

> **The Orientation Layer computes the relationships among already-established astrological facts so
> each transient movement is deterministically located within the user's standing chart, running
> timeline, and current chapter before any prose is generated. It introduces no new astrological
> facts, performs no interpretation, makes no predictions, and increases no certainty. It only
> establishes context.**

It answers the user's founding question — *"help me understand where I am"* — by making that answer
a **fact the engine hands over**, never a thing the renderer has to invent.

The engine says **what is**. The renderer says **how it reads**. The Orientation Layer says **where
this sits in the person's story** — the missing middle.

---

## The pipeline invariant (proposed constitutional principle)

> **The engine does not render facts directly. Every narrative surface first constructs Movements
> from facts. Every Movement is then oriented within the user's standing chart and running timeline.
> Only then may the rendering layer produce prose.**
>
> `Facts → Movements → Orientation → Rendering`

The test every future feature must pass is a property of the pipeline, not a reminder:
**"Did we orient it?"** — never "Did we remember to run the Orientation Layer?"

_(Staged here as a proposed principle for `CONSTITUTION.md`; David to promote — "almost
constitutional" until he ratifies.)_

## Two laws (proposed constitutional)

1. **Orientation computes no new astrology.** It computes relationships among already-established
   truths. It joins facts; it never derives one. (Keeps it from drifting into a second interpretation
   engine.)
2. **Orientation must never increase certainty.** It may connect facts. It may narrow context. It may
   never infer a fact not already supported by computation. Every term in every emitted relationship
   must trace back to an already-computed input fact. The layer may *subtract* (narrow) but never
   *add* a claim. **This is probe-able** — a test asserts every output term has an input source.

---

## The six Contexts it establishes

Each is a deterministic join over already-computed data. **Movement Context** is the movement's own
internal structure (the subject being located); the other five are the contexts it is located
*within*.

| Context | Locates the movement by… | The join |
|---|---|---|
| **Movement** | its own internal structure | the movement's actors ↔ its own houses / dispositor |
| **Timeline** | where it sits in the running clocks | movement window ↔ dasha / profection phase |
| **Authority** | which running lords it engages | movement actors ↔ maha / antar / pratyantara / profection year-lord. *Agreement among these is what "convergence" names — a detectable pattern, not the layer.* |
| **Personal** | how it meets THIS natal chart | movement ↔ struck natal points; and `natalCondition` that modulates how the same movement lands differently for this person than another |
| **Canon** | which facets the chart resolves | canon facet list ∩ activating conditions → the resolved subset (never the whole list) |
| **Narrative** | its continuity with the current chapter | movement significations ↔ current chapter's significations |

Each participating actor's condition is **re-sourced from the authority record** (`natalCondition` /
the dasha `.natal` block), not the movement's thin per-frame copy. This single move makes Personal
Context answerable — and absorbs the "Moon = flat `Debilitated` instead of cancelled/hard-won" bug as
a side effect.

---

## Consumes (all already computed — no ephemeris, no new sky math)

- **The transient movement** — `eclipseSeasonArc` / `mercuryRxArc` / `monthArc`; for Day:
  `panchang`, `transits`, `activatedAspects`; `timeLordTransit`.
- **The running timeline** — `profection` (activated house, year-lord, its ruled houses); `dasha`
  (maha / antar / pratyantara, each with its `.natal` condition + `rulesHouses`).
- **The standing self** — `natal`; `natalCondition` (the enriched per-lord research store); `stage`
  (hosts, companions, current character conditions).
- **The canon** — `HOUSE_KEYWORDS` and the nakshatra facet lists (the raw material Canon Context
  resolves against).

## Emits

An `orientation` block per movement: the set of **context relationships** (what connects to what, via
which context, carrying each actor's re-sourced condition), and the **resolved canon facet subset**.
Each relationship is a *complete message-seed* — enough for the renderer to voice a located account
without inventing one. **No scores, no ranks, no prominence** — narrowing only; foreground emerges
downstream.

## Pipeline position

A **universal post-assembly phase** — the last deterministic phase before rendering. It runs *after*
movement construction and after the rest of the payload is assembled (it needs the movement AND the
timeline AND the natal record all present). It writes a **separate block**, never mutating the
movement (that would couple it to each frame's shape). Surface-agnostic: it keys off whatever
movement + timeline are present, so Day / Month / Eclipse / Transit / Year / Compatibility are all
oriented by one mechanism instead of each prompt reinventing it.

---

## Failures this closes

- **"Left me hanging"** — completeness becomes structural; the connection is computed, so it can't be
  silently omitted.
- **The cancelled-Moon label bug** — subsumed; condition re-sourced from the authority record.
- **Recap endings / redundancy** — the WHY slot had no content, so prose padded WHERE/WHAT; fill it
  and the padding has nowhere to go.
- **Canon-dump risk** — the facet subset is resolved deterministically; the renderer never gets the
  whole list to guess from.
- **The renderer inventing relevance** — relevance/why becomes a handed-over relationship (closes a
  RULE-ZERO-class hole).
- **Subsystems that don't talk** (`spotlight: false` while the eclipse strikes the year-lord;
  dispositor dignity ≠ dasha dignity) — this is the layer where they finally join.
- **Cross-surface inconsistency** — every surface answers its context the same way.

---

## Non-goals (the boundary)

Not the engine (no new sky facts). Not the renderer (no prose). Not interpretation (canon + prompt
assign meaning). Not prediction (no outcomes). Not a scorer (relationships, not metrics).

---

## RESOLVED — the Canon Context activation rule is not authored; it already exists

A read-only inventory (24 Jul 2026, 5 parallel traces) found the engine already performs
canon-activation-by-computed-relationship in ~15 places. The activation rule is **not undiscovered
doctrine** — it is pervasive and consistent, and the governing law is now **Constitution Principle 17,
_Identity Qualifies, Relationship Activates_**: a canon row goes live only when a *relationship*
(occupancy / aspect ≥24 virūpas / conjunction / transit-on-point / running-lord convergence) ties it to
the chart; *identity* (ruler/significator/karaka status) never activates — it only qualifies. This was
ruled and **measured** in `life-areas.ts` (14,400 area-days).

**Canonical form of the rule** = the knots gate generalized (`knots.ts:305`): a row is live when a
running period-lord stands in a computed relationship to the row's houses/significators; a *slow* transit
landing on the ruler dates it as an *event*.

So the Canon Context **exposes and generalizes** existing activation. The residual work is engineering,
not doctrine:
1. **Apply the existing activation to the movement surfaces** (eclipse/month/rx) that currently bypass it
   and dump `HOUSE_KEYWORDS` whole.
2. **Connect the activation that is computed but unconsumed** (`illuminates`, the stage `CastSheet`, the
   `yoga→knot` reinforcement).
3. **(Optional, hygiene — David's call, not doctrine)** lift the handful of LLM-finished *lead* picks
   (day-tilt leading-facet, secondary agenda verb, yoga "live today") into the engine; their inputs and
   rules already exist as prose.

Burden of proof has shifted (Principle 18): assume more activation exists in the engine until exhausted.
No doctrinal ruling blocks the build spec.
