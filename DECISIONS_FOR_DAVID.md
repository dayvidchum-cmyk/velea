# DECISIONS FOR DAVID — method forks I will not guess

*Started 2026-07-20, during the audit fix run.*

> **The two original questions were answered on 2026-07-20 and are BUILT. ONE new question is open
> — question 3 at the bottom.**
> 1. *"what do the text books say"* → the canon says the personal pair decides a day (METHOD.md
>    Step 0) and "the native's tara standing overrides the collective" (muhurta veto note). No canon
>    rule lets a rough collective sky cancel a personal peak. Shipped as **v781**: the reading now
>    crowns the same twelve days the calendar does, and the prompt was corrected to match.
> 2. *"majority"* → shipped as **v780**: the day's Moon SIGN now follows the same majority rule as
>    its star, verified 120/120 against independent dense sampling.
>
> The record of both questions is kept below, because the reasoning is the thing worth keeping.

---

These are the only things I have found that I am **deliberately not deciding**. Each one is a
question about YOUR sky-reading method where the canon does not rule and there is a real classical
case on both sides — so guessing would be inventing method and calling it a fix
(the standing law: never assume the method).

Everything else the audit turns up gets fixed without asking. This file is short on purpose. If it
starts growing, that means I am asking too much.

**Answer format: just say "1: A" / "2: B" — one line each is enough.**

---

## 1. Does the CROWN care about the collective sky?

**The split you stated:** golden = the collective sky's border · crown = the personal apex
(Velea's OWN tarabala + chandrabala).

**What the code does:** the calendar's crown is the personal apex (as of v778 — this was badly
broken and is now fixed). But the READING's crown adds two more gates: the day's *universal /
collective* score must be ≥ 0, and the transit pressure must not be a pileup.

**Measured** (3 charts × a full year of real sky): after v778 the calendar's twelve crowns are all
true convergences, but the reading still refuses ~9 of those 12 — almost always because the
COLLECTIVE day is negative. So the calendar shows a crown and the prose calls the same day merely
"favorable."

- **A — the crown is purely personal.** Drop the universal/transit gates from the reading's crown.
  The calendar and the prose agree 12/12. A crown can then fall on a rough collective day — which
  is arguably the point ("altitude, not weather").
- **B — a crown needs a clean sky too.** Keep the gates, and add them to the calendar's ranking
  instead, so the calendar stops crowning days the prose won't call crowns. Fewer crowns per year.
- **C — leave as is** and accept that the calendar crown and the prose crown mean different things.

I lean **A**: it is what your own stated split says, and it keeps the crown a fact about the
PERSON. But it is your method.

---

## 2. Is the day's Moon SIGN taken at sunrise, or by majority?

**Background:** you ruled (2026-07-09) that the day's Moon-NAKSHATRA is the star that rules the
majority of the vedic day, sunrise to sunrise. v774 made that exact. The day's Moon **SIGN** was
never revisited: it is still read at the sunrise instant (`astronomy.ts:438`, comment "more stable
than nakshatra" — the same reasoning the majority ruling overturned for the star).

That sign is what **chandrabala** counts from — so it drives the crown, the day mode, and the
house.

**Measured, 365 real days (Boston):**
- the Moon changes sign inside the vedic day on **160 days (43.8%)**
- on **77 of those (21.1% of ALL days)** the sunrise sign is *not* the sign that ruled the day
- worst cases: 2026-08-02 the app counts chandra from Aquarius, which held **1%** of the day
  (Pisces ruled it). Same shape on 2026-11-07, 2026-12-27, 2027-03-13, 2027-02-22.

- **A — majority, like the star.** One Moon, one clock. Extends your 07-09 ruling to the same
  body's sign. Changes the chandra/mode/house verdict on ~1 day in 5.
- **B — sunrise, on purpose.** Classical almanacs do quote the day's elements at sunrise; if that
  is the intent, I will write it down as doctrine so no future audit re-raises it — but then the
  STAR should arguably go back to sunrise too, for the same reason.
- **C — sunrise for the sign, majority for the star**, deliberately, because they answer different
  questions. If so, tell me the reason in one line and I will record it in the canon notes.

I lean **A**, and note that crown.ts already documents the split as "the personal layer is
majority-based; the universal/collective layer keeps the noon convention" — chandrabala is the
personal layer. But this is exactly the kind of thing I am not willing to decide for you.

**Cost note:** changing it re-hashes the affected days, so any already-cached reading for one of
those days regenerates once if reopened. With the current handful of testers that is cents, not a
mass regeneration — it is not a money reason to wait.

---

*See also `BLOCKED_ON_STRIPE.md` — the separate list of things parked because they need billing.*


---

## 3. When someone CORRECTS their birth data, what happens to a reading they PINNED? (open)

**Found 2026-07-20** while auditing the birth-data edit cascade. Everything else in that cascade is
sound: the chart, the research, the dashas, the convergence and the profection all recompute, and
unpinned readings can't survive because the natal data is inside their cache hash. Two exceptions:

1. The ranked solar year was memoised on a key that couldn't see a birth-TIME correction. **Fixed
   (v786)** — not a question, just a bug.
2. **A PINNED reading is served regardless of its hash.** That is the whole point of a pin ("a
   locked read NEVER regenerates"). But if the birth data was wrong and has now been corrected, the
   pinned prose was computed from a chart that is not theirs — and per v776 the pin covers the year
   read too, so that stays stale as well.

- **A — accuracy wins.** A chart recompute unpins. The corrected reading generates on next open.
  Cost: the exact words they chose to keep are replaced on that date.
- **B — their words win.** Pinned prose is theirs; leave it. Cost: a reading from a superseded
  chart keeps being served as today's reading, silently.
- **C — keep it AND say so.** Leave the pin, mark the row as "read from your earlier chart" and
  show that in the UI. Honest and non-destructive — but it needs a new column, so it waits for a
  hand-run migration (your rule: no auto-migrations, ever).

I lean **C**, with **A** as the interim if you don't want to wait for the migration. I have not
implemented any of them — replacing prose someone deliberately kept is not a call I should make
alone, and it is rare enough (the 24h edit cooldown) that guessing buys nothing.

---

## 4. Your twelve crown days are picked by CALENDAR DATE, not by merit (open)

**Found 2026-07-20**, auditing every threshold in the engine. v778 fixed the pool — the top twelve
now come from days where tara AND chandra are both favorable, which is your split exactly. What was
never looked at is the **cutoff**.

**Measured** (real Boston sky, 2026-07-20 → 2027-07-19, all 324 birth-star × natal-Moon-sign
combinations — I re-ran this myself after an agent reported it):

- a chart gets a **median 101 convergent days a year** (min 81, max 124). Not one of the 324 has
  fewer than 12.
- inside that pool the ladder barely discriminates — tara class and rung are near-identical for all
  of them — so the final `|| a.date.localeCompare(b.date)` decides. **A mean of 29.9 days are tied
  with the 12th on every ranked dimension**, and the cutoff falls inside a tie in **324 of 324**
  charts.
- consequence: **85.6% of all crowns land in the first half of the solar year** (3327 of 3888;
  50% if unbiased). On the sample chart all twelve fall between 21 Jul and 30 Oct, while 69
  equally-convergent days in the other eight months wear nothing.
- and BASE_PROMPT tells the model, of a crowned day: *"one of the TWELVE crowned days of this
  person's whole solar year… Genuinely rare: twelve days out of three hundred and sixty-five."*
  The count is true. The **selection** is an artifact of how the list was sorted.

- **A — twelve stays, but earn it.** Add a real tie-break inside the pool (Ashtakavarga bindus on
  the day-Moon's sign is the obvious candidate — it is already computed) so the twelve are the
  twelve strongest, not the twelve earliest.
- **B — crown every convergent day.** Honest to the predicate, but that is ~101 days a year, and the
  prompt's "genuinely rare" line and the calendar's whole look would change with it.
- **C — spread them.** Take the best of each month, so the year reads as a year.
- **D — leave it.** Twelve is twelve; which twelve matters less than that they are real apex days.

I lean **A**: it keeps your number and your rarity claim, and it makes the word "crown" mean the
same thing in October as in July. But which dimension breaks the tie is your method, not mine.

---

## 5. A transit is only reported as touching a natal point within 4° — the slow lords vanish (open)

`input-builder.ts:421` reports `hitsNatalPoint` / `orbDeg` only when the orb is **≤ 4°**. Outside
that, the contact is erased from the payload — the model cannot know it exists. **Line 170 of the
same file uses 10°** for natal-to-natal conjunctions. One file, two answers to the same question.

**Measured** (5 charts × 365 days × 9 planets = 16,425 planet-days): of every contact within 10°,
**53.2% is dropped at the 4° cutoff**. Per planet, the longest UNBROKEN stretch where a planet sat
4–10° from a natal point and the payload never said so once:

    Rahu 188 days · Saturn 142 · Jupiter 129 · Ketu 114 · Mercury 21 · Venus 20 · Mars 36

For the Moon and the Sun, 4° is defensible. For the slow lords — the ones a chapter is built on —
the classical orb is 8–9°, and a Saturn transit within 8° of your natal Meridian is exactly the
kind of thing the Arc and the year read exist to name.

- **A — one orb, 8°, for the slow planets** (Jupiter, Saturn, Rahu, Ketu), keep 4° for the fast ones.
- **B — 8° for everything**, matching the tradition's conjunction orb.
- **C — keep 4°**, and I write down why, so no future audit re-raises it.

I lean **A**. But the number is a method ruling — the inconsistency is mine to report, not to settle.
