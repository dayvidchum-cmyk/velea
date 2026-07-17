# VELEA SYSTEM MAP

> For AI sessions: read THIS instead of exploring the repo. One line per node; grep a
> section, then open only the file you need. Update this map when architecture changes
> (new engine/table/router/page/surface) — it is only worth its tokens if it stays true.
> Stack: tRPC + Drizzle/MySQL + React/Vite/wouter PWA; Anthropic Sonnet for prose.
> Deploy: git push main → Railway → velealor.com. Version = client/src/lib/version.ts
> APP_VERSION + client/public/sw.js CACHE, bumped in lockstep every release.

## SPINE (data flow)
birth data (profiles) → chart calc (server/birthchart/calculator.ts + vedic/natal-chart-engine.ts)
→ RESEARCH STORE at profile creation (vedic/house-research.ts Steps 1-14 + shadbala/vimshopak/avashtas/yoga-detect → profile_research; dasha-tree → profile_dasha_periods; convergence.ts → profile_convergence)
→ deterministic day/time engines (panchang/, sky/, vedic/day-filter, panchapakshi/, profection/, meridian/)
→ narrative input (narrative/input-builder.ts) → prompts.ts tails → generate.ts (Claude) → narrative_cache
→ client pages via tRPC routers. LLM only VOICES; engines LOCATE (velea-the-point).

## LAWS (operational, all enforced in code)
- CACHE LAW: hash only day-stable input (dayStableHash); `today` NEVER hashed (tense anchor passes it prompt-only). SALTS: SURFACE_VERSION in prompts.ts — batch bumps, each bump = fleet regeneration cost.
- DOOR LAW: no reading generates without its own tap; opens only PEEK (peek param → service short-circuits). Upsell + future readings ALWAYS gated. Pattern: getAtlasReadCached(...,peek) + armedTheme in LifeAtlas.tsx.
- TENSE LAW: every span-read input carries {chapter/window dates, stance past|current|future}; four tails carry the retrospect rule (v655).
- CACHE-WRITE LAW: upsertNarrativeCache catches write failures — a billed reading is never killed by its save (v653; cacheDate was VARCHAR(10), widened 64).
- BLACK BOX: getRecentGenErrors in narrative/generate.ts records gen failures + silent no-tool-block nulls + ALL thrown tRPC procedure errors (adapter onError in _core/index.ts). Admin Users page: Test LLM / Test reading / Recent errors.
- NO AUTO MIGRATE: schema changes = idempotent scripts run by David's hand (DATABASE_URL in his terminal). drizzle-kit push is BANNED.
- USE THE FILE: brand marks render David's own PNGs as CSS masks, never redrawn.
- Engine-only commits ride versioned releases (bare pushes restart Railway → error flash).

## SERVER ENGINES
### server/sky/ — the sky now/over time
- current-sky.ts — all planets now; getCurrentSky, computeGoldenDays
- golden-moment.ts — collective slow-planet weather → verdict; feeds task-scorer
- month-events.ts — month's big beats per chart | eclipses.ts — real eclipses, sidereal
- retrograde-phase.ts — graded rx state per planet (RX_WINDOWS mercury..saturn), planetRxCycle
- arc.ts — forward trajectory (Road Ahead) | time-of-day.ts — dawn/day/dusk/night bucket for Stage art
### server/vedic/ — classical engine (K&F canon)
- natal-chart-engine.ts (chart) · profection-engine.ts · dasha-tree.ts (birth→120y all levels)
- convergence.ts — Step-15 timeline; CONVERGENCE_ENGINE_VERSION=convergence-v2-heavylord (Meridian-seated lord ties count double, mcLon threaded)
- windows.ts — mergeThemeWindows(convergence rows)→ThemeWindow{from,to,peak,bigKnot,era}
- year-rank.ts — ranks solar year days (crown ladder) | day-filter.ts — muhurta classification (7 natures × 5 tithi families; replaced the 4 modes)
- day-frame.ts — deterministic day read dispatcher | knots.ts — legacy knot scorer (being retired per lens-router)
- shadbala.ts · vimshopak.ts · vargas.ts · ashtakavarga.ts · avashtas.ts · bhava-chalit.ts · dignity.ts · aspects.ts · natal-states.ts
- house-research.ts — Steps 1-14 all houses; RESEARCH_ENGINE_VERSION=research-v2
- research-store.ts — persists/reads research+dasha+convergence; getStoredResearch (version-gated), getDashaChainAt, storeConvergence
- melana.ts — combined 2-chart engine (canon-corrected v640; cites canon/melana.json) | life-areas.ts — area routing | varshaphala.ts — solar return | meaning-engine.ts · yoga-detect.ts
### server/vedic/canon/ — cited JSON tables + METHOD.md (the Lens Router: time frame picks the system — day→Tara Bala, moment→Prasna, event→Step-15, year→Varshaphala, clock→Vimshottari)
- yogas.json is STATICALLY IMPORTED (routers.ts + narrative/service.ts) — bundled; never readFileSync canon in prod
### server/panchang/ — daily almanac + mode
- astronomy.ts (calcPanchang) · service.ts (getDayField) · interpreter.ts (calculateFinalMode + applyWeatherGate) · crown.ts (crown days, personalDayForDate) · hora.ts · karana.ts · dignity.ts · affliction.ts · auspiciousness.ts · modifier-config.ts · tz-offset.ts
### server/panchapakshi/ — Time Master (five birds): compute.ts · yamas.ts · apahara.ts · golden-hour.ts (bird∧hora fusion) · tables/sequences/activities
### server/profection/ — calculator.ts · interpreter.ts · transit-calculator.ts · router.ts · transit-router.ts
### server/layers/ — pressure soft-scoring: index.ts getCurrentLayers (time-lord-theme + transit-pressure)
### server/meridian/activations.ts — grahas on natal MC/IC; computeMeridianRead
### server/narrative/ — LLM surfaces
- input-builder.ts buildNarrativeInput (5 blocks; opts: lifeArea/areaFocus/eclipseArc/rxArcPlanet/monthArc)
- prompts.ts — BASE_PROMPT + 17 tails + SURFACE_VERSION salts + MODEL
- generate.ts — callGuarded (tool-forced, guard retries, machinery scrub) + per-surface generators + probeLLM + black box
- service.ts — cache-aware getters (getXReadCached): cache row → (peek?) → singleFlight generate → upsert; tenseOf/todayIso tense anchor
- router.ts — narrativeRouter (gates: chapterReader feature, begun-chapters-free, antar past+current only)
- day-read-signals.ts — deterministic precision layer for pick-a-date
### top-level server/
- routers.ts — root appRouter (most namespaces inline) | routers/{profiles,arc,dasha}.ts
- task-scorer.ts — scoreTasks (mode/layers/golden/circles handshake) | feature-flags.ts — hasFeature; FeatureKey: yearPage houseReader chapterReader momentRefresh secondProfile lifeAtlas specialReadings (defaults: admins for premium)
- db.ts — drizzle handle + all helpers (upsertNarrativeCache w/ catch, listYogaReadKeys, task CRUD w/ circles JSON)
- astrology-subject.ts — resolveAstrologySubject (whose chart) | dasha-calculator.ts — calculateDashaTimeline
- _core/ — trpc, context, index.ts (express + tRPC onError→black box + marketingPages), rateLimit, oauth, vite

## DATA (drizzle/schema.ts — prod tables created by HAND-RUN scripts; schema.ts can drift from prod: compare information_schema when inserts fail)
users · sessions · tasks (circles TEXT json, kind, lifeAreas) · panchang · reflections · systemPrompts · subtasks · natalBodies(legacy) · profectionYears · timeLordTransits · projects · projectNotes · checkIns · profiles · profileNatalBodies · narrativeCache (profileId+surface+cacheDate slug unique; surface≤24 cacheDate≤64) · horoscopes (immutable purchases) · waitlist · referralCodes · referralRedemptions · profileResearch (MEDIUMTEXT) · profileDashaPeriods (level 1-5, maha..prana, ~70k rows/profile) · profileConvergence (per pratyantar span, themes JSON)

## API (tRPC namespaces)
system · profiles (list/create/setActive/calculateChart/getSubject…) · referrals · auth (login/register + admin: listUsers, recomputeUserChart, repairAllCharts, llmStatus, llmRecentErrors, testReadingForUser, createProfileUser) · tasks (rankedForToday = the big ranker) · settings (+panchang: today/byDate/byMonth/whyToday/currentLayers) · systemPrompts · subtasks · projects · reflections · meridian.current · crown (forMonth/forYear/dignities) · atlas (windows/themeRead[peek]/windowRead) · combined.read · features (mine/all/set) · masterMode (access/today/hora) · horoscope (access/yogasList/yogaRead/list/get/reveal/eclipseSeason/planetRx/mercuryRx/month/saveNotes) · celestial.today · sky (monthMarks/yearMarks[≤400d]/current/stage/goldenDays) · checkIn · diagnostics · narrative (glance/deepRead/dayRead/cast/houseRead/dashaRead/tlWindowRead/chapter/list/lockStatus/setLock/currentTransits) · profection · timeLordTransit · arc.forward · dasha.timeline

## CLIENT (client/src/pages; nav = BottomNav 6 tabs)
- Planner.tsx `/` Today — hero (collapsed; day-story gated on heroOpen), coins calendar, ranked tasks, check-in
- ProfectionYear.tsx `/profection` Chart — Time Lord tab: wheel, TL path windows, Road Ahead (veiled), deep read (readOpen-gated)
- Astrology.tsx — Natal/Dasha detail (chapter reader, antar shelf) | Horoscope.tsx `/horoscope` Readings — hub: today/year expanders, yogas shelf (nameplates + free taste), life-area shelves, eclipse/mercuryRx/slowReviews/month/combined cards, pick-a-date calendar
- LifeAtlas.tsx `/atlas` — decade-shelved theme windows; peek+door; season datelines are doors
- YearCalendar.tsx `/year` · Projects.tsx · ProjectDetail.tsx · Glossary.tsx · Settings.tsx · Profiles.tsx · About.tsx · ReadingsArchive.tsx · ReflectionHistory.tsx · Login.tsx · Users.tsx `/admin/users` (diagnostics buttons) · AdminPrompts.tsx · Diagnostics.tsx
- lib/stale-guard.ts — on foreground: compare build vs server sw.js, reload once if behind (stale-PWA fix)

## MARKS (all David's files as CSS masks — use-the-file law)
VeleaMark (arc = the app; loader sweep) · GateMark (/gate-mark.png = threshold/premium; default 18, never tiny) · CrownMark (/crown-mark.png = crown days) · PlanetMark (/planet-marks/*.png, 7 glyphs + node inks) · VeleaLorMark (bullseye = golden hour ONLY) · OctagramMark (knots/Lakshmi) · DiamondMark (era) · ProseCard (white-prose gradient reading register) · VeleaLoader (sweeping arc, currentColor dilation)
Grammar: arc=app · gate=threshold · crown=day apex · bullseye=golden moment. Full ceremonial gate art = merch/crest (see velea-time-gate-doctrine memory).

## NARRATIVE SURFACES (SURFACE_VERSION keys)
glance · deep · deep_full · chapter · day_read · cast · house_read · dasha_read · atlas_read · window_read · yoga_read · life_area · planet_rx · combined_read · tl_window · eclipse_season · mercury_rx · month

## SCRIPTS (hand-run; DATABASE_URL in David's terminal)
- scripts/: widen-narrative-cache.ts (7/17 outage) · recompute-convergence.ts (heavy-lord rebuild) · diagnose-readings.ts (stage-by-stage autopsy) · add-task-circles-column.ts · extend-circles-2.ts · migrate-* · query-*
- server/scripts/: create-research-tables.ts · create-horoscopes-table.ts · create-sessions-table.ts · ~60 proof/check/scan harnesses (dignity-check, apahara-check, backtest-tilt, trace-*, eclipse tools, create-tester, reset-password, gen-icons.mjs)

## SHARED
types · const (COOKIE_NAME, UNAUTHED_ERR_MSG) · zodiac · life-areas (parseLifeAreas) · life-area-shelves (8 shelves/~33 seats, SUB_THEME atlas bridge, resolveArea) · task-circle (28 CIRCLES + voices) · task-kind (7 kinds) · suggest-mode · rest-gate

## ROOT DOCS
AUDITS.md (post-build audit suite #1-12) · STRIPE_PLAN.md (time-gate billing, trigger "go stripe") · LAUNCH_STATUS.md (7/29 scope) · REBUILD_MAP.md (canon-vs-invented) · PROOF_LOG.md (PRIVATE, gitignored) · KNOWN_ISSUES.md · DEPLOY.md · server/vedic/canon/METHOD.md (lens router)
