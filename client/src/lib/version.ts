// Velea app version.
// v1.0 = the deploy of 2026-07-02 12:16 AM (the Meridian layer + glossary tooltips
// release) — the baseline the user anchored the version scheme to.
// v1.1 = 2026-07-03 — Master Mode, Celestial/Tonight's Sky, full glossary coverage,
// profile-switch refresh, and the shell rebuilt to normal document flow so the bottom
// nav welds to the physical screen edge.
// v1.69 = 2026-07-03 — the 5-layer recommendation roadmap closed one-by-one: karana,
// hora + moment-feed, combustion/nodal/eclipse, pratyantardasha, planetary strength
// (dignity/placement) — each deterministic + proof-scripted; plus current-location moved
// to Settings. (Minor number roughly follows the SW cache version.)
// v1.86 = 2026-07-04 — Crown Days on the calendar (gold crown + border + popup), golden
// days removed, Velea mark = today; admin-only force-logout-all + hero "update to the
// moment" upsell preview; and a cross-user leak in the narrative endpoints closed
// (owner-scoped). Minor number now tracks the SW cache line (set to 1.86 for the v86/v87 build).
// v1.88 = 2026-07-04 — birth-data anti-hijack (confirm warning + 24h edit cooldown); today's
// calendar cell now renders the saturated tint so the Velea mark reads.
// v111 = 2026-07-04 — the client-facing version now tracks the SW cache line directly (was
// "1.NN"). This span (v104–v111): narrative voice de-centered from "worth"; nav reorder
// (Today·Chart·Projects·Glossary); first-run welcome capped at 2 lifetime shows (server-side);
// spotlight/aria transits + the Time Lord's live condition; Stage cards on a white atmospheric
// wash; Settings collapsed to one "Account" heading with Log Out standalone; Time Master +
// Hora as side-by-side tiles; About "the method" + David's closing letter and signature.
// v112 = 2026-07-04 — Full Spectrum visual mode (Settings › Interface & Focus): every surface
// takes a mid-dark shade of today's day-mode color, text forced legible. Also: dark card/popover
// surfaces retinted to the deep-indigo background; About "grain of sand" + gold "With gratitude"
// + David's handwritten signature.
// v114 = 2026-07-04 — dark-mode white body text softened (#FFFFFF → warm #EAE7E1) so it stops
// glaring; Full Spectrum Build day warmed onto a warm near-black base so the gold reads golden,
// not olive (gold font contrast preserved); bottom-nav labels shrunk + cell-clipped so the 6 admin
// items (Projects/Glossary) stop mushing together.
// v1.1.115 = 2026-07-04 — version scheme is now YEAR.MONTH.BUILD. "1.1" = Velea's first year,
// first month; the BUILD segment keeps tracking the SW cache line. Same build as the prior v114
// (softened dark text, warm Build Full Spectrum, un-mushed nav) — re-labelled under the new scheme.
// Roll MONTH each calendar month, YEAR each year; bump BUILD on each shipped release and keep it
// in step with the SW cache version.
// v1.1.117 = 2026-07-04 — time-aware, second-voice hero greetings (e.g. "Still up, Lang?"
// past midnight), 6 hour buckets × rotating variants; seed copy for future push notifications.
// v1.1.119 = 2026-07-04 — "looks like you've moved" location nudge: when the device drifts
// >100km from the saved location (only for users who already granted GPS), offer a one-tap
// update so sunrise/hora/day-timing follow. Throttled, dismiss-aware, never prompts unsolicited.
// v1.1.120 = 2026-07-04 — golden days brought back to the calendar as a GOLDEN BORDER (the
// backend computeGoldenDays "potential" was still live — only the display was gone). Crown days
// now use David's new gold-crown PNG badge (a golden day + crown on top).
// v1.1.121 = 2026-07-04 — REVERTED the Stage white-wash (#5): the waning-gibbous/moon and the
// other Stage cards go back to the original dark scrim + white text (the white opacity layer
// read gross over the light moon art).
// v1.1.122 = 2026-07-05 — Stage station cards (Mercury Rx etc.) get a flat #545454 @ 26% veil
// over the whole image (David's mockup) instead of the gradient scrim; moon card keeps its scrim.
// v1.1.123 = 2026-07-05 — Stage station cards: drop the text halo (the flat veil carries it;
// moon card keeps its halo), and wrap slow-planet-weather signals in the same translucent boxes
// as "Today's call" for consistency.
// v1.1.124 = 2026-07-05 — stale-task check-in nudge (in-app): a task open >3h with no check-in
// since it was added offers a current-state check-in (8am–10pm, throttled, stands down after
// check-in). Also ships the approved timezone-first location nudge (DST offset change + 150km).
// v1.1.125 = 2026-07-05 — golden hour is now marked with the crown (was ✦) in the Time Master
// card — current golden hour, the header badge, and the "next" window — unifying it with crown days.
// v1.1.126 = 2026-07-05 — Full Spectrum Build background richer: 40% gold (was 30%) on the same
// dark base, so it reads golden instead of muddy bronze while gold labels stay legible.
// v1.1.127 = 2026-07-05 — Chart-page polish: (1) the Time Lord/Natal/Dasha tab bar no longer
// renders a white pill in light+Full-Spectrum (was var(--color-secondary), Tailwind-baked to the
// light value; now rides --color-card + the day tint); (2) profection-wheel BIRTH/NOW labels
// go gold (were #000, invisible on the dark/full-spectrum wheel); (3) nav icons swapped —
// Today = the Velea mark (the living now), Chart = the book (your story: profection/dasha/natal).
// v1.1.325 = 2026-07-11 — Calendar Mercury Rx redrawn in the planet's own green: degree-exact
// pre/post-shadow zones added (Mercury re-treading the exact station degrees), the whole
// retrograde influence now reads as a green RING (shadow dashed → rx solid → window thick) so
// the date number stays intact, and the station day carries a centered green ☿. Ring gets a
// hairline dark stroke on FS + dark (green-on-green Action was soft); light keeps the plain ring.
// v1.1.326 = 2026-07-11 — Eclipse days now show ONLY the dark gold-rimmed disc, centered in
// place of the date number (was disc + number), matching the Mercury station-day treatment.
// v1.1.327 = 2026-07-11 — Retrograde calendar goes multi-planet: Mercury, Venus, Mars, Jupiter,
// Saturn each render as a small planet-colored glyph in a bottom STRIP (Mercury's ring removed).
// Station = bold/large, window = bold, rx = normal, shadow = faint; colors mode-tuned (bright on
// dark/FS, deep on light), date number kept. Degree-exact shadow for all; FAST planets show the
// full pre/post-shadow span, SLOW (Jupiter/Saturn) show only enter/leave blips. Tap → a
// "Retrograde sky" popup listing every planet's state that day.
// v1.1.328 = 2026-07-11 — Retrograde strip glyphs enlarged (rx .76rem / station .92rem, was
// .52/.62) and lifted off the bottom edge; the date number gets a paddingBottom nudge up so
// number and strip no longer crowd.
// v1.1.329 = 2026-07-11 — Retrograde strip is now a LITERAL LANE under the date coin (was glyphs
// absolutely-placed inside the circle, which made mixed sizes misalign). Cell = coin on top +
// fixed-height glyph lane below; all glyphs one size on a shared baseline (station = heavy + glow,
// window = bold, rx = normal, shadow = faint). Lane sits on the neutral card, so colors read clean.
// v1.1.330 = 2026-07-11 — Fix retrograde glyph alignment: ♀/♂ were rendering as color EMOJI on
// iOS (a different font + baseline, and it ignored our color), so ☿♀♂♃♄ never shared a line. Force
// TEXT presentation (U+FE0E) + pin one symbol font (Apple Symbols…) so all five align on the strip.
// v1.1.331 = 2026-07-11 — Retrograde strip tiers were indistinguishable (rx vs window): symbol fonts
// are single-weight so fontWeight did nothing. Re-tier by OPACITY instead — station full+glow,
// window full, rx dimmer (.6), shadow faintest (.34). Added Noto Sans Symbols to the font fallback
// for Android/web (the glyphs live in Misc Symbols, which Noto Sans Symbols covers).
// v1.1.332 = 2026-07-11 — Saturn ♄ recolored to electric blue (bright #33A1FF dark/FS, #0E74D4
// light) — was a muddy indigo that read too close to the Selective-blue tiles.
// v1.1.333 = 2026-07-11 — Retrograde redesign "events pop, spans recede": the daily glyph strip
// (which turned to wallpaper once 3-4 planets were retrograde for weeks) is replaced. STATIONS now
// put the turning planet's glyph IN the date coin (large, crisp, no color-glow) in place of the
// number. Ongoing spans become one thin continuous colored TRACK per planet under the coin (fixed
// slots so each reads as a single line across days) — opacity by state (window/station full, rx
// dimmer, shadow faintest). Tap still opens the "Retrograde sky" list.
// v1.1.334 = 2026-07-11 — Bigger station glyph on the coin (1.75rem), and shadow-phase tracks are
// now DASHED lines (opacity alone was too subtle) — solid = retrograde run, dashed = shadow.
// v1.1.335 = 2026-07-11 — Build Full Spectrum ground deepened #6F5B1D → #3F340F. The old mid-
// lightness gold sat at the same brightness as text + wheel and read as a washed-out veil; same
// hue, darker, so accents and content lift off it (matching how the cool FS modes behave).
// v1.1.336 = 2026-07-11 — Time Master Hora list now marks the GOLDEN hours (Veleal'or bullseye)
// so you can plan ahead: each hora is flagged golden when its lord is favorable AND your bird is
// favorable inside it; when the golden run is narrower than the full hour, its start time shows
// next to the mark. New computeGoldenHoras engine shares ONE golden definition with the live
// "golden now" read (buildDayContext) — proven by server/scripts/golden-horas-check.ts (18/18
// instants agree). Best-effort: horas without the user's bird data just render unmarked.
// v1.1.337 = 2026-07-11 — HOROSCOPE page (premium, gated with the usual lock): a clean month
// calendar — pick any date, reveal ("purchase") its date-specific deep read, keep your own notes
// under it. Purchased dates carry the Veleal'or bullseye and list below for scroll-back. Reveals
// are immutable snapshots (new horoscopes table) so a purchase never drifts on prompt/chart change;
// generation reuses the date-specific "stage + guests" deep read. New 6th nav item (Sparkles).
// NOTE: prod needs the horoscopes table created by hand (CREATE TABLE) — see deploy notes.
// v1.1.338 = 2026-07-11 — Horoscope nav icon is now a narrow vertical DIAMOND (DiamondMark) — a
// node/knot/point, the single day you pin on the calendar — replacing the generic Sparkles.
// v1.1.339 = 2026-07-11 — Fix golden-hour marks getting cut off in the Hora list: the Hora column
// is narrow (side-by-side with Time Master), so the far-right ⊙ + peak-time clipped off-screen.
// The bullseye now sits INLINE right after the planet name; the peak-time is dropped from the row
// (it lives in the Time Master header). Also: Horoscope now LOCKED for testers (own hasHoroscope
// gate — admin/allowlist only), and the Horoscope nav icon is a narrow diamond (node/knot/point).
// v1.1.340 = 2026-07-11 — Build Full Spectrum legibility: warm reds/roses vibrated + washed out on
// the gold FS ground. (1) Project life-area chips now use the SOFTENED MODE_OKLCH palette in FS
// (the vibrant MODE_SOLID rose was the culprit; MODE_OKLCH exists for exactly this) — dark/light
// unchanged. (2) The row Delete rose and (3) the admin Force-logout red are lightened (same hue) in
// FS so they read instead of vibrating; dark/light keep their original reds.
// v1.1.341 = 2026-07-11 — Bottom nav spacing fix for the 6th item: "HOROSCOPE" (the longest label)
// was clipping its last letter and crowding Settings. Nav labels 10px→9px, letter-spacing→0, and
// per-item padding px-1→px-0.5 so all six fit cleanly.
// v1.1.342 = 2026-07-11 — Even nav spacing: labels were centered in equal-width cells, so short
// words (TODAY) had big side-gaps and long words (HOROSCOPE) had tiny ones — airy left, crowded
// right. Items now size to their word and justify-between distributes the gaps evenly (px-4 insets
// so the first/last don't hug the screen edge).
// v1.1.343 = 2026-07-11 — Mercury Rx Stage card is now a FIXED single card: it no longer swaps
// with the viewer's time of day (dawn/day/dusk/night). todSrc skips the time-of-day suffix for any
// mercury-rx image; the 4 unused Mercury Rx time-of-day variant files were removed. All other Stage
// cards still breathe with the real sky. (Also today: new moon art swapped into the Stage cards.)
// v1.1.344 = 2026-07-11 — Mercury Rx art timeline: rx-2 now owns the MIDDLE of the retrograde;
// rx-1 (the flat card) bookends it (first week after the station + final week before it turns
// direct). direct-2 "stations direct" art retired — the single post-turn card uses direct-1's art
// with the "stations direct" copy. Pre-shadow dawn/dusk/night variants removed.
// v1.1.345 = 2026-07-11 — Task delete moved to swipe-RIGHT (was pin) everywhere — a deliberate
// gesture, since the crowded collapsed row made accidental taps easy; the collapsed trash icon is
// gone (delete now also lives in the edit sheet, two-tap confirm). Pre-shadow Stage card pinned to
// its midday art only. Golden-hour bullseye removed from the collapsed Time Master + Hora cards
// (kept in the expanded views).
// v1.1.346 = 2026-07-11 — Removed "Personal Energy" (Settings): a static Low/Med/High baseline
// that was redundant with the daily check-in — the check-in captures live physicalEnergy (+ four
// more axes) and applies as a dominant override, so the static toggle only added a weak legacy
// nudge and double-counted energy. Pulled from Settings, the ranking input, the scorer, and tests;
// no-check-in days simply rank without an energy baseline (was already the "Medium" default).
// v1.1.347 = 2026-07-11 — Welcome splash now tracks the hour (David's greeting_splash art):
// sunrise 5–7, day 8–16, sunset 17–18, evening 19–20 — and AT NIGHT (21–4) it becomes the current
// Moon phase, the same phase art the Stage shows, so the welcome mirrors the sky overhead. Buckets
// align to the greeting-text buckets so words + sky agree. Moon pulled from celestial.today (cached).
// v1.1.348 = 2026-07-11 — Horoscope page: the leftover Sparkles icon on the reveal ("purchase")
// prompt is replaced with the DiamondMark — the same node/knot/point symbol as the Horoscope nav
// icon, so the page and its icon agree (Sparkles was retired app-wide).
// v1.1.349 = 2026-07-11 — Calendar restyle (David): light-mode --background → #FDFDFD, and the
// Planner calendar surface is now ALWAYS #FDFDFD in every appearance mode (appearance never leaks
// in). Coins flip to a fill/outline model: TODAY and the pressed date are FILLED with the day-mode
// color + white number; every other day is an OUTLINE — a ring in the day-mode color with the
// number in that same color. The white today-border is retired (today is the filled coin). Retro
// glyphs/strip pinned to the deep (light-bg) palette since the surface is always light.
// v1.1.350 = 2026-07-11 — Calendar negative space + unified coin palette. More breathing room:
// row gap 0.25rem→1rem, coins 3.1→2.5rem, body padding opened up (inspiration: an airy month grid).
// And since the surface is ALWAYS light now, the day-mode coin colors are ONE light-tuned palette
// (~0.55 lightness) shared across every appearance mode — dark enough to read on white and to carry
// a white number when filled; Build is a deeper amber-gold (a bright gold couldn't hold white text).
// v1.1.352 = 2026-07-11 — Calendar coin polish (David): numbers up to 0.875rem (~+2px), rings
// tightened (coin 2.5→2rem) so the circle hugs the digit. Reverted to the BRIGHT/true mode palette
// (bright gold is fine on white) — and a FILLED coin's number is now a very dark TONAL version of
// its day-mode color (darkenOklch ×0.32) instead of flat white: a monochromatic, more elegant coin.
// v1.1.388 = 2026-07-12 — Two fixes. (1) Calendar knot mark: the Star of Lakshmi (octagram) is drawn
// in LINES again (outline + center bindu + glow), not a solid fill (David) — the amber-on-gold stroke
// on a Build coin is kept so a knot+Build day still reads. (2) Neecha bhanga in the dasha breakdown:
// a debilitated-but-CANCELLED dasha lord (David's Moon) no longer reads as flatly "debilitated" — it
// gains a gold "hard-won strength — neecha bhanga" bullet, fed by the server crown.dignities engine.
// Same signal (cancelledDebilitation/hardWon) wired into the narrative input so the LLM prose honors it.
// v1.1.389 = 2026-07-12 — THE DAY READ shipped: the metaphor day-read (scene = today's outer
// weather incl. live rx/eclipse/station; story = the inner self + chapter, the two Moons kept
// distinct, hardWon honored; tilt = how to move, no single move; closeLine). New DAY_READ_TAIL
// + generate/cache/endpoint (narrative.dayRead). Wired to BOTH: the Horoscope reveal now reads
// the PICKED DAY (was wrongly reusing the year deep-read for every date), and the Today page
// gains a lazy, collapsed "The day, in full" section. Legacy year-read horoscope snapshots
// still render. Prompt mandate: a read explains the OUTER, the INNER, and how to MOVE — as
// interactions. (Inert until the Anthropic key is re-enabled.) Varga topic-lens layers on next.
// v1.1.390 = 2026-07-12 — Day-read refined + Today de-duplicated (David). (1) The day read is now
// PURE PROSE — the redundant/jargony "THE MECHANICS" layer is gone; placements live inside the
// scene/story/tilt lines, glossary-linked, said once. Prompt bans echoing raw input field names
// (no more "personalApex isCrown true" / "chandraHouse 7"). (2) Option A: the glance is trimmed to
// a tight at-a-glance TEASER (~70 words, no arc line) and the hero's "THE FULL READ" toggle is
// removed — the day read ("The day, in full") is the one full read. PROMPT_VERSION bumped.
// v1.1.391 = 2026-07-12 — Pre-test hardening of the v390 day-read (no prompt change → no cache
// bust → no regen cost). (1) Horoscope scroll-back snippet read c?.scene?.synthesis but scene is
// now a prose STRING → blank snippets for new day-read snapshots; fixed to c?.scene. (2) Horoscope
// day-read prose now glossary-links its terms (GlossaryText), matching the Today card.
// v1.1.392 = 2026-07-12 — STORY-AS-HERO (David's option B). The concise day-read IS the hero now:
// (1) the day-story (scene→story→tilt→carried line) auto-loads as the hero prose, replacing the
// old glance teaser; (2) the glance surface is retired from Today (no double-generation — ONE read
// per day); (3) the day-read gains a `question` field so it powers the hero's closing question too;
// (4) "Why this today?" moved BELOW the story + rebranded "The Read" (opens the cast — Phase 2);
// (5) the collapsed "The day, in full" press-line is gone (its content is the hero); (6) admin ↻
// repointed to refresh the day-read. Prompt: THE PROOF IS IN THE SPECIFICS law + Ketu-window
// (day_read surface salt only — glance/deep/chapter caches untouched).
// v1.1.393 = 2026-07-12 — THE READ = THE CAST (no placeholder). The hero's "The Read" button now
// opens the cast: today's LOUD players (2–4 foreground characters, each with its live condition +
// the lesson it points to — restore a depleted Venus, lean on a strong Jupiter, wait out a
// hungover Mercury) over THE CHAPTER (background scenery — the natal Moon/Sun/Time Lord/dashas).
// PG-playful, personified, glossary-linked. New `cast` narrative surface (own prompt CAST_TAIL +
// surface salt), lazy — fires only when the sheet opens. SignpostSheet repurposed from the old
// data-pill "why today" into the cast render.
// v1.1.394 = 2026-07-12 — GUARDS, not promises. The two failure modes (over-length + chart-jargon
// leaks) are now caught in CODE and regenerated, not shipped: generate.ts guardViolation() scans
// every day-read/cast for house numbers, sign names, "exalted/debilitated/retrograde/combust", and
// word count, with ONE bounded corrective retry (11 unit tests prove it). max_tokens slashed
// (day_read 800→400, cast 900→320). THE READ is now ONE paragraph — schema is a single `read`
// string, so it CANNOT come back as per-planet cards. Prompts: hero hard-capped at 120 words with
// the planets pulled OUT (they live in the cast, killing the repetition); cast rewritten to one
// ≤120-word PG paragraph that knows the data flags but never prints them.
// v1.1.395 = 2026-07-12 — THE READ floats centered. Was a bottom-anchored sheet that jammed the
// last line against the nav bar (looked cut off); now a centered modal — flex-centered overlay,
// max-width 440 / max-height 82vh, rounded on all corners, its own scroll, pop-in scale. Tap the
// backdrop to close. Content unchanged (the one-paragraph cast).
// v1.1.396 = 2026-07-12 — HOROSCOPE goes life-area (David's spec, method = Kurczak & Fish Appendix
// IV). Pick a date AND a part of life (Self·Money·Career·Love·Health·Home·Children·Purpose·Siblings·
// Parents) → the reading is routed through that area's own divisional chart (D2 wealth, D10 career,
// D9 love, D30 health, …), reading the area's house + ruler + karakas BOTH natally and in the varga
// (the deep lens), pointed at how the picked date's transits + dashas activate it. New deterministic
// engine (server/vedic/life-areas.ts + vargas.ts, 26 tests) → lifeAreaLens in the narrative input →
// LIFE_AREA_TAIL prompt (premium ~350w, same zero-machinery guards as the hero) → generateLifeAreaRead.
// Each (date × area) is its own immutable purchase (eclipse×Career ≠ eclipse×Money), with its own
// notes. Life-area chips on the page; scroll-back list tags each read with its area. Schema: horoscopes
// gains a lifeArea column + widened unique key — run server/scripts/add-horoscope-lifearea.ts on prod
// (NOT auto-applied). Inert until the Anthropic key is on + the migration is run.
// v1.1.397 = 2026-07-12 — Fix: legacy "Full day" horoscope snapshots were unopenable. Tapping a saved
// read in the scroll-back list skipped switching to its area when that area was 'day' (there's no
// 'day' chip), so the panel stayed on the selected life-area and showed "Reveal" instead of the saved
// read. Now tapping any saved entry switches to its area (chips show none selected for a legacy
// full-day read; the panel header reads "Full day"). One-line click-handler fix.
//
// v1.1.398 = 2026-07-12 — ECLIPSE SEASON reading. New card atop the Horoscope page reads the WHOLE
// double-eclipse arc for your chart — buildup → each eclipse's reset → where the field opens after
// — not one-day caution. Server engine: sky/eclipses.ts (findEclipses/nextEclipseSeason/
// eclipseChartContext) → input-builder eclipseSeasonArc → ECLIPSE_SEASON_TAIL → generateEclipseSeasonRead,
// cached by SEASON in narrative_cache (re-opening the same season is free). Collapsed teaser by
// default; taps horoscope.eclipseSeason. First real season: Aug 12 solar (David's 11th, gains/income)
// + Aug 28 lunar (his 6th, work/service/debts).
//
// v1.1.399 = 2026-07-12 — Branding: BAN the word "horoscope" from user-facing copy (David). The
// section is now "Readings" (nav label + page headers + locked-card title); "Reveal this horoscope"
// → "Reveal this reading". Route stays /horoscope and internals (trpc.horoscope.*) unchanged. KEPT
// the deliberate "This isn't horoscopes" positioning (landing meta/hero, marketing "not a horoscope",
// and the LLM's "not a horoscope writer" guard). Server-side too: LIFE_AREA_TAIL task header
// HOROSCOPE→READING + BASE_PROMPT now explicitly forbids the word in generated prose. (Server cache
// money-leak fix — dayStableHash — also shipped between 398 and 399, server-only, no client bump.)
//
// v1.1.400 = 2026-07-12 — Removed the "Your year, right now" upsell (the locked/admin live-regenerated
// "stage + guests" preview) from the Chart page — replaced by the Readings hub (David). Cut the locked
// card + admin button + the live "guests" modal + their state/handlers (guestsOpen/openGuests + the
// deepened refresh fetch) and the now-orphaned Users/LockedFeatureCard imports. The plain "The Read ·
// your year" panel stays for now. First step toward consolidating deep readings under Readings.
//
// v1.1.401 = 2026-07-12 — READINGS BECOMES THE HUB (David's approved IA, all 5 steps). (1) Time Master
// + Hora moved Today→Readings (self-contained; app-header glance unaffected). (2) "Your year" deep read
// now lives in Readings (full DeepReadBody); Chart's "The Read · your year" reduced to a summary + "Read
// your full year in Readings →" link. (3) Today's day read MIRRORED into Readings (read-only, links to
// Today). (4) "Your readings" archive REGROUPED BY TYPE (his pick), newest-first within each; label was
// "Your horoscopes" (banned word) → "Your readings". (5) Road Ahead stays on Chart, admin-only (his call,
// undecided). Server: year read + chapter now run through scrubMachinery (hero standard). REFINEMENT vs
// the plan: "the chapter" stays on Chart — it's a coupled sub-part of the structural Time Lord Movement
// panel, not a standalone reading, so moving it would have gutted that panel for no gain.
//
// v1.1.402 = 2026-07-12 — Readings hub polish (David's QA): (1) the pick-a-date intro line moved to sit
// right above the calendar it describes. (2) The new hub-section borders now use the day-mode color
// (were gray). (3) Eclipse season card is now COLLAPSIBLE + shows a "Read" badge when a reading already
// exists (new read-only peek query horoscope.eclipseSeasonSaved — no cost) so it's closable and
// communicates it's been read; it also lists in the "Your readings" log. (4) The log is now ALWAYS shown
// when entitled (was hidden when empty → undiscoverable), with an empty-state hint + an Eclipse-season row.
//
// v1.1.410 = 2026-07-13 — iCloud triage #2 + #3 (David). Calendar: planet/knot strokes THINNER +
// glyphs LARGER — station glyphs 1.65→1.9rem (single) / 1.2→1.4rem (multi), octagram size 24→25 at
// strokeWidth 1.6→1.15, coin rings 2→1.5px (caution/eclipse/crown/golden) and 1.5→1.25px (station),
// eclipse disc rim 1.5→1.25px. Mode orbs: the CURRENT-day orb breathes again (orb-pulse keyframe +
// --orb-glow in its own mode color, reduced-motion safe) and the active mode's NAME now matches its
// orb color (was foreground). Reflection Log book icon removed. Client-only, no narrative regen.
//
// v1.1.411 = 2026-07-13 — iCloud triage #4 (David's red line): the expanded Time Master / Hora cards
// no longer run tall. Each gets ONE capped scroll window (~12rem, ending around the golden-block line)
// with a single internal scroll — Time Master opens on the golden block (schedule + caveat scroll
// below; auto-center-on-now dropped so the golden block stays put), Hora keeps its open-on-now list at
// a taller 9rem window so both columns end at the same flat bottom. Client-only, no narrative regen.
//
// v1.1.412 = 2026-07-13 — iCloud triage #1 (David): Restraint's red hurt to look at next to the
// fire-engine caution red on the calendar (two reds ~10° apart, vibrating). Restraint's whole
// family rotates off red (hue ~10-14) to MULBERRY (hue 355) — the alarm/caution red is untouched
// (it stays unmissable by design). Solid accent #B15F71 → #9A4E6E; swept through every token: the
// mode oklch/tint/rgba/card-bg/solid, the calendar coin (MODE_DOT), the CSS vars + tag/orb classes
// across all three themes, the hero + card gradients, and the Time Master "Caution" / Hora "malefic"
// / error-text uses. Deep plum-burgundy shadow (#4A1A2E) kept — it's on-hue with mulberry. Each
// surface keeps its own tuned lightness (calendar/orbs stay light); only the hue moved. Client-only.
//
// v1.1.413 = 2026-07-13 — Readings nav icon swapped OctagramMark → DiamondMark (David). The octagram
// (two overlapping stroked shapes, edge-to-edge, with a solid center bindu) read visibly darker/
// heavier than the thin lucide outlines beside it; the narrow single-outline diamond matches their
// weight and frees the octagram to mean only "knot day" on the calendar. Client-only.
//
// v1.1.414 = 2026-07-13 — Today's Trigger is now its OWN collapsible card under Time Lord Movement
// (David), pulled out of the Time Lord Movement ombre summary where it was nested. Renders light
// (mode-accent left borders + tags) with a subtitle; still the deterministic ephemeris breakdown,
// no LLM. Sits between Time Lord Movement and the Meridian; only shows on days with a live trigger.
//
// v1.1.415 = 2026-07-13 — Two Time Lord ribbon fixes. (1) SERVER (shipped separately): the ribbon
// never showed retrograde — getPlanetState computed speed WITHOUT SEFLG_SPEED, so nothing was ever
// flagged Rx (Venus this fall read "Direct"); flag added + a self-heal rebuilds stale all-direct rows.
// (2) CLIENT: the ribbon's literal timeline rule + notches were hardcoded #FDFDFD — invisible white-
// on-white in light mode; now var(--foreground) at 0.55 opacity, reads on light/dark/Full Spectrum.
//
// v1.1.416 = 2026-07-13 — The Meridian now INTERPRETS the sign on each pole (David's benefit law):
// was generic angle definitions ("Gemini — your MC: how you appear…", same for any sign); now each
// sign names WHO you are at your public peak (MC) and private base (IC), grounded in its Vedic
// ruler's dharma (Gemini→Mercury the messenger, Sagittarius→Jupiter the guru, etc.). 12-sign MC +
// IC gloss dictionaries, deterministic, no LLM. Living doc — voice refine-able per sign.
//
// v1.1.417 = 2026-07-13 — NEW DARK MODE (David): the #000000/#111111 "black boxes" are gone. Dark
// mode is now a neutral grayscale ELEVATION ladder — bg #16171A, cards #1E2024, modals #202227,
// muted #23252B, and controls (pills/buttons/rows) raised to #34363D so they read as chips, not
// holes; the day-mode color stays the only saturated pop. Swept --background/card/popover/secondary/
// muted/sidebar/sidebar-accent + the --space-* ramp across :root + .dark, plus .dark body & the glass
// surfaces (were #000/#0A0A0A). Calendar = Option A: stays light but is now warm PAPER (#F4F0E8) + a
// soft shadow, a luminous almanac page that sits harmoniously on the dark instead of glaring white.
// (Full Spectrum per-color tuning still its own pass; this de-blackens its controls as a bonus.)
//
// v1.1.418 = 2026-07-13 — Dark-mode TEXT softened to match the palette (David): body text was still
// pure #FDFDFD, brighter than the ramp's off-white. Softened the light-on-dark foreground tokens
// (--foreground/card/popover/secondary/sidebar + their --color-* aliases, and the .dark body / glass
// / card-celestial hardcodes) #FDFDFD → #ECEAE4, in the dark + FS blocks. Left untouched: light-mode
// text (#2d2d2d), the light #FDFDFD background, white-on-accent (primary/accent/destructive), and the
// intentional crisp-white text on colored bands (ombre summaries, hero, ribbon glyphs).
//
// v1.1.419 = 2026-07-13 — Calendar tone is now appearance-aware (David: warm paper looked dingy on
// the white light-mode bg). Driven by --calendar-surface / --calendar-shadow: warm paper #F4F0E8 +
// soft shadow on dark/FS (glows as an artifact), clean near-white #FDFDFD + a whisper of shadow on
// light. (Groundwork for a shared "parchment" chart-artifact surface across calendar/wheel/natal.)
//
// v1.1.420 = 2026-07-13 — PARCHMENT FAMILY (David): the chart artifacts now share ONE luminous
// almanac surface, cohesive against the dark chrome. New reusable `.parchment` class = the
// appearance-aware --parchment tone + a local remap of the color tokens so any descendant renders as
// dark INK on paper in every mode (no per-element retune). Applied: calendar (v419), profection wheel
// (ink re-pinned + parchment card), natal chart (now shares --parchment vs its old hardcoded cream),
// the Readings calendar, and the Readings reveal box. Token generalized --calendar-surface → --parchment.
// Dasha stays chrome (it's colorful gradient period cards, not a chart-on-surface — flagged for David).
//
// v1.1.421 = 2026-07-13 — Parchment family extended to the natal PLANET TABLE (David: "do the natal
// table too"). The table container now uses `.parchment`, so the token-driven row text re-inks to
// dark on paper; the mode-gradient header stays a colored ledger band and the subtle mode-tint zebra
// rows read as a faint stripe on the almanac page. Parchment set now: calendar, profection wheel,
// natal chart, natal planet table, Readings calendar + reveal box.
//
// v1.1.422 = 2026-07-13 — Dasha stays chrome EXCEPT the current period: the active antardasha (the
// "NOW" sub-period) now lifts off the dark list as a single luminous parchment chip (David: "what if
// only the current dasha was parchment") — colored left tab + raised margin + drop shadow, so "you
// are here" is the one paper focal point. Siblings stay chrome; the colorful gradient Mahadasha
// headers stay chrome. Reuses the .parchment class (token remap → dark ink on paper in every mode).
//
// v1.1.423 = 2026-07-13 — Dasha parchment, corrected framing (David: "I wanted the whole moon timeline
// parchment and then Saturn would glow its blue color"). The ACTIVE Mahadasha card (your current era)
// is now the whole parchment page — header + sub-period list on one paper surface — and its current
// sub-period (Saturn now) GLOWS its own planet color on the page: a soft color wash, a solid left tab,
// a colored halo, and its name inked in that color. Sibling Mahadasha cards stay chrome. (Replaces the
// v422 single-chip approach.)
//
// v1.1.424 = 2026-07-13 — Two calendar fixes. (1) Caution day stops "vibrating" (David): today's coin
// was stacking the fire-red caution ring/number on the mulberry Restraint fill — two close reds
// buzzing. A caution day now resolves to ONE red family (fill / number / ring differ only in
// lightness), so the mulberry↔red clash is gone. (2) Readings calendar dates now have a hover
// affordance (soft mode-color wash + hint ring) — they were selectable but gave zero feedback, so
// they read as a dead zone on desktop.
//
// v1.1.425 = 2026-07-13 — THE MERCURY RETROGRADE period reading (David: "complete the mercury rx
// reading option") — the sibling to Eclipse Season. One arc across the whole rx cycle (pre-shadow
// build → the review through your chart's house(s) → the retroshade clearing), read once per cycle and
// kept. Full stack: sky/retrograde-phase.ts mercuryRxCycle (finds the active/approaching cycle + its
// four turning dates + the sign/house it reviews) → input-builder mercuryRxArc (maps into this chart:
// house(s), dispositor condition, natal points Mercury backs over) → MERCURY_RX_TAIL → generateMercuryRxRead
// → getMercuryRxCached (cached per cycle, keyed by the station-retrograde date) → horoscope.mercuryRx
// endpoints → MercuryRxCard on the Readings page (quicksilver-blue, under the eclipse card). Gated to
// horoscope entitlement; unavailable when Mercury is clear.
//
// v1.1.426 = 2026-07-13 — THE MONTH period reading (David: "same as a single day, but expanded to the
// month — the interactions"), the third period reading. ONE synthesized read of the whole month (far
// cheaper than 30 day-reads), spined on the TIME LORD and using the full layered input, weaving the
// month's big SCENES / CHARACTERS / CONVERSATIONS / ARCS. New engine sky/month-events.ts scans the
// calendar month for the beats (lunations, ingresses, stations, eclipses, personal natal hits), each
// mapped to the chart's houses → input-builder monthArc → MONTH_TAIL → generateMonthRead →
// getMonthCached (cached per month "YYYY-MM") → horoscope.month endpoints → MonthCard (twilight violet,
// atop the Readings period cards). Subscriber core benefit (gated to horoscope entitlement until billing).
//
// v1.1.427 = 2026-07-13 — THE MERIDIAN IS THE SPINE (David's law) + the Moon-counted-twice fix. Root:
// for a Moon-Time-Lord user the transiting Moon IS the daily trigger, so the "slow chapter" collapsed
// onto it — the fastest body posing as the season — and the read flattened to mood, blind to the nodal
// (reach/release) axis. Diagnosed on Simone (Rahu 10th ↔ Moon+Ketu 4th; her nodes sit on her MC/IC;
// engaged in her fiancé's home country while the engine told her to "settle into home"). Fixes: (1)
// input-builder nulls the fake Moon-chapter when timeLordIsMoon; (2) new deterministic meridianAxis
// (MC=reach/IC=release, natal planets on the angles, which ruling lord sits on which pole) fed to the
// narrative as the SPINE; (3) surgical prompt laws "THE MERIDIAN IS THE SPINE" + "WHEN THE MOON IS BOTH
// LORD AND TRIGGER" (PROMPT_VERSION bumped → all narrative surfaces regenerate); (4) personalDayForDate
// now location-aware (samples the day at local noon where the body is, not fixed noon-UTC); (5) "Your
// Year, Explained" node-aware (a node on the Time Lord flips "settle in" → release/reach + names the axis).
//
// v1.1.428 = 2026-07-13 — LocationChip above BOTH calendars (Readings + Planner). David kept forgetting
// to update his current location when switching profiles because the only control was in the header. The
// chip shows "Reading from <city>" and, on tap, opens the existing LocationSheet (via the shared
// velea-open-location event) — no schema, reuses the per-user current location. This is v1 of the fuller
// hometown + current + per-date location model (that fuller (B) version needs a reviewed schema, TODO).
// v1.1.756 = 2026-07-18 — THE LOCATION MODEL, whole (the fuller (B) version the v1.1.428 note
// promised): ONE server resolver (resolveDaySky: per-date override → current (±3 days of today) →
// hometown → birth → default) with the location REQUIRED at compile time everywhere — the silent-
// Boston divergence class is dead (celestial time-of-day, monthSaved peek, recalculate, whyToday's
// majority star, testReadingForUser all were unlocated; all wired). ONE editing surface: the
// LocationSheet, now with contextual openings — missing-location prompt (once/session), profile-
// switch confirm (Q2), and pick-a-date "Where were you this day?" (writes a per-profile-per-date
// override row). Hometown per profile (editor field + geocoder; seeded from birth). City search
// now stores the CITY's timezone, not the device's. BirthChartSheet (dead duplicate birth editor)
// deleted. Schema: profiles.hometown* + profile_day_locations via scripts/add-location-model.ts.
// v1.1.757 = 2026-07-18 — FIRST-RUN BEAT ORDER (David's spec, from the Linda login): login gate →
// manifesto (3 beats) → etymology splash (seashell) → welcome pop-up (birth + location) → app
// reveals + tour. Root causes fixed: (1) Login switched accounts with invalidate, not reset — the
// PREVIOUS user's cached tourState ("welcome seen, tours on") auto-fired the page tour over the
// new user's first-run; now queryClient.resetQueries(). (2) The etymology splash fired before the
// manifesto; for first-run users App.tsx now defers it and Onboarding plays it as beat 5.
// (3) The missing-location prompt is now strictly a later-session surface (waits for "welcome"
// seen + no overlay on screen). (4) The task guide waits for first-run completion too.
// v1.1.758 = 2026-07-18 — reopen glitch fix ("Today flashes, THEN the greeting"): the app-open
// sunset greeting now decides SYNCHRONOUSLY at first paint from local hints (auth mirror +
// velea-onboarded flag) instead of waiting for auth/tourState round-trips — the greeting mounts
// before Today can flash. Hint cleared at login so a new account still gets first-run beats;
// folded away if the session actually expired.
// v1.1.759 = 2026-07-18 — the gate veil: a fresh login never flashes Today before its first beat
// (David: "second beat was the entire today page. then the manifesto started"). From the moment
// of login until the beat decision lands, true black + the spinning mark holds the screen; the
// manifesto (first-run) or the etymology splash (returning) replaces it in the same render.
// 6s timeout so a hung fetch can never hold the gate.
// v1.1.760 = 2026-07-18 — location friction killed (David's Linda/velea walk-through): (1) the
// welcome's gold "Set my current location" now DOES it — one tap → GPS → saved → "{city} ✓ —
// change it" on the button; the sheet opens only as the manual fallback (GPS denied) or to
// change. (2) LocationSheet saves no longer window.location.reload() — queries invalidate in
// place, so the flow that opened the sheet (welcome, Today, pick-a-date) keeps its state and
// the chip updates live. Shared capture helper: lib/capture-location.ts.
// v1.1.761 = 2026-07-18 — quieting pass (David's velea-profile recording): (1) reopen-greeting
// sync hint now keys on the MANIFESTO seen, not welcome — accounts whose welcome burned by
// show-cap flashed Today forever; (2) page tours NEVER auto-fire — explicit start only ("Show
// me around" / Settings); (3) the Morning Bell rings only for onboarded accounts, never in a
// session where first-run beats played, never over another overlay (its opens count is
// device-wide, so account-level gates were missing).
// v1.1.762 = 2026-07-18 — self-audit of v756–v761 (AUDIT_2026-07-18_v756-761.md): 4 findings,
// 4 fixed — (1) one unveiled paint in the returning-login veil (now flag-keyed); (2) almanac
// year walk no longer consults the per-date override tier (a yearStart override relocated the
// whole year); (3) missing-location prompt gate was unreachable for show-cap-burned accounts
// (welcome-seen → manifesto-seen); (4) LocationSheet resets stale status on open.
// v1.1.763 = 2026-07-19 — THE OVERLAY SEQUENCER: the whole self-firing-popup architecture is
// dead, replaced by ONE owner (OverlaySequencer) — verified end-to-end in a real browser
// (playwright, fresh signup, every beat screenshotted) BEFORE shipping. The choreography:
// login → veil → manifesto (3 beats) → etymology splash → capture card → app; sunset greeting
// alone on ordinary opens; max ONE nudge per session, only when idle, only post-onboarding.
// ROOT CAUSES KILLED (not patched): (1) App's "/"→/profiles redirect exiled fresh signups from
// the beats entirely and spawned the "3 birth data cards" war — the capture card now takes
// birth date/time/city INLINE, geocodes, resolves tz, casts the chart (verified: Taurus lagna,
// 9 natal bodies in DB from a typed signup), and seeds hometown (Q5). (2) markTourSeen +
// setToursEnabled raced on the same tourState JSON — last writer clobbered seen[], the
// welcome-zombie source all night; new atomic settings.completeWelcome. (3) Planner's zero-task
// auto-fired task guide stacked over the greeting — killed; NOTHING tours uninvited.
// (4) reflections.get returned undefined → console error on every un-journaled day. Also:
// scripts/sync-local-dev-db.ts (additive-only local mirror sync — drifted mirrors were masking
// the real bugs during reproduction).
// v1.1.764 = 2026-07-19 — the three newest field notes, each verified before ship: (1) Morning
// Bell title is the brand line again ("Velea" above the greeting — the "Good morning" title made
// iOS add a redundant "from Velea" row); greeting moved into the body. (2) "Pin this reading"
// flips optimistically the instant it's tapped (server ensure-generate takes seconds; a failed
// pin reverts itself) — DRIVEN: flip observed at +200ms. (3) Profile-login modal is dead-center
// always, above the nav, scrolls within itself under the keyboard — DRIVEN: screenshot verified.
// v1.1.765 = 2026-07-19 — field-note batch (7:18 folder), every fix driven in a real browser first:
// (1) FIXED CRASH: the Chart page "Something went sideways" — MeridianCard called useUtils +
// useState AFTER an `if (!data) return null`, so its hook count grew when the query resolved
// ("change in the order of Hooks"); all hooks moved before the guard. (2) Profection wheel hub
// widened 16→30 so the inner ring's 2-digit ages stop touching ("common issue on all profiles").
// (3) Year-calendar glyph cluster (crown + 2 planets) now steps down to fit its ~40px tile
// (Jupiter-trio overflow). (4) Price + "Notify me when it's live" waitlist on every locked
// feature (settings.joinWaitlist → waitlist table; price hidden until PREMIUM_PRICING is set —
// never an invented number). (5) "matters/matter" purged (banned AI-tell). (6) Hero label +
// chevron contrast off hero-ink, not the mud-on-red day-accent-deep. (7) Glossary links in the
// profection explainer. (8) Chart header/tab spacing compressed. (9) The Morning Bell → FIRST
// LIGHT (brand.ts). Also fixed a bug in scripts/sync-local-dev-db.ts (timestamp defaults).
// v1.1.766 = 2026-07-19 — prosperity day NAMED in the reading, like retrogrades (David: "just do
// it"). A Sampat tārā day (the wealth/gain rung) now instructs the reading to name the day's
// tilt toward income/what-you're-owed/asking-for-money in plain money language — woven in, never
// "Sampat", never a mechanic — riding on top of the day's mode. Verified deterministically:
// personalApex.tara="Sampat" reaches the model on real Sampat days (2026-07-26, 08-05). glance +
// day_read surface salts bumped so it takes effect on next view.
// v1.1.767 = 2026-07-19 — MANDATORY POST-STRETCH AUDIT (v756-766, David's law #6): 4 parallel
// audit agents across the 12 AUDITS.md lenses, every finding re-verified against real code before
// fixing. 12 fixed (AUDIT_2026-07-19.md): HIGH — the task-guide tour crash (shared tourIndex not
// reset → out-of-range step deref); the moment-upsell "Contact your Admin" dead-end → notify-me
// waitlist; and my OWN v766 prosperity fix was incomplete (rule only in GLANCE_TAIL, not the hero
// DAY_READ_TAIL, yet day_read's salt was bumped → costly + still silent) — now in both tails. MED —
// "self-worth" banned framing purged; naked "House 9 is lit up" reworded; capture-card backdrop no
// longer strands a chartless account; two-primary buttons resolved; nudge arming race fixed. LOW —
// pinned gold→hero-ink; publicKey guard; profiles.create archived-count dead-end. Added AUDITS.md
// lenses #13 (hook-order) & #14 (reading-rule placement/salt). 499 tests pass.
// v1.1.768 = 2026-07-19 — THE COLD-LAUNCH CLIP, fixed at the mechanism (David's screen recording,
// 20:48). Reopening the app from a swipe-away landed on Today with the greeting cut ~30% under the
// header; "Refresh app" always corrected it. Watched the recording frame by frame: the header does
// NOT change height when its async data lands (BUILD · SUCCEED : JUPITER and the veleal'or chip
// join EXISTING rows), so the "late data grows the bar" theory was wrong. Measured instead — the
// greeting sat ~157 device px (~52pt) high, the magnitude of the top safe-area inset, not of any
// content. ROOT CAUSE: the spacer was `calc(measuredOuterHeight - env(safe-area-inset-top))` — a JS
// pixel value minus a CSS env(), which resolve at DIFFERENT times. On a cold PWA launch the effect
// measured before the inset applied, so barH excluded it and the spacer then subtracted an inset
// that was never in the measurement. FIX removes the arithmetic rather than retiming it: measure the
// bar's INNER container (its content height — the only thing the spacer ever needed, since
// main.content-safe-area already offsets by the inset and the bar carries it in its own padding),
// and reserve exactly that. No env() on either side = nothing to race. useEffect → useLayoutEffect
// so it measures before paint (no 0-height first frame either). Reproduced both formulas in a
// harness with a late-arriving inset: old = greeting 35px UNDER the bar, new = 33px clear. Verified
// every route renders inside main.content-safe-area, and that env()-less browsers degrade correctly.
// This is the same clip as the "2:21 AM" one — that fix corrected the number, this removes the
// mechanism.
// v1.1.769 = 2026-07-19 — THE EPHEMERIS COLD-START RACE + KETU'S SPEED SIGN (audit section 7).
// (1) natal-chart-engine.initSwissEph assigned the module-level instance BEFORE awaiting the WASM
// load and BEFORE set_sid_mode, so a second concurrent caller saw it truthy and got a half-built
// engine — either a .ccall throw, or (worse) one with NO ayanamsa set, silently returning
// Fagan-Bradley positions ~0.883° off the Lahiri frame everything else is stored in. The exact bug
// the C1 fix closed, reachable again through a race, firing at container start after a deploy.
// Now memoizes the PROMISE, not the instance, so every caller awaits one initialisation and gets a
// fully-configured engine; a failure clears the promise so a later call can retry. VERIFIED: 8/8
// concurrent cold-start calls now resolve to one identical value (was 4-7 of 8 rejecting).
// (2) birthchart/calculator NEGATED Rahu's speed for Ketu at both sites, yielding a positive/direct
// value that was persisted to profile_natal_bodies. Both mean nodes are always retrograde, so Ketu
// carries Rahu's speed unchanged — the rule was already stated correctly in transit-calculator's
// calcSid. VERIFIED at BOTH sites independently (not inferred from each other): separation exactly
// 180.000000000, speeds identical and negative, isRetrograde true. Correction to the audit sheet:
// it said stored rows need a re-run — they do NOT. `Graha` is the seven classical planets, so
// combustion, yoga-detect and chesta never read a node's speed; the wrong value was written and
// never consumed. 298 tests pass, build exits 0.
// v1.1.770 = 2026-07-19 — ONE SOURCE FOR THE DAY'S TITHI (audit section 7). The calendar/hero used
// the MAJORITY-of-day tithi (astro.tithiIndex + 1) while the READING recomputed it from Sun/Moon
// longitudes sampled at local noon — two derivations of one quantity. MEASURED over 120 days:
// they land in DIFFERENT tithi FAMILIES on 26 of them (21.7%). 2026-08-01 is the clean example —
// the hero reads rikta ("start nothing") while the reading directly beneath it was generated from
// jaya ("bold moves land well"). The nakshatra immediately above in input-builder had already been
// moved to the day-stable majority for exactly this reason; the tithi was left behind.
// FIX: derive the number from panchang.tithi + paksha (the majority values already on the input)
// instead of resampling the sky. Name+paksha is a bijection over the 30 tithis (index 14 = Purnima
// in Shukla, Amavasya in Krishna); an unmatched name falls back to the old noon computation, since
// a wrong family is bad but no reading is worse. VERIFIED across 120 days: the reconstruction
// reproduces the calendar's number 120/120, zero fallbacks. 284 tests pass, build exits 0.
// v1.1.771 = 2026-07-19 — THE SHARED PANCHANG ROW (audit section 2/7). The `panchang` table is keyed
// on DATE ALONE, no location column, so the row is written by whoever opens that date FIRST at THEIR
// coordinates. The cached branch already recomputed the sunrise star, transitions and karana for the
// CALLER's location — but kept serving the STORED dominant nakshatra, tithi, paksha and Moon sign.
// Those decide the day's classical NATURE (input-builder feeds panchang.nakshatra straight into the
// muhurta day filter) and the activated house. MEASURED, Boston vs Tokyo over 60 days: the dominant
// nakshatra differs on 37 of them (61.7%), the tithi on 35, the Moon sign — hence the house — on 14.
// So one user's sky was setting the day's character for users in other timezones, and freezing into
// their paid readings. FIX: the location-correct values were ALREADY being computed in that branch
// and discarded; they are now preferred, with the stored row kept as the fallback if the recompute
// throws (degraded beats absent). No schema change and no migration — a location-keyed cache row is
// still the real fix and remains David's hand to run. 284 tests pass, build exits 0.
// v1.1.772 = 2026-07-19 — THE VISHTI VETO ACTUALLY VETOES (audit section 7). Bhadra "blocks
// INITIATING regardless of the axes" per the canon, but the code enforced that by regex-matching
// English prose (/beginn|launch|starting|new /) against the supports list. MEASURED: that catches 5
// of the canon's 47 supports strings — while travel, moves and relocations, vehicles, marriage,
// love and union, vows, foundations, planting and commitments-meant-to-last all sailed through.
// Those are the three things Bhadra forbids most (yatra, vivaha, any arambha), and a copy-edit to
// the prose silently changed what the veto blocked. FIX: each canon supports-string is classified
// once by ACT CLASS (initiate/journey/union/celebrate/sever/complete/continue) and Vishti cancels
// the first four, leaving the cruel deeds and the continuing work it classically permits. The map
// lives in day-filter.ts, NOT in muhurta-tables.json, because the canon file is the cited source
// and this classification is Velea's inference on top of it. A module-load guard throws if the
// canon ever gains a supports string the map does not classify, so a veto cannot silently stop
// cancelling something. VERIFIED with a control: across 7 natures x 15 tithis (105 cases), 129
// forbidden acts survived the OLD regex and 0 survive the new filter. 284 tests pass.
// v1.1.773 = 2026-07-19 — THE VETO THE PROMPT PROMISED AND THE DATA COULD NEVER CARRY (audit
// section 7). The prompt told the model that dayFilter.vetoes includes "Mercury's contest (finish
// and revise, don't launch)" — but DayFilterInput has no Mercury field, so that entry can never
// appear. The audit's proposed fix was to add Mercury to the filter. Checking the code first says
// otherwise: input-builder.ts:574 documents a deliberate design — "the rx law gates movement, not
// character" — and movementOf DOES cap Action at Build on a true retrograde unless a strong Moon
// punches through. David's rx-contest law is shipping; it just lives at the movement layer. So the
// defect was the PROMISE, not the engine: the prompt now says plainly that Mercury is not a
// dayFilter veto and arrives as input.mercuryRx (already having capped the movement upstream).
// The canon note in muhurta-tables.json claimed the law was "expressed as removing beginnings from
// supports", which no code did — corrected to describe what actually ships, with the old wording
// recorded. No astrology output changes; a false instruction is removed. Canon file verified intact
// after the edit (27 unique nakshatras, 5 families, 2-line diff). 264 tests pass.
// v1.1.774 = 2026-07-19 — THE DAY IS NAMED BY TRUE MAJORITY, SUNRISE TO SUNRISE (David: "it should
// be named by the majority starting at sunrise to the next sunrise, THOROUGHLY, not 6 samples").
// The old code sampled 6 points ~4h apart and counted them, so a transition landing between 41.7%
// and 58.3% of the day was decided by a 3-3 tie broken on key ORDER rather than duration; and the
// pada was assigned inside that loop, keeping the LAST value seen. Replaced with exact boundary
// bisection (~30s tolerance) summing REAL durations per value.
// THE TRAP, and it bit me first: it is tempting to assume at most ONE crossing per day (the Moon
// covers ~13.2° against a 13.33° nakshatra). FALSE when the day opens near a boundary. 2026-07-09
// opened at 13.23° — a tenth of a degree from Ashwini's edge — crossed to Bharani at 5:26 AM, then
// had a full nakshatra of room and reached Krittika before the next sunrise. My first attempt found
// only the first boundary, took the end value, and named the day KRITTIKA — skipping Bharani, which
// ruled ~99% of it. The tests passed; a dense-sampling control caught it. Now every boundary is
// walked and durations summed. VERIFIED: 45/45 days match an independent 10-minute dense sampling
// of the same window — by the same control that failed the first attempt. The pada is taken from the
// middle of the RULING star's own window (no pada can hold a majority of a day; the Moon crosses
// 3-4). Note: the day pada reaches no prose and no screen — stored only. 264 tests pass.
// v1.1.775 = 2026-07-19 — THE BANNED 2nd-HOUSE FRAMING, PURGED PROPERLY (audit section 1). v767
// fixed "self-worth" in two places and missed seven, including one on the SAME screen. All live
// sites now read "money, what you own, what you earn, your voice": WhyNowChain, TheWhySheet,
// CurrentTriggerBreakdown, ReasoningChain, the Astrology 2nd-house card, the Glossary entry, and
// the three profection theme strings. In the PROMPT, only the two DEFINITIONS were changed — the
// bald "The 2nd is what you own AND your self-worth" and the lead of the 2nd-house gloss. The
// nuanced GATE (prompts.ts:445-449 and 1439-1447) is deliberately UNTOUCHED: it already enforces
// David's law correctly — worth is reached only through the money, the speech, the possessions and
// the mouths you feed, and only when a self-planet genuinely links to the 2nd. Deleting that would
// have removed the enforcement along with the phrase. Also recorded in astronomy.ts what the CANON
// says about pada (it defines pada only as a property of a MOMENT — melana's nadi reckoning and the
// Arudha bhava padas, both natal; there is no canonical "day's pada"), so no ruling is pending.
// v1.1.776 = 2026-07-20 — THE RETIRED SURFACE NOBODY UNPOINTED (audit chain 5). Today's hero
// moved from the "glance" surface to "day_read" (v-Option-A) — but four consumers kept naming
// "glance" and so went silently blind, with nothing to throw:
//   (1) THE MODEL'S MEMORY. input.recentReads — the last 3 days of prose, the guard against the
//       "wallpaper era" where the same essay and the same directive ran four mornings straight —
//       read glance rows. No glance rows are generated any more, so for anyone who never pinned a
//       day, recentReads was ALWAYS EMPTY. The prompt's own escape hatch ("when recentReads is
//       empty, none of this constrains you") means the anti-repetition law had quietly been OFF.
//   (2) THE PIN. It ensure-generated a GLANCE — a whole billed generation of prose the user never
//       sees — then pinned that, while the read on screen stayed unpinned and free to regenerate.
//       Pinning now ensures day_read, which is already cached (the pin sits under it): cost ~0.
//   (3) THE PIN INVARIANT. getDayReadCached skipped its lock check entirely when refresh=true, so
//       the refresh button overwrote (and re-billed) the very prose the user chose to keep. The
//       deep read already guarded this; the day read — where the pin actually lives — did not.
//   (4) THE ARCHIVE. Kept Readings listed WHERE surface='glance' — empty for every new user. It
//       now lists both surfaces, one row per date (day_read wins, legacy glance fills the older
//       dates), and its snippet extractor knows the day_read shape: the old one looked only for a
//       `narrative` field and fell back to String(content) — raw JSON printed at the user.
// Fixed as a CLASS, not four patches: server/narrative/daily-surface.ts is now the one answer to
// "which rows are the daily reading, and where is the prose inside one?" — pure, zero imports,
// shared by the DB layer, the router and the input builder. 7 controls, each proven able to fail
// by running the OLD logic against the same fixtures (JSON blob leaked, prose came back "", the
// archive query returned 1 row of 3, PINNED_SURFACES lacked day_read). Cache identity is
// unaffected — dayStableHash already excludes recentReads (audit H1), so no re-bill.
// v1.1.777 = 2026-07-20 — THE GLYPHS, LOOKED AT. Not reasoned about: rendered at the true phone
// cell (390px viewport → 48.8px cell), measured, and screenshotted before and after.
// WHAT WAS WRONG: the mark rail's slot width was chosen from the mark count alone, but the crown
// renders in that same row at 17px and was never in the budget. "5 marks + ♛" asked for 5×8+17 =
// 57px of rail inside a 48.8px cell; "3 marks + ♛" asked for 53px. Nothing clamped it — the rail is
// absolutely positioned with nowrap, so the excess spilled silently into the days either side.
// Measured on the old code: three cells put their glyphs up to 4.1px OUTSIDE their own cell, which
// with the neighbour doing the same left ~0px between two clusters. That is why loaded days ran
// together into one strip and you could not tell which glyph belonged to which day.
// THE FIX IS THE BUDGET, not a nudge: RAIL_BUDGET = 40px is a hard ceiling and the slot width is
// SOLVED from it with the crown included (crown 17 alone, yielding to 14 when it shares the rail;
// one fewer slotted mark when a crown is present). Moon dot and € now ride their slot too. Measured
// after: 0 cells overflow, 3.4px of air on each side — ~7px of gutter between two fully-loaded
// neighbours. The common 0-2 mark day is pixel-identical; only crown rows and 3-mark rows change.
// WHY IT HID SO LONG: /audit rendered each coin in a ~116px tile — 2.4x the real cell — so this
// class of bug could not fail there. /audit now opens with a TRUE-cell-width strip: the same coins
// in a real 7-column grid at 48.86px, worst loads adjacent, each cell outlined. A rail that
// outgrows its day now crosses a visible line.
// v1.1.778 = 2026-07-20 — THE CROWN DAYS WERE LANDING ON THE WEAKEST MOON OF THE YEAR.
// The doctrine is convergence: a crown day is Velea's OWN tarabala AND chandrabala together. The
// year ranking sorted tara class → tara RUNG → and only then the Moon, and that ordering quietly
// made the Moon irrelevant — because tara and chandra are the SAME MOON. A tara rung pins the
// day-star to a narrow band of the zodiac, which pins the day's Moon SIGN to a near-fixed set of
// houses from the natal Moon. So "best star" decided the Moon's house before chandra was consulted.
// MEASURED, three real charts × a full year of real sky (crown-probe, 365 days each):
//   • EVERY Parama Mitra (rung 9) day of the year carried BAD chandrabala — 43/43, 41/41, 40/40.
//   • So all twelve "crowning days of your year" sat on houses 4/8/12 from the native's own Moon.
//   • The reading's own crown gate agreed with 0 of those 12, on all three charts.
//   • Two of one chart's twelve were rated CAUTION by the personal-weather layer on the same date.
//   • Meanwhile 82–101 days a year DID converge — and the calendar crowned none of them.
// FIXED at the definition: the top-12 pool is now the apex condition itself (tara favorable AND
// chandra favorable), ranked by the same ladder inside that pool. A year with fewer than twelve
// convergences gets fewer crowns, never padding — the count is reported as summary.convergent.
// WHY IT SURVIVED: it does not misfire on David's own chart. Whether the best rung lands on a good
// or an adverse chandra house depends on where the birth star sits inside its sign — the old
// ranking looked correct on the one profile the app is tested from and was 12-for-12 wrong on
// others. The regression test now asserts BOTH anchor sets against a real captured 365-day sky
// (the idealised generator locks tara and chandra together and cannot show this at all).
// Still open and NOT changed here: the reading's crown additionally requires a clean COLLECTIVE
// day (universal score ≥ 0), which the calendar's ranking does not consider — so ~9 of the 12
// still read as "favorable" rather than "crown" in the prose. That is a method question for David
// (his stated split is: golden = the collective sky, crown = the personal apex), not a code call.
// v1.1.779 = 2026-07-20 — THE HOUSE READER DIDN'T KNOW HOW THE KEEPER WAS DOING.
// A house's stored `lord` is {planet, placedHouse, placedSign, bhavaYoga} — WHERE the room's
// keeper lives, never HOW HE IS. So the read described the ruler of a room with no idea whether he
// was exalted, debilitated-but-cancelled, combust or fast asleep: a fallen keeper produced the
// same paragraph as an exalted one. The engine already held every bit of it in research.planets,
// and the Chapter Reader in the same file assembles exactly this via planetCondition — the House
// Reader simply never asked. Occupants had the identical hole: a list of bare NAMES, so "Saturn
// stands in this room" reached the model with no sense of WHICH Saturn.
// WORST WHERE IT SHOWS MOST: house 1 is one of the three FREE rooms and the one people open first,
// and it is the only house with no divisional route (vargaCheck = null) — so it had NO condition
// data at all, while the prompt still asked for a "varga shadow" beat. That is an invitation to
// invent, against this surface's own "no fairy tales — every claim traceable to input" law. The
// keeper's D1 condition now fills that place and the varga beat is explicitly conditional.
// Input assembly extracted to buildHouseReadInput() so it is provable without a database:
// 5 controls, incl. an exalted vs fallen keeper yielding demonstrably different data.
// House reads re-hash and regenerate once on next open (a handful of rooms, not a mass regen).
// v1.1.780 = 2026-07-20 — ONE MOON, ONE CLOCK (David: "2. majority").
// The day's STAR has been the star that rules the majority of the vedic day since the 2026-07-09
// ruling (made exact in v774). The day's SIGN was never revisited — it was still read at the
// sunrise INSTANT, justified in a comment as "more stable than nakshatra", which is the very
// reasoning the majority ruling overturned. That sign is what chandrabala counts from, so it was
// setting the crown, the day mode and the house.
// MEASURED, 365 real days: the Moon changes sign inside the vedic day on 43.8% of days, and on
// 21.1% of ALL days the sunrise sign was NOT the sign that ruled the day. Worst case 2026-08-02:
// the sunrise sign held 1% of the day and decided all of it.
// The day's sign now comes from the same boundary-walking majority engine as the star, with the
// same trap avoided (every crossing walked, real durations summed — not one assumed crossing).
// VERIFIED like v774 was: 120/120 days match INDEPENDENT 10-minute dense sampling, on a probe
// proven able to fail (27 of those 120 days, 22.5%, actually moved).
// THE SUBTLE HALF: baseMode is NOT the day's sign. It is the OPENING configuration of the intraday
// timeline, which finishDayMode walks forward across the sign/star boundaries — and the timeline
// already lands on the majority-ruling mode by itself. Deriving it from the ruling sign would open
// the day in a sign it only reaches at midday and then "flip" to itself: the "Build moves to
// Selective at 10:59 PM — so why is Selective showing?" bug. So the day's HOUSE now comes from the
// ruling sign while the timeline still opens on the SUNRISE sign, and calcPanchang exposes both.
// No migration: the cached-row path already prefers the freshly computed values (v771).
// v1.1.781 = 2026-07-20 — ONE CALENDAR, ONE CROWN. David asked what the textbooks say; they say
// the personal pair decides a day. METHOD.md Step 0: a DAY is judged by Tara Bala + Chandra Bala.
// The muhurta canon's own veto note: "the native's tara standing OVERRIDES the collective." The
// collective limbs classify what KIND of day it is, never how high it goes, and no canon rule
// makes a rough collective sky cancel a personal peak — the only stated interaction runs the other
// way. That is David's split exactly (golden = collective sky, crown = personal apex), so the
// universal/transit gates in the reading's crown were Velea inventions sitting on top of the canon.
// The reading's crown was ALSO its own definition: a threshold firing on 30-54 days a year (8-15%)
// while the prompt told the model it meant "one of their RARE personal peak days" — and it agreed
// with the calendar's twelve on ZERO days. Now personalApex.isCrown means exactly one thing: this
// date is one of the twelve crowned days of the solar year, from the SAME ranked year the calendar
// draws its marks from. rankedSolarYearFor moved out of routers.ts into vedic/ranked-year.ts so
// both surfaces read one implementation (the year walk measures ~0.1s and is cached in-process).
// The prompt was rewritten to describe what the field now IS — it was still telling the model the
// old gate definition, which would have been a lie to the model about its own input.
// Fail-safe: if the ranked year cannot be built, isCrown is FALSE, never a guess — the prompt's
// rule is "when isCrown is false, say NOTHING about crowns", so a failure costs a silence, never
// a false peak. Also finishing v780: the reading's chandrabala now takes the day's RULING Moon
// sign (dayMoonSignIdxOverride), so tara and chandra there are read off one clock too.
// v1.1.782 = 2026-07-20 — THE CANON THE APP NEVER OPENED. A census of server/vedic/canon showed
// THREE transcribed files imported by nothing: planet-in-house.json, karakas.json and
// bhava-significations.json. planet-in-house.json is a complete 12x7 table from Vol II Appendix III
// — what each graha INDICATES in each natal house — and its own note reads "Feed to the narrative
// as concrete specifics; do NOT paraphrase into 'work'." So the one surface whose entire job is a
// ROOM was inferring what its occupants mean there while the book sat unread in the repo, against
// the standing law to build from canon rather than inference.
// Now wired into the House Reader for every occupant of the room AND for the keeper in the house he
// actually lives in ("Speech, Friends", "Mineral Wealth", "Ability to Endure Hardship") — the
// concrete nouns that keep a room read specific instead of a mood.
// DELIBERATELY NOT WIRED: bhava-significations.json. What a HOUSE means is David's own living house
// doctrine, already carried in the prompt; his doctrine outranks the book there and that file is
// merge-never-replace territory, not a drop-in. karakas.json stays open — its knotSignificatorMap
// has no entry for wealth/parents/home/health, so a naive wiring would delete four themes.
// PROCESS NOTE, recorded because it is the kind of thing this audit exists to catch: this wiring
// was written mid-turn and swept into the v780 commit by a `git add -A` before its prompt existed,
// so for two commits the input carried canonIndications that no prompt ever told the model to read
// — dead data, in a commit whose message never mentioned it. Finished and tested here.
// v1.1.783 = 2026-07-20 — A PAID READING NO LONGER DIES ON A FAILED CACHE WRITE.
// The 2026-07-17 outage law says a cache-write failure must never kill a generated reading, and it
// did not — but upsertNarrativeCache returned VOID, so no caller could tell a failed save from a
// successful one. The reading was served, the row never landed, and the NEXT TAP generated the
// identical reading and BILLED FOR IT AGAIN. During that outage (cacheDate VARCHAR(10) rejecting
// the new longer keys) that was every tap, of every surface, indefinitely.
// A failed write now returns false AND parks the row in-process; getNarrativeCache serves it just
// like a table row, so every surface benefits with no change at any call site. It cannot serve the
// wrong thing: callers already gate on inputHash, so a held row that no longer matches misses
// exactly like a stale database row would. Per-process and lost on restart, which is right — this
// is a shock absorber for a broken table, not a second cache. Capped at 60, drop-oldest, with
// heldNarrativeCount() so a table rejecting writes is visible instead of silent.
// PROVEN: 6 controls, run through the same getDb()-is-null branch a broken table takes; 5 of the 6
// fail against the old code ("expected undefined to be false", "expected undefined to be defined").
// v1.1.784 = 2026-07-20 — A LOCKED ROOM NOW LOOKS LOCKED, AND THE ACCENT BECAME READABLE INK.
// (1) THE ROOM GATE WAS INVISIBLE TO THE CLIENT. Three rooms read free (the 1st, the Sun's, the
// Moon's); the server locks the other nine. The client knew nothing about that, so a locked room
// fell through to the FAILURE branch and read "The room is quiet right now" with an "Ask again"
// button that could never succeed. Nine rooms out of twelve presented the app as broken instead of
// presenting the premium layer, and invited a retry guaranteed to fail. Locked rooms now show the
// gate, honestly: which three rooms are open, and that this one waits behind the full reading.
// (2) MEASURING THAT NEW GATE TURNED UP A CLASS BUG. The day-mode accent is a SURFACE colour used
// directly as INK, and every accent fails WCAG on one ground or the other (4.5:1 for small text):
//        parchment  espresso            parchment  espresso
//   gold   2.75 X     5.79       wine     6.82      2.34 X
//   lime   2.74 X     5.82       red      5.46      2.92 X
//   teal   3.84 X     4.15 X     slate    5.11      3.12 X
//                                green    4.72      3.38 X
// One table explaining both long-running complaints at once — "gold not showing up on darker value
// colors" AND gold washing out on light — as ONE root cause, not two skins.
// shared/accent-ink.ts walks the colour's LIGHTNESS until it clears the ratio, preserving hue and
// saturation exactly: a Build day stays gold, it just becomes a gold you can read. It stops at the
// first colour that passes (smallest possible shift) and returns an already-readable accent
// untouched. 21 tests, incl. hue drift < 3 degrees for all 7 modes on both grounds.
// The three existing ad-hoc helpers (tonalInk, tonalInkY, DARK_LIFT — a hand-maintained table of 12
// hex pairs that silently no-ops for anything not listed) are the predecessors of this; none of
// them measures contrast. Applied here ONLY to the new gate. Sweeping it across the app is a
// VISUAL decision and therefore David's call, not mine — the measurement is in his hands.
// v1.1.785 = 2026-07-20 — THE DEFAULT BUTTON WAS NEAR-ILLEGIBLE IN THE DEFAULT THEME.
// Chasing the Full Spectrum --color-* gaps found something bigger sitting underneath. --primary is
// the SAME light brand gold in every theme block, so its foreground must be dark in every block —
// but html.light had it near-WHITE (#FBF6EC). Measured on the real rendered button: 1.95:1, against
// a 4.5:1 floor. That is `bg-primary text-primary-foreground`: the DEFAULT button variant, badges,
// checkboxes, the selected calendar day, and the chat bubbles — all carrying near-invisible labels
// in Oat Milk, the app's default theme. Same bug again in --accent-foreground and
// --sidebar-primary-foreground. Set to #1a1305 (8.77:1) — the value the other theme blocks already
// use for these exact tokens, so this is the system agreeing with itself, not a new colour.
// Full Spectrum inherits html.light and was fixed by the same lines: FS primary went 1.95 -> 8.77.
// VERIFIED by resolving the REAL computed tokens in a browser across light / dark / full-spectrum
// (8.77x on all three now). The probe resolves oklch() and color-mix() through a canvas, because
// its first version regex-parsed "oklch(0.767 0.139 91.1)" as if those were RGB channels and
// reported nonsense; it now carries a black/white sanity anchor that must read 21.0.
// The original FS audit came back mostly CLEAN: of the 7 --color-* tokens the app uses that the FS
// block does not set, 4 are painted at runtime by FullSpectrumController and the other 3 are the
// gold primary/accent, which are legible on FS's dark grounds by design.
// LEFT FOR DAVID (a palette value he chose, not an internal contradiction): light-mode
// --muted-foreground #8D8171 measures 3.48:1 on the card and 3.16:1 on the background, under the
// 4.5 floor for small text. Same hue 15% darker (#786E60) reaches 4.56/4.14. His call.
// v1.1.786 = 2026-07-20 — A CORRECTED BIRTH TIME COULD KEEP SERVING THE OLD CHART'S CROWN DAYS.
// Audit of the birth-data edit cascade (a blind spot nobody had checked). Most of it is sound: the
// chart, research, dashas, convergence, profection and transits all recompute, and unpinned
// narrative rows cannot survive because the natal data sits inside their cache hash.
// THE HOLE: the ranked solar year is memoised per profile, and its key carried the birth DATE and
// the Moon's star/sign — but the walk ALSO reads birthTime, lagnaSign and ascendantDegree through
// the convergence timeline that supplies its windows and chains. So correcting a birth TIME while
// the Moon stayed in the same nakshatra and sign — the common case for a small fix — hit the stale
// entry and kept handing out crown days computed from the pre-correction chart until the process
// restarted. That got sharper in v781, when the READING started taking its crown from here too.
// Fixed at both levels: the key now carries every field the walk reads (yr-v10), AND a chart
// recompute clears the profile's entries outright via invalidateRankedYear() — so the next cache
// field added to that function cannot silently reintroduce this.
// (The typecheck caught my first attempt shadowing the local `p2` pad helper — which is exactly why
// the build gate is on the exit code and not on grepping the log.)
// STILL OPEN, deliberately unimplemented — see DECISIONS_FOR_DAVID.md #3: a PINNED reading is
// served regardless of its hash, by design, so after a birth-data correction it keeps showing prose
// computed from a chart that is no longer theirs. Replacing words someone chose to keep is not a
// call to make alone.
// v1.1.787 = 2026-07-20 — EVERY PREMIUM GATE NOW LOOKS LIKE A GATE, NOT A BROKEN APP.
// v784 fixed the House Reader; this is the sweep for the CLASS. Server reading procedures return
// { available: false, locked: true } in seventeen places, and the clients only ever tested
// `available` — so a lock fell through to the FAILURE branch everywhere: "the chapter is quiet
// right now — try again in a moment", with a retry that can never open it. Only ONE client site
// (ProfectionYear's window read) had ever honoured the flag.
// Swept, via a single <LockedRead> so the next call site cannot forget the distinction:
//   · the Chapter Reader (4 server locks: no entitlement, not your lord, chapter not begun, a
//     sub-chapter ahead of the running one)
//   · both sub-chapter shelves      · the Life Atlas theme read      · the yoga read (3 locks)
// A genuine failure keeps its retry — which now means something, because it is no longer the
// locked path as well.
// AND A BUG IN MY OWN v784 HELPER, caught by measuring the finished component instead of trusting
// it: accent-ink's ground constants were eyeballed (#FBF7ED/#211B14) when index.css actually says
// --card is #F9F4EA light and #201A14 dark. Tuning the ink against a ground a shade lighter than
// the real one landed every light-mode label at 4.43-4.49:1 — under the 4.5 bar it was aiming for.
// Corrected to the real values: all ten labels (5 sites x 2 themes) now measure 4.52-6.7:1.
// v1.1.788 = 2026-07-20 — FINISHING THE GATE SWEEP I CLAIMED WAS DONE IN v787.
// Re-auditing my own run with fresh eyes: v787's message said "every premium gate", but the sweep
// covered 5 consumer sites and there were 9. Still falling through to a failure line were the two
// biggest gates in the app:
//   · YEAR-SIGHT (narrative.deepRead, canYearSight) on BOTH the Horoscope hub and the Profection
//     page — the headline premium read, telling non-entitled users it "couldn't be drawn just now"
//   · PICK-A-DATE (guardedDate) on the Horoscope's today read, the Cast sheet, and the Planner hero
// The Planner hero got a DIFFERENT treatment on purpose, and this is the part worth remembering:
// <LockedRead> inks its label against the CARD ground (parchment/espresso), but the hero is a
// saturated day-mode ground with its own --hero-ink. Dropping the shared component in there would
// have computed the label colour for a background that zone does not have — a fresh instance of
// the exact class v784/v785 were about. The hero uses its own ink idiom, like KeptReadings below it.
// Also: the hero previously rendered NOTHING for a locked date — not a broken message, but a silent
// dead end on the most-seen surface in the app, precisely where the pick-a-date gate should speak.
// v1.1.789 = 2026-07-20 — A BUG I INTRODUCED IN v780, FOUND BY RE-AUDITING MY OWN RUN.
// v780 made houseActivated the day's RULING house (majority) but left baseMode on the SUNRISE
// house. Those two had always agreed, and two places assume they still do: ReasoningChain, which
// explains the day as "the Moon is in house N, which gives mode M", and the narrative input, which
// ships activatedHouse alongside the mode. So on days where the Moon changes sign, the explainer
// contradicted itself and the model was handed a house that did not match its mode — a fresh
// instance of the exact "two clocks in one verdict" class the majority ruling exists to remove,
// introduced BY the fix for it.
// MEASURED over 90 real days: the two signs differ on 18, and on 13 of those the chain was
// self-contradicting ("house→Build but baseMode Restraint", "house→Action but baseMode Restraint").
// baseMode was doing two jobs. Now it is two fields: `baseMode` is the DAY's mode, from the ruling
// house, and always agrees with houseActivated; `baseModeAtSunrise` is the intraday timeline's
// OPENING config, which finishDayMode walks forward across the boundaries — that one must stay at
// sunrise or the day opens in a sign the Moon does not reach until midday and then flips to itself.
// Both service.ts paths (cached and fresh) updated to pass the sunrise one to the timeline.
// VERIFIED: 0 house/mode mismatches across 90 days, on a probe that names the 18 differing days so
// it cannot pass by being blind, and the timeline opening checked against the sunrise house on all
// of them.
// v1.1.790 = 2026-07-20 — THE LAST DEAD CANON FILE, AND THE DRIFT IT WAS HIDING.
// karakas.json was the third canon file imported by nothing (v782 wired planet-in-house and
// explained why bhava-significations stays out). The knot detector's theme table had been
// hand-copied from it — and had already drifted: career's karakas read [Saturn, Sun, Mercury]
// where Vol I Ch.4 says [Mercury, Sun, Jupiter, Saturn]. JUPITER WAS MISSING from vocation, so a
// Jupiter dasha, or Jupiter lighting the 10th, never registered as a career knot at all — the
// karaka of counsel, teaching and wisdom, absent from the theme it most belongs to.
// The six themes the canon indexes are now READ from it. The four it does not index stay local and
// explicit — wealth, home and health have no canon entry, and the canon splits father [9] /
// mother [4] where this engine reads one `parents` theme whose [4,9] is exactly their union.
// Deriving the whole table would have silently deleted four themes and split a fifth; that caveat
// was carried in the audit notes and is now enforced by a test instead of a memory.
// PROVEN: 10 controls. The honest one is isolated — reverting ONLY the career line fails exactly
// two assertions ("expected [Saturn, Sun, Mercury] to include Jupiter"). My first control run was
// worthless: stashing the file removed the test's export too, so all ten failed because the table
// was undefined, not because of drift. A probe that fails for the wrong reason proves nothing.
// v1.1.791 = 2026-07-20 — DAVID'S THREE ANSWERS, BUILT.
// (1) "keep accuracy" — a chart recompute now RELEASES every pin on that profile. A pinned read is
// served whatever its input hash says, so after a birth-data correction it kept showing prose from
// a chart that was no longer the native's (the year read included). Releasing the hold lets the
// corrected reading generate on next open. Nothing is deleted: the rows and their words stay until
// that date is actually reopened.
// (2) "sweep it" — --day-accent-ink now rides alongside --day-accent: the same hue and saturation,
// moved in lightness only until it clears 4.5:1 on the ground in use, and byte-identical when the
// accent already passes. TEXT reads the ink; fills, tints, borders and marks keep the raw accent,
// which is what makes this an evolution rather than a recolour. Measured across the six live coins:
// in LIGHT 5 of 6 failed (gold at 1.92:1) and now sit at 4.54-4.72; in DARK only the caution ruby
// failed (2.62 -> 4.55) and the other five are unchanged.
// (3) light-mode caption grey: #8D8171 (3.48:1 on the card) -> #786E60 (4.56:1). Same hue, 15%
// darker. Light mode is otherwise untouched — this was never a light-vs-dark question, it was the
// small grey text being too pale to read, and David was right that it should not have been a choice.
// HONEST SCOPE: 38 text sites were swept — every one that reads useDayModeColor(). 49 remain that
// receive their colour as a PROP (planet inks, sign colours, per-card accents), which the hook
// cannot reach. Those need the ink applied at the text site itself. NOT claiming a finished sweep
// this time (see v787/v788, where I claimed one and had done five of nine).
// v1.1.792 = 2026-07-20 — THE SWEEP, FINISHED (David: "finish. i'm not checking half done work").
// v791 swept the 38 sites reading useDayModeColor(). The other 49 receive their colour as a PROP —
// planet inks, category colours, mode colours, per-card accents — which a hook cannot reach.
// MEASURED, and it is not a near-miss: EVERY planet colour and EVERY mode colour fails as text on
// one ground or the other. Moon 1.66:1 on light, Mercury 1.68, Venus 1.76, Sun 1.98, Jupiter 2.11;
// Mars 2.64 and Saturn 2.44 on dark; Ketu, Action and Selective fail on BOTH. 19 of 19 colours.
// (PLANET_COLORS_PARCH — "tuned for legibility on the parchment chart" — was a hand-made partial
// answer to exactly this, for one surface. The fourth ad-hoc predecessor, after tonalInk, tonalInkY
// and DARK_LIFT.)
// client/src/lib/ink.ts is the one entry point: inkOf(colour) maps the day-accent var to its
// published twin, solves a hex against the ground in use, and returns anything it cannot reason
// about (color-mix, oklch, gradients) UNTOUCHED rather than guessing. 64 call sites; 0 raw accents
// left as text.
// THREE THINGS I GOT WRONG AND CAUGHT BY LOOKING:
//  · CalendarCoin — the script inked the coin's NUMBER, which sits on the coin's own FILL, not the
//    card. Wrong ground, and the hover handler resets to the raw value. Reverted.
//  · TimeLordMovement — its labels are WHITE on a gradient in immersive mode. Inking the resolved
//    value would have darkened white text on a dark gradient. Now inked at the source, in the
//    card-ground branch only.
//  · AppHeader — a border mix got read as a background tint. A border does not change the ground.
// AND A FLAW IN THE HELPER ITSELF: chips are drawn on color-mix(colour N%, card), so the pixel
// behind the text is the card TINTED BY THE VERY COLOUR being inked — not the card. Solving against
// the untinted card left them at 3.9:1 where 4.5 was intended. inkOf now takes the tint and
// reconstructs the real ground; worst case went 3.9 → 4.51. Measured, not assumed.
// v1.1.793 = 2026-07-20 — THE READING THAT SPINS FOREVER. Found while bringing the audit sheet up
// to date: the sheet's "spinners" row was still open and I had NOT fixed it — v787/v788 added the
// LOCKED branch beside this gate without touching the gate itself.
// `data === undefined ? <Loading/>` also matches an ERRORED query, so a failed call spins
// indefinitely and the reader waits for something that will never arrive. Now gated on the fetch
// state, so a failure fails honestly. Checked the rest: the Atlas uses isLoading, which is false on
// error under React Query v5 (isPending && isFetching), so it already fell through — the Horoscope
// hub's two reads were the only surfaces with this gate.
// v1.1.794 = 2026-07-20 — THE READING WAS STILL BEING HANDED TWO CLOCKS.
// Found by re-auditing the audit sheet itself: v789 split the engine's base mode into the day's
// (from the RULING house) and the timeline's opening (from the SUNRISE house) — and the narrative
// never read either of them. input-builder shipped `mode: field.finalMode`, which finishDayMode
// evaluates at the CURRENT SEGMENT for today, beside `activatedHouse: field.houseActivated`, which
// is always the day's ruling house. So on the ~21% of days the Moon changes sign inside the vedic
// day, the model was handed a house and a mode describing two different halves of that day — the
// exact class the 2026-07-20 ruling exists to remove, alive in the one path that bills.
// finishDayMode now always computes the MAJORITY configuration as well and returns it as
// dayMode/dayQualifier/dayModeReason — the day-scale triplet travels together, so no explainer can
// narrate one scale's house beside another scale's mode. The narrative, the /audit diagnostics and
// the narrative-input script read the day scale; the hero and the intraday timeline still read
// finalMode, which is correct for them. gateDayField carries BOTH scales through the interaction
// mode and the Personal Weather Gate — a contained day is contained all day, on both clocks.
// Controls that fail against the old code: day-scale-mode.test.ts stands at 3:00 AM local (before
// a 6:30 AM sign crossing) and proves the moment reads Action while the day reads Restraint, and
// that the day's answer is identical to the same date read as "not today"; day-scale-gate.test.ts
// proves the gate and the interaction mode reach the day scale. 31 files, 317 tests, 0 failures.
// EXPECTED SIDE EFFECT: on days where the two disagreed, the narrative input hash changes, so those
// readings regenerate once. That is the wrong data being replaced, not churn.
// v1.1.795 = 2026-07-20 — THE CACHED PANCHANG ROW STILL NAMED SOMEONE ELSE'S SKY.
// The `panchang` table is keyed on DATE ALONE, so the row belongs to whoever opened that date
// first, at THEIR coordinates. The 2026-07-19 mitigation recomputed the sky at the CALLER's
// coordinates and used it for everything derived — house, mode, day filter — and then handed back
// the STORED moonSign, nakshatra, pada and sunrise anyway. That is worse than the bug it was
// closing: a Seoul reader got Seoul's day character printed over Boston's star, so the reading's
// derived character and the sky it names disagreed with each other. The recomputed values were
// sitting in scope, already fallback-guarded, and were being discarded at the emit. Now emitted.
// AND THE FALLBACK IT PROMISED WAS NOT REAL. calcPanchang does not throw on unusable coordinates —
// it returns NaN longitudes, which then threw out of karanaFromLongitudes BELOW the catch and
// killed the whole read, cached row and all. "A degraded read beats no read" was a crash. A
// non-finite recompute is now discarded exactly like a throw. Found by writing the third control
// rather than by reading the code — the fallback branch had never been exercised.
// Control: cached-sky-location.test.ts poisons the row with a sky no location produces (sunrise
// 11:47 PM) and asserts the emitted field matches an INDEPENDENT calcPanchang at Seoul, that the
// derived house still agrees with the emitted sign, and that an impossible recompute serves the
// stored row instead of throwing. 33 files, 326 tests, 0 failures. Build exits 0.
// STILL TRUE, and David's to run: a location column on the panchang table is the real fix. This
// closes the leak at the read; the row is still shared.
// v1.1.796 = 2026-07-20 — DAVID'S OWN CHART, READ AGAINST DAVID'S OWN LAW.
// The law is written at the top of vedic/dignity.ts: dignity and cancellation ALWAYS travel
// together, because a raw debilitation is a TRAP — a cancelled fall (neecha bhanga) is the
// fall-then-rise, often a raja yoga. That module has computed the cancellation since the day it was
// written. No consumer ever asked it. The life-area lens and day-frame both classify on labels from
// the OTHER dignity module (panchang/dignity.ts), which has no concept of cancellation at all, so
// day-frame's STRAINED set matched the bare string "Debilitated" and called a cancelled fall
// strained. David's Moon is debilitated in Scorpio, CANCELLED. The path is admin-gated, so it fired
// on him and almost nobody else.
// labelWithCancellation() in vedic/dignity.ts is now the one owner of an honest label. It refuses
// to call a cancelled debilitation strained and hands back the classical reasons so the prose can
// say what happened — and it deliberately does NOT upgrade the fall to "supported": that weighting
// is David's call, not a helper's, so a cancelled fall lands in neither bucket. It also never
// softens what it could not check (missing longitudes, a node, a non-finite ascendant all pass
// through as "Debilitated") — silence is not cancellation. Applied to the RASI dignity only: there
// is no canon in this repo for cancelling a debilitation inside a divisional chart, and inventing
// one would be worse than leaving the varga label bare.
// Both consumers now route through it: the lens (which carries cancelledDebilitation + reasons on
// PlanetState) and day-frame's houses-8/11 branch, which reads natalByPlanet directly and would
// otherwise have kept the exact bug the lens path just closed.
// Also deleted a stale comment that claimed the avashta engine does not exist. It is 284 lines and
// has existed since 07-15 — the comment lied for five days and an audit believed it.
// Control: cancelled-debilitation.test.ts, 8 assertions, on two hand-built charts (one that cancels
// by dispositor-in-kendra, one where every classical condition is denied). My first "does not
// cancel" fixture put Venus in a kendra from the Moon and the test caught it — the fixture was
// wrong, not the code, and the reasoning is written into the file.
// 34 files, 334 tests, 0 failures. Build exits 0. No new tsc errors.
// v1.1.797 = 2026-07-20 — WHAT A CANCELLED FALL READS AS, TAKEN FROM THE BOOK.
// v796 pulled David's cancelled Moon out of "strained" and deliberately left it in neither bucket,
// because what a cancelled fall IS is a method question. He asked what the textbooks say. They say
// it plainly, in canon/yogas.json universalRules, ingested from Kurczak & Fish Vol I Ch.10:
//   neechaBhanga — "a debilitated planet ... has its debility cancelled and CAN ACT AS IF EXALTED."
//   dashaGate    — "a yoga is LATENT until its planets' period activates it."
//   noYogaDominates — "never give an unmodified textbook reading of a yoga."
// His ruling: take the book at its word — supportive, gated on the dasha. So there are two labels
// now, and the gate is the canon's own rule rather than a dial I invented:
//   · a running dasha lord is the fallen planet or one of its cancellers → ACTING AS EXALTED (supportive)
//   · otherwise                                                          → CANCELLED, LATENT (neither)
// Never strained again either way, because the chart does cancel it. neechaBhanga() now returns `by`
// — the planets that FORM the cancellation — because dashaGate cannot be applied without knowing
// whose period counts, and both consumers pass their running lords in. noYogaDominates is honoured
// by carrying the reasons through to the prose so it modifies rather than recites.
// The gate is one-directional: an unknown or absent dasha is LATENT, never assumed running.
// Controls: 12 assertions. Two of my fixtures were wrong and the tests caught both — Venus in Leo is
// a kendra from a Scorpio Moon (so it cancels), and Venus is a FORMER in the cancelling chart (so it
// activates). Both corrections are written into the file; the code was right each time.
// 34 files, 338 tests, 0 failures. Build exits 0. No new tsc errors.
// STILL OPEN, and David's to rule: the code's cancellation CONDITIONS are the four commonly-cited
// Parashari ones, while the ingested canon states a narrower rule (association with an exalted
// planet). Engine and book disagree about WHEN a fall is cancelled, before what it means.
// v1.1.798 = 2026-07-20 — THE HEAVY LORD WAS MANUFACTURING CHAPTERS OUT OF ONE LORD.
// The sheet said the live knots and the stored timeline disagree about the same chart, and they did:
// the heavy-lord law (David 2026-07-17, the Simone proving case — "when a dasha lord lands on the
// Meridian, it's the whole reading") was applied in convergence.ts AFTER buildKnots returned, so the
// live layer never obeyed it. knots.ts even carried a comment saying the meridian is "never a
// convergence line", two days older than the law that says it is. I moved the weighting into
// buildKnots so both paths compute one law — and the founding-wound test in knots.test.ts failed
// immediately, which is the finding neither the sheet nor five audit agents had reached:
// GATING ON THE WEIGHT LETS ONE LORD LIGHT A CHAPTER ALONE. A single axis-seated maha lord doubles
// to 2, clears the >= 2 gate, and stands as a "standing chapter" with NOBODY agreeing with it — the
// exact phantom the v430 rebuild removed. And the STORED timeline has gated on weight since v639,
// so every profile stored since then can carry chapters lit by one lord.
// The law reads correctly as INTENSITY, not agreement: "it's the whole reading" is about how loud a
// real chapter is, not about inventing one. So: `weight` (convergence + one per axis-seated tied
// lord) RANKS, and the honest lord COUNT GATES. Both paths compute both numbers in buildKnots.
// convergence.ts now passes meridianOnAxis in and stores the head-count as `convergence` — it had
// been storing the WEIGHTED number in that field, so a stored row claimed more tied lords than it
// listed. windows.ts takes `peak` from weight, which is where loudness belongs, with a fallback that
// leaves pre-v798 rows reading exactly as they did.
// RESEARCH_ENGINE_VERSION → "research-v3-lordgate". That is the only lever that reaches stored dasha
// and convergence rows (DASHA_ENGINE_VERSION and CONVERGENCE_ENGINE_VERSION are read by nothing), so
// every profile rebuilds all three layers on next read. Pure computation — no LLM, no billing.
// Controls: 4 new convergence assertions including a founding-wound probe that COUNTS what it
// checked and fails if it checked nothing, plus a live-vs-stored equality test that asserts the
// weighting was actually exercised so the agreement cannot be vacuous.
// 34 files, 342 tests, 0 failures. Build exits 0. No new tsc errors.
// v1.1.799 = 2026-07-20 — SATURN WAS MISSING FROM HEALTH, ONE CANON TABLE OVER.
// v790 wired karakas.json's knotSignificatorMap and found career missing Jupiter. That index covers
// only six themes, so the other four stayed hand-listed — and karakas.json ALSO carries
// houseKarakaTable (Vol I Ch.7, p66-90): the karaka(s) of every house 1..12. Three of the four local
// themes are house-defined, so their karakas ARE that table's union over their houses, and the
// hand-listing had already drifted: health (houses 6 and 1) carried [Sun, Mars] while the canon
// gives the 6th to [Mars, SATURN]. Saturn — chronic illness, depletion, longevity — was absent from
// the vitality theme, so a Saturn dasha never tied to health through the karaka path. Identical
// shape to career's missing Jupiter, in the table nobody had opened.
// wealth, home and health now derive from houseKarakaTable and a test asserts the equality, so
// three coincidences became three enforced facts. `parents` deliberately does NOT: the two canon
// tables disagree there (the house table would add Mercury via the 4th) and knotSignificatorMap's
// father ∪ mother is the index written for this question — where the canon has a purpose-built
// answer it outranks the general table. A test asserts that divergence is chosen, not drift.
// AUDIT NOTE, since I was told to question the agents: the audit agent that raised this cited a key
// name that does not exist in the file ("houseKarakas") and a line number that is not the table. The
// VALUE it quoted was right and the finding was real. Checked before acting, not after.
// 34 files, 347 tests, 0 failures. Build exits 0. No new tsc errors.
// v1.1.800 = 2026-07-20 — GAJA KESHARI COULD NEVER FORM. FOR ANY CHART. EVER.
// I set out to add the canon cancellations to Kemadruma and Sakata — both ship a verdict about a
// person's whole life ("loneliness, a poor or difficult life") and both were missing the neutralizing
// clause stated in their OWN canon entry. Writing the control for the Gaja-Keshari cancellation is
// what exposed the real bug underneath: the test could not make Gaja Keshari form at all.
// combustion() returns a REPORT — { combust, orbDeg, limitDeg } — for every orb-bearing planet, and
// yoga-detect did `!!combustion(...)`. An object is always truthy, so isCombust() was TRUE for every
// planet except the Sun, on every chart. Consequences, in opposite directions:
//   · GAJA KESHARI is gated on !isCombust("Jupiter") → it could NEVER fire. One of the best-known
//     benefic yogas, permanently dark — and it is also one of the three cancellers of Kemadruma, so
//     its absence made the loneliness verdict fire MORE often.
//   · "Dur" is gated on isCombust(l) || … → its arm was always true, so it fired far too readily.
// natal-states.ts:84 carries a comment warning about exactly this trap and golden-hour.ts reads
// `?.combust` correctly. This file was the one that fell in. Swept the other callers: no others.
// THE CANCELLATIONS, from canon/yogas.json: Kemadruma is neutralized by the Moon in a kendra/trine,
// conjunct another planet, or forming Gaja Keshari; Sakata is not formed with the Moon in an angle
// to the Ascendant. Both clauses are measured FROM THE ASCENDANT, so they read the lagna sign rather
// than the running frame — referencing them to the frame would make the Moon trivially house-1 in
// the chandra frame and auto-cancel both afflictions for every chart, while silently breaking the
// FRAME_INDEPENDENT contract these two are declared under. detectInFrame now takes the ascendant
// explicitly, and the navamsha run passes the D9 lagna rather than the D1 one.
// One judgement flagged rather than made silently: the canon excludes the Sun and the nodes from
// Kemadruma's own 2nd/12th condition but states no exclusion for "conjunct another planet", so the
// Sun counts as a canceller here — the literal reading, and the one that prints the bad verdict at
// fewer people.
// Controls: 15 assertions in the first test file these 42 detectors have ever had, each with a
// denominator — the yoga is shown FORMING before each cancellation is shown stopping it, and Gaja
// Keshari is shown still refusing when Jupiter genuinely is combust. My first "Dur" probe was
// degenerate (six planets stacked in one sign) and proved nothing; it was replaced with a targeted
// pair where combustion is the only thing that can satisfy the arm.
// 35 files, 362 tests, 0 failures. Build exits 0. No new tsc errors.
// v1.1.801 = 2026-07-20 — TWO PLACES THE ENGINE INVENTED DATA RATHER THAN ADMITTING IT COULD NOT.
// One class, two instances, both about refusing to fabricate.
// (1) POLAR DAY AND NIGHT. Above the Arctic circle the Sun does not cross the horizon for weeks. The
// solver clamped the hour-angle cosine into range and returned a time anyway, so the app reported a
// sunrise that never happened — and the whole vedic day is anchored to that instant, so the
// nakshatra, tithi, paksha, karana and the majority walk were all keyed to a fiction with nothing
// saying so. The clamp STAYS (every caller needs a number, and solar transit ± 12h is the
// least-wrong anchor) but the fabrication is now declared: AstronomyData.noSunrise is "polar-day" /
// "polar-night" / null. Shadbala already refused honestly here; this path now at least admits it.
// Verified against real latitudes: Longyearbyen at 78.22°N reports polar-night on 21 Dec and
// polar-day on 21 Jun and NULL at the equinox — the denominator that makes the flag mean something
// — and Boston reports null on all three.
// (2) THE UNKNOWN PLANET THAT BECAME THE SUN. transit-calculator did `SE_INDEX[name] ?? 0`, and
// index 0 is the Sun, so any unknown name silently returned the Sun's longitude and speed. That is
// the identical trap that made Rahu report the Sun before v550, whose rule — "unknown planets now
// throw instead of impersonating the Sun" — was applied in birthchart/calculator.ts and missed here.
// Latent (every current caller passes a known lord), which is exactly when it is cheapest to close.
// 39 files, 397 tests, 0 failures. Build exits 0. No new tsc errors.
// v1.1.802 = 2026-07-20 — TWO MONEY LEAKS, BOTH FROM A CHECK THAT WAS IN THE WRONG PLACE.
// (1) THE VERDICT REGENERATED ON A CLOCK. verdict.ts computes currentAge from new Date() rounded to
// 0.1 of a year and returns it in the payload; getVerdictCached hashed the WHOLE payload, so the
// hash flipped every 36.5 days with no change in meaning — the reading regenerated and billed, and
// the peek's hash comparison failed so the door reappeared claiming an already-read verdict was
// unread. Ten times a year, per profile. The age is now excluded from the cache IDENTITY only: the
// model still receives it, and everything the age actually decides stays hashed — each area's
// `tense` is computed FROM currentAge and lives in `areas`, so a genuine crossing still busts the
// cache. Same law as dayStableHash. SURFACE_VERSION also gained a `verdict` key: it had none, so
// the only lever that could bust this surface was PROMPT_VERSION, which regenerates EVERY surface
// for EVERY profile.
// (2) A PINNED READING WAS OVERWRITABLE. The pin was enforced only by the read paths refusing to
// regenerate; upsertNarrativeCache — the last line of defence and the only code that touches the
// words — never looked at `locked`. Any path that reached generation for a locked row silently
// replaced prose the user had explicitly kept. It now checks before it writes, and deliberately
// does NOT park the rejected prose in the held-rows map: holding it would serve the new words from
// memory on the very next read and defeat the pin from the other side.
// Controls: the verdict hash test proves the age ticking does NOT move the hash while a real tense
// crossing DOES (without that second half the fix is indistinguishable from "never bust"); the pin
// test mocks drizzle at the connection and drives the REAL upsert, asserting a locked row takes no
// insert, an unlocked row does, and nothing is held behind a refused write.
// 59 files, 588 tests, 0 failures. Build exits 0. No new tsc errors.
// v1.1.803 = 2026-07-20 — A PAID PICK-A-DATE READING HAD EXACTLY ONE DURABLE HOME.
// getLifeAreaRead holds NO narrative_cache at all — only a per-flight dedupe — so the horoscopes
// snapshot is the only thing standing between a purchase and a re-bill. v783 fixed the "failed save
// reports success" half everywhere else; this surface still returned available:true after a failed
// freeze, and because nothing else persists it, EVERY future tap regenerated and billed again. For
// ever. That is the 2026-07-17 outage class in its purest form: the failure mode is a column the
// write does not fit, and the user is charged repeatedly for a reading they already bought.
// A failed freeze now parks the reading in narrative_cache (which carries its own in-process shock
// absorber for the case where that write ALSO fails), and the reveal path checks there BEFORE
// generating — serving the reading free and retrying the freeze, so the snapshot heals itself the
// next time the table will accept it. Key is `${date}:${lifeArea}`, 17 chars, inside both the
// surface and cacheDate widths — deliberately checked, since an over-long key IS the outage.
// 59 files, 588 tests, 0 failures. Build exits 0. No new tsc errors.
// v1.1.804 = 2026-07-20 — 855 TOKENS OF LAW WERE BEING READ AS A CROSS-REFERENCE.
// The RECENT READS doctrine — the whole anti-repetition law, written after the 2026-07-10
// "wallpaper era" when the same essay ran four mornings straight — had been pasted into the MIDDLE
// of the personalApex FIELD GLOSS, after an opening double-quote that never closed on its line.
// What the model actually read was: 'isCrown TRUE = a rare peak day … See "RECENT READS — ONE
// CONTINUING STORY…' then 37 lines of doctrine, then '…PERSONAL APEX — THE CROWN DAY" in the glance
// task.' So the law was presented as the CONTENTS of a cross-reference, and the crown reference the
// sentence was actually making was severed across 40 lines. It has been that way since 07-10 and
// survived four audits. The identical doctrine appears correctly, as its own top-level section, in
// the other prompt — which is how it was supposed to look here.
// Lifted out verbatim into its own section and the one-line cross-reference restored. The text the
// model receives is byte-identical, only its position changed, so NO PROMPT_VERSION BUMP: nothing
// regenerates and nobody is billed for a formatting fix.
// Control: a structural test, because the defect is textual POSITION — it asserts the heading only
// ever starts a line (an indented one is inside a gloss), that the crown cross-reference is whole,
// that the doctrine's teeth are all still present (a move, not a delete), and that the gloss no
// longer leaves an unterminated quote.
// 59 files, 592 tests, 0 failures. Build exits 0. No new tsc errors.
// v1.1.805 = 2026-07-20 — THE GLANCE IS ACTUALLY RETIRED NOW.
// v776 "closed by retirement" was my claim and it was false — the re-audit found two live paths
// still standing. (1) An ADMIN BUTTON called generateGlance DIRECTLY: no guard, no corrective
// retry, no scrub, no daily-cap accounting, and it exercised the RETIRED surface, so a green result
// said nothing about the reading the user actually opens. It now runs the LIVE day read through the
// normal cached path, so the probe answers the question it claims to answer and a repeat press
// costs nothing. (2) narrative.glance was still an exposed tRPC procedure — a billed endpoint any
// authenticated client could call to generate prose no human would ever see, and the last path in
// the app that could still WRITE glance rows.
// Procedure, getGlanceCached, generateGlance, GLANCE_SCHEMA and GlanceContent: gone. Four dev
// scripts repointed to the day read and two deleted outright.
// DELIBERATELY KEPT: "glance" in DAILY_SURFACES and PINNED_SURFACES, so legacy rows already in the
// table still appear in Kept Readings and still honour their pins. Retiring a surface must never
// delete what someone already saved.
// PROCESS NOTE, because it nearly shipped: my first removal cut by "start marker → next export",
// which silently swallowed DEEP_READ_SCHEMA and SECTION — code the deep read depends on. tsc went
// 7 → 16 and caught it. I reverted the file and re-cut by three explicit named boundaries instead
// of by offset. Net type errors introduced: zero. The lesson is the same one this audit keeps
// teaching — an offset is not a boundary.
// 59 files, 592 tests, 0 failures. Build exits 0. Still exactly the 7 pre-existing tsc errors.
// v1.1.806 = 2026-07-20 — THE DAILY CAP WAS COUNTING RESULTS, NOT CALLS.
// It counted one event per non-null generation, which was wrong in both directions at once:
//   · callGuarded makes up to THREE model calls — an attempt plus two corrective retries when a
//     guard trips — all counted as ONE. A 50/day cap was really up to 150 calls against a wallet
//     with a $20/month ceiling.
//   · A generation that burned those three calls and still came back null counted as ZERO, because
//     the old rule was "only count a REAL generation". Money spent with nothing to show is exactly
//     what a cap exists to bound; it was invisible at the moment it mattered most.
// The meter counts the CALLS. That needs no special case for a dry wallet — with no key the request
// is never made, so nothing is counted, and audit LOW-14's original intent still holds.
// AsyncLocalStorage rather than a module-level counter, deliberately: generations run concurrently
// for different profiles, and a global counter read before and after an await would attribute one
// profile's retries to whoever happened to be measuring. A test asserts that separation directly.
// STILL OPEN and genuinely David's: the DURABLE count is `rows in narrative_cache since UTC
// midnight`, scoped by profileId — so regenerating one row a hundred times still reads as one, and
// N profiles gives one user N times the cap. Both need a schema change (a generations table or a
// column), and schema changes are hand-run scripts here, never automatic. Half-fixing it in memory
// would be a band-aid over the same hole.
// 60 files, 597 tests, 0 failures. Build exits 0. Still exactly the 7 pre-existing tsc errors.
// v1.1.807 = 2026-07-20 — THE INK SOLVER OVERSHOT, AND ITS OWN TEST COULD NOT SEE IT.
// accentInk promises, in its own comment, "the closest to the original that works". It did not
// deliver that: the lightness sweep STARTED AT 0.5 and walked outward, skipping the whole range
// between the colour and mid-grey. A mid-dark accent on the espresso ground could not be returned
// below 0.5 no matter how small a move would have cleared the bar. Measured on the real palette:
// restore #3C8A7A on espresso needs 4.5 and landed at 6.70 — a visibly brighter teal than the
// palette colour, across 71 call sites. Starting the sweep at the accent's OWN lightness makes the
// promise true: the first clearing step IS the nearest lightness that clears. restore now lands at
// 4.53, and every mode accent on both grounds lands in [4.5, 6.0).
// THE TEST THAT EXISTED COULD NOT CATCH IT, and that is the more useful finding. Its
// "moves as little as it has to" case used build-on-parchment — an accent whose lightness happens
// to sit near 0.5, so the broken sweep gave nearly the right answer — with a ceiling of 6.5 that
// never tripped. A loose bound on a convenient fixture is exactly how a real defect passes a green
// suite. Added the case that fails (restore on espresso, ceiling 5.5) plus the general form over
// every accent × both grounds, and VERIFIED the pair fails against the old solver and passes
// against the new one, rather than assuming it.
// NOT TOUCHED, because they are David's palette calls and not bugs: the crown octagram at 1.18–1.61
// on its own gold coin, and the dimmed-parchment muted ink at 2.29. Both now have measured numbers
// and a working tool; the decision is his.
// 64 files, 650 tests, 0 failures. Build exits 0. Still exactly the 7 pre-existing tsc errors.
// v1.1.808 = 2026-07-20 — THE TOP RUNG OF THE BELL LADDER HAD NEVER ONCE FIRED.
// Two defects, one shape: the code was written and nothing read it.
// (1) THE CROWN. POOL.crown has carried David's line — "Heavy is the head that wears the crown —
// who cares. Today is yours, honey." — since it was written, and the selector never looked at it.
// It went straight to the eclipse rung, so a CROWNED day, one of the twelve apex days of a person's
// whole solar year, rang the ordinary stage line. Crown > eclipse > retroshade > waterfalls >
// horizon > ordinary is his blessed ladder and its top rung was decorative. It is the only PERSONAL
// rung, which is exactly why it sat unwired while every collective rung got built: the selector
// works from the shared sky and cannot see one chart. The caller now resolves it per user, from the
// SAME ranked solar year the calendar and the reading were repointed to in v778/v781 — so the bell
// can never announce an apex the calendar does not show. It fails to FALSE, never throws: a bell
// that rings the ordinary line is a small loss, a bell that throws costs the morning.
// (2) THE REACH. The ring loop read users.locationTimezone and nothing else, so anyone who never
// set a current location had no clock, failed the hour check, and was never rung — permanently.
// The app already knew their timezone: every profile carries a hometown (backfilled from birth) and
// a birth timezone, and resolve-day-sky's standing order is current → hometown → birth. The bell
// was the one surface off that order. Only users still missing a clock are looked up, so a fully
// located userbase costs nothing, and localClock's "skip, don't guess" contract is untouched — the
// fix adds SOURCES, it does not invent a timezone.
// Controls: 7 structural assertions, verified to fail against the pre-v808 file by reverting only
// push.ts and re-running. They pin the ladder ORDER (crown above eclipse), the shared crown source,
// the fail-to-false, and the precedence order itself.
// 65 files, 657 tests, 0 failures. Build exits 0. Still exactly the 7 pre-existing tsc errors.
// v1.1.809 = 2026-07-20 — THE BOOK, PROPERLY. And what it says is not what the engine does.
// David asked twice for a deep dive on neecha bhanga. Result: canon/neecha-bhanga-provenance.md,
// condition by condition, with the Sanskrit read compound-by-compound rather than taken from a
// summary. Findings, in order of how much they matter:
// · Phaladeepika 7.30 reads नीचोच्चभेशौ — nīca-ucca-bha-īśau — "the LORDS of the debilitation and
//   exaltation SIGNS, both or even one, in a kendra." The popular English rule "a debilitated
//   planet IN A KENDRA is cancelled" reads the planet itself into a clause about two lords. It is a
//   mistranslation, it is everywhere (the same search that returns the Sanskrit returns the corrupt
//   reading two paragraphs later), and this engine has never implemented it. Good.
// · CONDITIONS 2 AND 3 IN dignity.ts ARE ONE VERSE under two competing glosses of that compound —
//   "the lord of the exaltation sign" vs "the planet exalted in that sign". Firing both
//   double-counts a philological disagreement, and `count` is used ("≥2 is a solid cancellation").
// · Phaladeepika 7.27 (both lords in mutual kendra to EACH OTHER) is textual and not implemented.
// · BPHS gives NONE of the four. Its debilitation raja yoga is Ch.41 vv.19-20 — a different rule.
//   Citing "Parashara" for these conditions cites the wrong text.
// · Our own yogas.json line ("associated with an exalted planet … can act as if exalted") has NO
//   classical verse behind it in any text. It is K&F's reading, and the modern sources that state
//   it say so in the first person ("I have no textual authority for this view, but in my
//   experience…"). That does not make it wrong — K&F is the declared source and David ruled on it
//   deliberately — but the engine's four conditions and the canon's one rule are two different
//   systems, and the engine runs neither cleanly.
// · The dasha gate v797 implemented is primary as a GENERAL principle (Phaladeepika 19.54, Saravali
//   5.47-50); applied specifically to neecha bhanga it is modern (B.V. Raman, 1947).
// NOTHING IN THE ENGINE CHANGED. Which conditions are Velea's is David's ruling; the file exists so
// he makes it against the sources instead of against a memory.
// QUESTIONING THE AGENT, as instructed: it first reported "the debilitated planet itself in a
// kendra" as textual, then withdrew it against the Sanskrit — the correction was the useful part. I
// re-derived 7.30 from the Devanagari myself before writing any of it down.
// 65 files, 657 tests, 0 failures. Build exits 0. Still exactly the 7 pre-existing tsc errors.
export const APP_VERSION = "1.1.809";
