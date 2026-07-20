# DECISIONS FOR DAVID — method forks I will not guess

*Started 2026-07-20, during the audit fix run.*

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
