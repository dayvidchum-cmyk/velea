/** Shared window-merging over stored convergence spans — carrying each window's PEAK
 *  convergence (the BIG KARMIC KNOTS, David's term) and whether it is a HELD ERA.
 *
 *  THE ERA LAW (David 2026-07-16, the 2058 wealth window): peak convergence alone is
 *  half-blind — it rewards MANY lords at once and ignores a tie HELD FOR YEARS. A window
 *  is an ERA when some maha|antar pair keeps the theme lit through its EVERY pratyantar
 *  span — the tie lives at the ANTAR grain, so it runs as long as the antar runs (years,
 *  not weeks). No arbitrary duration cutoff: the dasha grain itself is the test.
 *  (≥3 spans required so a birth/horizon-truncated antar can't fake it.) */
export type ThemeWindow = { theme: string; from: string; to: string; peak: number; bigKnot: boolean; era: boolean };
export function mergeThemeWindows(rows: Array<{ startAt: any; endAt: any; themes: string; maha?: string; antar?: string }>): ThemeWindow[] {
  const spans = rows
    .map((r) => ({ s: new Date(r.startAt).getTime(), e: new Date(r.endAt).getTime(), themes: JSON.parse(r.themes ?? "{}"), pair: r.maha && r.antar ? `${r.maha}|${r.antar}` : null }))
    .sort((a, b) => a.s - b.s);
  const themes = Array.from(new Set(spans.flatMap((sp) => Object.keys(sp.themes).filter((k) => sp.themes[k]?.lit))));
  const totalByPair = new Map<string, number>();
  for (const sp of spans) if (sp.pair) totalByPair.set(sp.pair, (totalByPair.get(sp.pair) ?? 0) + 1);
  const out: ThemeWindow[] = [];
  for (const th of themes) {
    const litByPair = new Map<string, number>();
    for (const sp of spans) if (sp.pair && sp.themes[th]?.lit) litByPair.set(sp.pair, (litByPair.get(sp.pair) ?? 0) + 1);
    const held = new Set<string>();
    for (const [pair, lit] of litByPair) if (lit >= 3 && lit === totalByPair.get(pair)) held.add(pair);
    let open: { s: number; e: number; peak: number; era: boolean } | null = null;
    for (const sp of spans) {
      const t = sp.themes[th];
      const lit = t?.lit;
      const inHeld = !!(sp.pair && held.has(sp.pair));
      // PEAK IS LOUDNESS, so it reads `weight` — the heavy-lord law belongs here, where the question
      // is how big a window is, not at the gate that decides whether it exists at all (v798). Legacy
      // rows written before v798 have no `weight` and their `convergence` already held the weighted
      // number, so falling back to it keeps those rows reading exactly as they did.
      const loud = t?.weight ?? t?.convergence ?? 1;
      if (lit && !open) open = { s: sp.s, e: sp.e, peak: loud, era: inHeld };
      else if (lit && open) { open.e = sp.e; open.peak = Math.max(open.peak, loud); open.era = open.era || inHeld; }
      else if (!lit && open) { push(out, th, open); open = null; }
    }
    if (open) push(out, th, open);
  }
  return out.sort((a, b) => a.from.localeCompare(b.from));
}
function push(out: ThemeWindow[], theme: string, w: { s: number; e: number; peak: number; era: boolean }) {
  out.push({ theme, from: iso(w.s), to: iso(w.e), peak: w.peak, bigKnot: w.peak >= 3, era: w.era });
}
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
