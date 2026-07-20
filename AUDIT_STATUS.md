# AUDIT STATUS — where the fix run stands

*2026-07-20, **v875**. Every number here was printed by running something, not counted from memory.
The previous edition of this file was written at v790 and left standing for 84 versions — it listed
three things as waiting on you that were all already done. A status page that goes stale is worse
than none, because it is believed. If you are reading this and the version above is not the version
in `client/src/lib/version.ts`, distrust it and ask.*

**110 test files · 1137 tests passing · 66 mutation probes, all proven able to fail · build exit 0.**
(The audit sheet claimed 1082 tests and 32 probes. Both were wrong; so were most of its other
totals. Corrected in the same pass.)

---

## Waiting on you

| | What | Why it is yours |
|---|---|---|
| 1 | **Run one script:** `npx tsx server/scripts/add-horoscope-location-columns.ts` | A paid reading records no location, while the page prints a live "Lived in {city}" above the frozen prose. Reveal a date, later set that date's location, and the page names a city the sky was never cast for. Needs 5 nullable columns. A deploy once wiped every account, so schema is always yours to run. |
| 2 | **Three star spellings** in Raman's Siddha grid (`canon/siddha-yoga-source.md`) | "Uttara" bare, "Blwvishta", "Animidha". Each is *probably* obvious; a wrong entry mislabels real days forever. |
| 3 | **The crown mark is gold on a gold coin** — 1.61:1 light, 1.17:1 dark, recomputed | Darker gold reads fine but turns olive, and the crown is your brand. Palette call. |
| 4 | **Parchment day numbers in dark** — 2.28:1, and that is the *best* case; mode-coloured numbers measure 1.05 (green) and 1.24 (gold) | The sheet's "one value in the theme block" was wrong. Your palette. |
| 5 | **The year calendar** has drifted off three laws that arrived after it: no bindi ladder, no shadow glyphs, hardcoded `#f8f4ea` ground that does not dim with the theme | Two of its divergences are your own recorded year-only rulings. Which of the three later laws should reach it is your eye, not mine. |
| 6 | **Price · Stripe keys · did the production schema reconcile run** | Yours. Nothing charges yet — there is no Stripe dependency in the repo at all. |
| 7 | **Knot thresholds** — the numbers deciding when a theme is "lit" are mine and unvalidated | You asked how we test them with your eyes. I owe you that method. |
| 8 | **The pick-a-date precision layer** — 179 lines, imported by nothing, with a test pinning it as unimported | Wire it or delete it. |
| 9 | **A karaka doing nothing today** — I reversed a test that asserted a transiting karaka activates its area wherever it stands | It was mine, uncited, and it made a quiet day impossible. One line back if you disagree. |
| 10 | **Krittika and Vishakha** (canon: *mixed*) are scored harsh in the day-quality gate | Defensible and unchanged, now pinned by value so moving it is a decision. |

**Cannot be done from here at all:** production-vs-schema drift, and confirming the day-shift
column landed in the live table. Both need your `DATABASE_URL`.

---

## Fixed today, each proven

Every one had a control written **first** and run against the unfixed code, where it failed.

- **Your v852 nakshatra ruling had never reached the engine.** `interpreter.ts` kept private star
  lists and imported nothing from the table you corrected. Magha, Purva Phalguni, Purva Ashadha
  (canon: fierce) and Vishakha (mixed) read as *expansion* — on **57 of 365** real days, measured,
  which independently reproduces the "57 days a year" your own decision row predicted.
  `nakshatra-canon.test.ts` passed throughout by asserting against the dead copy.
- **A quiet life area was unreachable.** Being an area's ruler or karaka activated it regardless of
  where the planet stood, so Venus bore on love every day of every life. Measured: **0 of 14,400**
  area-days quiet, 58.3% of all activation resting on that clause alone. Now **19.2%** — identical
  to the control that simply deletes the clause. The prompt already described the corrected rule
  and already said "when activation is empty, say so honestly". That instruction had been dead text.
- **The paid-word repair was a false green.** It raised `maxWords`, which only rejects drafts for
  being too long. The prompts still said 120/170/130 words against the free read's 175. Raised to
  240 with the cap matching the enforced ceiling; the guard now reads `prompts.ts` too, and a
  per-surface cache salt moved so readers do not keep the old prose.
- **A simplified strength source published as exact.** Chesta is K&F's relative-speed rule (p.314) —
  cited, but not the eight-state seeghra-kendra. Nothing in the payload said so. `approximate` now
  travels with the number to the model. *I did not null the total* — that would make every planet
  read "unmeasured" on every paid surface, which is your decision, not a repair.
- **A locked season rendered as an outage** with a retry that could never succeed, and the gate
  sweep had no guard at all — only the *server* half was tested. Now guarded across all 21 lockable
  endpoints.
- **The third nakshatra list pinned to canon.** It contradicts the cited natures on **zero** of 27.
  The sweep's "4 disagreements" were against the interpreter's pre-fix values — my own stale
  finding, retracted in the commit.

---

## What I got wrong today, before it reached you

Three instruments lied first. Each would have been a false claim:

1. A cache-hash probe said the chapter read re-bills **every day**. It did not — I fed it a
   fabricated input containing `date`; the real stage input returns early carrying none.
2. A lock scan checked per *file* and passed **with the bug present**, because the same file's
   other endpoint handled it.
3. Its per-endpoint replacement then flagged working code, because the alias regex could not follow
   `const d: any = someQ.data`. I nearly "fixed" a page that was correct.

The lesson is the one already in `CLAUDE.md`, earned again: a clean result from an instrument that
was never shown to fail proves nothing.
