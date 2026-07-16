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
/** Sets --day-accent on the root. Full Spectrum is exempt (its gold is law). */
export function setDayAccent(character: any, fullSpectrum: boolean) {
  const root = document.documentElement;
  if (fullSpectrum) { root.style.removeProperty("--day-accent"); return; }
  const coin = coinForCharacter(character);
  if (coin) {
    root.style.setProperty("--day-accent", coin);
    // deep self-shade of the day (same recipe as the filled coin's number)
    const n = parseInt(coin.slice(1), 16);
    const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * 0.45))).toString(16).padStart(2, "0");
    root.style.setProperty("--day-accent-deep", `#${ch(n >> 16)}${ch((n >> 8) & 255)}${ch(n & 255)}`);
  } else {
    root.style.removeProperty("--day-accent");
    root.style.removeProperty("--day-accent-deep");
  }
}
