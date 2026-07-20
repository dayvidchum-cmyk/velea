# NEECHA BHANGA — where each condition actually comes from

*Researched 2026-07-20, after David asked "what do the textbooks say?" and the answer turned out to
be that the engine and the ingested canon disagree about **when** a fall is cancelled, before either
gets to what it means.*

This file is **provenance, not canon extraction**. `karakas.json`, `yogas.json` and the rest are
transcriptions of Kurczak & Fish. This is a separate record of which conditions have a classical
verse behind them and which do not, so the engine can stop citing an authority it never checked.
Nothing here is licensed to change the engine — see THE OPEN RULING at the bottom.

---

## What the engine currently does

`server/vedic/dignity.ts` → `neechaBhanga()` now requires **TWO** conditions to cancel and treats
**three or more as "solid"** (David's ruling, 2026-07-20). The table below is the original four; three
more have since been added — conjunction with the dispositor, parivartana, and his condition 3 (the
fallen planet itself in a kendra) — and conditions 2 and 3 below are now emitted as ONE.

| # | Condition in code | Provenance |
|---|---|---|
| 1 | Dispositor (lord of the debilitation sign) in a kendra from Lagna **or** Moon | **Textual** — Phaladeepika 7.30, echoed at 7.26 |
| 2 | The planet that is **exalted in** the debilitation sign, in a kendra | **One gloss** of a single compound — see below |
| 3 | Lord of the debilitated planet's **exaltation sign**, in a kendra | **The other gloss of the same compound** |
| 4 | The debilitated planet aspected by its dispositor | **Textual** — Phaladeepika 7.28 |

## Phaladeepika 7.30, the verse the whole apparatus rests on

> नीचे यस्तस्य **नीचोच्चभेशौ** द्वावेक एव वा । केन्द्रस्थश्चेच्चक्रवर्ती नृपः स्याद्भूपवन्दितः

*nīce yas tasya **nīca-ucca-bha-īśau** dvāv eka eva vā | kendra-sthaś cet …*

Read literally: **the lord of the debilitation sign and the lord of the exaltation sign — both, or
even one alone — in a kendra**. `bha` is the sign; `īśa` is its lord. The verse names two LORDS.

**Two things follow, and they matter:**

1. **The popular English rule "a debilitated planet IN A KENDRA gets neecha bhanga" is a
   mistranslation.** It reads the planet itself into a clause that is about the two lords. It
   circulates widely — the same web search that returns the Sanskrit above also returns a summary
   stating the corrupted version two paragraphs later. This engine has never implemented it. Good.
2. **Conditions 2 and 3 are the SAME condition under two competing glosses**, of `tad-ucca-nātha` /
   `ucca-bha-īśa` — "the lord of the exaltation sign" versus "the planet that is exalted in that
   sign". Sastri's own note records the dispute: *"According to some, taduccanātha means the planet
   that is exalted in that Rasi."* They are one verse, not two conditions. **Firing both
   double-counts a philological disagreement** — which matters here because `count` is used
   ("≥1 cancels, ≥2 is a solid cancellation").

## What is textual and missing

**Phaladeepika 7.27** — the debilitation-lord and the exaltation-lord in **mutual kendra to each
other** — is in the text and is not implemented. Routinely dropped by modern lists too.

## BPHS: verified negative

BPHS has no passage giving these four conditions. Its debilitation-raja-yoga material is a different
rule entirely — **Ch. 41 "Raja Yogas", vv. 19–20**: debilitated lords of the 6th/8th/12th aspecting
the Lagna while a strong Lagna lord aspects it too. Citing "Parashara" for the four conditions is
citing the wrong text.

## The rule our own canon file states

`yogas.json` → `universalRules.neechaBhanga`:

> "A debilitated (fallen) planet associated with an exalted planet has its debility cancelled
> (neecha bhanga) and can act as if exalted."

**This has no classical verse behind it, in any text.** It is Kurczak & Fish's reading (Vol I Ch. 16
#1, "occupies the same sign"), and the modern sources that state it say so themselves in the first
person — Santhanam: *"It is my experience that…"*; another K.N. Rao-lineage author: *"Though I have
no textual authority for this view, in my experience…"*.

That does **not** make it wrong. K&F is the project's declared source and David's ruling of
2026-07-20 took the book at its word deliberately. It does mean the engine's four conditions and the
canon file's one rule are **two different systems**, and the engine currently runs neither cleanly.

## Dasha latency

The general principle — a yoga is latent until its planets' period runs — **is** primary:
Phaladeepika 19.54, Saravali 5.47–50. Applied specifically to neecha bhanga it is modern; the
earliest located statement is B.V. Raman (1947). `yogas.json`'s `dashaGate` states the general rule,
which is what v797 implemented.

## Everything else in circulation

Named 20th-century authors, no verse anywhere: exchange/parivartana and "two debilitated planets
aspecting" (K.S. Charak) · "dispositor exalted or with digbala" (Seshadri Iyer) · retrogression
(Frawley, Seshadri Iyer) · ashtakavarga strength (B.V. Raman) · conjunct an exalted planet
(Santhanam). Condition counts across authorities run from **2 to 14**.

## THE OPEN RULING — David's, not mine

1. **Which conditions are Velea's?** The two textual ones (dispositor in kendra, aspect by
   dispositor) plus 7.27? Or K&F's single "associated with an exalted planet"? Or both systems?
2. ~~**Conditions 2 and 3 must not both fire.**~~ **CLOSED 2026-07-20 — this was never his call.**
   Merging them does not pick a gloss: either reading satisfies the same clause, so counting the
   verse once is neutral on the dispute that genuinely is unresolved. I flagged it for him anyway;
   he asked what the advantage of that was, and there wasn't one. Worse, the double-count silently
   defeated the ruling he had just made — "two conditions" means two INDEPENDENT pieces of evidence,
   and 2.4% of fallen charts were clearing that bar on one idea wearing two hats. Now emitted as a
   single condition, with BOTH candidate rescuers kept in `by` (dropping either would pick a gloss
   through the back door). Cancellation 76.1% → 73.8%.

   *The line worth keeping:* flag what needs his authority; fix what has a remedy that takes no
   side. "It has Sanskrit in it" is not the same as "it is his call".

Nothing in the engine has been changed on the strength of this file. It is here so the decision is
made against the sources instead of against a memory.

---

### Verification status

- Phaladeepika 7.30 Sanskrit: **verified** against two independent witnesses (IAST and Devanagari),
  and re-read compound-by-compound rather than taken from a summary.
- BPHS Ch. 41 vv. 19–20: **verified** as a different rule.
- The K&F wording: **verified** — it is in this repo, in `yogas.json`.
- Sastri's Note 3 on the disputed compound, and the first-person modern admissions: **reported by
  research, not read by me in a primary edition.** Treat as strong secondary.
