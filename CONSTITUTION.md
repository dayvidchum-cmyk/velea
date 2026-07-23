# Velea — Constitutional Principles

_Ratified by David, 2026-07-23. This is the highest-order doctrine in the repository. Every feature,
algorithm, heuristic, engine layer, prompt, and reading answers to it. Where any local rule, method
note, or clever implementation conflicts with a principle here, **the implementation is wrong — not the
Constitution** (Principle 13)._

**These are design constraints, not algorithms.** Do not translate a principle directly into
implementation logic. Future algorithms must *satisfy* these principles, never *replace* them. When a
constitutional principle is in hand, the goal is not to solve it immediately — it is to **preserve it
while designing the implementation.**

---

## Principle 1 — Reality Before Narrative

The engine computes reality. The narrative expresses reality. The narrative must never invent meaning
that cannot be traced back to computed states.

## Principle 2 — Comprehension Over Completeness

The purpose of a reading is not to communicate everything the engine knows. It is to produce the
clearest possible understanding of the day.

If two true statements compete for attention, prefer the one that best explains the day as a whole.

## Principle 3 — One Governing Idea

Every reading should be reducible to one central insight.

Every paragraph, sentence, and supporting detail must reinforce that governing idea. Nothing should
compete with it.

## Principle 4 — Theme Before Evidence

The engine first determines what the day is fundamentally about.

Everything else exists only to explain, refine, or support that theme. Planetary conditions never
compete for authorship.

## Principle 5 — Authority Flows Top-Down

Higher-order timing systems establish the frame. Lower-order conditions modify the frame.

An aspect, dignity, or yoga may deepen today's story, but they do not replace its governing subject.

## Principle 6 — The Engine Computes More Than It Says

Computation and narration are not the same activity. The engine is expected to compute significantly
more information than the reading will ever express.

Silence is an intentional design decision.

## Principle 7 — Evidence Corroborates

Astrological factors do not vote. They corroborate.

The engine should never ask which rule wins. It should ask which computed conditions best explain
today's governing theme.

## Principle 8 — Model Reality, Not Terminology

Traditional labels exist to describe underlying phenomena. The engine models the phenomenon rather
than preserving inherited vocabulary.

Names may evolve. Reality does not.

## Principle 9 — Respect the Shape of Reality

Model each phenomenon according to its true nature. Continuous phenomena should be modeled
continuously. Categorical phenomena should remain categorical.

Do not introduce gradients merely to create nuance. Do not force binaries onto inherently continuous
experiences.

## Principle 10 — States Represent Experience

Every computed state should answer one question: **What is it like to experience this today?**

The narrative exists to describe lived conditions, not expose internal calculations.

## Principle 11 — Functional Over Textual

Whenever classical rules and lived experience diverge, the narrative layer prioritizes functional
reality.

Recovery measures restored capability. Influence measures experienced effect. Strength measures
operational capacity.

The engine models how astrology functions — not merely how it is classified.

## Principle 12 — Editorial Judgment Is a Feature

The narrative layer is editorial, not encyclopedic. Including every true observation weakens coherence.

Omission is often more truthful than accumulation.

## Principle 13 — Internal Consistency Is Law

Every new feature, algorithm, or heuristic must be evaluated against these constitutional principles.

If an implementation satisfies a local rule but violates the Constitution, the implementation is
wrong — not the Constitution.

## Principle 14 — Narrative Economy

A day read has one governing idea and a finite coherence budget.

The engine computes far more than the reading expresses. On any given day, multiple conditions may be
simultaneously active (retrograde, station, eclipse phase, combustion, nodal activation, lunar
condition, aspects, dignity, yogas, and others). These are candidates, never obligations.

A condition earns a place in the reading only if expressing it materially deepens the reader's
understanding of the day's governing idea. If it merely contributes another correct observation, it
remains computed but silent, regardless of how rare, dramatic, or technically significant it may be.

The narrative must never optimize for coverage. It optimizes for understanding.

A day read is not a catalogue of active conditions. It is a coherent explanation of the day. Every
sentence must strengthen that explanation. A reading that merely recites its active conditions has
exhausted its coherence budget on information instead of insight.

Individual state doctrines (retrograde, station, combustion, nodal influence, lunar phase, dignity,
aspects, and others) define how a condition should be voiced _when it earns a place_. They are never
instructions that the condition must be included.

All narrative prompts, heuristics, and future features must conform to this principle.

## Principle 15 — The Engine Is Not the Reading

The purpose of the engine is to compute reality. The purpose of the reading is to reveal reality. These
are not the same task.

Increasing the amount computed does not increase the quality of the reading.

**Do not optimize for coverage. Optimize for revelation.** Coverage asks: *"What else should I mention?"*
Revelation asks: *"What single insight will make today make sense?"*

_The heart of Velea. The math is becoming stable enough that the remaining work is no longer "how do we
calculate this?" but "how do we communicate it without losing meaning?" (David, 2026-07-23)._

## Principle 16 — Structural Axes

Certain chart features (e.g. the Rahu/Ketu axis and the MC/IC axis) represent structural geometry rather
than ordinary planetary actors. They are not excluded because they are unusual, nor elevated because they
are important. They must be modeled according to their own ontology and narrated only when they
materially clarify the day's governing theme.

Structural significance does not exempt them from the principles of coherence, narrative economy, or
editorial judgment.

---

## Standing rule — Transparency of Departure

Be explicit in the documentation whenever Velea intentionally departs from a specific classical authority.
If the engine supports a non-universal method (e.g. graded drishti from Rahu/Ketu), that choice is
documented as an **intentional design decision** — never presented as if every classical school agrees.
This preserves both transparency and trust. (David, 2026-07-23.)

---

_Implementation rule: these principles are design constraints, not algorithms. Do not immediately
translate them into implementation logic. Future algorithms must satisfy these principles rather than
replace them — preserve the principle while designing the implementation._
