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
export const APP_VERSION = "1.1.378";
