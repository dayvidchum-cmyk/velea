# Velea Vedic Canon

Transcribed, **cited** source data from David's Vedic textbooks — the authoritative ground the engine
and the narrative prompt read from. **Rule: build from the canon, not inference.** Each file names its
source (book, author, page/chapter). Where a table is only partially captured, it says so — never silently complete.

## Provenance
- **K&F** = Kurczak, Ryan & Fish, Richard — *The Art & Science of Vedic Astrology*, **Vol I & Vol II**.
  The complete two-volume set (682pp, clean text layer) is the primary source. `server/vedic/life-areas.ts`
  (Appendix IV) was already built from it.

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
- Per-pair avastha narratives (Vol II Ch.10, ~1800 lines) — pull on demand; the formulas already let the engine compute the state.

_(Resolved: `Yogas.pdf` = a scan of Vol I pp.110-133, already captured. AL is wired into `knots.ts`. Maturity-of-planets + planetary-ages tables now in `timing.json` from the Vol I Ch.13 rescan.)_
- **Maturity of Planets** ages + **Planetary Ages** background periods (Vol I Ch.13 — image tables, not in text layer).
- Per-pair **avastha narratives** (Vol II Ch.10, ~1800 lines) — pull on demand; formulas already let the engine compute the state.
- The 18 photo scans (IMG_1739-1760) in the 7:13:26 drop — not yet reviewed; likely overlap the PDF.

## Next: FEED TO EVERYTHING
Canon is stored. Per David's directive ("ingest, store, feed to everything") the open build is wiring these
files into the live engine: the **knot detector** (life-areas × karakas × house-lord-combos × yogas, scored + resolved)
and the **narrative prompt** (feed the lit knots + avastha states, deterministically, so the LLM reaches for them — cheap).

## Drop workflow
David drops source scans in iCloud `DCPC/FIELD NOTES/For Claude Code/<date>/`. See memory `velea-canon-source-drop`.
