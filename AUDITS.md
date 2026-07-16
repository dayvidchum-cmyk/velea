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

---

## How to run
Point an agent (or a Workflow fan-out) at the changed surfaces from the last stretch, one audit per
lens, and report only real findings. Grep-automatable audits (2, 3, 7, 8, 9) can gate a build; the
judgment audits (1, 5, 6, 10) want eyes on the deployed surfaces.
