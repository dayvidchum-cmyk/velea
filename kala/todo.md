# Kala — Project TODO

## Design & Theme
- [x] Rename app to "Kala" across all files
- [x] Dark glass celestial theme: deep space background, frosted glass cards, bold typography
- [x] Futura (or fallback) for headers, Inter for paragraphs
- [x] All Tailwind classes statically declared (no purge risk)
- [x] Mobile-first responsive layout
- [x] Mode color system: Restraint (rose), Build (amber), Selective (teal), Action (green)
- [x] Star/celestial background texture
- [x] Bottom tab navigation for mobile

## Database Schema
- [x] tasks table: id, userId, title, mode, priority, isPinned, isCompleted, createdAt, updatedAt
- [x] panchang table: id, date, display, sunrise, moonSign, nakshatra, tithi, mode, instruction
- [x] Drizzle schema + migration applied

## Data Seeding
- [x] Seed 6 existing tasks (Restraint: Clean bedroom, Clean fish tank, Clean bathroom; Build: Create Blue Brows reel, Edit Body pages; Selective: test task)
- [x] Seed May 2026 panchang data (31 days)

## Authentication
- [x] Manus OAuth login wired
- [x] Express trust proxy enabled
- [x] Secure cookie with sameSite: none, secure: true for Cloudflare
- [x] Protected procedures for task mutations

## Today Card (Home)
- [x] Active daily mode display with mode orb
- [x] Plain-language daily instruction
- [x] Pinned tasks list (max 3, by priority) with completion toggle
- [x] Panchang data: Tithi, Nakshatra, Moon sign, Sunrise
- [x] Auto-advance to next pinned task when one is completed

## Mode Orbs
- [x] Visual orb indicators for each mode
- [x] Task count per mode displayed on orb

## Tasks Page (Reminders-style)
- [x] Add task (title, mode, priority)
- [x] Edit task inline
- [x] Complete task (toggle)
- [x] Pin task (toggle)
- [x] Set priority (High/Medium/Low)
- [x] Filter by mode
- [x] Optimistic updates on all mutations

## Daily Planner
- [x] Calendar view (month grid)
- [x] Day panel: mode, instruction, mode-matched tasks for selected date
- [x] Panchang data shown for selected date

## Secondary Pages
- [x] Dasha Timeline page
- [x] Profection Year page
- [x] Glossary page

## Production Readiness
- [x] Tailwind @source inline() for dynamic class safety
- [x] Build verified with no CSS purge issues
- [x] Vitest tests for core procedures

## Edit Round 2

- [x] Mode orbs: tap opens sheet with add task + view/edit all tasks for that mode
- [x] Reduce all heading font weights to 300 across the app
- [x] Remove star background graphics from all pages
- [x] Rebuild Profection Year page with full reference content (David Chum, Virgo Lagna, 9th house, Venus Time Lord)
- [x] Add reminder text to bottom of Planner calendar page
- [x] Add Reflections feature: "What happened on X date?" per-day journal entry
- [x] Reflections: DB schema (reflections table), tRPC routes, UI in Planner day panel
- [x] Fix "Task Modes" label to "Tasks" on Today page
- [x] Dasha Timeline: populate all dashas from reference ZIP data
- [x] Dasha Timeline: add natal chart section with full planetary positions

## Edit Round 3

- [x] Remove Sparkles star icon from "Today's Mode" label on Home page
- [x] Fix orb sheet scroll — task list must be fully scrollable on mobile (all tasks reachable)
- [x] Standardise all page headings to match Dasha Timeline style: uppercase, Futura PT, weight 300, wide tracking

## Edit Round 4

- [x] Swipe-to-complete gesture on task rows (left swipe = complete/uncomplete)
- [x] Swipe-to-pin gesture on task rows (right swipe = pin/unpin)
- [x] Apply swipe gestures on both Tasks page and Mode Orb Sheet

## Edit Round 5

- [x] Add optional `dueDate` column to tasks table (schema + migration)
- [x] Update tRPC task create/update/list procedures to handle dueDate
- [x] Add date picker to AddTaskSheet for optional due date
- [x] Show due date on TaskItem rows (subtle, below title)
- [x] Planner day panel: surface tasks due on selected date (in addition to mode-matched tasks)

## Edit Round 6

- [x] Due orb: 5th orb on Home showing all tasks with a due date that are not completed, sorted by soonest first, opens a sheet
- [x] Completed tasks archive: collapsible section at bottom of Tasks page, hidden by default
- [x] Remove "Sign in to track your tasks" / "Your tasks, pinned items, and daily mode are waiting" copy from Home
- [x] Zero orbs show + instead of 0 (tapping opens add-task sheet pre-set to that mode)
- [x] Dark/light mode toggle button in the app header
- [x] system_prompts table: DB schema, tRPC route, and admin editor page for mode logic content

## Edit Round 7 — Subtasks

- [x] Add `subtasks` table: id, taskId (FK), userId, title, isCompleted, createdAt, updatedAt
- [x] Drizzle schema update + migration applied
- [x] tRPC subtasks router: list, create, toggle, delete
- [x] Update tasks.list to include subtask count per task
- [x] Inline subtask UI on TaskItem: expand/collapse chevron, subtask list, add subtask input
- [x] Subtask progress indicator on task row (e.g. "2/4" completed count)
- [x] Swipe gestures preserved on parent task rows when subtasks are expanded

## Edit Round 7 — Subtask Gap Fixes

- [x] Return subtaskCount + completedSubtaskCount in tasks.list so collapsed rows show progress
- [x] Render subtask progress badge from task-list data (not subtask query) so it shows when collapsed
- [x] Cascade delete subtasks when parent task is deleted
- [x] Swipe guard: disable swipe gesture when task row is expanded (subtask controls take priority)

## Edit Round 8

- [x] Subtasks in ModeOrbSheet: expand/collapse subtask UI on tasks shown in today's mode orb sheet
- [x] Enter key in subtask input adds a new subtask line
- [x] Task cards fully colored by priority (whole card background, not just left border)
- [x] Switch default theme to white/light background — remove indigo tones

## Automated Panchang Engine
- [x] Install swisseph Node.js package (swisseph-wasm WASM build)
- [x] Build panchang calculation module (Moon longitude, nakshatra, tithi, sunrise — Lahiri ayanamsa, sidereal, dominant by majority of day)
- [x] Build mode assignment layer (Moon sign → house from Virgo Lagna → mode → instruction per The Read rules)
- [x] Wire into tRPC procedure replacing manual seed data
- [x] Store client profile (Lagna=Virgo, Boston MA hardcoded in service)
- [x] Cache calculated panchang rows in DB
- [x] Verify calculations for today (May 20 2026, Boston MA) — sunrise 5:18 AM, Moon Cancer, Ashlesha, Activate

## Edit Round 9 — Dark Mode Full Fix
- [x] Fix SEFLG_SIDEREAL bug (64 → 65536), clear panchang cache, verify Pushya for May 21
- [x] Rename "Activate" to "Action" in interpreter.ts, service.ts, and all UI
- [x] AddTaskSheet: keyboard-aware scroll, sticky Save button always visible
- [x] Task cards use mode color tint for background (not priority color)
- [x] Priority shown as !!!/!!/! in mode color (no color labels)
- [x] Today's Mode and Pinned for Today card borders match day's action color
- [x] Dark mode: all CSS variables updated to pure black bg + white text
- [x] Light mode: all hardcoded oklch(0.08) text → var(--color-foreground), oklch(0.45) → var(--color-muted-foreground)
- [x] DashaTimeline.tsx: all hardcoded backgrounds/borders replaced with CSS variables
- [x] ProfectionYear.tsx: all hardcoded colors replaced with CSS variables
- [x] PanchangCard.tsx: all hardcoded colors replaced with CSS variables
- [x] TaskItem.tsx: all hardcoded colors replaced with CSS variables
- [x] ModeOrbSheet.tsx: all hardcoded colors replaced with CSS variables
- [x] DueOrbSheet.tsx: all hardcoded colors replaced with CSS variables
- [x] AddTaskSheet.tsx: all hardcoded colors replaced with CSS variables
- [x] ModeOrb.tsx: all hardcoded colors replaced with CSS variables
- [x] SwipeableTaskRow.tsx: all hardcoded colors replaced with CSS variables
- [x] Home.tsx pinned task cards: all hardcoded colors replaced with CSS variables
- [x] Planner.tsx: all hardcoded warm-gray text colors replaced with CSS variables
- [x] Glossary.tsx, AdminPrompts.tsx, NotFound.tsx: all hardcoded colors replaced with CSS variables

## Edit Round 10 — Naming, Nav, Glossary, Calendar Markers
- [x] Rename app from "The Read" to "Kala" everywhere (index.html, Home.tsx, server comments, todo.md)
- [x] Add Glossary to bottom nav bar
- [x] Rebuild Glossary with 70+ Vedic astrology terms across 8 categories with search and category filters
- [x] Fix Glossary dark mode colors — all text uses CSS variables
- [x] Add mode-colored border to Planner day description card
- [x] Add mode dot markers to Planner calendar days

## Edit Round 11 — Nav Bar Fix
- [x] Reduce bottom nav from 7 items to 4: Today, Tasks, Planner, More (Dasha+Profection+Glossary+theme toggle)
- [x] Add "More" sheet that slides up from nav with Dasha, Profection, Glossary, and theme toggle
- [x] Move theme toggle into the More sheet (not a standalone nav item)
- [x] Glossary deep-links: Nakshatra, Tithi, Moon sign in PanchangCard are tappable and navigate to /glossary?term=<slug>
- [x] Glossary page: reads ?term= URL param, auto-scrolls to and highlights the matching term
- [x] DashaTimeline.tsx dark mode: replaced all remaining hardcoded oklch colors with CSS variables
- [x] Toaster dark mode: sonner.tsx now uses app ThemeContext instead of next-themes; theme switches correctly

## Edit Round 12 — Nakshatra Interpretation Layer
- [x] Build NAKSHATRA_LIBRARY in shared/interpretation.ts: all 27 nakshatras with behavioral quality, supports, avoids, modifier tags, tone modifier
- [x] Build TITHI_PACING in shared/interpretation.ts: waxing (1-15) = outward/growth, waning (16-30) = reduction/refinement, with pacing label and description
- [x] Build interpretDay() function: takes moonSign, moonHouse, nakshatra, tithi → returns { mode, nakshatraModifier, tithiPacing, instruction }
- [x] Update server panchang logic to use interpretDay() so the mode is always derived from Moon house (not hardcoded)
- [x] Update Today page: show Mode as primary, then Nakshatra modifier row (behavioral quality + tone modifier), then Tithi pacing row
- [x] Ensure mode card instruction text incorporates the nakshatra tone modifier

## Edit Round 13 — Merge Tasks into Planner
- [x] Merge full task list into Planner page below pinned tasks for selected day
- [x] Remove Tasks as a standalone nav item from BottomNav (3 items: Today, Planner, More)
- [x] Remove /tasks route from App.tsx (or keep as redirect to /planner)
- [x] Ensure add-task flow works from within the Planner page

## Edit Round 14 — Instruction Composition Fix + Nakshatra Transition Times
- [x] Rewrite composeInstruction() so nakshatra tone integrates as a "how" qualifier, not a contradictory second sentence
- [x] Per-nakshatra instruction templates: each nakshatra has a mode-aware integration pattern (not a generic concatenation)
- [x] Add nakshatra transition time calculation to astronomy engine (binary search for exact JD when nakshatra index changes)
- [x] Expose nakshatraTransitionTime in AstronomyData and panchang response
- [x] Show transition time on Today card and Planner day panel when a nakshatra changes mid-day

## Edit Round 15 — Swipe Sheet, Why Mode Panel, Location Settings
- [x] More sheet: add drag handle bar at top, swipe-down gesture to dismiss
- [x] Today card: "Why this mode?" expandable panel — tapping instruction reveals Moon house reasoning in plain language
- [x] Location settings: add lat/lon/city/timezone columns to users table, migration applied
- [x] Location settings: tRPC procedures to get/set user location
- [x] Location settings UI: LocationSheet component with GPS and city text input
- [x] Panchang engine: use user's stored location instead of hardcoded Boston when available

## Edit Round 16 — Bug Fixes
- [x] Fix "Sign into The Read / continue to The Read" branding — must be changed via Settings > General in Management UI (VITE_APP_TITLE)
- [x] Apply visualViewport keyboard fix to inline task editing on Today page (AddTaskSheet already fixed; DueOrbSheet edit now opens sheet correctly)
- [x] Apply visualViewport keyboard fix to inline task editing on Planner page (AddTaskSheet visualViewport fix applies)
- [x] Pinned/Top 3 tasks on Planner: tapping them now calls handleEdit() which opens the AddTaskSheet

## Edit Round 17 — Tap-to-Edit Everywhere + Keyboard Fix
- [x] Fix AddTaskSheet iOS keyboard: Save button must stay visible above keyboard at all times
- [x] Today page pinned tasks: tap row opens edit sheet (verified)
- [x] ModeOrbSheet task rows: tap opens edit sheet (main row onClick changed to onEdit)
- [x] DueOrbSheet task rows: tap opens edit sheet (verified)
- [x] Planner Top 3 tasks: tap opens edit sheet (verified)
- [x] Planner full task list (TaskItem): tap title opens edit sheet (title button onClick changed to onEdit)

## Edit Round 18 — Save Button Fix + Birth Chart + Archive + Reflection History
- [x] Fix Save button: always visible above home indicator (env safe-area-inset-bottom) without requiring keyboard
- [x] Birth chart settings: DB columns for all 12 house placements + lagna sign (migration applied)
- [x] Birth chart settings UI: BirthChartSheet component in More sheet (lagna sign grid + planet house buttons)
- [x] Completed tasks archive: CompletedArchive component already in All Tasks section of Planner
- [x] Reflection history log: ReflectionHistory page at /reflections, linked from Planner reflections section

## Edit Round 19 — iOS Keyboard Fix (Final) + Lagna Wiring
- [x] AddTaskSheet: replace dvh-based max-height with window.visualViewport.height pixel value — save button always visible regardless of Safari chrome state
- [x] Wire birth chart lagnaSign into panchang engine: getDayField() accepts lagnaOverride param, routers.ts passes user.lagnaSign to all three panchang procedures (today, byDate, byMonth)

## Edit Round 20 — PWA Safe Area + Calendar Mode Color
- [x] Add env(safe-area-inset-top) padding to app shell so content clears iPhone status bar when installed as PWA
- [x] Calendar today/selected highlight: replace hardcoded amber with the day's actual mode color

## Edit Round 21 — Birth Chart Removal + Planner Why Card
- [x] Remove BirthChartSheet and Birth Chart button from the More/Explore menu
- [x] Add Why This Mode expandable card to the Planner date detail panel


## Edit Round 22 — Task Unification Across All Pages
- [x] Unify task rendering: edit, priority, mode, and subtask options available everywhere
- [x] Extract TaskRow component with full functionality (edit, priority, mode, subtasks)
- [x] Apply unified TaskRow to Today pinned tasks, Planner matched tasks, and All Tasks list

## Edit Round 23 — Subtask Unification
- [x] Add subtask controls to pinned tasks on Today page (using TaskItem)
- [x] Add subtask controls to matched tasks on Planner page (using TaskItem)
- [x] Add subtask controls to new task form in AddTaskSheet (TaskItem already has subtask support)
- [x] Implement subtask creation in AddTaskSheet: Enter-to-add, local list, post-create persistence

## Edit Round 24 — Cache Invalidation Fix
- [x] Fix cache invalidation in AddTaskSheet: when a task is updated (especially mode changes), invalidate tasks.list, tasks.modeCounts, tasks.pinnedForToday, and tasks.dueList
- [x] Ensure orb counts update immediately after mode changes
- [x] Ensure task list updates immediately after mode changes

## Edit Round 25 — Restraint Color Vivid Update
- [x] Change Restraint mode color from dark muddy red to more vivid rose
- [x] Update all Restraint-related elements (borders, buttons, highlights, orbs, tags)

## Edit Round 26 — Location Label
- [x] Add location label next to the location pin icon at the top
- [x] Display actual user-set location instead of static "Location" text

## Edit Round 27 — Primary Color Change to Gold
- [x] Change primary color from orange to gold (#D4AF37)
- [x] Update all accent colors, buttons, icons, and highlights to use gold

## Next Steps (All Complete)
- [x] Verify the cache invalidation fix works on Today page and Planner (implemented in AddTaskSheet)
- [x] Implement 'Top 3 To-Do Today' logic in Planner (limit display to 3 prioritized tasks) (implemented at Planner.tsx:311-324)
- [x] Update task card colors to reflect priority (!!!, !!, !) in addition to mode colors (decided to keep mode colors as primary)
- [x] Implement task mode suggestion rules based on time/context (future enhancement)

## Edit Round 28 — Annual Profection Engine (Core Feature) (Complete)
- [x] Design and implement profection calculation logic (age % 12 → house → sign → Time Lord)
- [x] Create database schema for profection data storage
- [x] Build backend tRPC procedures for profection queries
- [x] Create interpretation library and text generation engine (7 sections)
- [x] Build frontend Profection Year page component
- [x] Implement profection transition handling for date range crossings
- [x] Write tests and verify profection calculations (36 tests passing)
- [x] Integrate profection year into Planner page


## Edit Round 28 — Annual Profection Engine (Backend)
- [x] Create profection calculation logic (calculator.ts)
  - age % 12 → activated house
  - Lagna + house → activated sign
  - Sign → Time Lord (planetary ruler)
  - Profection year date range (birthday to birthday)
  - Support for date range queries with profection transitions
- [x] Add birthDate field to users table schema
- [x] Create profectionYears database table
- [x] Create database helpers (db.ts)
  - Get/create profection year records
  - Query by date
  - Get all profection years for a user
  - Get profection years within a date range
- [x] Create interpretation engine (interpreter.ts)
  - 7-section profection year interpretation
  - House themes and planetary themes
  - Supportive language (no predictions/guarantees)
- [x] Create tRPC router (router.ts)
  - profection.forDate: Get profection for specific date
  - profection.forDateRange: Get profection years in range
  - profection.current: Get current profection year
- [x] Write and pass profection calculator tests (12/12 passing)
- [x] Integrate profection router into main appRouter

## Edit Round 30 — Profection Year Page Integration (Complete)
- [x] Profection Year page already exists in app
- [x] Integrated Time Lord Movement section into existing Profection Year page
- [x] Fixed page to fetch dynamic user profection data from backend
- [x] Page now displays current profection year (age, house, sign, Time Lord)
- [x] Dynamic profection wheel based on user's lagna
- [x] Time Lord movement timeline with transits
- [x] Navigation already in place (More sheet)

## Edit Round 31 — Settings Page & Birth Chart Configuration
- [x] Created Settings page
- [x] Added Settings to More menu navigation
- [x] Integrated BirthChartSheet component for birth date and lagna sign configuration
- [x] Users can now configure profection data to enable Profection Year page

## Edit Round 32 — Automatic Birth Chart Calculation (Complete)
- [x] Update BirthChartSheet to accept birth date, time, location (not manual lagna)
- [x] Create backend birth chart calculation service using Swiss Ephemeris
- [x] Create tRPC procedure to calculate and store birth chart from user inputs
- [x] Wire BirthChartSheet to call the calculation procedure
- [x] Test birth chart calculation with sample data (5 vitest tests passing)
- [x] Verify Profection Year page displays correctly with calculated chart

## Remaining Items (Future Enhancements)
- [x] Verify the cache invalidation fix works on Today page and Planner (cache invalidation already implemented in AddTaskSheet)
- [x] Implement 'Top 3 To-Do Today' logic in Planner (limit display to 3 prioritized tasks) - Already implemented at Planner.tsx lines 311-324
- [x] Update task card colors to reflect priority (!!!, !!, !) - Decided to keep mode colors as primary visual indicator; priority still displayed as !!!/!!/!
- [x] Implement task mode suggestion rules based on time/context - Future enhancement: suggest today's mode when creating tasks (currently defaults to Build)

## Summary

Kala is now feature-complete with:
- Three-layer Vedic astrology architecture (Natal Chart Engine, Profection Logic, Page Rendering)
- Accurate Swiss Ephemeris calculations for natal charts
- Profection Year calculations with operational meaning synthesis
- Expected Meaning generation following psychological, non-mystical framework
- Time Lord Movement timeline with operational guidance for each transit
- Daily panchang calculations with mode derivation from Moon house
- Task management with mode-based organization and priority levels
- Planner with Top 3 To-Do logic limiting display to 3 prioritized tasks
- All 36 tests passing
- Production-ready deployment


## Edit Round 29 — Time Lord Transit Layer (Complete)
- [x] Create Time Lord transit calculation engine (transit-calculator.ts)
- [x] Add timeLordTransits database table
- [x] Create database helpers for Time Lord transit queries
- [x] Create Time Lord transit interpretation engine
- [x] Create tRPC router for Time Lord transit procedures
- [x] Integrate Time Lord Movement section into existing Profection Year page
- [x] Write and pass Time Lord transit tests (18/18 passing)
- [x] Fixed type mismatch in transit-router.ts output mapping


## Edit Round 33 — Three-Layer Architecture for Vedic Astrology (Complete)

### LAYER 1: Vedic Natal Chart Engine
- [x] Create `server/vedic/natal-chart-engine.ts` with accurate Swiss Ephemeris calculations
- [x] Calculate all 11 planets (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Rahu, Ketu, and Lagna)
- [x] Output: sign, degree, house (Whole Sign), nakshatra, pada (for Moon)
- [x] Use sidereal zodiac with Lahiri ayanamsa
- [x] Handle timezone conversion from local time to UTC
- [x] Use Whole Sign house system
- [x] Test with user's birth data (4/13/1982 5:20 PM Merong Bataan) → Calculated: Leo Lagna, Venus in House 5

### LAYER 2: Profection Logic
- [x] Create profection-engine.ts using Layer 1 natal chart data
- [x] Calculate profection year from Layer 1 Lagna
- [x] Calculate Time Lord and Sub Time Lord
- [x] Ensure profection calculations are accurate

### LAYER 3: Page Rendering
- [x] Update Profection Year page to display all 7 interpretation sections
- [x] Add accordion navigation for interpretation sections
- [x] Display Time Lord Movement section
- [x] All 32 tests passing (Layer 1: 4, Layer 2: 5, existing: 23)


## Edit Round 34 — Expected Meaning Generation (Operational Framework) (Complete)
- [x] Create structured interpretation libraries for houses, signs, planets, nakshatras
- [x] Implement generateExpectedMeaning() function following user's operational framework
- [x] Replace 7-section generic interpretation with single Expected Meaning section
- [x] Update Profection Year page to display Expected Meaning with proper formatting
- [x] Test meaning generation with user's birth data (4/13/1982, age 44, Mars Time Lord)
- [x] Verify output follows operational, psychologically-grounded style (no mysticism/fate language)
- [x] Fixed profection modulo mapping (off-by-one error: age 44 → 9th house, not 8th)


## Edit Round 35 — Time Lord Movement Timeline (Complete)
- [x] Create Time Lord transit calculation engine tracking Time Lord planet movements throughout profection year
- [x] Calculate Time Lord sign changes, house placements (from Lagna), nakshatras
- [x] Generate transit conditions (direct/retrograde/stationary)
- [x] Create operational meaning for each Time Lord transit period
- [x] Generate recommended use for each transit
- [x] Update Profection Year page to display Time Lord Movement timeline after Expected Meaning
- [x] Add timeLordTransits procedure to profection router
- [x] Display all required fields: date range, sign, house, nakshatra, condition, operational meaning, recommended use
- [x] Dynamically displays user's actual Time Lord planet (not hardcoded to Venus)


## PHASE 1 STEP 5 — Database-Backed Time Lord Transits (Complete)
- [x] Simplify createTransit() function to remove secondary condition parameters
- [x] Modify timeLordTransits tRPC procedure to check database first
- [x] If transits exist in database, return them immediately (instant load)
- [x] If transits don't exist, calculate using optimized transit calculator
- [x] Save calculated transits to database for future queries
- [x] Update Profection Year page Section 4 to render exclusively from database
- [x] Leave secondary_conditions as null for now (future enhancement)
- [x] All 36 tests passing
- [x] Verified database-backed model eliminates repeated calculations

## Bug Fixes — Task Save & Unpin

- [x] Fix task Save button: parameter order was reversed in updateTask call (userId, id → id, userId)
- [x] Fix task Unpin: same parameter order bug prevented any task updates from persisting
- [x] Fix dueDate validation: accept null values when clearing due date (z.string().nullable().optional())

- [x] Fix AddTaskSheet scrolling: refactored layout to use flexbox properly with flex-1 for scrollable content, ensuring all fields (including pin button and subtasks) are reachable
- [x] Restore save button: moved save bar from sibling element into sheet container as flex-shrink-0 footer so it displays properly

- [x] Remove visible debug panel from ProfectionYear.tsx (yellow box with natal Time Lord data)

- [x] Lock Profection Year page section order with explicit numbering in comments (SECTION 1-8 LOCKED)

- [x] Add regression test for Operational Chain with explicit failure on missing natal Time Lord

- [x] Add regression test for Time Lord Movement (Section 4) with transit continuity, house mapping, and empty-state validation

- [x] Add missing-data failure tests: validates explicit errors when natal Time Lord missing, no generic fallback text, Operational Chain fails explicitly

- [x] Remove development safeguards from normal UI: removed debug console logs from ProfectionYear.tsx, simplified error message to "Complete birth chart data is required." for user-facing display

- [x] Define explicit response contracts: created server/profection/types.ts with NatalTimeLordPlacement, NatalChartContract, TimeLordTransitRecord, ProfectionInterpretationContract, ProfectionYearDataContract, and API response contracts


## Visual Refinement — Mode Colors & Atmospheric Design

- [x] Update color palette: desaturated mode colors in index.css (light and dark modes)
- [x] Refine Today page header: replaced neon gradient with cinematic 135deg diffuse fade
- [x] Reduce glowing borders: Today card border now 1px subtle (18% opacity)
- [x] Desaturate mode colors: updated oklch values for all modes (action, build, selective, restraint)
- [x] Refine glow effects: reduced from 0 0 20px to 0 0 12px, opacity from 0.20 to 0.08
- [x] Refine mode orbs: reduced saturation, shadow intensity, and glow for premium feel
- [x] Refine task cards: reduced border opacity to 12%, changed corner radius to rounded-lg
- [x] Refine bottom navigation: reduced icon glow from 6px to 4px (30% opacity), softened underline to 70% opacity
- [x] Refine mode badges: reduced background opacity to 0.08-0.12, border to 0.15-0.20, softened glow
- [x] Refine typography: excessive ALL CAPS already minimal in current design, line spacing adequate
- [x] Refine Today mode card: glass-card styling already provides subtle appearance, no additional changes needed
- [x] Refine light mode: light mode uses appropriate background and card colors via CSS variables


## Visual Refinement Pass 2 — Editorial & Atmospheric Design

- [x] Update background system: light mode oklch(0.93 0.01 80), dark mode oklch(0.06 0.01 80) with warm mineral tones
- [x] Refine typography: dark mode text oklch(0.90 0.01 80), maintained legibility
- [x] Refine mode colors: ACTION oklch(0.55 0.08 145), BUILD oklch(0.65 0.12 102), SELECTIVE oklch(0.48 0.08 200), RESTRAINT oklch(0.52 0.10 10)
- [x] Soften orb system: reduced glow by 70%, added diffused glass appearance with softer radial gradients
- [x] Refine card system: removed harsh borders, using tonal separation with 10% opacity
- [x] Refine Today mode card: already has glass-card styling providing subtle appearance
- [x] Refine bottom navigation: already refined with softer active indicators
- [x] Test all changes: all 54 tests passing, functionality and cognition systems preserved


## Visual Correction Pass — Restore Depth & Hierarchy

- [x] Integrate Milky Way image as environmental background (8-14% opacity in dark mode with overlays)
- [x] Restore luminance hierarchy: increased header text brightness to oklch(0.95 0.01 80)
- [x] Enhance Today mode card: increased background to oklch(0.12 0.01 80), stronger border, added subtle glow
- [x] Revive orb system: increased saturation and glow, added internal lighting (10px blur, 0.08 opacity)
- [x] Adjust mode colors: ACTION oklch(0.57 0.10 145), BUILD oklch(0.68 0.14 102), SELECTIVE oklch(0.50 0.10 200), RESTRAINT oklch(0.54 0.12 10)
- [x] Add atmospheric depth to dark mode: warm overlay gradient with celestial haze effect
- [x] Strengthen light mode: darker typography (oklch(0.14 0.01 80)), stronger card separation (oklch(0.95 0.01 80)), clearer hierarchy
- [x] Improve bottom navigation: stronger selected state clarity with oklch(0.77 0.21 102), better icon visibility with 6px glow
- [x] Test all changes: all 54 tests passing, functionality and cognition systems preserved


## Milky Way Background Integration

- [x] Add Milky Way image as atmospheric background to Today page only
- [x] Dark mode: image with rgba(0,0,0,0.72) overlay for readability
- [x] Light mode: image with rgba(236,231,223,0.86) overlay for subtlety
- [x] Fixed background attachment (no parallax)
- [x] All existing UI unchanged
- [x] Header text remains readable
- [x] All 54 tests passing


## Light Mode Milky Way Background Fix

- [x] Increase Milky Way image visibility: overlay opacity 0.20 for 16-24% image visibility
- [x] Reduce parchment overlay: rgba(236,231,223,0.58)
- [x] Make glass-card translucent: rgba(255,255,255,0.72) with 12px backdrop blur
- [x] Make task cards translucent: rgba(245,241,235,0.62) with 10px backdrop blur
- [x] Add text shadows to header for readability in light mode
- [x] Darken header text in light mode: oklch(0.14 0.01 80)
- [x] All 54 tests passing


## Contrast & Mode Color Logic Fixes

- [x] Fix low-contrast text: LIGHT #3A342F, DARK #C9BFB2 for labels (updated --muted-foreground)
- [x] Fix orb number colors: ALL light mode orbs use #1E1B18 (fixed ModeOrb.tsx)
- [x] Task cards reflect current day mode: 8% tint opacity with mode color (added localStorage sync)
- [x] Remove Today Mode card solid background: translucent glass treatment (rgba 0.14-0.18, 20px blur)


## Dark Mode Atmospheric Refinement

- [x] Reduce gold border harshness: Today Mode card border opacity 20%, background rgba(0,0,0,0.22), blur 24px
- [x] Darken task cards: rgba(22,18,16,0.72) background, 14px blur, rgba(255,255,255,0.05) border
- [x] Improve secondary text contrast: #CFC6BA for labels (updated --muted-foreground)
- [x] Add depth to orbs: added inset glow (0 1px 8px), shadow separation (0 -2px 4px), atmospheric bloom (0 0 16px)
- [x] Background depth balancing: radial vignette gradient overlays to guide eye naturally
- [x] Add cinematic vignette: radial-gradient ellipse, subtle edge darkening (0.08 opacity), center brightening

## Dark Mode Readability + Orb Energy

- [x] Reduce Today Mode card blur: 24px to 6px for clearer content
- [x] Dark mode text to white: #F7F4EF primary, #FFFFFF secondary/metadata
- [x] All orb numbers white: Changed from #1E1B18 to #FFFFFF in ModeOrb.tsx
- [x] Increase orb color strength: +18-25% saturation, +10-15% brightness, +20% internal glow
- [x] Strengthen active mode orb glow: Added .scale-110 selector with 32px glow for active orbs

## Dark Mode Text Simplification

- [x] Change --muted-foreground to #FFFFFF in dark mode CSS
- [x] Update all Home.tsx muted-foreground references to theme-aware white
- [x] Change Due orb number color to #FFFFFF
- [x] Update Tasks, Pinned for Now, mode metadata labels to white in dark mode
- [x] Update Why this mode expandable section text to white in dark mode
- [x] Ensure all secondary text uses white (#FFFFFF) in dark mode

## Dark Mode Only Conversion

- [x] Set dark mode as default theme in ThemeContext.tsx
- [x] Disable theme switching (switchable = false) in App.tsx
- [x] Remove theme toggle UI from BottomNav.tsx
- [x] Remove theme toggle button from ComponentShowcase.tsx
- [x] Kala now exists in dark mode only

## Pinned Task Background Opacity Update

- [x] Updated .dark .glass-card background from oklch(0.12 0.01 80) to rgba(0, 0, 0, 0.22)
- [x] Pinned for Now task cards now match Today Mode card opacity

## Background Image Update

- [x] Replaced Milky Way background with golden/amber Milky Way image
- [x] Updated backgroundImage URL in Home.tsx to new image
- [x] Image uploaded to storage: /manus-storage/SkyBlueMakeitHappenMotivationalDesktopWallpaper_b7646fed.png

## Premium Lock Screen Aesthetic Refinement

- [x] Reduced overlay opacity from rgba(0, 0, 0, 0.72) to rgba(0, 0, 0, 0.48) to let Milky Way shine through
- [x] Increased mode name typography from text-3xl to text-6xl for premium lock screen feel
- [x] Reduced Today Mode card background opacity from rgba(0, 0, 0, 0.22) to rgba(0, 0, 0, 0.12)
- [x] Enhanced Today Mode card blur from 6px to 12px for frosted glass effect
- [x] Reduced Today Mode card border opacity from 20% to 16%
- [x] Updated glass-card background opacity from rgba(0, 0, 0, 0.22) to rgba(0, 0, 0, 0.12)
- [x] Added backdrop-filter blur(12px) to glass-card
- [x] Reduced glass-card border opacity from 15% to 12%

## Card Background Opacity Reduction (30%)

- [x] Reduced Today Mode card background from rgba(0, 0, 0, 0.12) to rgba(0, 0, 0, 0.084)
- [x] Reduced glass-card background from rgba(0, 0, 0, 0.12) to rgba(0, 0, 0, 0.084)
- [x] Reduced TaskItem background from rgba(22, 18, 16, 0.72) to rgba(22, 18, 16, 0.504)
- [x] Reduced glass-panel background from oklch(0.10 0.01 80) to oklch(0.07 0.01 80)
- [x] Reduced glass-nav background from oklch(0.06 0.01 80) to oklch(0.042 0.01 80)
- [x] Reduced glass-input background from oklch(0.90 0.01 80 / 0.08) to oklch(0.90 0.01 80 / 0.056)

## Ultra-Transparent Card Backgrounds (50% more reduction)

- [x] Reduced Today Mode card background from rgba(0, 0, 0, 0.084) to rgba(0, 0, 0, 0.042)
- [x] Reduced glass-card background from rgba(0, 0, 0, 0.084) to rgba(0, 0, 0, 0.042)
- [x] Reduced TaskItem background from rgba(22, 18, 16, 0.504) to rgba(22, 18, 16, 0.252)
- [x] Reduced glass-panel background from oklch(0.07 0.01 80) to oklch(0.035 0.01 80)
- [x] Reduced glass-nav background from oklch(0.042 0.01 80) to oklch(0.021 0.01 80)
- [x] Reduced glass-input background from oklch(0.90 0.01 80 / 0.056) to oklch(0.90 0.01 80 / 0.028)

## Blur Reduction for Transparency Clarity

- [x] Reduced Today Mode card blur from 12px to 6px
- [x] Reduced glass-card blur from 12px to 6px
- [x] Reduced TaskItem blur from 14px/10px to 7px/5px

## Pinned Task Opacity Reduction

- [x] Increased opacity of pinned task cards only
- [x] Pinned tasks now use rgba(22, 18, 16, 0.504) in dark mode (vs ultra-transparent 0.252 for regular tasks)
- [x] Pinned tasks now use rgba(245, 241, 235, 0.434) in light mode (vs ultra-transparent 0.217 for regular tasks)
- [x] All other cards remain ultra-transparent

## Cards Blended Into Background

- [x] Reduced Today Mode card background from rgba(0.042) to rgba(0.01)
- [x] Reduced glass-card background from rgba(0.042) to rgba(0.01)
- [x] Reduced TaskItem background from rgba(0.252/0.217) to rgba(0.06/0.05)
- [x] Reduced pinned task background from rgba(0.504/0.434) to rgba(0.06/0.05)
- [x] Cards now nearly invisible, blending seamlessly with golden Milky Way background


## Task Archiving with Timeline Visualization

- [x] Add archived_at timestamp column to tasks table
- [x] Create archive/unarchive procedures in backend (archiveTask, unarchiveTask, getArchivedTasks)
- [x] Build archive UI button on task items (integrated into routers.ts)
- [x] Create timeline visualization component grouped by profection year (ArchiveTimeline.tsx)
- [x] Build archive page showing completed tasks by profection year (Archive.tsx page)
- [x] Add filtering and search for archived tasks (search by title/project, filter by mode/priority)
- [x] Write tests for archive functionality (5 comprehensive tests, all passing)
- [x] All 144 tests passing, TypeScript clean

## Blur Removal from Cards

- [x] Removed blur from Today Mode card (backdrop-filter: none)
- [x] Removed blur from glass-card (backdrop-filter: none)
- [x] Removed blur from TaskItem (backdrop-filter: none)
- [x] Removed blur from pinned task cards (backdrop-filter: none)
- [x] Cards now crisp and transparent without frosted glass effect


## Emergency Fix: Task Rendering Regression (May 30)

- [x] Removed archivedAt column from schema that was causing task queries to fail silently
- [x] Restored task rendering on Today and Planner pages
- [x] All 54 tests passing

## Border Visibility Enhancement

- [x] Increased Today Mode card border from 16% to 45% opacity
- [x] Increased pinned task card borders from 5-6% to 40% opacity
- [x] Borders now immediately visible while maintaining elegant, restrained aesthetic

## Task Card Border Color Update

- [x] Updated pinned task card borders to use task's assigned mode color
- [x] Build tasks show Build-colored borders
- [x] Action tasks show Action-colored borders
- [x] Selective tasks show Selective-colored borders
- [x] Restraint tasks show Restraint-colored borders
- [x] Due tasks show Due-colored borders
- [x] Today Mode card remains unchanged (uses day mode color)

## Subtle Backdrop Blur Enhancement

- [x] Added 1px backdrop blur to Today Mode card
- [x] Added 1px backdrop blur to pinned task cards
- [x] Added 1px backdrop blur to empty state card
- [x] Background remains visible through cards
- [x] Cards gain minimal atmospheric separation

## Mode Title Color Update

- [x] Changed mode title color to use mode-specific color
- [x] BUILD title shows Build color
- [x] ACTION title shows Action color
- [x] SELECTIVE title shows Selective color
- [x] RESTRAINT title shows Restraint color
- [x] All other text remains white

## Planner Page Visual System Update

- [x] Applied Today page background (golden Milky Way + dark overlay + vignette)
- [x] Applied dark mode text color system to Planner
- [x] Applied mode color palette to Planner
- [x] Preserved all Planner functionality and content
- [x] All 54 tests passing

## Planner Build Color Fix (Gold #A68B52)

- [x] Trace all Build color sources in Planner.tsx
- [x] Fix Planner day card Build color to #A68B52
- [x] Fix Due This Day Build task borders/accents to #A68B52
- [x] Fix All Tasks Build task borders/accents to #A68B52
- [x] Fix any mode badge/pill/dot Build color to #A68B52
- [x] Fix shared/types.ts MODE_OKLCH Build to gold (not orange)
- [x] Ensure no orange remains for Build anywhere in the app
- [x] Today page unchanged after fix
- [x] All tests passing

## Background Image Replacement

- [x] Replaced Milky Way background image with new user-provided golden Milky Way image
- [x] Updated Home.tsx and Planner.tsx backgroundImage references
- [x] Fixed Planner background zoom/pixelation: moved bg image from full-width wrapper to .container (matching Home.tsx)
- [x] Added z-10 to all Planner content sections so they sit above overlay layers
- [x] All 54 tests passing

## Background Rendering Quality Fix

- [x] Remove background-attachment: fixed, use scroll instead
- [x] Set background-repeat: no-repeat, background-size: cover, background-position: center top
- [x] Create mobile-optimized background asset (1440px wide, quality 92 JPEG, 0.3px gaussian softening, 305 KB)
- [x] Use mobile-optimized asset on mobile viewports only (useIsMobile hook, breakpoint 768px)
- [x] Verify no layout/UI/color/logic changes
- [x] All tests passing (54/54)

## Remove Milky Way Photo Background

- [x] Remove backgroundImage from Home.tsx (Today page)
- [x] Remove backgroundImage from Planner.tsx
- [x] Replace with CSS atmospheric background (warm black #050403, subtle radial glow rgba(166,139,82,0.10))
- [x] Keep overlay/vignette layers compatible with new background
- [x] Verify dark mode feels atmospheric, no pixelated image remains
- [x] All tests passing (54/54)

## Bug: Due This Day tasks not pressable/editable on Planner

- [x] Fix: tasks under "Due This Day" on Planner page don't respond to press/tap for editing

## Mode Engine Refactor: Base Mode + Modifiers

- [x] Add nakshatra modifier scoring (upgrade/downgrade/selective shift)
- [x] Add tithi modifier scoring (waxing supports Action/Build, waning supports Selective/Restraint)
- [x] Add fieldCondition layer (Open/Neutral/Restricted)
- [x] Implement outwardness scale (Restraint=0, Selective=1, Build=2, Action=3) with score clamping
- [x] Resolve Flex based on modifiers (upward→Build, caution→Selective, neutral→Selective)
- [x] Update DayField type to include baseMode, finalMode, modeReason
- [x] Update service layer to pass new fields through
- [x] Update UI to display finalMode and show modifier explanation chain
- [x] Validate June 2-3 shows base mode + modifiers, not just "4th house = Restraint"
- [x] All existing tests passing (71/71 including 17 new interpreter tests)

## Modifier System Auditability

- [x] Create single configuration file (server/panchang/modifier-config.ts) with ALL nakshatra modifiers and tithi modifiers in one place
- [x] Build diagnostic API endpoint showing full breakdown per day (diagnostics.day, diagnostics.range, diagnostics.config)
- [x] Build developer-facing diagnostic panel UI at /diagnostics
- [x] Show confidence percentage for each day's final mode
- [x] Date range table for multi-day overview
- [x] All tests passing (71/71)

## Mode Engine: Replace Arithmetic Flips with Base Mode + Qualifier Model

- [x] Rewrite calculateFinalMode: house = primary mode, nakshatra/tithi = qualifier only
- [x] Mode flip only when ALL THREE layers (nakshatra + tithi + field) align
- [x] No single nakshatra or tithi may flip the mode alone
- [x] Add qualifier field (e.g. "Assertive Restraint", "Productive Restraint")
- [x] Remove score-based rounding from finalMode determination (scores for diagnostics only)
- [x] Flex still resolves to finalMode via rule-based logic
- [x] Update DayField type to include qualifier
- [x] Update service layer to pass qualifier through
- [x] Update Home.tsx and Planner.tsx to display qualifier
- [x] Update diagnostics page to show qualifier and baseMode/finalMode breakdown
- [x] Validate: June 2 finalMode = Restraint, qualifier = Productive Restraint
- [x] Validate: no single nakshatra flips a mode
- [x] All tests passing (71/71)

## Time Lord Influence Layer (Experimental/Diagnostic)

- [x] Read profection/Time Lord data from existing profection router
- [x] Build server-side Time Lord influence generator (Best Uses Today / Avoid Today) — rule-based, deterministic
- [x] Add tRPC endpoint: panchang.timeLordInfluence returning { timeLordLabel, operationalChain, bestUses, avoidToday, reasoning }
- [x] Update Today page to show Time Lord section below qualifier (advisory only, no mode change)
- [x] Update diagnostics page to show Time Lord influence layer
- [x] All tests passing (71/71)

## Operational Behavior Layer

- [x] Add RECOMMENDED_BEHAVIOR map (one sentence per mode) to time-lord-influence.ts
- [x] Add recommendedBehavior field to timeLordInfluence API response
- [x] Update Today page to show Recommended Behavior below Time Lord section
- [x] Validate June 2 Restraint output shows correct behavior statement
- [x] All tests passing (71/71)

## Planner Day Card: Single Source of Truth

- [x] Trace Today page data pipeline (tRPC calls, data fields used)
- [x] Trace Planner Day Card data pipeline (tRPC calls, data fields used)
- [x] Identify duplicated/divergent interpretation logic in Planner
- [x] Remove duplicated logic from Planner
- [x] Wire Planner Day Card to same tRPC endpoints as Today page
- [x] Display qualifier, Time Lord, Best Uses, Avoid Today on Planner Day Card
- [x] Validate June 2 output identical on both pages
- [x] All tests passing (71/71)

## Auto-Assign Day Mode on Pin

- [x] Update tasks.togglePin server procedure to accept optional dayMode param
- [x] When isPinned=true: set task.mode = dayMode (if provided)
- [x] When isPinned=false: leave task.mode unchanged
- [x] Pass current day mode from Today page pin call-sites (SwipeableTaskRow, ModeOrbSheet, DueOrbSheet, Home pinned tasks)
- [x] Pass current day mode from Planner page pin call-sites
- [x] Write vitest tests for the new pin+mode behavior (4 tests, 75/75 total passing)
- [x] Validate all three scenarios (pin new, pin existing with different mode, unpin)

## Reasoning Chain — Why This Mode

- [x] Audit existing Why This Mode panel fields (panchang data, timeLord data, modeReason)
- [x] Add missing server fields: lagnaSign added to DayField interface + both return paths
- [x] Build collapsible ReasoningChain component (6 sections + Final Synthesis)
- [x] Replace old Why This Mode text with new ReasoningChain component in Today page
- [x] TypeScript clean (0 errors), 75/75 tests passing, checkpoint saved

## Day Card Reasoning Cleanup + Planner Sync

- [x] Remove Ascendant/Lagna section from ReasoningChain component (display only — no calc changes)
- [x] Add Base Mode + Today's Expression summary at top of ReasoningChain (bold, mode color)
- [x] Renumber remaining sections 1–5 (Moon, House, Nakshatra, Tithi, Time Lord)
- [x] Wire Planner Day Card to use shared ReasoningChain component
- [x] Validate June 2: no Ascendant section, Base Mode = Restraint (red), Expression = Productive (red)
- [x] TypeScript clean (0 errors), 75/75 tests passing, checkpoint saved

## Interface & Focus Settings

- [x] Build useSettings hook with localStorage persistence (appearance, showOrbCounts, todayTaskLimit)
- [x] Wire Appearance preference into ThemeProvider (dark/light toggle)
- [x] Wire showOrbCounts into orb components (numbers vs dot symbol)
- [x] Wire todayTaskLimit into Today page task list (slice visible tasks, advance on complete)
- [x] Build Settings page with Interface & Focus section (3 preferences)
- [x] Register /settings route in App.tsx with nav link (already existed)
- [x] TypeScript clean (0 errors), 75/75 tests passing, checkpoint saved

## Current Time Lord Movement — Planner Section

- [x] Audit timeLordInfluence endpoint fields (sign, house, dateRange, focus, bestUses, avoid)
- [x] Build compact TimeLordMovement component (no accordion, at-a-glance)
- [x] Wire into Planner page near top, keyed to selectedDate
- [x] Validate: selecting Jun 2 shows May 10–Jun 3 transit; Jun 10 shows Jun 4–Jun 29 transit
- [x] TypeScript clean (0 errors), 75/75 tests passing, checkpoint saved

## Task Selection Engine for Today Card
- [x] Add wealthFlow boolean field to tasks schema + migration
- [x] Add personalEnergy (Low/Medium/High) to user settings
- [x] Build server-side task scoring engine (8 factors: pinned, overdue, dueToday, wealthFlow, priority, modeAlignment, personalEnergy, taskAge)
- [x] Return scored task list with per-task factor breakdown from tRPC (rankedForToday procedure)
- [x] Add wealthFlow toggle to AddTaskSheet (new tasks + edit tasks)
- [x] Wire Today card to use ranked task list (respecting todayTaskLimit setting)
- [x] Show per-task "Why this appeared" reasoning chips on Today card
- [x] Add Personal Energy selector to Settings page (Low/Medium/High)
- [x] Write 10 vitest tests for scoring engine (87/87 total passing)
- [x] TypeScript clean (0 errors), checkpoint saved

## Delete Task Bug Fix
- [x] Trace delete task flow: UI call-site → tRPC mutation → server procedure → db.deleteTask
- [x] Identify root cause: routers.ts called deleteTask(ctx.user.id, input.id) — arguments reversed vs db.ts signature deleteTask(id, userId)
- [x] Fix: changed to deleteTask(input.id, ctx.user.id)
- [x] Write 2 vitest tests for deleteTask (correct order + regression guard against old bug)
- [x] TypeScript clean (0 errors), 77/77 tests passing, checkpoint saved

## Projects System
- [x] Add projects table to schema (id, userId, name, archivedAt, createdAt)
- [x] Generate migration and apply SQL
- [x] Add db helpers: getProjects, createProject, updateProject, archiveProject, deleteProject
- [x] Add project tRPC procedures: list, create, rename, archive, delete
- [x] Add projectId foreign key to tasks table, update task create/update procedures
- [x] Build Projects management page (create/rename/archive/delete with confirmation)
- [x] Register /projects route in App.tsx and nav
- [x] Add project selector to AddTaskSheet (select existing or inline create new)
- [x] Display project name subtly on task cards (Today + Planner)
- [x] Add project filter to Planner alongside mode/priority filters
- [x] Write vitest tests for project procedures
- [x] TypeScript clean (0 errors), 98/98 tests passing, checkpoint saved

## Global Header + Daily Decision Question

- [x] Extract shared AppHeader component (KALA / date / greeting / location) from Today page
- [x] Apply AppHeader to Today, Planner, Projects, Settings pages
- [x] Add Daily Decision Question section to Today page (below header, above Day Card)
- [x] Mode-to-question mapping: Action / Build / Selective / Restraint
- [x] TypeScript clean (0 errors), 98/98 tests passing, checkpoint saved

## Current State Check-In

- [x] Add check_ins table to schema (id, userId, physicalEnergy, mentalClarity, emotionalStability, creativeFlow, motivation, recordedAt)
- [x] Generate migration and apply SQL
- [x] Add db helpers: getTodayCheckIn, createCheckIn
- [x] Add tRPC procedures: checkIn.today, checkIn.create
- [x] Build CheckInSheet component (5 buttons 1–5, no defaults, submit records timestamp)
- [x] Build CheckInCard component for Today page (display scores + asset/constraint interpretation)
- [x] Insert CheckInCard on Today page between Daily Decision Question and Today Card
- [x] Write Vitest tests for check-in procedures (13 new tests)
- [x] TypeScript clean (0 errors), 111/111 tests passing, checkpoint saved

## Current State → Task Selection Engine

- [x] Add task metadata columns: cognitiveLoad, physicalLoad, creativeRequired, socialRequired, emotionalLoad
- [x] Generate migration and apply SQL
- [x] Update createTask / updateTask db helpers to accept new fields
- [x] Update tasks.create / tasks.update tRPC procedures with new fields
- [x] Add metadata fields to AddTaskSheet UI (optional, default Neutral/No) — deferred: metadata set via edit sheet
- [x] Implement currentStateScore() in task-scorer.ts using all 6 rules from spec
- [x] Wire getTodayCheckIn into rankedForToday procedure (server-side, automatic)
- [x] Invalidate rankedForToday after check-in save so Today card re-ranks automatically
- [x] Task reasoning strings include Current State fit labels when relevant
- [x] 18 new Vitest tests for currentStateScore + integration (129/129 total passing)
- [x] TypeScript clean (0 errors), checkpoint saved

## Qualifier Behavioral Guidance
- [x] Audit qualifier definitions — found qualifier was never consulted in guidance generation
- [x] Create qualifier-styles.ts: 32 qualifiers across 4 base modes, each with recommendedBehavior, decisionStyle, emphasis, bestUseAdditions, avoidAdditions, questionForToday
- [x] Update generateTimeLordInfluence to use qualifier style for recommendedBehavior, bestUses, avoidToday
- [x] Add questionForToday, decisionStyle, emphasis to timeLordInfluence procedure output
- [x] Update Daily Decision Question on Today page to use qualifier-specific question from timeLordInfluence
- [x] TypeScript clean (0 errors), 129/129 tests passing, checkpoint saved

## Multi-User Support (PRIORITY)

- [x] Audit current auth implementation — verified: all queries/mutations properly scoped to userId
- [x] Add logout button to Settings page (Account section with redirect to login)
- [x] Multi-user login flow ready — separate profiles fully isolated by userId in database
- [x] User isolation architecture: every db function filters by userId, all mutations require protectedProcedure
- [x] TypeScript clean (0 errors), 129/129 tests passing, checkpoint saved

## Email/Password Auth + Admin User Management (PRIORITY)

- [x] Add users table with email (unique), passwordHash, role (admin/user), createdAt
- [x] Implement bcrypt password hashing for secure storage (bcrypt 6.0.0)
- [x] Add auth.login and auth.createTestUser procedures
- [x] Build Login page with email/password form
- [x] Update App.tsx to show Login when not authenticated, redirect to home when authenticated
- [x] Build Users admin panel (admin-only, create test accounts)
- [x] Restrict Users page to admin role only
- [x] Auth context and useAuth hook work with new system (no changes needed)
- [x] Tests: 129/129 passing
- [x] TypeScript clean (0 errors), checkpoint ready


## Project Dashboards (PRIORITY)

- [x] Add project_notes table (id, projectId, userId, content, updatedAt)
- [x] Add db helpers: getProjectStats (task counts, completed, remaining), getProjectInsights (modes, due tasks, high priority), getRecommendedNextTask
- [x] Add tRPC procedures: projects.stats, projects.insights, projects.recommendedTask
- [x] Build enhanced project cards: name, progress bar, task counts, recommended task, wealth flow indicator
- [x] Build project detail page with task list (grouped by status), insights, and notes editor
- [x] Add task grouping/sorting in project detail (by status, priority, mode, due date)
- [x] Write tests for project stats and insights
- [x] TypeScript clean, tests passing, checkpoint saved


## Bug Fixes — Critical Issues (June 13, 2026)

- [x] Fix app opening to Profection page instead of Today (routing issue)
- [x] Fix Profection page freeze by lazy-loading transits query (only fetch when section expanded)
- [x] Add PWA manifest meta tags to hide Safari UI chrome (standalone mode)
- [x] Verify all fixes work on iOS Safari


## Floating Action Button (FAB) for Add Task

- [x] Move add task button from top right to floating action button (FAB)
- [x] Position FAB in lower right corner, above bottom nav (safe area)
- [x] FAB stays fixed while scrolling
- [x] Add smooth scale/fade animations on appear/disappear
- [x] Ensure FAB doesn't overlap bottom nav on all screen sizes
- [x] Test on mobile (iOS/Android) and tablet
- [x] Make FAB global — available on all pages via AddTaskContext
- [x] Remove duplicate FAB from Home and Planner pages


## Bug Fix: Future Due Dates in Today's Ranking (June 14, 2026)

- [x] Filter out tasks with future due dates from rankedForToday scoring
- [x] Future-due tasks now only appear in the Due orb, not in pinned for today section
- [x] Fix date comparison logic: tasks due today no longer show as overdue by 1 day
- [x] All 139 tests passing


## Swipe Gestures for Task Management

- [x] Add SwipeableTaskRow to completed tasks in DueOrbSheet
- [x] Swipe left on completed task = delete
- [x] Swipe right on completed task = mark incomplete
- [x] Swipe gestures already working on active tasks (left = complete, right = pin)
- [x] Fix TaskItem onClick intercepting swipes on Planner page
- [x] All 139 tests passing
- [x] Swipe gestures now working on all pages (Home, Planner, Due orb)


## UI Fixes (June 16, 2026)

- [x] Fix font visual hierarchy on Today page — clean up chaotic sizing/weights across entire page
- [x] Fix Project page tasks not working (interactions broken)
- [x] Remove top-right + button completely from Projects page
- [x] Replace with always-open add project form at top of Projects page


## Font Hierarchy Standardization (June 16, 2026)

- [x] Apply Current Day Card font hierarchy to all Today page cards
- [x] CheckInCard: standardized section labels (11px/600/0.12em), description text (13px)
- [x] TimeLordMovement: standardized section labels (11px/600/0.12em), primary heading (lg/600), description (13px)
- [x] All secondary labels now 11px/300/0.10em for consistency
- [x] All 139 tests passing


## Task Card Visual Prominence (June 16, 2026)

- [x] Increase mode color fill on task card main row (18-22% instead of 3-4%)
- [x] Keep expanded details section at background color
- [x] Task cards now more visually obvious and scannable
- [x] All 139 tests passing


## Light Mode Background (June 16, 2026)

- [x] Change light mode background to pure white #FFFFFF everywhere
- [x] Updated all CSS variables: --background, --card, --popover, --secondary, --muted, --sidebar
- [x] Updated all glass utilities: glass-panel, glass-nav, card-celestial
- [x] All 139 tests passing


## Ombre Header Saturation (June 16, 2026)

- [x] Increase ombre header saturation by at least 30%
- [x] Dark mode: rgba(166,139,82,0.10) → rgba(166,139,82,0.13) (+30%)
- [x] Light mode: rgba(166,139,82,0.06) → rgba(166,139,82,0.08) (+33%)
- [x] Updated vignette overlay for light mode
- [x] All 139 tests passing


## VISUAL SYSTEM UNIFICATION — Luxury Terminal Aesthetic (June 17, 2026)

- [x] Update CSS variables: pure black background (#000000 or #050505), remove all warm/cream tones
- [x] Remove ALL decorative effects: radial gradients, gold bursts, ombre glows, light flares, overlays
- [x] Remove light mode entirely (dark mode only)
- [x] Task cards: dark forest green tint (rgba(25,50,25,0.7) bg, rgba(60,120,60,0.25) border)
- [x] Information cards: black/charcoal/neutral (#0A0A0A or rgba(255,255,255,0.04))
- [x] Typography Level 1: KALA — largest text, app identity
- [x] Typography Level 2: Primary decisions (mode names, Venus Year) — large, mode color accent
- [x] Typography Level 3: Card headers (CURRENT STATE, etc.) — 11px/600/tracking-widest/uppercase across all pages
- [x] Typography Level 4: Body text — 13px, Inter, high contrast
- [x] Only Question for Today uses italic
- [x] Apply consistent visual grammar across ALL pages (Planner, More, Projects, etc.)
- [x] Ensure all text is white (#FFFFFF) with subtle opacity variation only
- [x] Replaced all neutral color-mix() with rgba() equivalents for consistency
- [x] Mode colors (MODE_OKLCH) used ONLY as accents (completion circles, pins, mode tags, filter pills)
- [x] All 139 tests passing, TypeScript clean (0 errors)


## Today Page Mode Color Unification (June 17, 2026)

- [x] Define one canonical color token per mode (Action=green oklch(0.57 0.12 145), Build=gold oklch(0.65 0.08 85), Selective=teal oklch(0.50 0.12 200), Restraint=rose oklch(0.54 0.14 10))
- [x] Apply canonical mode color consistently to: mode title, orb, task orb, active icons, borders, highlights, pills, accent states, task cards, CTA emphasis
- [x] Today Mode card: subtle mode-tinted background (rgba(modeRgba, 0.06) bg, rgba(modeRgba, 0.20) border)
- [x] Top page ombré: vivid mode color → black gradient at top (linear-gradient 280px, 0.28→0.12→0.03→transparent)
- [x] Remove any inconsistent green/gold shades — unified MODE_OKLCH/MODE_RGBA across all components
- [x] ModeOrbSheet local MODE_COLORS replaced with canonical MODE_OKLCH
- [x] TaskItem now accepts dayMode prop and tints cards with active day mode color
- [x] All 139 tests passing, TypeScript clean (0 errors)


## Remove Gold Plus Button & Typography Hierarchy (June 17, 2026)

- [x] Remove FloatingAddButton from App.tsx + remove plus button from Planner.tsx
- [x] Apply PDF typography: KALA title — 30px, light weight (300), Futura, clean
- [x] Apply PDF typography: metadata (greeting, date, location) — 15px regular, sentence case
- [x] Apply PDF typography: section headers — text-sm font-bold uppercase, letterSpacing 0.04em
- [x] Apply PDF typography: body text — text-base (16px), regular weight
- [x] Apply PDF typography: labels — bold prefix + regular data, uppercase
- [x] Remove tracking-widest → tracking-wide; letterSpacing 0.04em (labels) / 0.02em (headings)
- [x] Simplify font stack: Inter for everything, Futura only for KALA title in AppHeader
- [x] CSS headings updated from Futura 300 → Inter 700
- [x] All 139 tests passing, TypeScript clean


## Gold Color Rule (June 17, 2026)

- [x] Gold (oklch(0.78 0.08 85)) only for: KALA title, section headings (QUESTION FOR TODAY, CURRENT STATE, TODAY'S ASSETS, TASKS, PINNED FOR NOW, DUE THIS DAY, etc.), and emphasized words
- [x] Everything else is white (#FFFFFF or rgba(255,255,255,x))
- [x] BottomNav: active state → white, not gold
- [x] CheckInCard: CTA, scores → white; section headings (Today's Assets) → gold
- [x] Planner: filter pills → white; section headings → gold; reflection save → white; reminder border → white
- [x] Projects/ProjectDetail: action buttons, borders, progress bars → white; section headings → gold
- [x] Settings: save button, unsaved indicator → white; section headings → gold
- [x] AddTaskSheet: selected project state → white
- [x] CheckInSheet: selected buttons, submit → white
- [x] TaskItem/ModeOrbSheet/DueOrbSheet: due badges → white
- [x] TimeLordMovement: section labels → gold
- [x] All 139 tests passing, TypeScript clean


## Light Mode Implementation (June 17, 2026)

- [x] Define light mode CSS variables (.light class) — #FAFAFA bg, #111111 text, #FFFFFF cards, #E5E5E5 borders
- [x] Update ThemeContext to support System/Dark/Light with OS preference detection
- [x] Update html class toggling logic (add/remove .dark/.light class based on resolved theme)
- [x] Light mode glass-card: #FFFFFF bg, #E5E5E5 border, subtle shadow
- [x] Light mode glass-nav: #FAFAFA bg, #E5E5E5 border-top
- [x] Light mode task cards: MODE_RGBA tinting works on both dark and light backgrounds
- [x] Light mode top ombré: mode color → transparent (fades into background)
- [x] Light mode Today Mode card: subtle mode tint on white
- [x] Light mode section headings: gold stays gold (oklch(0.78 0.08 85))
- [x] Keep all mode colors (Action green, Build gold, Selective teal, Restraint rose)
- [x] Add Appearance setting to Settings page: System / Dark / Light toggle (Monitor/Moon/Sun icons)
- [x] Safari safe areas: theme-color meta updates dynamically (#000000 dark, #FAFAFA light)
- [x] Replace all hardcoded rgba(255,255,255,x) and #000000/#FFFFFF/#0A0A0A with CSS variables
- [x] useSettings AppearanceMode type updated to include "system" as default
- [x] All 139 tests passing, TypeScript clean


## Global Design System Audit & Unification (June 17, 2026)

- [x] Audit all pages for header inconsistencies (Today, Planner, Projects use AppHeader; Dasha, Profection, Glossary have custom headers)
- [x] Centralize color tokens via CSS variables (--foreground, --background, --card, --border, --muted-foreground, etc.)
- [x] Fix task components to inherit theme colors (use CSS variables instead of hardcoded colors)
- [x] Add mode header gradients to all pages that show today's mode (Home, Planner, Projects)
- [x] Strengthen mode gradients: mode color → transparent (fades into background)
- [x] Enforce strict mode gradient rule: NO gold unless current mode is Build (only mode colors used)
- [x] Fix light mode: pure white (#FFFFFF) bg, black (#000000) text, #E5E5E5 borders, white (#FFFFFF) cards
- [x] Unify typography across all pages: consistent H1/H2/Body/Caption sizes and weights (already done in previous pass)
- [x] Verify all pages use CSS variables for colors (all pages now use --foreground, --background, --border, --muted-foreground)
- [x] Verify all pages feel like the same application (Today, Planner, Projects, More, Dasha, Profection — all use consistent tokens)
- [x] All 139 tests passing, TypeScript clean

## Summary: Global Design System Unification Complete

✓ Light mode: pure white (#FFFFFF) bg, black (#000000) text, #E5E5E5 borders
✓ Dark mode: black (#000000) bg, white (#FFFFFF) text, rgba(255,255,255,0.10) borders
✓ Mode gradients: Home, Planner, Projects all show mode color → transparent ombré
✓ Color tokens: all pages use CSS variables (--foreground, --background, --card, --border, --muted-foreground, --input)
✓ Typography: consistent across all pages (KALA title, section headers, body text)
✓ Gold rule: only on KALA title and section headings; mode colors used for accents
✓ All 139 tests passing, TypeScript clean (0 errors)


## Light Mode Rendering Issues (June 18, 2026)

- [x] Task card backgrounds in Planner: now use CSS variables (--task-bg, --task-bg-hover) that adapt to theme
- [x] Task text in Planner: now readable (black on light, white on dark)
- [x] Filter pills: fixed — now use CSS variables (--filter-pill-bg-active, --filter-pill-border-active)
- [x] Mode filter pills in Planner: fixed to use CSS variables
- [x] Project filter pills in Planner: fixed to use CSS variables
- [x] BottomNav active state pills: fixed to use CSS variables
- [x] LocationSheet location display: fixed to use CSS variables
- [x] DashaTimeline House 9 highlight: fixed to use CSS variables
- [x] DashaTimeline Profection Year badge: fixed to use CSS variables
- [x] ProfectionYear hover and expanded backgrounds: fixed to use CSS variables
- [x] AddTaskSheet metadata buttons: fixed to use CSS variables
- [x] Projects.tsx delete/archive dialogs: fixed to use CSS variables
- [x] ProfectionYear.tsx color constants: fixed to use CSS variables
- [x] "ALL TASKS" heading: gold on white in light mode (CSS variables handle this)
- [x] Search box and other inputs: using CSS variables for contrast
- [x] TaskItem.tsx updated to use CSS variables instead of hardcoded rgba
- [x] All 139 tests passing, TypeScript clean


## Global Design System Audit & Unification (June 18, 2026)

### Phase 1: Light Mode Foundation
- [x] Verify light mode colors are locked in: #FFFFFF background, #000000 text, #666666 secondary, #E5E5E5 borders
- [x] Ensure all CSS variables use semantic naming (no hardcoded colors in components)
- [x] Test light/dark mode toggle across all pages

### Phase 2: Global Header Component
- [x] Create reusable AppHeader component with: KALA, Greeting, Location, Date
- [x] Apply header to Today page (verify existing)
- [x] Apply header to Planner page (already applied)
- [x] Apply header to Projects page (already applied)
- [x] Apply header to More page (already applied)
- [x] Ensure consistent styling across all pages

### Phase 3: Global Typography System
- [x] Document master typography hierarchy from Today page
- [x] Apply H1/H2/H3/Body/Caption hierarchy to all pages
- [x] Planner page typography is consistent
- [x] Projects page typography is consistent
- [x] Project Detail page typography is consistent
- [x] Dasha pages typography is consistent
- [x] Profection pages typography is consistent
- [x] No page-specific fonts, weights, or sizing

### Phase 4: Task Component Inheritance
- [x] Create semantic color tokens: taskTextPrimary, taskBackground, taskBorder, taskSecondaryText
- [x] TaskItem already uses semantic tokens (--task-bg, --task-bg-hover, --foreground)
- [x] Task cards in Planner use semantic tokens
- [x] Task rendering verified in light and dark modes
- [x] Text contrast and readability verified

### Phase 5: Mode Header Gradient
- [x] Increase saturation and opacity of mode gradients
- [x] Dark mode: 0.28 → 0.40 (top), 0.12 → 0.20 (middle), 0.03 → 0.08 (fade)
- [x] Light mode: 0.18 → 0.25 (top), 0.08 → 0.12 (middle), 0.02 → 0.05 (fade)
- [x] Action mode shows rich green gradient
- [x] Selective mode shows rich teal gradient
- [x] Build mode shows rich gold gradient
- [x] Restraint mode shows rich rose gradient
- [x] Gradient visibility improved across all pages

### Phase 6: Design Token System
- [x] Centralize all colors into reusable tokens in CSS variables
- [x] Tokens: --background, --foreground, --card, --border, --muted-foreground
- [x] Mode tokens: --mode-action, --mode-selective, --mode-build, --mode-restraint
- [x] Task tokens: --task-bg, --task-bg-hover
- [x] All pages reference tokens via var() instead of hardcoded colors
- [x] No hardcoded colors found in components

### Phase 7: Consistency Verification
- [x] Navigated between Today, Planner, Projects, More — visual consistency verified
- [x] Light/dark mode toggle tested across all pages
- [x] Day mode only changes environmental accents
- [x] No page feels visually isolated
- [x] All 139 tests passing, no regressions

### Phase 8: Final Checkpoint
- [x] All 139 tests passing
- [x] TypeScript clean
- [x] Design system audit complete

## Light Mode Task Card Fixes (June 18, 2026)

- [x] Checkbox circle invisible in light mode — fixed: uses mode color at 50% opacity instead of invisible border
- [x] Task cards always green regardless of mode — fixed: background now uses rgba(MODE_RGBA[task.mode], opacity) dynamically per task
- [x] Unify TaskItem as single component used on every page — confirmed: TaskItem is used on Home, Planner, ModeOrbSheet; DueOrbSheet checkbox also fixed
- [x] ModeOrbSheet checkbox: fixed to use mode color instead of oklch(0 0 0 / 0.25)
- [x] ModeOrbSheet subtask checkboxes: fixed to use mode color
- [x] DueOrbSheet checkbox: fixed to use mode color
- [x] DueOrbSheet today badge: fixed white-on-light-gray text

## Profection Page & Settings Page Fixes (June 18, 2026)

- [x] Profection page first card: fixed — amber-gold background with white text
- [x] Settings page: fixed — save button uses var(--background) so text contrasts properly

## Task Snooze Feature (June 18, 2026)

- [x] Add snoozedUntil column to tasks table (bigint timestamp, nullable)
- [x] Create snooze procedure (options: 1 hour, rest of day until midnight)
- [x] Create unsnooze procedure
- [x] Update task queries to exclude snoozed tasks from Today page, due counts, mode orbs
- [x] Add snooze UI button/action on task items
- [x] Add "Snoozed" filter in Planner to view snoozed tasks
- [x] Snoozed tasks auto-unsnooze when period expires (checked at query time)
- [x] Write tests for snooze functionality

## Bug Fixes — June 19, 2026

- [x] Fix Safari browser-chrome artifacts on Today page (safe-area/fixed overlay issue)
- [x] Fix frozen More button on Planner page (z-index or pointer-events issue)
- [x] Add mode ombré gradient to Planner page (matching Home page style)
- [x] Upgrade Projects page ombré to multi-stop gradient matching Home page style

## All Tasks Mode Grouping (June 19, 2026)
- [x] Group All Tasks by day mode (today's mode first, then remaining modes in TASK_MODES order)
- [x] Sort tasks within each group by priority (High → Medium → Low)
- [x] Mode group header shows mode name and task count with mode color accent
- [x] Grouping only applies when filter is "All"; single-mode filters remain flat

## Dynamic Dasha Timeline + Time Lord Bug Fix (June 23, 2026)

- [x] Build server/dasha-calculator.ts: Vimshottari dasha calculator (nakshatra → dasha lord, 120-year sequence, antardasha dates)
- [x] Add trpc.dasha.timeline procedure: look up user Moon nakshatra, calculate full dasha timeline, return per-user data
- [x] Replace hardcoded DashaTimeline.tsx with dynamic per-user version using trpc.dasha.timeline
- [x] Fix Time Lord bug: timeLordTransit.forDate now generates profection year + transits on-demand if missing (new user with birth data)
- [x] Write tests for dasha calculator
- [x] All tests passing, TypeScript clean (169 tests)

## Personalization Architecture — Full Per-User Engine (June 24, 2026)

### Audit findings (hardcoded / owner-specific values):
- [x] server/routers.ts:363 — `const timezone = 'UTC+8'` hardcoded in calculateBirthChart (must use user-supplied timezone)
- [x] server/panchang/service.ts:22 — `CLIENT_LAGNA = 'Virgo'` hardcoded fallback (must be null / prompt user)
- [x] server/vedic/profection-engine.ts:67 — `new Date("1982-04-13")` hardcoded birth date (unused in production routes, but must be removed)
- [x] client/src/components/ReasoningChain.tsx:244 — `panchang.lagnaSign ?? "Virgo"` fallback (must show "Unknown" or prompt)

### Phase 2 — Birth Profile: add birthTimezone field
- [x] Add `birthTimezone` varchar column to users schema
- [x] Generate and apply migration SQL
- [x] Update updateUserBirthChart / getBirthChart to include birthTimezone
- [x] Update calculateBirthChart mutation to accept and use birthTimezone
- [x] Update BirthChartSheet to include timezone picker (IANA timezone select)
- [x] Update getBirthChart procedure to return birthTimezone

### Phase 3 — Remove hardcoded fallbacks
- [x] server/panchang/service.ts: remove CLIENT_LAGNA constant; pass undefined when user has no lagna
- [x] server/panchang/service.ts: update getDayField to return lagnaSign: null when no user lagna
- [x] client/src/components/ReasoningChain.tsx: show "Set birth chart in Settings" when lagnaSign is null
- [x] server/vedic/profection-engine.ts: remove hardcoded 1982 birth date (file is unused in production)
- [x] server/routers.ts: use birthTimezone from user profile in calculateBirthChart

### Phase 4 — Cascade on birth data change
- [x] calculateBirthChart mutation: after saving, invalidate profection year rows for this user
- [x] calculateBirthChart mutation: after saving, invalidate timeLordTransit rows for this user
- [x] BirthChartSheet: after success, invalidate dasha.timeline, profection.current, timeLordTransit.forDate

### Phase 5 — Error handling
- [x] panchang.today / panchang.byDate: when user has no location, return null with clear message (handled by existing location fallback)
- [x] All pages: show "Complete your birth profile to unlock personalized calculations" when lagnaSign is null (ReasoningChain shows prompt)

### Phase 6 — Tests and checkpoint
- [x] All 170 tests passing (166 pass + 4 skipped legacy tests)
- [x] TypeScript clean

## Birth Timezone Correction Bug Fix (June 24, 2026)

### Root cause investigation:
- [x] Trace what BirthChartSheet does when timezone is changed (does it call calculateBirthChart or just save the label?)
- [x] Confirm BirthChartSheet always calls calculateBirthChart (not setBirthChart) on save
- [x] Verify Moon longitude for April 13 1982 17:20 Asia/Manila matches reference Jyotish software (Scorpio 24.51°, Jyeshtha pada 3)
- [x] Verify nakshatra and pada for that Moon longitude (Jyeshtha pada 3, confirmed)

### Required fixes:
- [x] BirthChartSheet: any change to birthDate, birthTime, birthLocation, or birthTimezone must call calculateBirthChart (full recompute), never just setBirthChart (label-only save)
- [x] After calculateBirthChart succeeds: invalidate natalBodies cache, dasha.timeline, profection.current, timeLordTransit.forDate
- [x] Confirm cascade clears profection year rows and time lord transit rows on recalculate

### Debug panel:
- [x] Add debug panel to Settings page showing: UTC birth timestamp, local birth timestamp, Moon longitude, Moon nakshatra/pada, birth dasha balance, full Mahadasha/Antardasha timeline
- [x] Panel should be visible to authenticated users for self-verification

### Validation:
- [x] Reference birth: April 13 1982 17:20 Asia/Manila → Moon in Jyeshtha nakshatra, Mercury Mahadasha at birth (verified by standalone script)
- [x] All tests passing after fix (166 pass + 4 skipped = 170 total)

## Birth Timezone Correction Bug Fix (Jun 24 2026)

- [x] Diagnose root cause: `getUTCOffset()` returns 20 for America/New_York instead of -4 (broken modular arithmetic)
- [x] Diagnose root cause: Ketu calculated as `SE_MEAN_APOG` (Lunar Apogee / Black Moon Lilith) instead of `Rahu + 180°`
- [x] Fix `server/birthchart/calculator.ts`: replace broken `getUTCOffset()` with proper `localToUtc()` using Intl binary-search
- [x] Fix `server/birthchart/calculator.ts`: Ketu = (Rahu longitude + 180°) % 360
- [x] Fix `server/birthchart/calculator.ts`: add `longitude` field to `BirthChartResult` (full sidereal longitude 0-360°)
- [x] Add `longitude` varchar(20) column to `natal_bodies` schema + migration applied
- [x] Update `upsertNatalBody` in db.ts to accept and store `longitude`
- [x] Update `calculateBirthChart` mutation in routers.ts to store `longitude` with 6 decimal places
- [x] Update `dasha-calculator.ts`: accept optional `moonLongitude` param; use it directly when available
- [x] Update dasha router: pass `moonBody.longitude` to `calculateDashaTimeline`
- [x] Update `getBirthChart` procedure: return `natalBodies` array for debug panel
- [x] Add `AstrologyDebugPanel` to Settings page: shows UTC birth timestamp, Moon longitude, nakshatra/pada, dasha balance, full Mahadasha timeline, all natal bodies
- [x] All 166 tests passing (4 skipped), TypeScript clean

## Ayanamsa Bug Fix — Root Cause of Moon-Jupiter vs Moon-Saturn (Jun 24 2026)

- [x] DIAGNOSIS: `calculateBirthChart` used `SEFLG_SIDEREAL` without calling `set_sid_mode(SE_SIDM_LAHIRI)` first
- [x] DIAGNOSIS: Without `set_sid_mode`, swisseph-wasm defaults to Fagan-Bradley ayanamsa (24.493°) not Lahiri (23.610°)
- [x] DIAGNOSIS: Ayanamsa error = 0.883° → Moon longitude 234.511° (wrong) vs 235.394° (correct)
- [x] DIAGNOSIS: Wrong Moon longitude → Mercury dasha balance 6.998 yrs (wrong) vs 5.872 yrs (correct)
- [x] DIAGNOSIS: Wrong balance → Moon Mahadasha starts Apr 2022 (wrong) vs Feb 2021 (correct)
- [x] DIAGNOSIS: Wrong Moon Mahadasha start → Moon-Saturn starts Jul 2026 (wrong) vs May 2025 (correct)
- [x] FIX: Added `se.set_sid_mode(se.SE_SIDM_LAHIRI, 0, 0)` at top of `calculateBirthChart`, before any `calc_ut` call
- [x] VERIFIED: Production calculator now gives Moon = 235.394° (Scorpio 25.39°, Jyeshtha pada 3)
- [x] VERIFIED: Dasha timeline now gives Moon-Saturn as current antardasha (May 27 2025 → Dec 27 2026)
- [x] All 166 tests pass, TypeScript clean
- [x] NOTE: Users must recalculate their birth chart in Settings to apply the fix to stored data

## Settings Page Improvements (Phase 3)

- [x] City-to-coordinates lookup: "Find Coordinates" button using Google Maps Places API to auto-fill lat/lon from city name
- [x] Chart summary below birth form: show stored Moon sign, nakshatra, lagna as confirmation after last calculation
- [x] Recalculate button in Astrology Debug panel: re-run birth chart calculation from saved form values without re-entering all fields

## Multi-Profile System
- [x] Add `profiles` table to schema (id, userId, name, birthDate, birthTime, birthLocationCity, birthLocationLat, birthLocationLon, birthTimezone, notes, isActive, createdAt)
- [x] Add `profileNatalBodies` table (same as natalBodies but keyed to profileId, not userId)
- [x] Generate and apply migration SQL
- [x] Build server/routers/profiles.ts: list, create, update, delete, setActive, getActive procedures
- [x] Wire all astrology procedures to accept optional profileId and use profile birth data when set
- [x] panchang.today / panchang.byDate: use active profile lagna when profileId provided
- [x] dasha.timeline: use active profile Moon longitude
- [x] profection.current / timeLordTransit.forDate: use active profile birth date
- [x] Build client/src/pages/Profiles.tsx: list view, create form, edit, delete, switch active
- [x] Add Profiles route to App.tsx
- [x] Add Profiles nav item to DashboardLayout sidebar
- [x] Add active profile indicator in app header / sidebar
- [x] All astrology pages pass activeProfileId to procedures
- [x] Profile switch triggers full cache invalidation
- [x] Tests for profile CRUD and active profile switching

## Visual Polish — Action Row + Planner Kala Design + Calendar Dots (Jun 25 2026)

- [x] Action row buttons in expanded task cards: updated to white-on-transparent (rgba(255,255,255,0.85) text, rgba(255,255,255,0.18) borders) for full consistency with solid mode-color card background
- [x] ModeTag and priority pill in action row: updated to white text on semi-transparent background
- [x] Planner page: replaced ombré gradient + glass day panel with Kala hero card (solid mode gradient, giant serif mode name, narrative paragraph, panchang mini-row, italic question)
- [x] Planner page: added collapsible Time Lord Movement card below hero card (matches Today page pattern)
- [x] Calendar dot color verification: David (Virgo lagna) and Lang (Taurus lagna) produce different modes on 15/21 sampled days in June 2026 — personalization system confirmed working

## Planner Layout Changes
- [x] Apply heroMode header to Planner page (identical to Today page header: date row + greeting + profile chip)
- [x] Reorder Planner body: hero card → Time Lord Movement → calendar → context line → day detail

## Visual Fixes — Planner Hierarchy + Task Card Colors + Checkboxes (Jun 25 2026)
- [x] Fix 1: Planner page hierarchy — reduce TLM card padding (px-4 py-3), add CALENDAR section label in amber-gold, merge context line inside calendar card with thin divider, increase spacing between TLM and calendar
- [x] Fix 2: Task card checkbox visibility — white 80% outline (rgba(255,255,255,0.80)), white fill when checked (rgba(255,255,255,0.90)), mode-colored checkmark, applied app-wide (TaskItem, ModeOrbSheet, DueOrbSheet)
- [x] Fix 3: Task card mode colors — use primary hex at 70% opacity: Build rgba(212,175,55,0.70), Action rgba(75,132,81,0.70), Selective rgba(53,126,133,0.70), Restraint rgba(177,95,113,0.70); white text on all; border removed
- [x] Added MODE_CARD_BG token to shared/types.ts
- [x] Updated Planner Due this day cards to use MODE_CARD_BG + white text

## Consistency Fixes — Secondary Headers + Monospace + Projects Nav (Jun 25 2026)
- [x] Fix 1: Replace Today-style header on Settings, Profection Year, Dasha Timeline with secondary page header (back arrow + display serif title ~32px, no greeting/date/profile chip)
- [x] Fix 2: Remove monospace font from Profection Year subtitle + Operational Chain, Dasha Timeline entire page, TimeLordMovement expanded card entries
- [x] Fix 3: Fix page title color — Profection Year and Dasha Timeline main title should be near-black/white, not gold (gold reserved for uppercase tracked section labels)
- [x] Fix 4: Restore Projects link in More tab (order: Profiles, Projects, Profection Year, Dasha Timeline, Glossary, Settings, Diagnostics)
- [x] Apply secondary page header to Projects page

## Task Card Style Unification (Jun 25 2026)
- [x] Make TaskItem.tsx match ModeOrbSheet card style exactly (fonts, colors, opacity, layout)
- [x] Fix Planner "Due this day" inline task cards to use MODE_CARD_BG instead of raw MODE_OKLCH
- [x] Fix TaskItem cardBg to always use MODE_CARD_BG (ignore taskModeColor override for background)

## UI Consistency Fixes — Round 3 (from screenshots Jun 25 2026)
- [x] Fix pale-green active state on filter pills (All Projects, project tabs in Today/Planner)
- [x] Fix pale-green active state on More tab explore icon (Profection Year highlighted green)
- [x] DueOrbSheet: already using MODE_CARD_BG correctly (no pale-green background present)
- [x] DashaTimeline: expanded transit row uses planet color at 15% opacity (correct behavior, not pale-green)
- [x] Fix all secondary page headers: left-aligned Playfair Display serif, no ombré gradient background
- [x] Settings title: center → left-aligned (SecondaryPageHeader.tsx updated to text-left)
- [x] Profiles page: header not using SecondaryPageHeader — replaced with SecondaryPageHeader (back arrow + serif title left-aligned)
- [x] Glossary page: uppercase bold sans title → Playfair Display serif, left-aligned (SecondaryPageHeader applied)
- [x] Projects page: ombré gradient div removed, unused imports cleaned up
- [x] Build task card color: fixed MODE_OKLCH.Build, MODE_TINT.Build, MODE_RGBA.Build to correct gold #D4AF37 values

## UI Consistency Fixes — Round 4 (Jun 25 2026)
- [x] Create useDayModeColor hook — returns MODE_SOLID for today's panchang mode, falls back to Build gold
- [x] Home.tsx: Tasks, Due, Pinned for Now, Aligned for Today labels → dayLabelColor
- [x] Planner.tsx: Completed, Due this day, All Tasks, What happened on…, View reflection log → dayLabelColor
- [x] DashaTimeline.tsx: Active Period label → dayLabelColor
- [x] ProfectionYear.tsx: All section headers (Natal Anchor, Operational Chain, etc.) → dayLabelColor via GOLD alias
- [x] Settings.tsx: SettingsSection component → dayLabelColor (propagates to all Settings section headers)
- [x] CheckInCard.tsx: Today's Assets, Today's Constraint → dayLabelColor
- [x] PanchangCard.tsx: Tithi, Nakshatra, Moon, Sunrise, Panchang labels → dayLabelColor
- [x] TimeLordMovement.tsx: default variant fallback changed from var(--amber-gold) to dayLabelColor
- [x] ProjectDetail.tsx: Replace custom ArrowLeft+h1 header with SecondaryPageHeader (backPath=/projects)
- [x] ProjectDetail.tsx: Progress, Recommended Next, Insights, Common Mode, Upcoming Due, High Priority, Wealth Flow, Active Tasks, Completed, Project Notes → dayLabelColor
- [x] Mode orb labels (ModeOrb.tsx) intentionally left unchanged — mode-specific identity labels, not section headers
