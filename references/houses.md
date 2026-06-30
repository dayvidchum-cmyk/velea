# Houses — significations & connections (engine reference)

Captured from the owner's design notes (2026-06-30). Source material for the
narrative engine's house reasoning. Not yet wired into `server/narrative/prompts.ts`
(the HOUSE DICTIONARY) or the input-builder — see "Integration options" at the end.

## Deep significations by house

### 2nd house — livelihood / what supports you
- A **succedent** house that **supports the 1st house** — so it takes on *anything
  that supports you*.
- Wealth and possessions, **and self-esteem** (worth and net-worth are the same axis).
- In some contexts: your **lawyer, your counsel, the people who help you in your
  fight** — allies your life leans on.
- Anything upon which your life is supported, with an emphasis on **things from the
  underworld** (wealth = the domain of Hades): planets in this part of the sky are
  *preparing to rise from the ground*.
- Derived significations follow from house-to-house relation (see Bhavat Bhavam):
  e.g. the 2nd is the **11th from the 4th**, so it represents **your parent's allies**.

*(More houses to be added as the owner supplies them.)*

## How the houses are connected

### 1. The Purusharthas (four pillars of life)
Four elemental groups outlining the evolutionary stages of development:

- **Dharma (Righteousness / Fire) — 1st, 5th, 9th.** Discover who you are (1st),
  apply your creative intelligence (5th), find higher purpose / wisdom (9th).
- **Artha (Wealth / Earth) — 2nd, 6th, 10th.** Build resources and family (2nd),
  manage daily work and overcome debts (6th), apply your skills in society (10th).
- **Kama (Desire / Air) — 3rd, 7th, 11th.** Personal passions and communication
  (3rd), romantic and business partnerships (7th), fulfillment of goals and network
  gains (11th).
- **Moksha (Liberation / Water) — 4th, 8th, 12th.** Deep emotional roots (4th),
  intense psychological transformation (8th), release of earthly attachment for
  spiritual freedom (12th).

### 2. Bhavat Bhavam (house-to-house linking)
Find the deeper meaning of any house by counting that many houses forward from it.

- **Siblings:** 3rd rules younger siblings; the 3rd-from-3rd (= the **5th**) rules
  your children — and also the longevity of your younger sibling.
- **Father:** 9th is the father; the 2nd-from-9th (= the **10th**) is the father's
  wealth — so the 10th dictates your father's finances and your relationship with him.
- **Marriage:** 7th is the spouse; the 8th-from-7th (= the **2nd**) reveals the
  longevity, family, and assets of your spouse.

## Integration options (when ready)
1. **HOUSE DICTIONARY enrichment** — fold the deep significations into each
   house's entry in `server/narrative/prompts.ts`.
2. **HOUSE CONNECTIONS section** — add the Purushartha groups + Bhavat Bhavam as a
   prompt section the read can refract through ("name the derived house when it
   sharpens the point").
3. **Computed derived houses** — have the input-builder compute Bhavat Bhavam links
   for the activated/relevant houses and pass them as structured data, so the engine
   reasons from real derived significations rather than improvising.
