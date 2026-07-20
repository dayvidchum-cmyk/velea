# AUDIT STATUS — where the fix run stands

*2026-07-20. Deployed and verified live at **v790** (checked against velealor.com/sw.js, not just
pushed). 19 commits, 558 tests passing, build clean.*

**This is the one place to look.** Two other files hold detail: `BLOCKED_ON_STRIPE.md` (parked on
purpose) and `DECISIONS_FOR_DAVID.md` (the only things waiting on you).

---

## Waiting on you — 3 things, that's all

| | What | Where |
|---|---|---|
| 1 | **Pinned readings after a birth-data correction.** A pin bypasses the cache hash by design, so a corrected chart keeps serving the old chart's prose. Keep their words, or keep accuracy? | `DECISIONS_FOR_DAVID.md` #3 |
| 2 | **Sweep `accentInk` app-wide?** Every day-mode accent fails contrast as text on one ground or the other. The utility is built and proven; applying it everywhere is a palette call. | v784 |
| 3 | **Light-mode `--muted-foreground`** measures 3.48:1 (needs 4.5). Same hue 15% darker (`#786E60`) reaches 4.56. Your palette value, your call. | v785 |

Plus one I can't do at all: **prod-vs-schema drift** needs your `DATABASE_URL`. It cannot be checked
from here.

---

## What this run actually fixed

**Money / billing correctness** (not Stripe — these leak today)
- v776 — pinning billed a full generation of prose nobody ever sees; refresh overwrote and re-billed pinned reads.
- v783 — a failed cache write reported success, so the next tap regenerated and re-billed the same reading. During the 7/17 outage that was *every* tap.

**The engine told two stories** (the class this run kept finding)
- v778 — **the crown days were landing on the weakest Moon of the year.** Every Parama Mitra day of the year carried bad chandrabala (43/43, 41/41, 40/40 across three charts), so all twelve "crowning days" sat on houses 4/8/12 from the native's own Moon. *It does not misfire on your chart* — which is why it survived.
- v780 — the day's star was read by majority, the day's sign at the sunrise instant. On 21.1% of days the sign that ruled the day was not the one being used; worst case it held 1% of the day.
- v781 — the reading and the calendar had different definitions of "crown", agreeing on **zero** days.
- v789 — a regression **I introduced in v780**, found by re-auditing: the day's house and the day's mode disagreed on 13 of 90 days, so the "why is today this mode" explainer contradicted itself.

**The model was being fed wrong or missing data**
- v776 — `recentReads`, the guard against the "wallpaper era", had been silently empty for everyone who never pinned.
- v779 — the House Reader described a room without knowing whether its keeper was exalted or fallen.
- v782 / v790 — three canon files were imported by nothing. `planet-in-house` now feeds the House Reader; `karakas.json` had drifted, leaving **Jupiter missing from career**.

**Things that read as broken**
- v777 — the glyph rail left its own cell; two loaded days ran together into one strip. `/audit` rendered coins at 2.4× the real cell, so this class *could not fail* there.
- v784 / v787 / v788 — premium gates rendered as failures with a retry that could never work, across nine surfaces.
- v785 — **the default button was near-illegible in the default theme** (1.95:1).

---

## How each of these was verified

Not "the tests pass". Every fix has a control that was *shown to fail* against the old code:
independent dense sampling (v780: 120/120), a real captured 365-day sky (v778), rendered-and-measured
pixels (v777, v784, v785, v787), or an isolated revert (v790).

Three probes lied to me first and are worth remembering: one measured a container that never grows
when its children spill; one parsed `oklch(...)` as if it were RGB; one failed for the wrong reason
entirely. **A clean result from a probe that cannot fail proves nothing** — every probe here now
carries a denominator or a sanity anchor.
