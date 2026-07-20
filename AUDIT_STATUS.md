# AUDIT STATUS — where the fix run stands

*2026-07-20, **v882**. Every number here was printed by running something. If the version above is
not the version in `client/src/lib/version.ts`, distrust this file and ask — the edition before last
was written at v790 and left standing for 84 versions, listing three finished things as waiting on
you.*

**113 test files · 1169 tests passing · 4 skipped · 77 mutation probes, all proven able to fail ·
tsc clean · build exit 0 · v882 verified live on velealor.com (bundle + /healthz).**

---

## What this pass found — all of it in work that was already marked done

The last stretch was audited again, this time by four independent sweeps (engine diff, client
crashes, cache/money/isolation, thresholds + the reading laws). Every finding below had a control
run against the unfixed code first, and the ones that reached you were re-measured by hand.

**v880 — three defects, one of them money**
1. `personalApex` (today's tara rung + chandra house, which move almost daily) was written onto the
   shared `natal` object and shipped in the SLOW-ONLY stage input. The stage surfaces carry no
   `panchang`, and `dayStableHash` strips volatile fields only from `panchang` — so
   deep/deep_full/chapter hashed a value that turned over daily and **the year read re-billed every
   morning it was opened**. `narrative.chapter` also has no door: it fires on Chart-tab load.
   The guard named for exactly this hashed the same object twice and could never fail.
2. v879's rikta fix closed the self-contradiction in `supports` and reopened it one field over:
   `sentence` was built before the yoga refilled `supports`. Measured on real 2026 sky — **12 days,
   12 contradicting before, 0 after**, with 291 ordinary days unchanged as the denominator.
3. The birth tier of the sky resolver read `p.birthLocation`, **a column `profiles` does not have**,
   so a paid reading cast on that tier froze a null city and the page said "Read for your saved
   location" forever. Its guard asserted the substring `"birthLocation"`, which `birthLocationLat`
   satisfies.

**v881 — every premium gate on Readings was telling the reader a lie about the sky**
Ten client call sites tested only `available` and never `locked`, so a locked reader was told *"The
sky is between eclipse seasons right now"*, *"Mercury is running clear right now"*, *"Venus is
running clear — no review to read"*, or handed a retry that could never work. The combined read and
the Verdict just stopped responding to the tap. The guard that called this done matched `useQuery`
only — all seven of these are mutations — and its proximity heuristic was satisfied by the word
inside *"not yet unlocked."* in a marketing string. Also: the Life Atlas spun forever on an errored
query, the Planner hero went blank on one, and the takeaway peeler could behead a sentence the model
wrote whole (it is rendered alone in gold, so the fragment is all the reader sees).

**v882 — the fate ban was enforced nowhere.** "Destined" is banned in copy because the path is
computed, not fixed. BASE_PROMPT bends fate-verbs back into the reader's hands, but the words
themselves were in no tail's ban list, no guard and no scrub. Now rejected on every surface,
including the ones allowed their machinery — they may name a sign, never a fate.

---

## Waiting on you

| | What | Why it is yours |
|---|---|---|
| 1 | **Your twelve crown days are picked by calendar date, not merit** — `DECISIONS_FOR_DAVID.md` #4 | Measured, 324 charts: a median 101 days a year meet the apex condition, ~30 are tied with the 12th on every ranked dimension, and 85.6% of all crowns land in the first half of the year because the tie-break is `localeCompare(date)`. Which dimension breaks the tie is your method. |
| 2 | **A transit only counts as touching a natal point within 4°** — `DECISIONS_FOR_DAVID.md` #5 | The same file uses 10° for natal conjunctions. Measured on 5 real charts: **54.2% of all contacts within 10° are dropped at the cutoff**, and Jupiter sat 4–10° from a natal point for 182 unbroken days without the model ever being told (Ketu 129, Mars 116, Rahu 113). The inconsistency is mine to report; the number is yours. |
| 3 | **A pinned reading after a birth-data correction** — `DECISIONS_FOR_DAVID.md` #3 | Still open. Pins bypass the hash by design, so corrected chart or kept words — your call. |
| 4 | **"The proof is in the specifics" is missing from SIX prompt tails** | I scanned all 17 constants myself: it is missing from `DEEP_READ_TAIL` (your year — PAID), `CHAPTER_TAIL`, `YOGA_READ_TAIL` (paid), `WINDOW_READ_TAIL` (paid), `ATLAS_READ_TAIL` (paid) and `CAST_TAIL`. BASE_PROMPT's only mention is a parenthetical inside the knots block, not a stated law. It is your words and your "MOST IMPORTANT LAW ON THIS PAGE" — but stated in the tail you were looking at when you made it. Adding it changes paid prose and costs a regeneration, so it waits for your yes. |
| 5 | **Two paid tails promise "no house numbers" with the enforcement switched off** | `yoga_read` and `window_read` pass `skipMachinery` and are never scrubbed, unlike the three surfaces where naming machinery is deliberate. Either the promise goes or the enforcement comes back — a voice call. |
| 6 | **The Verdict surface bypasses BASE_PROMPT** and so carries none of the shared laws (siblings, the Moon's pronoun, "never one single move"). | It is a first-class cached surface. Folding it into BASE is a prompt rewrite. |
| 7 | **Three star spellings · the crown mark's gold-on-gold · parchment day numbers in dark · the year calendar's three divergences · knot thresholds · pick-a-date precision layer (wire or delete) · price + Stripe keys** | Unchanged from the last edition — all yours, all still open. |

**Cannot be done from here:** production-vs-schema drift beyond what your last run showed, and
anything needing `DATABASE_URL`.

---

## One thing I chose NOT to fix

`horoscopes.computedCity` is `varchar(120)` while every column that can feed it is `varchar(128)`.
Under MySQL strict mode a 121–128-character place name would throw on insert, and the reveal path's
own comment says an insert failure means the archive won't list it and every re-reveal re-bills —
the 2026-07-17 outage shape. It is a one-character schema change, which makes it a script you run,
not a fix I ship. Say the word and I will write it as an idempotent widen.
