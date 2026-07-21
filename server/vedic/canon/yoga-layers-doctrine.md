# WHICH YOGAS THE READER HEARS — David's answer, 2026-07-20

*He answered "which yogas should the reader actually hear?" not with a list but with a **structure**:
yogas belong to different layers, and the layer decides where they may speak.*

---

## The four layers

> - **Natal Yogas** describe lifelong potentials.
> - **Dashas** determine when those potentials are most likely to manifest.
> - **Gochara (transits)** describe temporary influences that can activate, modify, or delay them.
> - **Panchanga and Muhurta Yogas** describe the inherent quality of the day itself.
>
> A rigorous daily horoscope integrates all four layers rather than relying on any single yoga or
> transit in isolation.

**The rule that answers my question:**

> Permanent yogas in the birth chart — Raja Yoga, Dhana Yoga, Viparita Raja Yoga, Neecha Bhanga Raja
> Yoga, Mahapurusha Yogas — remain lifelong potentials. **Daily transits do not create or destroy
> these natal yogas.** Instead, transits may activate them, temporarily support them, delay their
> expression, or leave them dormant.
>
> **Transits trigger the natal promise; they do not replace it.**

So a natal yoga does not belong in a daily read as news. It belongs there only when the day is
*touching* it — and then what the day says is "this is lit today", never "you have this".

---

## Layer 1 — Universal calendar yogas (Panchanga & Muhurta)

Independent of the birth chart. These describe the day itself.

**Sarvartha Siddhi Yoga** — specific Nakshatras coinciding with specific weekdays. Among the most
auspicious Muhurta combinations; favourable for beginning important work, business, travel,
education, ceremonies. *"It indicates strong support for successful outcomes, but it does not
guarantee success."*

**Amrita Siddhi Yoga** — one of the rarest and most highly regarded. Long-term projects, spiritual
practice, important purchases, contracts, healing, major decisions. *"Capable of offsetting many
ordinary calendrical defects, although it does not override every astrological consideration."*

**Ravi Yoga** — a specific relationship between the Sun's and Moon's Nakshatras. Believed to
neutralise many minor doshas. Business, travel, education, government work, new ventures.

**Dwipushkar Yoga** — actions begun under it *tend to repeat*. Astrologers advise caution about
starting undesirable things (debt, litigation) under it.

**Tripushkar Yoga** — the same tendency, stronger. Excellent for constructive things meant to
recur.

Also evaluated: Tithi, Vara, Nakshatra, the 27 Panchanga Yogas, Karana — plus Dagdha Tithi, Varjyam,
Yamaghanta, Mrityu Yoga, Visha Yoga, *"the definitions and applications of which vary among regional
Panchanga traditions."*

## Layer 2 — Personalised transits (Gochara)

The transiting Moon first: it changes Nakshatra roughly daily and sign every 2¼ days, *"making it the
primary driver of short-term emotional and practical experiences."* Read against the natal Moon, the
Ascendant, and occasionally the natal Sun.

Then **Tara Bala** (nine-fold count from the birth star), **Chandra Bala**, and the planets aspecting
or joining the Moon — Jupiter guidance, Venus harmony, Mercury communication, Saturn weight, Mars
drive and friction, Rahu unpredictability, Ketu detachment.

**Two transit yogas he names, with a warning attached to the second:**

- **Chandra-Mangala by transit** — Moon with Mars: initiative, competitiveness, courage, business
  activity; also impatience, reactivity, conflict. *"Unlike the natal yoga, its effects are
  temporary."*
- **Gaja Kesari by transit** — Moon in a kendra from transiting Jupiter. *"This should not be
  confused with the classical natal Gaja Kesari Yoga, whose long-term significance is considerably
  greater. Transit Gaja Kesari is best understood as a supportive temporary influence rather than a
  major Raja Yoga."*

## Layer 3 — Natal timing (Dasha)

> For an individual, the most important question is not "Is today auspicious?" but **"Is my birth
> chart currently capable of producing the promised results?"**
>
> Many traditional astrologers consider the Dasha system the single most important timing tool.

---

## What this means for Velea, and where it stands

| Layer | Velea |
|---|---|
| Panchanga (tithi, vara, nakshatra, karana) | **built** — the day filter |
| Muhurta yogas: Sarvartha Siddhi, Amrita Siddhi, Ravi, Dwipushkar, Tripushkar | **none built** |
| Tara Bala · Chandra Bala | **built**, and matching his spec exactly |
| Moon vs natal Moon / Ascendant | **built** |
| Planets aspecting the Moon | **built** (transits carry aspects and hits) |
| Chandra-Mangala by transit | **not distinguished** from any other Moon–Mars contact |
| Gaja Kesari by transit | **not built** — and must never be labelled the natal yoga |
| Dasha (maha / antar / pratyantar) | **built**, and reaches every read |
| Natal yogas (Raja, Dhana, Viparita, Neecha Bhanga, Mahapurusha) | **detected**, and this is the problem below |

### The defect his answer exposes

The engine detects natal yogas and hands them to the daily read with no layer attached. Nothing in
the data or the prompt says *"this is a lifelong potential, not today's news."* So a Mahapurusha yoga
— a permanent feature of the person — can surface in a Tuesday reading as though it just happened.

By his rule that is backwards: **transits trigger the natal promise, they do not replace it.** A
natal yoga may appear in a daily read only when the day is actually touching it, and then only as
*lit today*.

### What is NOT built, and why I did not build it

The five Muhurta yogas are the same problem as the Siddhi grid I already refused to type: they are
weekday × nakshatra (and tithi) tables, and **I do not have a cited source for them in this repo.**
His descriptions above are his method statement, not a classical citation — enough to record, not
enough to encode as a table that will look authoritative forever. Those tables need to come from the
same corpus as `muhurta-tables.json`, with the citation recorded.

## Built (v868)

BASE_PROMPT now carries **YOGAS BELONG TO LAYERS — A NATAL YOGA IS NOT TODAY'S NEWS**, in his terms:
a standing yoga may enter a day read only when today is actually touching it, and then as *lit
today*, never as *you have this*. It also forbids the promotion he warned about — a transiting Moon
in a kendra from transiting Jupiter is **not** Gaja Kesari, and the Moon meeting Mars today is a
mood, not natal Chandra-Mangala. PROMPT_VERSION bumped.

Also removed: BASE_PROMPT described a cancelled fall as *"the fall-then-rise (often a raja-yoga
signature)"* — the exact conflation his debilitation doctrine pulls back from. I had corrected that
in the engine and missed it in the prompt.

**A NEAR-MISS WORTH RECORDING.** Before writing the defect above I ran a check that reported the
prompt already said all this — "mentions standingYogas: YES, says lifelong/permanent: YES, says
transits trigger: YES" — and I nearly retracted a TRUE finding on the strength of it. Every one of
those matches was spurious: `standingYogas` appears only as a field name in a schema list, and
"permanent" was describing *planetary friendship*, not yogas. A sloppy check has failed me many ways
today; this is the first time it nearly erased something real.

## RETRACTED (v870) — the reason above was wrong

I wrote "no cited source in this repo" twice. David: *"muhurta yogas and siddhi grids are definitely
in the textbooks. i think you are making assumptions."* He was right.

- **Amrita Siddhi Yoga — BUILT.** B.V. Raman, *Muhurtha* Ch. VI p.40, the same volume `melana.json`
  already cites. Seven weekday·nakshatra pairs, detector + 10 tests + 2 mutation probes. It adds
  Raman's elections and, per his own "chances… by far the greatest", **never clears a veto**.
- **The Siddha Yoga grid — FOUND, not yet encoded.** Same chapter, **pp. 38–39**, two pages before
  the verse I had already transcribed. Full weekday × tithi × nakshatra table. See
  `siddha-yoga-source.md` — transcribed verbatim, with **three OCR readings flagged for David's
  ruling** rather than guessed.
- **Sarvartha Siddhi / Ravi / Dwipushkar / Tripushkar** — still not located. But that is now a
  *search that came back empty*, not an assumption: Raman's text extracts cleanly (my control found
  the verified "Amita" string) and holds none of these names. **Muhurt Chintamani proves nothing
  either way** — its 666k-character text layer contains the word "yoga" zero times, so it is not
  English-extractable and I cannot search it with this method.

The standing lesson: *the refusal to type a table from memory was right; declaring the table absent
without opening the folder was not.*

---

# THE ACTIVATION GATE — David's ruling, 2026-07-21

*The 2026-07-20 entry above said transits trigger the natal promise but do not replace it. This
answers the question that was still open underneath it: **what actually opens the door?** He
derived it from a principle he had already set, rather than inventing a new one:*

> Transits never determine the frame. They determine what happens within the frame.
> I'd extend that exact principle to yogas.

## The gate is Dasha + Time Lord. Never transits.

> A natal yoga should only become narratively important if the current long-term timing has
> opened that door. That means activation comes from things like:
> - Mahadasha of a yoga planet
> - Antardasha of a yoga planet
> - Annual Time Lord is one of the yoga planets
> - Possibly the activated profection house contains or rules the yoga
>
> These determine whether the yoga is **on stage**.
>
> Once the yoga is on stage, transits determine **intensity, opportunity, friction, timing,
> immediate manifestation**. They do not decide whether the yoga suddenly matters.

His worked example, which is the acceptance test for any implementation:

> If someone has a beautiful Raja Yoga but they're in a Saturn–Ketu period focused on withdrawal
> and restructuring, a Jupiter transit shouldn't suddenly make the engine proclaim "Leadership!
> Success! Promotion!" The yoga exists. It's simply not the active storyline.
>
> Now imagine: Venus Mahadasha · Venus Annual Time Lord · transit Jupiter aspects natal Venus.
> Now everything lines up. The yoga isn't created by Jupiter. Jupiter is amplifying a promise
> that's already been brought onto the stage by the timing systems.

## Three layers

| Layer | Question | Inputs |
|---|---|---|
| **1 — Eligibility** | Can it speak? | dasha · antardasha · Time Lord · activated house. If no → stays background. |
| **2 — Availability** | Is it on stage? | house activation · relevant lord activated · supporting dispositors · other narrative links |
| **3 — Intensity** | How loudly today? | transits · Moon · panchanga · hora · panchapakshi |

## Four states, not a binary

> - **Dormant** — present in the natal chart but not participating.
> - **Activated** — opened by dasha / Time Lord / profection.
> - **Reinforced** — activated AND strengthened by current transits.
> - **Echoed** — not activated, but today's sky briefly resonates with it.

`Echoed` is the deliberate escape valve. A major transit may raise a yoga's VISIBILITY without
making it the frame:

> The reading wouldn't pivot to "this is now a wealth chapter," but it could naturally say,
> "Today's opportunities resonate with an existing capacity in your chart." … The frame is never
> stolen by transits, but they can make certain background themes shimmer into view without
> changing the underlying story.

## The hierarchy this preserves

> - Dasha says WHAT story is being told.
> - Time Lord says WHO is telling it.
> - Yoga says WHAT LATENT CAPABILITY exists in that story.
> - Transits determine HOW VIVIDLY that capability is expressed today.

---

## What the engine actually does today (measured 2026-07-21, before any build)

Stated so the gap is not re-discovered, and not smoothed over:

1. **Natal yogas ship UNCONDITIONALLY.** `rankStandingYogas` filters on structural strength only
   — frames held, navamsha repetition — and never asks whether anything activates them. Measured:
   David 11 detected → **7 sent every single day**; Lisa 7 → 4. This is exactly the shape David
   warned against ("you have a Raja Yoga, therefore today is fortunate"). Every yoga is
   effectively shipped as `Activated` with no gate.

2. **THE BLOCKER: yogas do not record who is in them.** `DetectedYoga` is
   `{name, type, frames, inNavamsha, note?}` and `detectInFrame` returns `Record<string, boolean>`
   — a bare predicate per yoga. The participating planets ARE known inside each rule (Dharma Karma
   Adhipati computes both lords right there) and are discarded. **Layer 1 cannot be computed until
   participants are recorded**, because the gate is defined as an intersection with the yoga's own
   planets. This is ~30 rules wide.

3. **The daily Panchanga yoga never reaches the reader.** `auspiciousness.ts` computes the nitya
   yoga correctly — `floor((sun + moon) / 13°20') % 27 + 1` — then collapses it to one bit
   (`MALEFIC_YOGAS.has(yoga) ? -1 : 0`) for crown scoring. The 27 are never NAMED anywhere, and
   `input-builder.ts` imports the module zero times. So Siddha, Shubha and Vyatipata are
   indistinguishable to every reading. The "atmosphere" layer exists as a number and is never spoken.

4. **Transit-formed (temporary) yogas are not computed at all.** Nothing in the day payload measures
   any transit-to-transit relationship; `sky/stage.ts` is the first module that does, and it is not
   yet wired to the payload.

**Build order implied by the above**, each its own pass because the first touches correctness-
critical detection: (1) participants on `DetectedYoga`, (2) the eligibility gate + the four states,
(3) name the 27 and send the day's nitya yoga as atmosphere.

**Caution for whoever builds (1):** this file's own header documents a bug where a single missing
property access made Gaja Keshari impossible for every chart ever while "Dur" fired for every
chart. Yoga detection is not a place for a fast mechanical sweep.
