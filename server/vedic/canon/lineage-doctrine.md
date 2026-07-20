# LINEAGE, ANCESTRY AND THE PARENTS — David's doctrine, 2026-07-20

*Captured as delivered, in his words, while he was still sending it. Nothing here has been
implemented yet beyond the two wording fixes noted at the bottom. This file exists so the doctrine
is held WHOLE instead of being implemented in fragments as each message arrived — which is exactly
the slicing that has gone wrong before.*

---

## How this started

I asked him to pick one: is "parents" the 4th and 9th (the convergence engine), or the 12th with the
nodes (the paid life-area lens)? He did not pick one:

> **Both are correct. 4th and 9th are specifically mother and father. Ancestry is roots, and that
> should cover any role parents play into the concept of roots. Ancestry is also what your parents
> inherited, which you in turn inherited.**

Then he laid out the whole map, house by house.

---

## The houses

### 2nd — Immediate lineage & family wealth
> This house represents your **Kula** — your immediate family line, family values, traditions, and
> inherited wealth. It shows the traits and assets passed down to you directly by your parents and
> grandparents.

### 4th — The mother & home
> This is the **primary house for your mother**. It represents her health, your emotional bond with
> her, and the nurturing environment she provided. It also rules your home, inner peace, and
> childhood comfort.

### 5th — Grandchildren & ancient karma
> While it primarily rules children, the 5th house also represents your **Purva Punya** (past life
> credit). It shows the genetic and spiritual legacy you carry **forward into the future**.

### 8th — Inheritance & hidden ancestry
> This is the house of secrets, longevity, and unearned wealth. It represents wills, estates, and
> **deep genetic inheritance** — including ancestral trauma, hidden family secrets, or chronic
> health conditions passed down through DNA.

### 9th — The father & dharma
> According to the most widely accepted classical texts (like Brihat Parashara Hora Shastra), the
> 9th house represents your **father**. It governs the father because he is viewed as your **first
> teacher (Guru)**, guide, and the person who introduces you to duty and righteousness (Dharma).

### 10th — The father's status / alternative father
> In some secondary Vedic traditions (and Western astrology), the 10th house is used for the father
> as it sits opposite the 4th. In Vedic astrology, it specifically represents your **father's
> career, social standing, and his authority over you**.

### 12th — The departed ancestors
> This house rules the spirit world, liberation (**Moksha**), and the past. It represents your
> **distant ancestors who have passed away (Pitrus)**. Afflictions here can indicate **Pitri Dosha**
> (ancestral debt or unresolved ancestral karma).

---

## The karakas — houses only tell half the story

> In Vedic astrology, houses only tell half the story. You must also look at the planets that
> naturally represent these figures:
>
> - **The Moon (Chandra)** — the natural indicator for the **mother**, regardless of which house she
>   rules in your chart.
> - **The Sun (Surya)** — the natural indicator for the **father**, representing his ego, health,
>   and soul connection to you.
> - **Ketu** — the planet of the past, which often indicates deep genetic or spiritual ancestral
>   roots.

---

## What this means for Velea, stated plainly

Ancestry is not one house and not one question. It is a **spread**:

| The question | Where it is read |
|---|---|
| My mother, as a person | 4th · Moon |
| My father, as a person | 9th · Sun |
| My father's standing and authority over me | 10th |
| The family line I sit inside — traditions, values, inherited wealth | 2nd (Kula) |
| What came down through the blood — trauma, secrets, chronic conditions, estates | 8th |
| The departed, ancestral debt, what is owed backwards | 12th (Pitrus, Pitri Dosha) |
| What I carry forward — past-life credit, legacy onward | 5th (Purva Punya) |
| The ancestral root itself, as a planet | Ketu |

**The engine currently reads two of these eight.** `knots.ts` reads the parents as houses [4, 9]
with Moon/Sun/Jupiter. `life-areas.ts` routes the "Parents & Roots" lens to the 12th with Rahu and
Ketu. The 2nd, 5th, 8th and 10th carry no lineage reading at all, and Ketu-as-ancestral-root is not
named anywhere in that context.

---

## What has been changed so far (v853), and what has NOT

**Changed — wording only, to stop two systems claiming the same words:**

- `knots.ts` theme label: `"Parents / roots"` → **`"Parents — mother and father"`**
- `life-areas.ts` parents domain: now leads **"ancestry and roots — heredity, the line you come
  from, what your parents themselves inherited and handed on…"** instead of leading with "parents".

**NOT changed, deliberately:**

- The 12th-house lens domain does not yet say **departed ancestors, Pitrus, Moksha, or Pitri Dosha**.
  His doctrine is sharper and more specific than the wording I wrote before he sent it.
- The user-facing chip still reads **"Parents & Roots"** on what is now an ancestry area.
- Nothing has been built for the 2nd, 5th, 8th or 10th as lineage houses.
- Ketu is a karaka on the 12th lens already, glossed as "paternal ancestry" — his doctrine calls it
  the planet of the past and of **deep genetic or spiritual ancestral roots**, which is broader.

**Why it stopped there:** he was still mid-delivery when these arrived, one house per message. The
standing rule is to hold a whole principle whole and not slice it. Implementing house 2 while house
8 was still arriving is exactly how a method gets half-applied.

---

## The open question this raises

His ruling settles "which house is parents" — both, they answer different questions. It opens a
bigger one:

**Is ancestry a life-area (one chip, one lens), or is it a spread across seven houses and three
planets that the reading should draw on wherever it is lit?**

The current lens gives it one varga (D12) and one house (12). His doctrine describes something much
wider.

## HIS ANSWER (2026-07-20): the latter.

> "latter."

**Ancestry is a SPREAD, not a chip.** The reading draws on it wherever it is lit — across the seven
houses and three karakas above — rather than living behind one tap on one life-area.

### What that means structurally

This makes lineage a **theme detector**, the same shape as `knots.ts` — something that fires when
its houses or planets are lit by transit, dasha or natal condition, and hands the reading a thread
to pull. It is not a varga lens with a chip.

The existing pieces and what they become:

| Now | Under the ruling |
|---|---|
| `knots.ts` theme `parents` = houses [4, 9], karakas Moon/Sun/Jupiter | stays — that is the PARENTS-as-people thread |
| `life-areas.ts` `parents` = D12 / house 12 / Rahu+Ketu, chip "Parents & Roots" | the ancestry READING, but no longer the only place ancestry appears |
| nothing reads the 2nd, 5th, 8th or 10th as lineage | a lineage spread that watches all seven houses + Moon/Sun/Ketu |

### BUILT (v856), in one pass

`server/vedic/lineage.ts` — a detector, not a lens. All seven strands, each with its house, his
karakas, and the question it carries in the reader's language. A strand lights only when a running
period-lord or the TIME LORD is genuinely tied to it (seated in the house, ruling it, or being one of
its karakas), or when a SLOW transit lands on it.

**Fast transits are excluded on purpose.** Ancestry is a standing theme. If the Moon could light
"the departed" every third day, the spread would be noise and the reading would find ancestral
trauma on a Tuesday.

**It reaches the reading.** `input.lineage` is emitted only when something is lit, and BASE_PROMPT
carries the law: read the lit strand as part of the day, never as a header, never naming the house
number, and never reach for the ancestors when the field is absent. PROMPT_VERSION bumped, or the
law would reach nothing already cached.

**What it does NOT do:** score, rank or weigh. It reports which strands are lit and why. How loud a
strand should be is a method call David has not made, and inventing one here is the unowned
weighting this run has been removing.

### Still not done

- The 12th-house LENS domain still does not say Pitrus, Moksha or Pitri Dosha.
- The chip still reads "Parents & Roots" on an ancestry area — his rename to make.
- The 2nd, 5th, 8th and 10th now have a lineage READING but no varga lens of their own.
