# THE LEAD — build spec

*Written 2026-07-21, after David asked: "How does the LLM ground itself? Where does it latch onto
something and decide this is the beginning?"*

**Status: SPEC ONLY. No code written. Two rulings needed from David before build (§8).**

---

## 1. The problem, measured

The model is handed a payload and asked to write a reading. Nothing tells it where to begin.

`prompts.ts` contains **eleven passages asserting primacy**, and **five different things are called
the spine or the engine of the read**: the meridian axis (l.34, 879), the relational traversal
(l.172), the natal Moon (l.1264, 1609), the life-area lens (l.1974), the retrograde arc (l.2436).
Plus three separate "the loudest" claims and three "outranks".

A model handed five things each labelled "the spine" behaves rationally: it gives each one a
sentence. That is an inventory, not a read.

**Measured** — `server/scripts/lead-contention.ts`, 32 charts generated from real birth moments ×
33 dates across 2026 = 1,056 chart-days:

| Claimant | Present | |
|---|---|---|
| star turn | 992 | 93.9% |
| meridian loaded | 840 | 79.5% |
| hostile personal ground | 457 | 43.3% |
| crown rating | 194 | 18.4% |
| Mercury retrograde | 192 | 18.2% |
| node on the year lord | 148 | 14.0% |

    claimants present at once
      0        4    0.4%
      1       80    7.6%
      2      334   31.6%
      3      490   46.4%   <- the most common day in Velea
      4      135   12.8%
      5       13    1.2%

    TWO OR MORE: 972 / 1056 = 92.0%

**On 92% of chart-days there is no defined answer to "what is this read about."** The model picks,
and picks differently between runs. That is the mechanism behind "good bones, average execution"
(David, 2026-07-21): it isn't writing badly, it is arbitrating, and arbitration produces surveys.

Floor, not ceiling: the knots, the life-area lens and the hermit were excluded rather than
approximated. Real contention is higher.

---

## 2. What the canon says (and it is not a priority ladder)

**K&F Vol II, Appendix IV, "Part 1 — What are the steps in reading a chart?" (p.664–677).**

    Step 1:  Assess the Lagna
    Step 2:  Assess the Atmakaraka
    Step 3:  Assess the Moon
    Steps 4–14: each house, 2nd through 12th
    Step 15: Determining When Events Will Occur
             - Determine the current MahaDasha.
             - See the research from the previous 14 steps that relate to the MahaDasha Lord.
             - Determine the Sub Period Lord.
             - See the research from the previous 14 steps that relate to the Sub Period Lord.
             - Repeat this process for each sub cycle.
             - When the MahaDasha Lord and Sub Cycle Lords indicate similar events or
               circumstances predict that event or circumstance. The more sub cycles that
               indicate a certain event or circumstance, the better probability of it occurring.

Three things follow, and they decide the whole design:

**(a) The canon does not rank claimants. It selects.** The dasha lords are an *index into research
already done*. You do not scan the chart for what is loudest; you ask what the running lords mean in
this chart, then look for where they say the same thing.

**(b) Transits appear nowhere in Step 15.** The canon's own method for "what is happening now" never
consults one. `canon/METHOD.md` already states the law: *"Transits (gochara) never pick the frame —
they only time/color it… a transit can never contradict the natal promise."* This permanently
disqualifies the two loudest claimants measured above — meridian-loaded (79.5%) and Mercury Rx
(18.2%) are weather. The 75.8% meridian+starTurn collision is not a tie to break; it is a category
error.

**(c) It counts, it does not weight.** *"The more sub cycles that indicate a certain event… the
better probability."* Same rule as `year-rank.ts`'s own header (*"NO WEIGHTS — the books rank by
class and count agreements"*) and as David's crown ruling in DECISIONS #4. Third surface, one rule.

David has already ruled this once, in his own transcription (`canon/METHOD.md`):

> Appendix IV Step 15… **replaces the invented THEMES-scoring engine in `knots.ts`** (David's
> "hubris" — retire it): the tradition does not score, it **researches then looks for convergence.**

---

## 3. What already exists

Steps 1–14 are **already computed and stored**. `server/vedic/house-research.ts` → `NatalResearch`:

| Canon step | Stored as | Note |
|---|---|---|
| Step 1 — Lagna | `anchors.lagna` `{ sign, lord, lordHouse }` | |
| Step 2 — Atmakaraka | `anchors.atmakaraka` | code comment already reads *"K&F Appendix IV Step 2"* |
| Step 3 — Moon | `anchors.moon` | |
| Steps 4–14 — houses | `houses: HouseResearch[]` | occupants, lord, aspects, yogas, avashtas |
| per-lord research | `planets: Record<Graha, PlanetResearch>` | dignity, shadbala, avashtas, conjunct, vimshopak |
| the clock | payload `dasha: { mahaDasha, antarDasha, pratyantarDasha? }` | each with `lord`, `natal`, `rulesHouses` |

**Nothing new needs computing.** Step 15 is a join over data Velea already has. That is the whole
reason this is worth building: the order exists in the book, is implemented as data, and was never
turned into control flow.

---

## 4. What to build

A pure function, DB-free, testable without a database — the `rankStandingYogas` / `natalContactPayload`
pattern.

```
computeLead(research: NatalResearch, dasha: DashaBlock) -> Lead
```

### 4.1 What a lord "indicates"

For each running lord (maha, antar, pratyantar) collect its **portfolio** — the set of houses it
speaks for, straight from stored research, no interpretation:

1. houses it **rules** (`rulesHouses`)
2. the house it **occupies** (`planets[lord].house`)
3. houses it **aspects** (from `houses[].grahaAspects` where the aspecter is this lord)

Each entry carries its provenance (`ruled` | `occupied` | `aspected`) so the reason is inspectable
and never inferred later.

### 4.2 Convergence

Intersect the portfolios. A house appearing in **two or more** running lords' portfolios is a
convergence. Its **degree** = how many distinct dasha levels name it (2 or 3).

    degree 3  — maha + antar + pratyantar all point at it   (strongest)
    degree 2  — two levels agree
    degree 1  — one level only. NOT a convergence; never the lead.

Ordering among convergences of equal degree: by the **highest level** that names it (maha outranks
antar outranks pratyantar), then by house number ascending for determinism. **No weights, no scores**
— this is the canon's counting rule and must stay counting.

### 4.3 Output

```ts
lead: {
  house: number;              // the converged house — the subject of the read
  degree: 2 | 3;              // how many dasha levels agree
  lords: [                    // who agrees, and via what
    { lord: "Venus", level: "maha",  via: "ruled" },
    { lord: "Mercury", level: "antar", via: "occupied" },
  ];
  standing: {                 // Steps 1-3: where the narrator stands
    lagna: { sign, lord, lordHouse };
    atmakaraka: { planet, navamsaSign };
    moon: { sign, house, bright };
  };
  subordinate: string[];      // claimants explicitly demoted, e.g. ["transit:meridian","transit:mercuryRx"]
} | null                      // null when nothing converges — see 4.4
```

### 4.4 When nothing converges

`lead: null`. Measured contention says this will be uncommon, but it must be defined:
the read falls back to today's Tara/Chandra day-frame as the subject (`METHOD.md` Step 0, day frame),
and the prompt must be told the standing chart offered no convergence rather than being left to
guess. **`null` must never render as a blank or as a silently-different read** — it is a stated
state.

---

## 5. How the prompt uses it

One new block near the TOP of the day-read tail, above every existing primacy claim:

> **WHERE YOU STAND.** `input.lead` is the engine's answer to what this read is about, computed by
> the canon's own Step 15. You do not choose the subject; it is given. Open from `lead.house` as
> lived experience, name it in the person's terms, and let everything else in the payload be
> subordinate to it. `lead.lords` is why — the running lords that agree. `lead.degree` is how much
> they agree; 3 is rare and should read as rare. `lead.standing` is the person you are speaking to,
> not a topic to describe. If `lead` is null, say the chapter is quiet and read the day itself.

And the eleven existing primacy claims must be **demoted in the same edit** — "THE SPINE OF THE
READ" becomes "the spine of the *standing chart*", "is the engine of this read" becomes "is the
engine of *this surface*", and the transit-side claims are marked explicitly as colour. Leaving them
at full strength while adding a twelfth claimant makes the problem worse, not better.

---

## 6. How it is guarded

Following the v885/v886 lesson — **guard the wiring, not just the arithmetic.** contacts.ts shipped
with passing tests, a probe and a changelog entry while imported by nothing.

Tests (`server/vedic/lead.test.ts`), DB-free, fixtures from real research shapes:
1. a house named by maha + antar returns degree 2; by all three returns degree 3
2. a house named by one level only is **never** the lead — control in both directions
3. `via` provenance is accurate for ruled / occupied / aspected
4. ties break deterministically (same input → same lead, run twice)
5. no convergence → `lead: null`, not a fabricated house
6. **wiring**: the payload builder calls `computeLead` and emits the field (source-level assertion,
   the `payload-contract.test.ts` pattern)
7. **contract**: every key the prompt branches on is emitted

Probes (`tools/mutation-probe.sh`), each proven to fail:
- the degree-2 threshold dropped to 1 → single-lord noise becomes the lead
- the counting replaced by any weighted score → the canon's rule silently violated
- `computeLead` no longer called from the builder → the v884 shape again
- the prompt losing the WHERE YOU STAND block

---

## 7. What this explicitly does NOT do

- **Does not touch transits.** They stay in the payload as colour.
- **Does not retire `knots.ts`.** METHOD.md says Step 15 should replace its scoring, but that is a
  second, larger change and bundling them makes both unreviewable. Flagged, not done.
- **Does not change the headline matrix** (the separate ground-aware rewrite).
- **Does not decide the yoga class question** (DECISIONS #7).
- **Does not add a new astrological rule.** Every input is stored research; the only new thing is
  the join and the counting.

---

## 8. RULINGS NEEDED BEFORE BUILD

**#A — Which dasha levels vote?** Step 15 says "each sub cycle". Velea carries maha, antar and
pratyantar. Pratyantar is a few weeks and the prompt already says to weight it lightly *below*
maha/antar. Options: (i) all three vote equally; (ii) maha + antar vote, pratyantar only breaks
ties; (iii) all three, but degree 3 requires maha to be one of them. **I lean (iii)** — it keeps the
chapter in charge while letting the fine cycle confirm rather than create. This is method; it is
yours.

**#B — What is the subject when a knot is lit?** The knots are pre-computed convergences and the
prompt calls the first one "the loudest". Under this spec the lead is computed from the dasha
portfolios instead. Either the knot IS the lead when present (and `computeLead` should read knots
first), or knots become evidence *for* a lead rather than a competing claimant. **I lean the
latter** — one mechanism, per METHOD.md — but a knot outranking the dasha convergence is a
defensible reading of "the loudest" and I will not guess.

---

## 9. Risks

- **A wrong lead is worse than no lead.** The model will now open from whatever this computes, with
  full confidence. Degree-2 convergences are common; if the portfolio definition (§4.1) is too
  generous, everything converges and the lead is noise. Mitigation: measure the degree distribution
  across the same 1,056 chart-days *before* wiring it to the prompt, and report it. If most days
  produce degree-2 on four different houses, the definition needs tightening, not shipping.
- **Cache**: adding a payload field changes the hash, so cached readings regenerate once. At tester
  scale that is cents (same note as DECISIONS #2), not a reason to wait.
- **Prompt cost**: one small block added, eleven passages demoted — roughly net zero.
