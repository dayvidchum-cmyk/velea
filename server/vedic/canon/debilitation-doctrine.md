# DEBILITATION & NEECHA BHANGA — David's doctrine, 2026-07-20, audited against the engine

*Captured verbatim, then checked condition by condition. **Two of his six conditions are not
implemented, one is implemented only half-way, and one of the missing ones is a rule I previously
told him was a mistranslation.** That conflict is the most important thing in this file.*

---

## His framing

> A debilitated planet is **not automatically weak**, and Neecha Bhanga is **not automatically Raja
> Yoga**. These are separate concepts. There is no single rule — classical texts describe multiple
> ways it can happen.

## The six conditions he lists

| # | Condition | In the engine? |
|---|---|---|
| 1 | Lord of the **debilitation sign** in a Kendra from Asc **or Moon** | **YES** |
| 2 | Lord of the **exaltation sign** of the debilitated planet in a Kendra from Asc or Moon | **YES** |
| 3 | The **debilitated planet itself** in a Kendra from Asc or Moon | **NO — and see the conflict below** |
| 4 | Debilitated planet and its sign lord in **mutual aspect *or conjunction*** | **HALF** — aspect only, conjunction missing |
| 5 | **Exchange of signs** (Parivartana) with the debilitation-sign ruler | **NO** |
| 6 | Strong **benefic support** (Jupiter/Venus/well-placed Mercury) — *"not always listed as a primary rule"* | **NO** |

The engine also fires a condition he does **not** list: *the planet that exalts in the debilitation
sign, in a kendra*. That is the rival gloss of the same compound as #2 — see the provenance file.

---

## THE CONFLICT I OWE HIM PLAINLY

On 2026-07-20 I researched the verses and told him:

> "The popular English rule **'a debilitated planet IN A KENDRA gets neecha bhanga' is a
> mistranslation.** It reads the planet itself into a clause that is about the two lords. This
> engine has never implemented it. **Good.**"

**His doctrine lists exactly that as condition #3** — "one of the commonly cited conditions, though
some traditions treat it as stronger when combined with other factors."

Both statements can be true at once, and I should have said so the first time:

- **Philologically**, Phaladeepika 7.30 names two *lords* (`nīca-ucca-bha-īśau`). The planet-in-kendra
  reading is not what that verse says.
- **In practice**, the planet-in-kendra rule is genuinely widespread in the living tradition, and he
  is right that it is commonly cited.

So the question is not "who is correct" — it is **which authority Velea follows when the verse and
the practice diverge.** That is his ruling, not a fact I can look up. I framed it as settled when it
was not, and that was the error.

---

## What he says beyond the conditions

### Neecha Bhanga Raja Yoga is stricter than cancellation

> Cancellation becomes Raja Yoga **only when** the cancellation is strong, the planet has functional
> importance (ruling a trine or angle), the chart overall supports success, and the yoga is
> activated by dasha or transit. **"Not everyone with Neecha Bhanga experiences extraordinary
> success."**

### Cancellation is one layer, not a verdict

> A debilitated planet may still perform well with strong Shadbala, high Vimshopaka Bala, favourable
> Navamsa dignity (especially vargottama or exalted in D9), benefic aspects, good house placement,
> supportive yogas. **Conversely, a debilitated planet WITH Neecha Bhanga may still struggle** if
> heavily afflicted, combust, or otherwise weakened.

> "Many online calculators oversimplify Neecha Bhanga. They often check only one or two rules and
> then label a planet 'Neecha Bhanga' without considering whether the cancellation is meaningful in
> the context of the whole chart."

### His six-step evaluation

1. Is the planet actually debilitated — and **how deep** (exact degree of deepest debility)?
2. Check the classical cancellation conditions.
3. **Measure actual strength** — Shadbala, Ishta/Kashta, Vimshopaka, avasthas, combustion,
   retrograde, planetary war, aspects, house, functional status.
4. **Check the divisional charts**, especially D9 — exalted there? own sign? vargottama? still fallen?
5. Determine whether it is genuinely Raja Yoga.
6. **Confirm with timing** — dasha, antardasha, transits, Varshaphala. *"Having the yoga in the chart
   does not mean it is active all the time."*

### Two traps, both of which he pulls back from

**Combustion.** *"There is no universally accepted classical rule stating that combustion
automatically invalidates Neecha Bhanga."* It is one factor in judging the strength of the
cancellation — depending on closeness to the Sun, which planet (Mercury is treated differently),
Shadbala, benefic aspects and divisional strength.

**Retrograde.** *"It is not universally accepted that retrogression makes a debilitated planet
equivalent to an exalted one."* Retrogression often increases apparent strength or intensity; it
does not erase debilitation. Expression can still be unconventional, delayed, internalised or
inconsistent.

### His summary of both

> Combustion: if the planet responsible for creating Neecha Bhanga is significantly combust, its
> ability to strengthen the debilitated planet **may be reduced**. It does not automatically cancel
> Neecha Bhanga, but it is an important factor.
>
> Retrograde: interpreted differently across traditions; many consider it to increase strength,
> **sometimes substantially mitigating debilitation** — but the final judgment depends on the chart
> as a whole.

---

## The honest gap list

**Missing conditions:** the planet itself in a kendra (#3, pending his ruling on verse-vs-practice),
conjunction with the sign lord (#4's second half), Parivartana (#5), benefic support (#6).

**Missing weighting:** the engine reports `cancelled: true/false` and a `count`. It does not weigh
whether the cancellation is *strong*, does not check D9, does not consider whether the rescuing
planet is itself combust, and does not distinguish cancellation from Raja Yoga. His step 3 and step
4 — where he says experienced astrologers spend most of their time — are not modelled at all.

**What the engine does have** that supports him: Shadbala, Vimshopaka, avasthas, combustion,
retrograde state and D9 are all computed elsewhere in the app. They are simply not consulted by the
cancellation decision.

**Nothing here has been changed.** The conflict at the top needs his ruling first, and the weighting
question is method, not transcription.
