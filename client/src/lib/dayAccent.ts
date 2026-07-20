import { accentInk } from "@shared/accent-ink";
import { cardGround } from "./card-ground";
// THE DAY ACCENT (David 2026-07-15: "shouldn't it be the rose ochre today?") — the app's
// chrome follows TODAY's coin color instead of the static brand gold. One source with the
// calendar/hero maps; set once per day-character load via setDayAccent().
export const MOVEMENT_COIN: Record<string, string> = {
  golden: "#2E7D4F", action: "#77A96B", selective: "#00687a",
  build: "#D4AF37", restraint: "#d57176", caution: "#B3232F",
};
export const DEPTH_COIN: Record<string, Record<string, string>> = {
  build: { deep: "#C49A2E", mid: "#D4AF37", thin: "#CD9E86", leaning: "#BC886F" },
  selective: { deep: "#00525F", mid: "#00687a", thin: "#2E8291", leaning: "#54787C" },
  action: { deep: "#5E9457", mid: "#77A96B", thin: "#94BC88", leaning: "#9AA579" },
};
export function coinForCharacter(c: any): string | null {
  if (!c?.movement) return null;
  const depth = c.depth ?? c.buildDepth;
  return DEPTH_COIN[c.movement]?.[depth ?? "mid"] ?? MOVEMENT_COIN[c.movement] ?? null;
}
// C · JYOTISH INDIGO tuning (2026-07-16): on the indigo night ground the COOL day colors
// sit closest to the ground's own hue and melt — each gets a LIFTED dark-chrome variant.
// Named knobs on purpose: David tunes these per-color by eye, round by round. The calendar
// coins themselves are untouched (the almanac stays paper); this lifts CHROME accents only.
const DARK_LIFT: Record<string, string> = {
  "#00525F": "#2E8291", "#00687a": "#3A96A6", "#2E8291": "#63BFC9", "#54787C": "#7C9AA0", // selective ladder
  "#2E7D4F": "#3FA06B", // golden
  "#77A96B": "#8FC182", "#5E9457": "#77A96B", "#94BC88": "#A9CC9E", "#9AA579": "#AFBA8E", // action ladder
  "#d57176": "#E28A93", // restraint
  "#B3232F": "#D24352", // caution ruby
  "#D4AF37": "#E0BC4E", "#C49A2E": "#D4AF37", "#CD9E86": "#DCB29B", "#BC886F": "#CFA089", // build/ochre ladder
};
/** Sets --day-accent on the root. Full Spectrum is exempt (its gold is law). */
export function setDayAccent(character: any, fullSpectrum: boolean) {
  const root = document.documentElement;
  // The RAW coin is always published — Full Spectrum tints its ground from it
  // (only --day-accent itself is FS-exempt; FS chrome stays gold by law).
  const rawCoin = coinForCharacter(character);
  if (rawCoin) root.style.setProperty("--day-coin", rawCoin); else root.style.removeProperty("--day-coin");
  if (fullSpectrum) { root.style.removeProperty("--day-accent"); root.style.removeProperty("--day-accent-ink"); return; }
  let coin = rawCoin;
  // Dark chrome lifts the coin toward starlight so the accent never melts into the night.
  if (coin && root.classList.contains("dark")) coin = DARK_LIFT[coin] ?? coin;
  if (coin) {
    root.style.setProperty("--day-accent", coin);
    // THE READABLE TWIN (David 2026-07-20: "sweep it"). --day-accent is a SURFACE colour: it fills
    // coins, tints backgrounds and draws borders, and for those it is exactly right. As TEXT it
    // fails: measured against the two card grounds, every day-mode accent misses the 4.5:1 floor on
    // one side or the other (gold 2.75:1 on parchment, wine 2.34:1 on espresso — see
    // shared/accent-ink.ts for the table). --day-accent-ink is the SAME hue and saturation, moved in
    // lightness only until it clears the bar on the ground actually in use, and left byte-identical
    // when the accent already passes. A Build day stays gold; it becomes a gold you can read.
    // Text uses --day-accent-ink; fills, tints and borders keep --day-accent untouched, which is
    // what keeps this an evolution of the palette rather than a recolour of the app.
    root.style.setProperty("--day-accent-ink", accentInk(coin, cardGround()));
    // deep self-shade of the day (same recipe as the filled coin's number)
    const n = parseInt(coin.slice(1), 16);
    const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * 0.45))).toString(16).padStart(2, "0");
    root.style.setProperty("--day-accent-deep", `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`);
  } else {
    root.style.removeProperty("--day-accent");
    root.style.removeProperty("--day-accent-ink");
    root.style.removeProperty("--day-accent-deep");
  }
}
