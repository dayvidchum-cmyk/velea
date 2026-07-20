# Velea Vedic Canon

Transcribed, **cited** source data from David's Vedic textbooks — the authoritative ground the engine
and the narrative prompt read from. **Rule: build from the canon, not inference.** Each file names its
source (book, author, page/chapter). Where a table is only partially captured, it says so — never silently complete.

## Provenance
- **K&F** = Kurczak, Ryan & Fish, Richard — *The Art & Science of Vedic Astrology*, **Vol I & Vol II**.
  The complete two-volume set (682pp, clean text layer) is the primary source. `server/vedic/life-areas.ts`
  (Appendix IV) was already built from it. **Both volumes have now been read front to back** (2026-07-13);
  the method they document is captured in **`METHOD.md`**.

## ⭐ START HERE: `METHOD.md` — the Lens Router (the spine)
The control flow the whole engine hangs off. Every file below is **data the systems in METHOD pull**.
The core law: the **time frame in question picks the ONE system** the canon built for it
(day → Tara Bala + Chandra Bala · moment/question → Prasna · life-event timing → Appendix IV Step 15
convergence · year → Varshaphala · background clock → Vimshottari). That system pulls only the data it
names, enters the native where it says, and hands the LLM a **filtered lens, not a data dump.**

## Ingested
| File | Source | Notes |
|---|---|---|
| `bhava-significations.json` | Vol I Ch.7 | All 12 houses — sanskrit name, affinity sign/planet, keywords, indication lists, karakas, house type. **Confirms 10th = "the Dharma / life purpose. Fame, honour, status."** COMPLETE. |
| `karakas.json` | Vol I Ch.4 + Ch.7 | Natural significator of each planet; house-karaka table; `knotSignificatorMap`. Includes the **non-heteronormative partner-karaka rule** (partner follows the SPOUSE's gender). COMPLETE. |
| `planetary-friendships.json` | Vol II Ch.10 | Natural (naisargika) friend/neutral/enemy per planet. Foundation for dignity + avashtas. COMPLETE (natural only; compound maitri not given). |
| `yogas.json` | Vol I Ch.10 + Vol II Ch.7 | ~40 named yogas as detectors (condition → result → type → caveats) + universal rules (dasha-gate, judge from Lagna/Chandra/Sun/Navamsha, neecha bhanga). Tier-2 knot detectors. |
| `house-lord-combinations.json` | Vol II Ch.12 | **143/144** house-lord-in-house results (Parashara verse + Positive/Negative influences), keyed `L{lord}H{house}`. Modify by dignity. Deterministic knot fuel. Gap: `L11H4`. |
| `avashtas.json` | Vol II Ch.10 | The **live-condition engine**: 6 Lajjitaadi states (formulas) + 3 Jagradaadi strength states + combination/timing logic. Backs the no-black-&-white law. Per-pair prose pending. |
| `timing.json` | Vol I Ch.12 + Ch.13 | Vimshottari sequence/years + dasha reading law; full gochara (transit) interpretive layer (ascendant-frame, eclipse rules, coordinate-with-dasha, Sade Sati w/ the book's skeptical stance). |
| `arudha-lagna.json` | sarvatobhadra.com (web ref) | **Arudha Lagna = identity as received in the world** (public image, vs the Lagna's inner self). Calculation + bhava padas + planet-on-AL + predictive rules. The technical anchor for the dharma-is-identity law. NOT yet wired into knots.ts. |
| `planet-in-house.json` | Vol II App. III (p364-366) | Every planet in each of 12 houses → its indication. COMPLETE. |
| `vol2-house-and-prasna.md` | Vol II Ch.13-14 + App I-II | Prasna house meanings, Tajika aspects + Deepthamsa orbs, prasna timing framework, directions/places. (Superseded on house meanings by `bhava-significations.json`.) |

## Pending / still needed
- **Shadbala compute** (Vol II Ch.8) — `server/vedic/shadbala.ts` STARTED (tested). ✅ **Sthana Bala** (all 5: uchcha, saptavargaja, ojayugma, kendra, drekkana) + **Naisargika Bala** fully computed & pure; also exports **`compoundRelation`** (the panchadha/5-fold maitri the engine lacked). ⏳ **Dig** (needs real bhava/angle cusps — whole-sign has no MC), **Kala** (needs birth clock, sunrise/sunset, weekday/month/year lords, declination), **Drik** (aspectual), still pending. **Chesta is COMPUTED** by K&F's relative-speed rule (p.314) — the fuller eight-state seeghra-kendra is not built. Honesty guard, two halves (corrected 2026-07-20): a source that is MISSING goes on `pending` and keeps `sixSourceRupas` **null**; a source computed by a SIMPLIFIED method goes on `approximate` and travels with the number, so a total is never quoted as exact classical Shadbala. This file previously claimed the total stayed null until Chesta was exact, which the code has never done — the doc was the wrong half of the pair. This is what Appendix IV Steps 1–14 ask for ("What is the Lord's Shadbala?").
- Per-pair avastha narratives (Vol II Ch.10, ~1800 lines) — **now read in full** (all 7 planets); pull on demand into prose. The formulas in `avashtas.json` already let the engine compute the state; the narratives are the interpretive layer for the LLM.

_(Resolved: `Yogas.pdf` = a scan of Vol I pp.110-133, already captured. AL is wired into `knots.ts`. Maturity-of-planets + planetary-ages tables now in `timing.json` from the Vol I Ch.13 rescan.)_
- **Maturity of Planets** ages + **Planetary Ages** background periods (Vol I Ch.13 — image tables, not in text layer).
- Per-pair **avastha narratives** (Vol II Ch.10, ~1800 lines) — pull on demand; formulas already let the engine compute the state.
- The 18 photo scans (IMG_1739-1760) in the 7:13:26 drop — not yet reviewed; likely overlap the PDF.

## Next: FEED TO EVERYTHING — via the router, not a scorer
Canon is stored. Per David's directive the open build is wiring these files into the live engine — but
through **`METHOD.md`'s Lens Router**, not the invented scoring engine. The `knots.ts` THEMES-scoring is
**retired** (David: "hubris" — the tradition researches then looks for convergence, it does not weight).
Re-express it as **Appendix IV Steps 1–14 research** (the per-house prompt, fired 12×, pulling
dignity × avashta × balaadi × varga × karaka it already has) **+ Step 15 convergence** (MahaDasha lord ∧
sub-cycle lords agreeing on the same event = the "knot", timed). The narrative prompt then receives a
**filtered lens for the specific time frame**, not a data dump.

## Drop workflow
David drops source scans in iCloud `DCPC/FIELD NOTES/For Claude Code/<date>/`. See memory `velea-canon-source-drop`.

---

## Provenance notes (not extractions)

| File | What it is |
|---|---|
| `nakshatra-tables-provenance.md` | Which of the six live nakshatra tables actually has a source. Answer: one. The clash the audit reported is between two UNCITED constructions, and the one cited table sides against the engine's mode modifier on all four disputed stars. Records an OPEN RULING for David; nothing in the engine was changed. |
| `neecha-bhanga-provenance.md` | Where each neecha-bhanga condition actually comes from, verse by verse. Written 2026-07-20 because the engine's four conditions and this canon's own one-line rule turned out to be two different systems, and neither was cited. Records an OPEN RULING for David; nothing in the engine was changed on its strength. |
