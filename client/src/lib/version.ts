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
export const APP_VERSION = "1.1.122";
