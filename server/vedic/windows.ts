/** Shared window-merging over stored convergence spans — now carrying each window's PEAK
 *  convergence so the BIG KARMIC KNOTS (David's term) surface by weight. */
export type ThemeWindow = { theme: string; from: string; to: string; peak: number; bigKnot: boolean };
export function mergeThemeWindows(rows: Array<{ startAt: any; endAt: any; themes: string }>): ThemeWindow[] {
  const spans = rows
    .map((r) => ({ s: new Date(r.startAt).getTime(), e: new Date(r.endAt).getTime(), themes: JSON.parse(r.themes ?? "{}") }))
    .sort((a, b) => a.s - b.s);
  const themes = Array.from(new Set(spans.flatMap((sp) => Object.keys(sp.themes).filter((k) => sp.themes[k]?.lit))));
  const out: ThemeWindow[] = [];
  for (const th of themes) {
    let open: { s: number; e: number; peak: number } | null = null;
    for (const sp of spans) {
      const t = sp.themes[th];
      const lit = t?.lit;
      if (lit && !open) open = { s: sp.s, e: sp.e, peak: t?.convergence ?? 1 };
      else if (lit && open) { open.e = sp.e; open.peak = Math.max(open.peak, t?.convergence ?? 1); }
      else if (!lit && open) { push(out, th, open); open = null; }
    }
    if (open) push(out, th, open);
  }
  return out.sort((a, b) => a.from.localeCompare(b.from));
}
function push(out: ThemeWindow[], theme: string, w: { s: number; e: number; peak: number }) {
  out.push({ theme, from: iso(w.s), to: iso(w.e), peak: w.peak, bigKnot: w.peak >= 3 });
}
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
