# Time Lord Page — Design Spec (from user, Lisa as worked example)

The Time Lord page (renamed from "Profection Year") communicates the year's reading.
Order of sections, with the labels the user wants. Deterministic parts are computed
from the chart (FREE, no API, auditable); prose parts come from the LLM deep read.

## 1. Title: "Time Lord"

## 2. Explainer (DETERMINISTIC — static copy) — DONE
"In astrology, annual profection is an ancient timing technique that follows the
movement of your Lagna (Ascendant, Rising Sign), which activates one house of your
birth chart each year of your life. At birth you are age 0 and your 1st house is
activated; at age 1, the 2nd house; after 12 years the cycle repeats. The ruler of
the activated house is your Time Lord — the planet running your year."

## 3. "Your Time Lords" wheel (DETERMINISTIC) — DONE (renamed off "Profection")
- Must span the full Vimshottari range — ages 0–119 (10 rings). DONE.
- Caption: numbers = your age; the house it lands in = that year's focus; that sign's
  ruling planet = your Time Lord. DONE.

## 4. WHY NOW? — LOGIC CHAIN (DETERMINISTIC, numbered, ↓ arrows) — TODO
Walk the reasoning so a newcomer can trace it (Lisa, age 44, Virgo lagna):
1. You are 44 years old this year.
2. This activates the 9th house of your birth chart.
3. Your 9th house is Taurus.
4. Taurus is ruled by Venus → your Time Lord is Venus.
5. Venus sits in the 5th house of your birth chart (Capricorn, Uttara Ashadha) —
   creativity, the heart's expression, children, romance, speculative intelligence.
(Step 5 needs natal placement of the Time Lord — via trpc.profiles.getSubject → natalBodies.)

## 5. CORE THEME (LLM prose, short)
"A year of belief and self-worth examined together: what you teach, travel toward, or
take as your guiding philosophy is inseparable from what you think you deserve — and
both are being tested for honesty." (Venus rules 9th [belief/dharma] + 2nd [income/
self-worth] → fused; worked out through the 5th house [the heart's output].)

## 6. WHY NOW (dasha, ~6 sentences, LLM): name the players briefly
- Maha Dasha Jupiter in 2nd house (money, speech, self-worth) in Libra, rules 4th
  (home/origins/mother) and 7th (partnership) — home-security + partnerships are the bedrock.
- Antar Dasha Ketu in 4th house (home, roots, mother, the past) in Sagittarius, retro —
  releases the past/the home-as-was/the mother-story; rootlessness even when structure intact.

## 6b. CURRENT TRIGGER — STRUCTURED BREAKDOWN (DETERMINISTIC transits + brief read)
Same treatment as WHY NOW: a list, one row per live transit (planet → your house →
what it touches), then short prose. All deterministic (transit positions + house-from-
lagna are already in the narrative input's `transits` block). Lisa example:
- Transiting Mars → your 9th house (Taurus) — the year's own activated terrain; presses
  belief, long journeys, teaching, what you'll act on from your philosophy.
- Transiting Venus (your Time Lord) → your 11th house (Cancer) — the current chapter
  (weeks): friendships, the wider circle, gains, hopes.
- Transiting Saturn → your 7th house (Pisces) — slow accountability on partnerships,
  while Jupiter's dasha already asks what they're built on.

## 7. LIKELY MANIFESTATIONS — sub-headed by life domain (LLM), short prose + a reflective question each
- MONEY: 9th-and-2nd fusion through Venus → income & self-worth entangled. "Am I being
  rewarded for my gifts and experience? Does the exchange honor who I am and what I do?"
- HOME: Ketu in 4th + Jupiter ruling 4th → the ground feels uncertain (a parent's
  situation, where you live, the home you knew isn't quite the home now).
  *** Must distinguish PHYSICAL home vs. EMOTIONAL/inner home — "home is where the heart is." Don't conflate. ***
- RELATIONSHIPS: Saturn transiting 7th → partnerships audited: what's it built on, each
  person's contribution, the contract going forward. "Is the connection mutually beneficial?"

## 8. THE LESSON (LLM = developmental task, renamed)
"Close the gap between what you profess and what you ask for — stop underpricing the
knowledge/teaching/belief you've earned, and stop using philosophical distance to avoid
the concrete ask. Ketu in the 4th asks you to grieve something about the past or the
home without rebuilding it in the old image — let the inner ground reconstitute into
something yours, not inherited."

## 8b. CURRENT TIME LORD MOVEMENT (mostly DETERMINISTIC — exists)
Framing line (the soul of this section): **"When the Time Lord moves, life moves.
Friction shows you what needs to be resolved."** As the year lord transits each house
in turn, that life area is activated; friction there is diagnostic. — ADDED to page.
- Current chapter card: year lord's current sign · house · date range, FOCUS, and the
  engine-fed BEST USES / AVOID (chapterGoodFor/chapterAvoid — personalized). Exists.
- "Time Lord Movement this year": the full timeline of the year lord through each
  sign/house with dates + motion (direct/retro, combust, solitary). Exists via
  trpc.profection.timeLordTransits.

## 8c. CONFIDENCE — broken into a LIST (DONE)
level (Low/Mod/High) + 2–4 short converging-signal phrases as bullets, not a wall.
e.g. "9th-house profection — Venus year" / "Ketu sub-period in your 4th" / "Mars
transiting the activated 9th". More convergence = higher level.

## REDUNDANCY RULE (DONE)
The Today page owns the DAY signal (the glance). The Time Lord page is the YEAR — it
must NOT repeat today's signal. `synthesis` was removed from the deep read entirely.

## 9. WHAT SUPPORTS GROWTH / WHAT CREATES FRICTION
User flagged these as STILL GENERIC. Need to be personalized or cut. TBD.

## Renamed section labels (deep read → page)
Core Theme → CORE THEME · Why Now → WHY NOW? (logic chain + dasha) · Likely
Manifestations → LIKELY MANIFESTATIONS (by domain) · Developmental Task → THE LESSON.
