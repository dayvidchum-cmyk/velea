# THE LEAD — build spec

*Written 2026-07-21, after David asked: "How does the LLM ground itself? Where does it latch onto
something and decide this is the beginning?"*

**Status: SPEC ONLY. No code written. Two rulings needed from David before build (§8).**

> **REVISED 2026-07-21 after measuring — §2.5 is new and it corrects this spec twice.** Velea
> already contains a Step-15 convergence engine (`convergence.ts`), so §4's "build a new
> house-level convergence" was the wrong shape; and §4.4's claim that the null case "will be
> uncommon" was **wrong** — it is the largest single bucket at 37.4%. Both corrections are
> measured, not argued. §8's ruling #A is already answered by shipped code.

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

## 2.5 Step 15 is already built — and I measured what it answers

`server/vedic/convergence.ts` **is** Appendix IV Step 15. It was built to David's directive #3
(2026-07-15), its tie law is the Simone-validated v430 rebuild, its one-law fix is v798, and its
output is already stored per profile. It converges over knot **themes**, not houses.

So §4's proposal — build a new house-level convergence — would have put a second, unvalidated
Step-15 mechanism beside a validated one. **The question was never what to build. It is: how many
themes does the engine already light at once?**

Measured — `server/scripts/lead-convergence.ts`, the *same* cohort as §1 (32 real birth moments ×
33 dates in 2026 = 1,056 chart-days; 24,790 pratyantar spans of timeline):

    themes lit at once
      0      395   37.4%   <- nothing converges
      1      201   19.0%   <- the lead is already decided
      2      213   20.2%
      3       88    8.3%
      4      103    9.8%
      5       26    2.5%
      6       28    2.7%
      8        2    0.2%

    exactly one : 19.0%   the engine has already answered "what is this read about"
    none        : 37.4%   the null case
    two or more : 43.6%   a tiebreak is genuinely needed

    which themes light: siblings 27.3 · fame 25.5 · parents 25.1 · wealth 20.7 · health 16.4
                        career 11.3 · children 10.2 · home 7.7 · marriage 5.0 · identity 4.0

Controls all pass: 32/32 charts produced a timeline, 1056/1056 chart-days found a covering span,
44 distinct lit-sets (the result varies by chart), and only 10 of 24,790 spans carry no theme —
so a zero here is a real zero, not a dead instrument. `mcLon` is null in this run, which is safe
because the heavy-lord law feeds `weight` (knots.ts:295) while `lit` gates on `convergence` =
`activeLords.size` (knots.ts:291, :305). The script therefore never reports weight.

**Two consequences.**

**(a) §4.4 was wrong.** It said no-convergence "will be uncommon". It is the *largest* bucket —
37.4%, more than one day in three. The null path is not an edge case to define politely; it is the
most common thing the reader will meet, and it needs a real answer, not a fallback.

**(b) Ruling #A is already made, in shipped and validated code.** §8 asked which dasha levels vote.
`knots.ts` already counts distinct active lords across exactly maha/antar/pratyantar and gates on
`mahaTied && convergence >= 2` — that *is* option (iii), "all three vote, but maha must be one of
them". It was ruled by the v430 rebuild and re-fixed in v798. Re-asking it would reopen a settled
question, which this repo's method forbids. **#A is closed.**

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

*Superseded by §2.5. #A is closed — the shipped, Simone-validated law already answers it. #B
dissolved: knots are not a rival to the dasha convergence, they ARE it, so there is nothing to
arbitrate between. What the measurement leaves open is different, and narrower.*

**#1 — When two or more themes are lit (43.6% of chart-days), what picks one?**
The engine lights the set; nothing orders it. Three ways to choose, and only one is yours to pick:

- **(i) Highest convergence count wins**, ties broken by house number. Pure counting, the canon's
  own rule, no new astrology. Risk: a 3–3 tie is common and house order is arbitrary as meaning.
- **(ii) The maha lord's own strongest tie wins.** Step 15 reads *outward from the maha*, so the
  theme the chapter-lord is most actively tied to is the chapter. Risk: needs a "most actively
  tied" definition, which is a new rule and therefore yours.
- **(iii) Don't pick — hand the model the lit set, ranked, and say these agree.** Honest to the
  engine, but it is what we have now, and it is the mechanism behind the inventory problem.

**I lean (i)**, because it adds no astrology and this repo already counts in three places
(year-rank, the crown ruling, knots itself). But (ii) is a defensible reading of "outward from the
maha" and I will not encode a guess into a person's chart.

**#2 — What does the read open from on the 37.4% of days when nothing is lit?**
This is the big one, and my spec got it wrong by assuming it was rare. Options: the Tara/Chandra
day-frame becomes the subject (§4.4's original answer); or the standing chart speaks — lagna,
atmakaraka, Moon (Steps 1–3, which are always present and never null); or the near-miss layer is
admitted, since a maha-tied theme short of convergence 2 exists on 69.1% of chart-days and would
cut the null case sharply. **I lean Steps 1–3** — on a day the clock says nothing, the honest
subject is who the person is, not what the sky is doing — but admitting near-misses is a method
change with real reach and it is squarely yours.

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
