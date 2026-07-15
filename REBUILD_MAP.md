# REBUILD MAP — Canon vs. Invented

_The law (David, 2026-07-14): **every part of the app that is Velea-invented with no canonical text
behind it gets rebuilt on canon. Only then — after beta — does David decide what needs adjustment.**_

This is the backlog we burn down. North star is [`server/vedic/canon/METHOD.md`](server/vedic/canon/METHOD.md)
(the Lens Router — the canon is already stored; the rebuild makes each surface actually route through it
instead of through an invented table). Derived from a 4-sweep provenance audit of the whole engine layer
(2026-07-14).

---

## North star (the frame above everything below)

> **The point of the app (David's words):** _"A timing system designed to orient a human being and to
> keep them on their destined karmic path."_ The engine **locates** the person in their sky — chart ·
> chapter · day · window · the right lens; the LLM only **voices** it. Antidote to the founding wound
> (AI-astrology overload). Every item below is judged against this one sentence.
>
> **The governing law — one self, not departments:** the disease under the invented engines is
> **compartmentalization** — chopping the person into life-area boxes (Career/Money/Love/Health) and
> reading each alone. **The self is one; the sky is one.** The 10th-as-"career" mistranslation was just
> where it first leaked. Retire the compartments, don't relabel them. For every surface ask: _does this
> treat the native as one self, or as a set of boxes?_

## How we got here (session arc, 2026-07-14)

1. Realized the day-mode taxonomy (Action/Build/Selective/Restraint) is **Velea-invented**, not from
   the K&F textbooks — and neither day-mode engine is canon-derived.
2. David's law: **rebuild everything invented on canon → beta → THEN decide adjustments.**
3. 4-sweep audit → this map (substrate solid, meaning-layer invented).
4. Named the deeper bug: **compartmentalization** (10th=career was the symptom).
5. **Course-correction that matters more than any code:** in mapping this I sliced David's whole
   principles into file:line spreadsheets and micro-decisions and **overwhelmed him** — recreating the
   founding wound. He halted everything and reset to first principles. **Lesson (now a memory,
   `velea-dont-overwhelm-david`): hold principles whole, follow his pace, audit your own claims, don't
   assume his method/UX.**
6. Audited my own "what the canon engine can do" summary → found **4 overclaims**, corrected below.

## The audited foundation (what's real, corrected)

From birth data + a date, the canon engine already does this — **verified against code 2026-07-14**:
exact sidereal sky (Swiss Ephemeris/Lahiri, all 9 grahas); the chart + dignity incl. debilitation-
cancellation (Parashara); the **9** life-area vargas (D1/2/3/4/7/9/10/12/30 — **not** the full 16);
Vimshottari dasha to **pratyantar** (3rd level); the day weighed against the birth star (Tarabala/
Chandrabala); Pancha Pakshi fine windows (minute-validated, 4,900-row corpus); and Appendix IV
life-area routing. **Four honest limits** (corrections to my first summary): Shadbala is only **2 of 6**
sources real (+1 approx Chesta, 3 missing); the knots **convergence thresholds** are still invented (the
count method is canon, the cutoffs aren't); the life-area **purpose-vs-marriage split** is Velea's own
divergence; the **D30 health karaka** is blank.

## To resume (any model, any session)

Load memories `velea-the-point`, `velea-one-self-not-compartments`, `velea-rebuild-ground-up`,
`velea-dont-overwhelm-david`, `velea-lens-router` (only the one-line `MEMORY.md` pointers auto-load —
open the full files); read `server/vedic/canon/METHOD.md` (the canon spine) and this file.
**State at handoff:** grounded, "starting over" from the point of the app.
**Shipped state:** the app is NOT pristine — earlier this session the knots Step-15 rebuild, the
day-frame **admin-gated** reading + voice prompt, the cold-data condition fix, and the kill-Mon-Fri
prompt edits shipped & deployed (v433). Since the reset, only docs (this file + memories) — no new app
code. Check `git log` before assuming what exists. Do NOT start building a replacement for the
day-mode/crown/golden engines — David specs the method first. Wait for his pace.

## Disposition legend

- **KEEP** — canon-cited or real astronomy. Do not touch.
- **REBUILD** — invented sky-reading that **has a canonical replacement**. Tear out, re-express on canon.
- **DECIDE** — an invented *abstraction the canon has no direct form for* (e.g. "day mode"). The rebuild
  is a fork: **derive it from canon** (muhurta activity-suitability, real dashas) **or** keep it as an
  honest product layer fed by canon inputs. David picks per item — but not before beta.
- **PRODUCT** — not astrology at all (to-do ranking, verdict card). No canon exists for it. Keep the
  logic; the fix is only that its **astrological inputs** must come from a rebuilt canon engine, not an
  invented one.

> **The honest caveat:** "rebuild on canon" does not mean every surface has a textbook table waiting.
> The tradition has no "Action/Build/Selective/Restraint day mode" and no "rank my to-do list." For
> those, canon can only supply the *inputs* (is the day auspicious for outward action per muhurta? is
> the planet strong per Shadbala?) — the product abstraction on top stays Velea's, but it must be **thin
> and honest**, not a fake table pretending to be tradition.

---

## KEEP — the canon substrate (solid, cited, do not touch)

| Surface | Files | Why it's canon |
|---|---|---|
| Ephemeris / longitudes | `server/panchang/astronomy.ts` | Swiss Ephemeris (WASM), Lahiri ayanamsa |
| Vimshottari dashas | `server/dasha-calculator.ts` | standard proportional math |
| Divisional charts | `server/vedic/vargas.ts` | BPHS Parashari varga rules, unit-tested |
| Shadbala | `server/vedic/shadbala.ts` | **cited Vol II Ch.8 — BUILT BUT NOT WIRED** (see quick win) |
| Dignity tables | `server/vedic/dignity.ts` (tables), `server/panchang/dignity.ts` (tables/labels) | classical exalt/own/moola/friendship/neecha-bhanga, cited Parashari |
| Tarabala + Chandrabala | `server/panchang/crown.ts:41-79` | 9-tara scheme + chandra houses, Vol I Ch.12/13 |
| Karana math | `server/panchang/karana.ts` | canonical 60-half-tithi placement; Vishti = malefic |
| Combustion / eclipse | `server/panchang/affliction.ts` | per-planet orbs cited Drik-Panchang; eclipse = pure geometry |
| Life-area varga routing | `server/vedic/life-areas.ts` | **best-cited file in the tree** — K&F Vol II Appendix IV pp.367–374 |
| Canon data | `server/vedic/canon/*.json` | every file carries a K&F chapter/page `_source` |
| Pancha Pakshi timeline | `server/panchapakshi/sequences.ts`, `tables.ts`, `yamas.ts` | traditional Tamil data, validated to the minute against reference app |
| Apahara sub-windows | `server/panchapakshi/apahara.ts` | corpus-proven: 4,900 rows, zero exceptions |
| Malefic yogas, tithi score | `server/panchang/auspiciousness.ts` (partial) | standard malefic-yoga list, Rikta/Purna classical |

---

## REBUILD — invented, but canon has the replacement

### R1. Planetary strength → real Shadbala  (NOT a quick win — corrected 2026-07-14)
- **Invented now:** `server/panchang/dignity.ts:146-150` `TIER_SCORE` (exalted +5 … debil −5), `COMBUST_PENALTY 3`, `NODAL_PENALTY 2`, tunable band cutoffs. Self-declared "NOT canonical Shadbala."
- **Canon replacement is only ⅓ built:** `server/vedic/shadbala.ts` exists and is cited, but computes only **Sthana + Naisargika + approx Chesta**. It keeps `sixSourceRupas = null` by design (`:223`) — **Dig, Kala, Drik, exact Chesta are all `pending` (`:215`), not yet plumbed.** Wiring it now = swap invented weights for a *partial* Shadbala, no more canon-honest. **Prerequisite: ingest the 4 missing sources first** (METHOD.md build-order step 2).
- **Feeds:** natal strength label; every Steps-1–14 house pass (METHOD.md depends on it).

### R2. The knot detector — finish the Step-15 rebuild
- **Status:** mostly done. `knots.ts` is now a convergence *count*, not a weight-sum (canon skeleton).
- **Residual invented:** lit/tier cutoffs `≥2 / maha-anchored / event-vs-standing` (`knots.ts:223-226`), fold logic (`:236-254`), rank constant (`:233`), the `slow` planet set (`input-builder.ts:482`).
- **Canon path:** METHOD.md Step-15 — "more sub-cycles agree = higher probability." Make the tier a
  documented reading of confluence, not a bare number; get the thresholds cited or replaced.

### R3. `meaning-engine.ts` — DELETE or re-derive (**canon-violating**)
- **Invented now:** `meaning-engine.ts:22-91` generic keyword tables. **`:32` calls the 10th house
  "career, public role, authority" — directly violates the dharma-is-identity law and its own
  `canon/bhava-significations.json`** ("10th = the Dharma / life purpose").
- **Canon path:** replace with the per-house research builder (METHOD.md Steps 1–14) reading
  `bhava-significations.json`. This is the highest-integrity fix: an invented table contradicting canon.

---

## DECIDE — invented abstraction, no direct canon form (David forks, post-beta)

### D1. The day-mode engine (Action / Build / Selective / Restraint) — the big one
- **Invented now (all of it):** the 4-mode taxonomy; `HOUSE_MODE` (`interpreter.ts:152`);
  `interactionBaseMode` blend + Mercury-Rx cap + 0.15°/day station threshold (`:209-228`); every
  nakshatra/tithi/field modifier; `QUALIFIER_MAP` 32 labels; `NAKSHATRA_LIBRARY` ("Velea Nakshatra
  Interpretation Library" — self-cite); `composeInstruction`; `applyWeatherGate`; and the entire
  parallel mirror `modifier-config.ts`.
- **The rot:** **two disagreeing HOUSE→mode tables** (`interpreter.ts:152` vs `modifier-config.ts:23`)
  and **three disagreeing nakshatra classifications** (interpreter buckets vs `auspiciousness.ts` vs
  `modifier-config`). No ground truth — because there is no canon for it.
- **The two badges that split (today's bug):** `panchang.mode` (1 lens) vs `interactionMode` (2 lenses)
  are both invented, and nothing forces them to agree → "Expansive Selective" vs "Active Build."
- **The fork:** canon has **muhurta activity-suitability** (is today good for outward action, new
  starts, finishing, rest?) via tara/chandra bala + karana + tithi + nakshatra — real, cited. Option A:
  **re-derive the day mode from muhurta activity-suitability** (canonical inputs → one honest mode).
  Option B: keep a product "mode" but drive it from that single canon computation (one engine, no split).
  Either way: **one engine, no invented HOUSE_MODE, no two-badge divergence.** David specs the method.

### D2. Golden-hour fusion (Time Master "golden now")
- **Canon inputs (KEEP):** bird timeline, apahara sub-windows, hora lord, dignity, combustion.
- **Invented fusion (DECIDE):** the AND-gate `isGolden = birdFavorable ∧ lordFavorable`
  (`golden-hour.ts:26-31`); favorability thresholds; the apahara **peak-picker** tie-break
  (`:167-181`, "enemy down-ranked by 0.001, longest wins").
- **Fork:** is "golden" a defensible *fusion* of two canon systems (document the rule as David's stated
  framework, keep it) — or does it need grounding in a source that actually combines bird + hora? The
  corpus proves the sub-windows; it does **not** prove the AND-gate.

### D3. Crown rating composition
- **Canon components (KEEP):** tarabala, chandrabala, Ashtakavarga bindu, benefic/malefic + special aspects.
- **Invented composition (DECIDE):** `crownDay` additive score-sum, `/2` transit down-weight, ±2 rating
  bands, AV boost `+2/+6` thresholds, `transitScore` flat ±1, the veto floor (`crown.ts:141-205`).
- **Fork:** the crown is *Velea's own apex method* (tarabala+chandrabala convergence — that part is fine).
  The **weighting/banding** on top is the invented layer. Re-express as a canon convergence rule
  (agreement of tara + chandra + AV, no arbitrary weights) or keep a documented product score.

### D4. Time Master advisory prose
- **Invented:** `time-lord-influence.ts` (`MODE_PLANET_BEST_USES`/`AVOID` 4×9 matrices, archetype→mode),
  `qualifier-styles.ts` (32-entry "Velea Guidance Engine"), `hora.ts:34 HORA_TONE`.
- **Note:** these are all keyed off the **invented day-mode taxonomy (D1)**. They collapse or rebuild
  automatically once D1 is decided. Do not rebuild before D1.

---

## PRODUCT — not astrology; keep logic, fix only the inputs

### P1. Task/check-in scorer (gold dots, "Aligned for today", rest-gate)
- `server/task-scorer.ts` — 100% invented, but it's a **to-do ranker**, not sky-reading. No canon
  exists for ranking a task list. **Keep the product logic.** Its one astrological input is the day
  mode — so it inherits the D1 rebuild and needs no separate canon.

### P2. Golden-moment go/hold verdict card + personal "aligned" weighting
- `server/sky/golden-moment.ts` — the "Go all in / Hold / Mixed" matrix, signal weights, and the
  check-in `personalLevel` (`:238-243`) are all invented **product framing**. The *astrological signals
  underneath* (slow-planet-on-natal, retro, eclipse, combustion) are canon-adjacent. Keep the card;
  swap its invented inputs for rebuilt-canon ones; the go/hold copy is a UX choice, not a tradition.

### P3. Arc "Road Ahead" labels
- `server/sky/arc.ts` — milestone mechanics are canon (dasha turns, profection handoff, ingress). Only
  the **apex labels** ("Crown apex", horizon windows) are Velea framing, riding on the crown score (D3).
  Inherits D3; no separate work.

### P4. Activity labels (Succeed / Restore / etc.)
- `server/panchapakshi/activities.ts:20` — the favorability is canon; the *rebrand* of clock-literal
  Tamil labels into behavioral verbs is a UX choice. Keep; it's honest (header discloses it).

---

## The one quick win to bank now

**R1 (Shadbala).** `shadbala.ts` is already built, cited, and tested — it's just **not wired in**.
Replacing the invented `TIER_SCORE` strength weights with it is a self-contained swap that also unblocks
the Steps-1–14 per-house builder (which METHOD.md says depends on real Shadbala). Everything else needs
David's method spec first.

---

## Proposed sequence (each verified, then beta — no adjustments until beta)

1. **R1 Shadbala wire-in** (quick, unblocks the house builder).
2. **R3 `meaning-engine.ts`** delete/re-derive (kills the canon-violating 10th=career table).
3. **Per-house research builder** — METHOD.md Steps 1–14, one prompt × 12 (needs R1).
4. **R2 knots thresholds** — document/cite the convergence cutoffs against Step-15.
5. **D1 day-mode** — David specs the muhurta-derived method; rebuild as ONE engine (kills the two-badge
   split + `modifier-config` mirror). D4 (Time Master prose) rebuilds off it automatically.
6. **D3 crown / D2 golden-hour fusion** — re-express composition as canon convergence or documented product.
7. **P1/P2/P3** inherit their inputs from the above; only wiring changes.
8. **Ungate** the day-frame reading + beta. _Then_ David decides adjustments.

> **Method gate:** per `never-assume-method-or-ux`, I do not build D1/D2/D3 (or the house builder's
> reading logic) until David gives the spec — same as the knots rebuild. This map is the scope, not a
> license to invent a replacement.
