# Velea Narrative Audit (Engine → LLM)

_David's governing spec for the engine→LLM boundary, 2026-07-22. Verbatim. This is the standard the
resolved narrative package is checked against before any reading is sent. It is the full form of
standing audit #7 (Narrative Fidelity). Do not paraphrase it away._

## Purpose

Before any daily reading is sent to the LLM, audit the resolved narrative package.

The LLM is not an astrologer. It must never infer, prioritize, or resolve astrological meaning. Every
narrative decision should already have been made by the engine.

The audit exists to ensure the engine output is internally consistent, narratively coherent, and
contains only information that strengthens the reading.

---

## 1. Narrative Authority

Verify the hierarchy has been preserved. The reading must always have a clear narrative chain:

Mahadasha → Antardasha → Annual Time Lord → Current planetary condition → Operational Agenda →
Activated House → Today's sky → Moon (camera) → Hora → Pañcapakṣi

Nothing lower in the hierarchy may override something higher.
- ❌ A transit should never replace the Time Lord's agenda.
- ❌ Panchanga should never redefine the chapter.
- ❌ Hora should never become the day's central message.

## 2. One Governing Idea

Every reading should have one dominant thesis. Ask: if I had to summarize today's reading in one
sentence, what is it? Everything should reinforce that sentence. (E.g. "Today is about financial
clarity — not financial action.") If several unrelated ideas compete, simplify.

## 3. Information Density

The engine knows more than the reader needs. Do not expose every computed fact simply because it
exists. Ask: does this information change today's advice? If not, remove it. Engine completeness is
not the same thing as narrative quality.

## 4. Time Lord Consistency

The Time Lord should feel like the protagonist — same personality, motivation, priorities throughout.
Do not let the activated house become the protagonist.

## 5. Operational Agenda

The agenda shapes the reading; it does not become the reading. (Agenda "Reclaim" → good: "Look
carefully at what's outstanding"; bad: every paragraph becomes "reclaim reclaim reclaim.") Agenda is
seasoning, not the meal.

## 6. House Role

House answers: where is today's work happening? It does not answer what Venus wants. Never allow house
topic to replace Time Lord motivation.

## 7. Planet Condition

Planetary condition (Restore, Consolidate, Cultivate, Redeem, Reclaim, Repair) should change tone —
influence the narrative quietly. Avoid repeatedly announcing it.

## 8. Capacity Modifiers

Capacity modifiers answer HOW today's work can happen (Work Unseen, Enlist, Conserve, Steady). They
modify delivery; they never replace the agenda.

## 9. Transits

Transits never choose the frame. They answer intensity, opportunity, timing, friction. They never
determine today's protagonist, chapter, or agenda.

## 10. Natal Yogas

Natal yogas are latent promises. They become narratively important only when activated by higher
timing (Mahadasha, Antardasha, Annual Time Lord, activated profection). Transits increase expression;
they do not activate the yoga by themselves.

## 11. Engine Certainty

Never manufacture certainty. If the engine cannot determine something, neither should the LLM. (E.g.
planetary war: the engine knows war exists, not the winner — so the reading must never imply victory
or defeat. Instead: contend.)

## 12. Subject Resolution

Every narrative fact must already know who it concerns. Never ask the LLM to infer whether something
belongs to self, partner, parent, or child — resolve it upstream. Avoid ambiguous "both" unless the
methodology explicitly intends it; if two subjects genuinely matter, emit two separate narrative facts
rather than one ambiguous one.

## 13. Coherence Before Completeness

If removing one paragraph makes the reading stronger, remove it. The goal is not maximum information;
it is maximum coherence.

**The narrative layer's purpose (David, 2026-07-23):** *"The purpose of the narrative layer is not to
maximize information. It is to maximize understanding. Every sentence should increase coherence rather
than increase data. If two true statements compete for attention, prefer the one that better explains
the day as a whole."* This is the operative tiebreaker: truth is the floor, not the selector — every
surfaced fact is already true (the engine resolved it), so the choice between two truths is decided by
which one makes the day cohere. It is the narrative-side twin of `theme, then evidence`
(`velea-theme-then-evidence`): the engine computes far more than it says, and understanding — not
completeness — decides what it says.

**The operative test (David, 2026-07-23) — apply to every candidate fact before it is voiced:**
*"Does mentioning it make the reader understand the day more clearly?"* If yes, it earns a place. If
no, it stays in the payload as influence and out of the prose — no matter how true, rare, or hard-won
it was to compute. This is the one question that decides inclusion; run it on each planet, aspect,
yoga, dignity, and timing note the engine hands over.

## 14. Ending Test

The final paragraph should feel inevitable. Could the reading be summarized in one memorable sentence?
(Good: "The money is real, but today is for looking at it — not moving it." Poor: a recap of today's
schedule.) Readers remember principles; they forget logistics.

## 15. Reflection Question

The closing question should arise naturally from the reading and deepen the governing idea. Avoid
narrowing it unnecessarily — it should reflect the whole reading, not one interpretation.

## 16. The Final Litmus Test

Before sending anything to the LLM, ask:
1. Does the reading have one unmistakable governing idea?
2. Does every paragraph strengthen that idea?
3. Is the Time Lord still the protagonist?
4. Has the house remained the arena rather than the protagonist?
5. Is the operational agenda shaping the narrative instead of dominating it?
6. Have transits remained modifiers instead of becoming the frame?
7. Have I omitted true-but-unnecessary engine facts?
8. Is every narrative fact fully resolved so the LLM never has to guess?
9. Does the ending distill the reading into one memorable principle?
10. Would removing any paragraph make the reading stronger? If yes, remove it.

---

**One final principle.** The engine should maximize certainty. The narrative should maximize
coherence. The engine's responsibility is to resolve every methodological question before the LLM sees
the data. The LLM's responsibility is not to perform astrology or explain the engine — it is to tell a
single, faithful, compelling story from the already-resolved narrative facts. The best reading is not
the one that mentions the most truths; it is the one that leaves the reader with one clear insight that
feels inevitable.
