# THE CROWN AND GOLDEN MARKS — David's spec, 2026-07-20, audited against what is built

*His words, then a point-by-point check of the engine. Two of five pieces match exactly. Three are
missing, and one of those is missing entirely.*

---

## What he specified

### 1 · Tara Bala — the 9-part cycle from the birth star

> Count from your birth Nakshatra (natal Moon star) to the Nakshatra of the current day. This count
> fits into a 9-part cycle.
>
> - **Sampat (2nd)** — extremely prosperous; financial investments and wealth.
> - **Kshema (4th)** — supported and protected; health, buying property, seeking comfort.
> - **Sadhana (6th)** — aligned for achievement; mastering a skill, executing plans, hard work.
> - **Mitra & Parama Mitra (8th & 9th)** — highly friendly and lucky; networking, relationships,
>   asking for favours.
>
> Days on the **3rd (Vipat), 5th (Pratyak) or 7th (Naidhana)** bring obstacles or delays and are
> generally avoided for major steps.

### 2 · Chandra Bala — the Moon relative to the natal Moon sign

> - **Lucky houses:** the transiting Moon in your **1st, 3rd, 6th, 7th, 10th or 11th** from your
>   natal Moon sign.
> - **Peak prosperity:** the **11th** transit is universally known as the day of gains, unexpected
>   opportunities, and manifestations.
>
> **SUPERSEDED:** he corrected this himself — the 11th genuinely carries gains, fulfilment of
> desires, income, support from others and opportunity, but *"manifestations"* is **modern
> terminology, not classical Jyotisha language**.

### 3 · Shubha Muhurta — the universal layer

> Even if a day is personally lucky, the general day must also hold good energy:
>
> - **Amrita Siddhi Yoga** or **Sarvartha Siddhi Yoga** — special calendar days where the
>   combination of the **weekday and the Nakshatra** guarantees that work started will succeed.
>
> **SUPERSEDED BY HIS OWN CORRECTION, same day:** both yogas are real and among the strongest
> auspicious combinations, but *"guarantees"* is his word for what the texts do **not** claim — see
> THE CALIBRATION at the bottom of this file.
> - **Shubha Tithi** — auspicious lunar days (the **2nd, 3rd, 5th, 7th, 10th, 11th or 13th of the
>   waxing moon**) that naturally hold growth energy.

---

## The audit — what the engine actually does

| Piece | Status |
|---|---|
| Tara Bala: which taras are good | **MATCHES EXACTLY.** `crown.ts` marks 2, 4, 6, 8, 9 good and 3, 5, 7 bad — his five and his three, no more, no less. |
| Chandra Bala: which houses are lucky | **MATCHES EXACTLY.** `CHANDRA_FAV = {1, 3, 6, 7, 10, 11}` — his six. |
| Chandra Bala: the 11th as **peak** | **MISSING.** All six favourable houses are weighted identically. The day of gains reads the same as the 3rd. |
| Amrita Siddhi / Sarvartha Siddhi Yoga | **MISSING ENTIRELY.** No weekday×nakshatra table exists anywhere in the app. |
| Shubha Tithi | **PARTIAL, and by a different route.** The day filter uses the five tithi FAMILIES (nanda/bhadra/jaya/rikta/purna) from the cited muhurta canon, and vetoes rikta (4, 9, 14). His list — 2, 3, 5, 7, 10, 11, 13 shukla — is a specific set, not a family rule. |

### One more thing the engine adds that he did not specify

`crown.ts` treats **Janma (the 1st tara, the birth star itself)** as *mixed* — sensitive rather than
good or bad — and applies a **cycle attenuation**: the malefic taras strike at full force only in
the first round of nine, and soften in rounds two and three. He adopted that school on 2026-07-09.
Neither contradicts what he sent; both are recorded here so they are not mistaken for drift later.

---

## What was NOT done, and why

**The Siddhi yogas were not implemented.** They are a 7×27 weekday-by-nakshatra grid, and I do not
have a cited source for it in this repo. Typing that table from memory is exactly the failure this
run has been unpicking all day — an uncited table that looks authoritative, drifts silently, and
gets defended by a test that only proves it equals itself. It needs to come from the same corpus as
`muhurta-tables.json` (Muhurta Chintamani / Brihat Samhita), with the citation recorded, before it
goes anywhere near the crown.

**The 11th-as-peak is a one-line change but a method call.** Making the 11th outrank the other five
favourable houses changes which days crown. That is his ranking to confirm, not mine to assume.

**Shubha Tithi needs a ruling**: should the crown gate on his explicit list (2, 3, 5, 7, 10, 11, 13
shukla), or keep using the cited family rule the day filter already applies? They are not the same
test, and the family rule is the one with a citation.

---

## THE CALIBRATION — his correction, 2026-07-20, hours after the spec above

He graded his own summary and pulled it back:

> Tara Bala **9.5/10** · Chandra Bala **9/10** · Shubha Muhurta **8.5/10**
>
> "The core principles are correct, but phrases like **'guarantees success,' 'extremely prosperous,'
> or 'universally known as manifestation days' are stronger than classical Jyotisha texts generally
> support.** These factors are intended to **improve the probability of favorable outcomes, not
> ensure them.**"

Specific pull-backs:

- **Sampat** is favourable for financial matters — *not* "extremely prosperous in every case".
- **Vipat / Pratyak / Naidhana** caution is standard, **but** "experienced astrologers don't
  automatically cancel important events solely because one of these Tārās appears." A hard tārā is a
  headwind, not a veto.
- **The 11th** carries gains, fulfilment of desires, income, support, opportunity — but *not*
  "manifestations", which is modern language.
- **Shubha Tithi** is "generally favorable" and **depends on what you are doing** — marriage,
  surgery, travel, investing, spiritual practice and signing contracts each prefer different tithis.

### What this changed in the engine

`BASE_PROMPT` now carries **PROBABILITY, NEVER A PROMISE**: no guarantees, no manifestation-speak,
say what a day *supports* and what it makes harder, never what it will produce — and name friction
without forbidding the day. PROMPT_VERSION bumped, or the law reaches nothing already cached.

### What a complete muhurta actually weighs — his list, and where Velea stands

> Vara · Tithi · Nakshatra · Yoga · Karana · Tārā Bala · Chandra Bala · planetary strengths ·
> ascendant at the chosen time · afflictions · Rahu Kalam · Yamaganda · Gulika
>
> and, in professional practice: planetary Hora · weekday lord · Lagna at the chosen time · the
> strength of Jupiter and Venus · combustion · retrogrades · eclipses · Rahu Kalam · Durmuhurta ·
> Panchaka · whether the Moon is afflicted or void · the person's current Dasha · Gochara.

Velea already computes: vara, tithi, nakshatra, karana, tārā bala, chandra bala, shadbala,
combustion, retrogrades, eclipses, hora, the current dasha and gochara.

**Gulika is built too** — and I nearly wrote here that it was not. It exists as the *natal* upagraha
(Saturn's shadow point, `natal-states.ts`), reaches the prompt as `gulikaHouse`, and is described to
the model as "the chart's shadow point: matters of that house run deeper than logistics". What is
**not** built is Gulika as a **daily time window**, which is what a muhurta uses it for. Those are
two different instruments with one name, and I checked before writing rather than after.

**Genuinely not built:** Rahu Kalam, Yamaganda, Durmuhurta, Panchaka, void-Moon rules, Gulika-as-a-
window, and a Lagna-at-the-chosen-moment check. That is the honest gap between "a good day" and "a
muhurta" — a roadmap, not a bug.
