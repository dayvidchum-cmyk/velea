# Velea — Post-Build Audits

_Run after a stretch of building, before David reviews on the deployed app (velealor.com PWA).
These keep the whole thing copacetic — catching the drift that accumulates while heads-down._

Two kinds of check:
- 🤖 **mostly automatable** — a grep, a build gate, or a proof script can flag most of it.
- 👁 **judgment read** — needs a human/agent to actually read the surface from the user's POV.

This is a living doc. Add, cut, and reword freely.

---

## The audits

### 1. Benefit audit 👁 — _David's law, 2026-07-13_
**Every feature must be perceived and received as a benefit to the user.** Each surface reads
in plain, lived language that tells the user what they *get* — never raw data or jargon left
unexplained. The trigger case: the Meridian bolded the sign on the MC/IC (Gemini/Sagittarius) but
only defined the *angles*, never said what the *sign* meant there — the one personal data point
was the one thing unexplained. **Check:** for each card, would a first-time user know why it helps
them? Is any personal data point (a sign, a placement, a number) named but not translated into
"here's what that means for you"?

### 2. LLM-cost audit 🤖👁 — _protects: no spend without green-light; $9.99 target_
No surface fires an LLM without being cached + generate-once + gated (tap-to-generate, never on
page load). **Check:** every new narrative query has `enabled:` gated on an explicit open/intent
(not just profile id); deterministic layers (trigger, meridian, ribbon, Time Master) stay
LLM-free; the wallet math still holds.

### 3. Cache time-stability audit 🤖 — _protects: reopening a reading shouldn't regenerate_
Any cached surface hashes **only over day-stable inputs** — no live-minute panchang fields leaking
into the key (the bug that quietly cost money). **Check:** new surfaces use `dayStableHash` with the
**surface threaded into the hash**, and `SURFACE_VERSION` salts are consulted.

### 4. Reading-voice audit 🤖👁 — _protects: the craft laws_
**Includes DISPLAY-SIDE prose surgery** (learned 2026-07-16, the "broken thought"): any client
code that splits, peels, truncates, or re-bullets LLM prose (takeaway peelers, sentence
splitters, teaser trims) can behead a sentence the model wrote whole. Audit the seam, not just
the generation guards — grep for `.split(` / `lastIndexOf("—")` / slice-on-prose in pages, and
read each transformer against an appositive-bearing sample.
The reading laws hold everywhere: **no house numbers** in user prose (name the lived place);
**siblings = blood + inner circle**; **no "self-worth" lean** for the 2nd house (money/livelihood);
**Moon stays gender-neutral** (never "she"); **concise ≠ vaguer** (proof is in the specifics);
**never collapse to one single move**. Grep for house numbers / "she" near Moon / banned word
"horoscope"; read for the rest.

### 4b. Orb-honesty check (joined audit #4, born 2026-07-17) — _protects: earned precision_
The Simone acceptance read claimed "Rahu sits on that same point within a degree" — natal
Mars–Rahu are 17.5° apart (same sign only); "fused" for a 13.7° separation; transit dignity
sold without its house or the natal condition beside it. The LLM tightens orbs the input never
gave. **Check:** every degree-level claim in sampled readings traces to a numeric orb in the
input; sign-level facts wear sign-level language. The celebratory summarizer (Claude included)
is subject to the same check.

### 5. Cognitive-load audit 👁 — _protects: collapse-is-default_
New sections **ship collapsed**; one clear primary per screen; nothing mushed or noisy. **Check:**
default-open states, and whether a new panel is adding load or earning its space.

### 6. Theming audit 🤖👁 — _protects: Full Spectrum + light/dark legibility_
Every new surface sets the `--color-*` aliases (not just base tokens), reads on all appearance
modes, and has **no white-on-white / invisible text** (the "Your year" bug) and no vibrating
colors on the warm FS ground. **Check:** view each new surface in light, dark, and Full Spectrum.

### 7. Deployed-end-state audit 🤖 — _protects: David tests the deployed app_
Client changes bump **version.ts + sw.js in step**; work is committed + pushed (visible only when
deployed); and any decided structural/visual changes are **bundled** so David reviews the real
end-state UX, never an intermediate. **Check:** version/sw in step, nothing left uncommitted.

### 8. Data-isolation audit 🤖 — _protects: per-user privacy + the paid seam_
Every user-scoped query is `WHERE userId`; narrative endpoints call `assertOwnsProfile`; no
cross-user leak; testers' personal charts never cross-shared. **Check:** new endpoints touching
profile/narrative data.

### 9. Migration-safety audit 🤖 — _protects: never auto force-wipe accounts_
No auto force-migrate; schema changes are manual + reviewed; **pending prod migrations are tracked**
(e.g. horoscopes table, lifeArea column) so nothing ships assuming a migration that hasn't run.

### 10. Fix-the-class audit 🤖👁 — _protects: fix the source, not the symptom_
When a bug was fixed, the whole **class** was swept, not the one failing instance (siblings
app-wide, mulberry across every token). **Check:** the last stretch's fixes — did any stop at the
first instance?

### 11. Threshold-honesty audit 👁 — _protects: the method's meaning surviving compression into code_
Born 2026-07-16: the atlas ★ badge was `peak ≥ 3` — it rewarded MANY lords at once and was blind
to a tie HELD FOR YEARS (David's 2058 wealth era, 2.5 years at peak 2, wore no mark; "another user
would have missed this important piece"). Every place the engine compresses the method into a
threshold, badge, gate, ranking, or score — ask: **what TRUE case does this cutoff hide?** For each
signal, name the dimensions the method actually carries (count, duration, level/grain, which lords,
which axis) and check the compression keeps all the decisive ones. Known thresholds to re-examine
when touched: bigKnot/era, crown-day ladder ranks, second-handshake +55, rest-gate floors, muhurta
vetoes, golden-hour peak pick. **Check:** any new or touched threshold in the stretch.

### 13. Hook-order audit 🤖 — _protects: no whole-page crash from React's rules of hooks_
Born 2026-07-19: `MeridianCard` called `useUtils`/`useState` AFTER `if (!data) return null`, so its
hook count GREW the render the query resolved → "change in the order of Hooks" → the error boundary
took the whole Chart page down ("Something went sideways"). LAW: in every component, EVERY hook
(useState/useMemo/useEffect/useQuery/useUtils/useContext/custom) precedes EVERY conditional return —
no exceptions. **Check:** read each component top-to-bottom; any hook after an early `return` is a
latent crash the moment its guard flips. (Heuristic greps false-positive on sibling functions —
confirm by reading the component body.)

### 14. Reading-rule placement audit 🤖 — _protects: the fix lands where the reader sees it, and the salt matches_
Born 2026-07-19 (the prosperity half-fix): a new reading rule was added to `GLANCE_TAIL` only, but the
hero surface is `DAY_READ_TAIL` — so the rule David asked for never reached the read he was looking at,
AND `day_read`'s `SURFACE_VERSION` salt was bumped anyway → a full paid regeneration of identical
output. LAW: when you add/change a reading rule, (a) identify EVERY tail that renders the affected
surface (glance vs day_read vs deep vs …) and put the rule in each; (b) bump ONLY the salts whose tail
actually changed — a salt bump with no matching prompt change is a pure cash burn on next view.
**Check:** each SURFACE_VERSION bump in the stretch has a corresponding edit in that surface's tail,
and each new rule reached every tail that surface uses.

### 12. Explainer-prose audit 👁 — _protects: understanding over machinery on every teaching surface_
Born 2026-07-16: the "Your year, explained" chain shipped VERBATIM as David's scaffolding sketch —
a numbered decoder ring with arrow stacks. His verdict: "it's not clear. it makes me shut down.
visually is jolting." LAW: every explainer/glossary/chain surface must RESOLVE — end in 2–3
sentences of plain prose that synthesize the steps into one thought worth reading on (the thread).
Scaffolding handed over mid-design is never final copy. Pale-background/dark-ink is the CLINICAL
register — a reading's main voice belongs on the gradient (ProseCard). **Check:** every
numbered/structured explainer (chains, glossary blocks, node bullets, house pop-ups) — does it
close in prose? Does it make you want to keep reading?

---

## How to run
Point an agent (or a Workflow fan-out) at the changed surfaces from the last stretch, one audit per
lens, and report only real findings. Grep-automatable audits (2, 3, 7, 8, 9) can gate a build; the
judgment audits (1, 5, 6, 10) want eyes on the deployed surfaces.
