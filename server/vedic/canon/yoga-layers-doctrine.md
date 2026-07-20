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

**The five Muhurta yogas remain unbuilt**, for the reason above: no cited source in this repo.
