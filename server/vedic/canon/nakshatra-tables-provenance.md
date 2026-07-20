# The six nakshatra tables — which one has a source

*Researched 2026-07-20. The audit sheet has carried "the nakshatra tables contradict each other" as
an open row for days, framed as a clash between authorities. It is not that. Five of the six have no
cited source at all, and the one that does disagrees with the engine's loudest table.*

This is **provenance, not a ruling**. Nothing in the engine was changed. Which table Velea uses is
David's call; this exists so the call is made against the sources.

---

## The six

| # | Table | Where | Source |
|---|---|---|---|
| 1 | `nakshatraNature` — the seven natures | `canon/muhurta-tables.json` | **Cited.** Muhurta Chintamani (Nakshatra-prakarana) + Brihat Samhita Ch.98. Blessed by David 2026-07-15: *"use the standard classical tables."* |
| 2 | `NAKSHATRA_UPGRADE` / `DOWNGRADE` / `SELECTIVE` | `panchang/interpreter.ts:272` | **None.** Comment reads only "these determine how each nakshatra shifts the base mode score." This is REBUILD_MAP R1. |
| 3 | `NAKSHATRA_SCORE` (+1 / −1 / 0) | `panchang/auspiciousness.ts:14` | **None, and it says so**: *"a common general-purpose grouping."* An honest admission that it is folklore-level, not a cited table. |
| 4 | `NAKSHATRA_MODIFIERS` | `panchang/modifier-config.ts:45` | A second copy of #2. (Its sibling `HOUSE_TO_BASE_MODE` was a stale copy that had already drifted — deleted in v810.) |
| 5 | `NAKSHATRA_LIBRARY` | `panchang/interpreter.ts:411` | Per-star behavioural prose. Velea's own voice layer, not a classification. |
| 6 | bird / element groups | `panchapakshi/tables.ts:18` | A different axis entirely (Pancha Pakshi). Not in this dispute. |

**One of the six has a citation.** The clash the sheet reports is between #2 and #3 — two tables with
no source between them.

## The four stars, checked against the canon

The mode engine (#2) rates all four **+1, "expansion / outward movement"**. Day-quality (#3) rates
all four **−1, harsh**. What the cited table actually says, read out of `muhurta-tables.json`:

| Star | Canon nature | Canon's own guidance |
|---|---|---|
| Magha | **fierce** (Ugra) | avoid gentle things, beginnings, journeys |
| Purva Phalguni | **fierce** (Ugra) | ” |
| Purva Ashadha | **fierce** (Ugra) | ” |
| Vishakha | **mixed** (Misra/Sadharana) | neither, by classification |

So: three of the four are *fierce*, one is *mixed*, and **none is "expansion / outward movement."**
The canon does not support the +1 side for any of them.

> **Correction to the audit's own record.** An earlier pass reported that the canon classes all four
> as fierce. Vishakha is **mixed**, not fierce. The direction of the finding survives — the canon
> still contradicts the +1 rating on every one of the four — but the claim as stated was wrong, and
> a claim that is right in direction and wrong in detail is exactly what gets repeated until nobody
> checks it.

## What this does and does not settle

It settles the **evidentiary** question: this is not two authorities disagreeing. It is two
uncited constructions disagreeing, with the one sourced table siding against the engine's mode
modifier.

It does **not** settle the product question, and that part is genuinely David's:

1. The seven natures are a **classification**, not a score. Collapsing "fierce" to −1 and "fixed" to
   +1 is itself a construction — a defensible one, but ours.
2. `NAKSHATRA_SCORE` is already the closer fit, and it is still uncited.
3. Some of these are **calibrated dials**, tuned by count against David's own chart. Replacing a
   tuned dial with a canonical classification is the trade the rebuild map's "canon as the single
   gate" question describes: some surfaces get more faithful, some hand-tuned counts move.

## The ruling this asks for

- Does the day-quality signal read the canon's seven natures directly, retiring #3?
- Does the mode engine's nakshatra modifier derive from the same natures, retiring #2 and its copy
  in #4?
- Or do the constructions stay, explicitly labelled as Velea's product layer rather than canon?

Whichever way it goes, **#2 and #4 must stop being two copies** — that is the same shape as the
house→mode table deleted in v810, and it is not a method question.

---

### Verification status

- Table locations and their comments: **read directly in the source.**
- Canon natures of the four stars: **read directly out of `muhurta-tables.json`.**
- Muhurta Chintamani / Brihat Samhita as the ultimate source: **taken from the canon file's own
  `_source` line, not verified against a translated primary text.** Recorded as such.
