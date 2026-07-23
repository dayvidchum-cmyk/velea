# METHOD — The Lens Router

_The spine. Written after reading K&F Vol I & II front to back. This is not invented; it is how the
canon is already wired. Every file in `canon/` is **data the systems below pull**. This doc is the
**control flow** — which system fires for which time frame, and what deterministic data it hands the
LLM so the prompt is a **filtered lens, not a data dump.** Living doc — David refines._

---

## The law (why this exists)

> Throw a pile of sky at the model with no lens and it glitches — too much stuff, no filter.
> The tradition already built a **different system for each kind of question about time.** Pick the
> ONE system the question calls for, let *that system* pull exactly the data it needs, enter the
> native at the point the system says to, and it spirals to a single point where the answer sings.

The founding wound (see memory `velea-origin-frustration`) is the un-filtered lens: raw profection,
overload, the loop. The fix is the router below. **Big → small, as small as possible. Sky first;
the sky is the prompt the Vedas pre-built. The native enters sooner than you'd think.**

---

## Step 0 — Name the time frame (this picks the system)

The time frame IS the router key. Do not choose a method; the question's time frame chooses it.

| Time frame in question | The ONE system the canon built for it | Where the native enters | Source |
|---|---|---|---|
| **A day** — "which days this month hold something?" | **Tara Bala + Chandra Bala** — count from the native's **birth nakshatra** to the day's Moon-nakshatra (mod 9). | **Step ONE.** Native's birth star is the origin of the count. | Vol I Ch.12/13 (nakshatra timing); already live as Velea crown days (`velea-time-master-golden-hour`, `crown-days-and-golden-removed`) |
| **A moment / a single question** — "is now good for X?" | **Prasna** (horary). Cast the chart for the moment of the question, anchor on the **Ascendant** = querent, the house of the matter = significator. Ithasala (faster planet **applying**) = future / it fulfils; Easarapha (**separating**) = past / it fails; conjunction = now. Moon in Ithasala to the significator = it moves. 11th-lord Ithasala to lagnesha = ultimate success. | Native only cross-references (no birth data required). This is **David's journal method**: "what big thing is happening this summer in the sky…" = time frame + sky first, native last. | Vol II Ch.13–14; `arudha-lagna.json`, `vol2-house-and-prasna.md` |
| **A life EVENT — WHEN will it happen** (engagement, marriage, birth, career turn, fame) | **Appendix IV Step 15** — the convergence method. Current **MahaDasha lord** + each **sub-cycle lord** (bhukti, antara, pratyantar). Where the researched indications of those lords **agree on the same event**, predict it. **More sub-cycles agreeing = higher probability.** | Native is the whole substrate: Steps 1–14 research each house first (below), then Step 15 times it. | Vol II Appendix IV |
| **A solar year / annual** — "how is this year?" | **Varshaphala** (Tajika Solar Return) — the annual chart + Tajika yogas (Ithasala/Easarapha/Nakta/Yamya/Kamboola) + year-lord. | Native's Solar Return recomputed each birthday. | Vol II Ch.14; `velea-period-readings` (Monthly), `velea-pick-a-date-horoscope` |
| **A life STAGE with no dasha/transit signal** | **Planetary Ages + Maturity** — background planet by age band; a planet "matures" at its year (Jupiter 16 … Ketu 48) and its houses sharpen ~12 mo. | Native's age. | Vol I Ch.13; already in `timing.json` |
| **The always-on background clock** | **Vimshottari Dasha** — the master. Whatever a planet promises natally fires in **its** maha/bhukti/antara. A promise with no dasha in the relevant life-stage stays **latent**. | Native's Moon nakshatra sets the start. | Vol I Ch.12; `timing.json` |

**Transits (gochara) never pick the frame — they only time/color it.** Coordinate transits with the
running dasha (the single most important transit rule); a transit can never contradict the natal
promise. Read from the **Ascendant** primarily, Chandra lagna secondary. Slow planets (Jupiter,
Saturn) carry the story; fast planets matter only at exact conjunction. (`timing.json` → `transits`.)

---

## The counting law — **weight ranks, lords gate** (David, ratified v798)

Step 15 **counts agreement; it never weights it into existence.** A theme lights on the honest count
of **distinct running period-lords** tied to it (`convergence`), gated two ways: a **standing** chapter
lights only when the **maha lord is tied AND at least one more period-lord agrees** (`mahaTied &&
convergence ≥ 2`) — Step 15 reads outward from the maha, so sub-cycles agreeing among themselves without
the chapter frame is not the chapter; an **acute event** breaks through alone only when a **moving
trigger dates it** (a slow transit landing on the house-lord — a static natal conjunction establishes
the chapter but dates nothing).

**Intensity is a separate axis from agreement.** The heavy-lord bonus — a period lord seated on the
Meridian doubles its tie (David's law 2026-07-17, ratified on the Simone proving case: *"when a dasha
lord lands on the Meridian, it's the whole reading"*) — feeds **`weight`, which RANKS how loud a lit
chapter is. It never decides whether the chapter lights.** A weighted gate would let one axis-seated
maha reach 2 and manufacture a chapter with nobody agreeing (the phantom the v430 rebuild exists to
prevent; re-fixed v798). So, as one rule: **weight ranks, lords gate.**

**The count is the engine's private authority** (David, 2026-07-22): it decides which theme leads the
reading — no vote, no AI, no tie-break beyond these deterministic rules. But the reader is **never
handed the score.** Convergence 3 and convergence 2 must read with the *same* conviction; the number
picks the subject, it does not set the tone. (Open reconciliation: the Low/Moderate/High `confidence`
field on the deep/year reads still exposes the tally — David's call whether that trust-signal stays on
prediction surfaces or the score goes fully internal everywhere.)

---

## Steps 1–14 — Research each house (the reusable per-house prompt)

Appendix IV runs this identical block per house 1→12. It is **one prompt template, fired twelve
times.** This replaces the invented THEMES-scoring engine in `knots.ts` (David's "hubris" — retire it):
the tradition does not score, it **researches then looks for convergence.**

For the house in question:
1. Sign on the house. Planets **graha-aspecting** the bhava cusp (helping / hurting?).
2. **Lord** of the house → its **dignity** (exalt / moolatrikona / own / friend / neutral / enemy / fall,
   + neecha bhanga cancellation), its **Shadbala**, where it sits (house, sign), who it's with.
3. Planets **rashi-aspecting** the bhava (and what houses THEY rule — that's the wiring: every planet
   drags its own houses' affairs onto whatever it touches).
4. **Bhava yogas** the lord makes / to the house (`yogas.json`, `house-lord-combinations.json`).
5. **Lajjitaadi avashtas** on the lord AND on the house (`avashtas.json` + the full per-planet
   narratives now read into METHOD's sibling notes — friends *delight*, enemies *starve/agitate/shame*,
   qualified by **Jagradaadi** awake/sleepy/asleep for how much it bites).
6. **Balaadi avashta** (karmic fruition: infant ¼ · adolescent ½ · adult full · old ⅛ · dead ~none).
7. **The house's OWN varga**, read for that house, with the varga's **primary karaka**:
   D2 Hora (2nd, wealth, karaka Moon) · D3 Drekkana (3rd, siblings/effort, Mars) ·
   D4 Chaturthamsa (4th, fortune, Mercury) · D7 Saptamsa (5th & 7th, children/creativity, Jupiter) ·
   D9 Navamsha (**9th, marriage & dharma**, Venus/Jupiter) · D10 Dasamsha (**10th, status/career**,
   Saturn/Sun) · D12 Dwadasamsa (12th, ancestry/past-life, Rahu/Ketu) · D20 Vimsamsa (8th, spiritual) ·
   D30 Trimsamsa (6th, health/adversity, Sun). (Appendix III + Appendix IV per-step varga map.)

**Special anchors that ride alongside the house pass:** the **Lagna** (Step 1 — overriding factor;
its lord's placement assures that house), the **Atmakaraka** (planet at highest degree in any sign +
its Navamsha sign = Karakamsha = the soul/self lens), the **Moon** (waxing/waning, sign, house, who
touches it — the mind and the day-trigger). Dharma = **identity received in the world** via the
Meridian/10th, NOT career (`velea-dharma-is-identity-not-work`, `velea-meridian-is-the-spine`).

---

## Step 15 — Time it (convergence, not scoring)

1. Current **MahaDasha** → pull its lord's Steps-1–14 research.
2. **Sub-period lord** (bhukti) → pull its research. Repeat for each finer sub-cycle (antara, pratyantar).
3. Where MahaDasha lord and sub-cycle lords **indicate the same event** → predict it. **The more
   sub-cycles that agree, the higher the probability.** (This is *confluence* — same as reading the
   Sudarshana Chakra: Lagna + Chandra + Surya lagna agreeing = fixed karma; Vol II Ch.3.)

This is the honest replacement for the knot detector. No invented weights — the "knot" is simply the
**house whose promise multiple running dasha lords converge on, in the window in question.**

---

## What the engine hands the LLM (the deliverable)

Not a data dump. Per surface, the router:
1. reads the **time frame** → selects **one system** (table above);
2. lets that system **pull only the data it names** (the deterministic canon: dignity, avashtas,
   shadbala, balaadi, the relevant varga, the karaka, the dasha lords);
3. enters the **native** where the system says (Tara Bala step-one / Prasna cross-ref / Appendix IV
   substrate);
4. hands the LLM a **filtered lens** — the few concrete, lived house-specifics that converge, named as
   the **place they are lived** (the craft, the voice, the livelihood, blood + inner circle), never a
   house number, never the machinery (`velea-proof-is-in-the-specifics`, `velea-no-house-numbers-in-prose`,
   `velea-readings-no-single-move`).

Deterministic + cached (day-stable hash — `velea-cache-must-be-time-stable`), each layer verified
before it ships (`recommendation-layer-roadmap`, `fix-the-source-not-the-symptom`).

---

## Build order (open)

The canon is stored. The router above is the wiring. Next, one layer at a time, verified:
1. **Retire** `knots.ts` THEMES-scoring; re-express as Appendix IV Steps-1–14 research + Step-15
   convergence (deterministic, no weights).
2. **Ingest Shadbala** compute (Vol II Ch.8) — Steps 1–14 depend on it; not yet in `canon/`.
3. **Per-house research builder** — the one prompt fired 12× (Steps 1–14), pulling dignity/avashta/
   balaadi/varga/karaka it already has.
4. **Time-frame router** — the Step-0 table as the actual dispatch: day→TaraBala, moment→Prasna,
   event→Step15, year→Varshaphala.
