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
export const APP_VERSION = "1.1.575";
