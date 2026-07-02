# Velea — Universal vs Personal Energy

Captured 2026-06-29 from the owner's design notes. Conceptual; not yet built.

## The core idea: two energies, read together

Velea already tracks two distinct signals. Velea is the synthesis of them.

- **Personal energy → Panchapakshi.** Your internal readiness. Reflects whether
  *you*, the vessel, are charged for an act.
- **Universal energy → Golden Moment.** Cosmic/collective flow. Reflects whether
  *the moment* supports an act, even when personal energy is muted.

### Decision matrix — which signal to follow

| Situation | Priority |
|---|---|
| High-stakes or personal actions (signing something, confronting someone, posting something vulnerable) | **Follow Panchapakshi** — it reflects your internal readiness. |
| External / collective moments (launching, sending something already prepared, attending an event) | **Follow Golden Moment** — cosmic flow supports it even if personal energy is muted. |
| Both favorable | **Go all in** — extremely strong. |
| Both unfavorable | **Wait**, or use it for behind-the-scenes work. |

## The unlock: Check-In = Panchapakshi embodied in the vessel

> "What if the Check-In is the modern-day equivalent of a panchapakshi embodied
> in the vessel?"

This is the key insight. In the codebase, **Layer 1 (Panchapakshi) is deferred
"until an authoritative table is supplied"** (`server/layers/index.ts`,
`server/layers/types.ts`). The classical five-bird table never materialized.

But the **Check-In already captures five live dimensions** of the vessel
(`check_ins` table): physicalEnergy, mentalClarity, emotionalStability,
creativeFlow, motivation — each 1–5, stamped at the exact moment of submission.

Panchapakshi means "five birds." The Check-In *is* five measures — not computed
from a static table, but **read live from the actual vessel**. So the Check-In
can serve as Velea's Personal-energy signal, unblocking the deferred Layer 1
without needing the classical table.

## Golden Moment — still to define

The Universal-energy signal. Not yet a named feature in the code. Candidate
sources to compute it from: the panchang day-mode favorability, transit quality
to the natal chart, and/or the existing layered scoring system. Needs a definition
before it can drive the matrix.

## Velea — the framing

> "Velea tells you where you are at the moment as existence continues to be woven.
> It's ironic because it all started, supposedly, from something smaller than a
> tiny grain of sand. Somehow the stuff in there — stardust, aka humans, the
> things humans produce — grew and grew and expanded, and there's so much energy
> and momentum that it is still expanding. So much power that the force is still
> spreading. Some would call it a soul. A roadmap to the soul at a specific
> moment."

Velea = a roadmap to the soul at a specific moment — the synthesized read of
where you are, personal and universal energy woven together.
