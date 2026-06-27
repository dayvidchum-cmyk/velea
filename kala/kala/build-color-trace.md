# Build Color Trace — Planner Page

## Target: #A68B52 (muted mineral gold) everywhere Build appears on Planner

## Sources Found

### 1. shared/types.ts — MODE_OKLCH (line 83)
- `Build: "oklch(0.68 0.14 102)"` — THIS IS ORANGE (hue 102)
- MODE_TINT (line 92): `Build: "oklch(0.68 0.14 102 / 0.12)"` — ORANGE tint
- Used by: TaskItem.tsx internal accents (completion circle, priority pill, pin button, subtask toggles)
- Used by: Home.tsx (Today page) — but we must NOT change Today page behavior

### 2. index.css — CSS custom properties
- `--mode-build: oklch(0.68 0.14 102)` (line ~39) — ORANGE
- Dark mode override: `--mode-build: oklch(0.68 0.16 102)` (line ~432) — ORANGE
- `.tag-build` class (lines 260-270) — uses orange-ish values
- `.orb-build` class (lines 327-331) — uses 102-hue values
- These back: ModeTag component, Tailwind `*-mode-build` utilities

### 3. Planner.tsx — Local overrides (ALREADY gold in some places)
- PLANNER_MODE_OKLCH (line 56-59): Build = "oklch(0.72 0.17 75)" — GOLD ✓
- PLANNER_MODE_TINT (line 61-64): Build = "oklch(0.72 0.17 75 / 0.12)" — GOLD ✓
- MODE_DOT (line 29): Build = "oklch(0.72 0.17 75)" — GOLD ✓
- MODE_FILTER_COLORS (line 49): Build = "oklch(0.72 0.17 75)" — GOLD ✓
- These are used for: task borders, swipe colors, filter pills, calendar dots

### 4. TaskItem.tsx — Internal accents (uses shared MODE_OKLCH)
- Completion circle/checkmark (lines 143-155): uses `MODE_OKLCH[task.mode]` — ORANGE for Build
- Due-date badge (lines 172-188): hardcoded `oklch(0.72 0.17 75)` — GOLD ✓
- Subtask progress badge (lines 190-201): hardcoded gold when complete — GOLD ✓
- Pinned icon color (line 208): uses `MODE_OKLCH[task.mode]` — ORANGE for Build
- Expanded area subtask toggles (lines 230-239): uses `MODE_OKLCH[task.mode]` — ORANGE
- Add button (lines 285-290): uses `MODE_OKLCH[task.mode]` — ORANGE
- Priority pill text (lines 320-329): uses `MODE_OKLCH[task.mode]` — ORANGE
- Pin button bg/border (lines 344-355): uses `MODE_OKLCH[task.mode]` — ORANGE

### 5. ModeTag.tsx — Uses CSS class `tag-build`
- Always resolves Build to `tag-build` CSS class
- Color comes from index.css `.tag-build` — ORANGE

## Root Cause Analysis

The Planner.tsx local overrides (PLANNER_MODE_OKLCH) only fix the OUTER border via `taskModeColor` prop.
But TaskItem.tsx INTERNAL accents still read from shared `MODE_OKLCH` which has Build = orange.
And ModeTag uses CSS `.tag-build` class which also has orange values.

## Fix Strategy

The cleanest fix: Change the SHARED Build color in `shared/types.ts` MODE_OKLCH and MODE_TINT
from orange (hue 102) to gold (#A68B52 equivalent).

Also fix index.css `--mode-build` and `.tag-build` and `.orb-build` to use gold.

This fixes ALL pages at once. Today page will also get gold (which is correct — user wants #A68B52 everywhere).

### #A68B52 in oklch
#A68B52 ≈ oklch(0.62 0.09 80) — muted mineral gold

### Current orange values to replace:
- oklch(0.68 0.14 102) → needs to become gold
- oklch(0.68 0.16 102) → needs to become gold
