# Velea — Release Gates & Audit Framework

_David's doctrine, 2026-07-22. Verbatim. Eighteen audits, organized under five release gates. These
are more important than visual polish. Run the Deterministic Astrology Audit before anything else.
This supersedes the earlier five-item "standing audits" framing — those items live on inside these
gates. Companion spec: `NARRATIVE_AUDIT.md` (the 16-point engine→LLM contract, gate 2)._

---

## The eighteen audits

### 1. Deterministic Astrology Audit (Highest Priority)
Run this before anything else. Verify:
- Every astrological conclusion is deterministic.
- No interpretation is performed by the LLM.
- Every narrative fact can be traced to engine output.
- No duplicate computations.
- No conflicting rulings.
- No fallback silently changing methodology.
- Every "why" can be explained.

This protects the integrity of Velea.

### 2. Narrative Coherence Audit
(Came directly out of the Venus discussions.) Audit for:
- One governing idea · one emotional arc · one protagonist.
- No competing narratives.
- Strong ending.
- Reflection question supports the thesis.
- Remove true-but-unnecessary facts.

This protects the reading.

### 3. Engine Output Audit
Inspect every JSON object before the LLM. Is every field populated? Any nulls? Any duplicate facts?
Any conflicting facts? Any ambiguous subjects? Any unnecessary fields? Is every field actually
consumed? **If a field isn't used, either use it or remove it.**

### 4. Prompt Audit
The prompts are becoming an engine themselves. Audit for: duplicate instructions · contradictions ·
prompt drift · outdated assumptions · redundant examples · hidden conflicts · token efficiency.
**Every sentence should justify its existence.**

### 5. Information Architecture Audit
Every screen should answer: Why am I here? What should I do? What happens next? Nothing should
compete for attention.

### 6. Onboarding Audit
The first 3 minutes determine retention. Audit: time to first value · time to first delight ·
cognitive load · required permissions · account-creation friction · subscription timing · trust.

### 7. Conversion Audit
Its own pass. Review: trial · pricing · paywall · upgrade timing · upgrade copy · restore purchases ·
purchase confirmation · cancellation flow. Ask: **where does money leak?**

### 8. Retention Audit
Different from conversion. Why would someone come back tomorrow? Does today's reading create
anticipation? Does history matter? Do notifications feel valuable? Does streak behavior feel
meaningful?

### 9. Delight Audit
The forgotten one. Find moments where users smile: microinteractions · animations · transitions ·
loading · language · unexpected polish. The best apps surprise people in tiny ways.

### 10. Trust Audit
Especially important for astrology. Does anything make this feel fake? Repeated wording ·
contradictions · typos · inconsistent terminology · confusing calculations · wrong dates —
everything that weakens confidence.

### 11. Performance Audit
Measure: startup · animation · frame drops · memory · battery · network · offline · slow queries ·
every perceived delay.

### 12. Accessibility Audit
Beyond WCAG. Think: one-handed use · fatigue · ADHD · low vision · color blindness · large text ·
motion sensitivity · VoiceOver.

### 13. Error Recovery Audit
Assume everything fails: server · payments · notifications · offline · bad chart · corrupt data.
How gracefully does the app recover?

### 14. Content Audit
Across every screen: consistency · grammar · tone · capitalization · terminology · reading level ·
no repeated metaphors · no accidental jargon.

### 15. Design System Audit
Should feel mathematically consistent: typography scale · spacing scale · corner radii · elevation ·
animation duration · icon sizing · grid · component reuse.

### 16. Business Rules Audit
Many teams forget this. Every business rule should be documented: when is a reading regenerated?
what invalidates cache? how often can users refresh? subscription rules · timezone handling ·
notification timing · upgrade behavior. **Nothing should exist "because the code does it."**

### 17. Future Scalability Audit
If you added Elections · Muhurta · Compatibility · AI chat · Monthly reports · Widgets · Wearables —
would today's architecture survive?

### 18. The "No Magic" Audit
The most uniquely Velea audit. For every feature: if I disappeared tomorrow, could another engineer
explain exactly why this behaves the way it does? If no, document it or simplify it. **No hidden
heuristics. No mystery behavior. No "it just works."**

---

## The five release gates

1. **Astrological Fidelity** — Is the astrology correct and methodologically consistent?
2. **Narrative Fidelity** — Does the reading tell one coherent story without the LLM inventing meaning?
3. **Engineering Integrity** — Is every engine output deterministic, traceable, and free of ambiguity?
4. **Visual & UX Excellence** — Does every interaction feel polished, intuitive, and unmistakably Velea?
5. **Business Excellence** — Does the product maximize trust, retention, and conversion without introducing friction or "money leaks"?

If Velea passes all five gates, it's not just an astrology app — it's a product where the
computational engine, narrative layer, user experience, and business model all reinforce one another
instead of pulling in different directions. That alignment is what distinguishes Velea from apps with
good astrology but poor UX, or beautiful UX but shallow astrology.

---

## The earlier five standing audits are preserved here (nothing dropped)

Before this framework, David gave five "standing audits." They are not lost — they live on inside the
gates above:
- **Narrative Fidelity** → Gate 2 + audit #2 (full 16-point contract in `NARRATIVE_AUDIT.md`).
- **Design Excellence** ("nothing ships because it's good enough — it ships because nothing obvious
  remains") → Gate 4 + audits #9 Delight, #14 Content, #15 Design System.
- **Revenue Integrity** ("every dollar has one path, no hidden paths") → Gate 5 + audits #7 Conversion.
- **Cognitive Load** ("Where am I? What matters? What happens next?") → audit #5 Information Architecture.
- **The Velea Standard** — the one distinct *measurement lens*, kept verbatim below.

### The Velea Standard (the four questions, verbatim)
Every change is measured against four questions:
- **Accuracy** — Is it true?
- **Precision** — Is this the clearest implementation possible?
- **Trust** — Would this increase or decrease confidence in Velea?
- **Friction** — Does this create unnecessary effort?

If any answer is "yes," fix the source before shipping.
