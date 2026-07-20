/**
 * ACCENT INK — the day-mode colour, made readable as TEXT on a given ground.
 *
 * THE CLASS BUG (measured 2026-07-20). The day-mode accent is a SURFACE/identity colour, and the
 * app uses it directly as ink. Measured against the two card grounds, every single accent fails
 * WCAG on one side or the other (small bold text needs 4.5:1):
 *
 *                      parchment #FBF7ED   espresso #211B14
 *   BUILD      gold        2.75x  FAIL         5.79x
 *   ENERGIZE   lime        2.74x  FAIL         5.82x
 *   RESTORE    teal        3.84x  FAIL         4.15x  FAIL
 *   RESTRAINT  wine        6.82x               2.34x  FAIL
 *   PEAK       red         5.46x               2.92x  FAIL
 *   SELECTIVE  slate       5.11x               3.12x  FAIL
 *   ACTION     green       4.72x               3.38x  FAIL
 *
 * That single table explains both long-running complaints at once — "gold not showing up on darker
 * value colors" and gold-on-light washing out — as one root cause rather than two skins.
 *
 * The existing helpers (tonalInk in Planner, tonalInkY in YearCalendar, shadeHex) apply a FIXED
 * shade factor, which is why they land legibly on one ground and not the other. This walks the
 * colour's LIGHTNESS toward the readable side until it actually clears the ratio, so the answer is
 * measured rather than guessed.
 *
 * HUE AND SATURATION ARE PRESERVED EXACTLY — only lightness moves. A Build day stays gold, it just
 * becomes a gold you can read. That keeps this an evolution of the palette, never a recolour.
 */

export const PARCHMENT = "#FBF7ED";
export const ESPRESSO = "#211B14";

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two #rrggbb colours (1 = identical, 21 = black on white). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const x = hex.replace("#", "");
  const r = parseInt(x.slice(0, 2), 16) / 255, g = parseInt(x.slice(2, 4), 16) / 255, b = parseInt(x.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h, s, l };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; }
  else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue(p, q, h + 1 / 3); g = hue(p, q, h); b = hue(p, q, h - 1 / 3);
  }
  const to2 = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

/**
 * The accent, moved in lightness ONLY until it reads on `ground`.
 *
 * @param accent  the day-mode colour, #rrggbb
 * @param ground  the surface it sits on, #rrggbb
 * @param target  required contrast ratio — 4.5 for body/small text (default), 3 for large or for
 *                non-text marks where the shape already carries the meaning
 * @returns a #rrggbb with the SAME hue and saturation, light enough or dark enough to be read.
 *          If even pure black/white cannot reach the target (a mid-grey ground), returns the best
 *          available rather than throwing — legibility degrades, it never crashes a screen.
 */
export function accentInk(accent: string, ground: string, target = 4.5): string {
  if (!/^#[0-9a-f]{6}$/i.test(accent) || !/^#[0-9a-f]{6}$/i.test(ground)) return accent;
  if (contrastRatio(accent, ground) >= target) return accent; // already readable — do not touch it
  const { h, s } = hexToHsl(accent);
  // Move AWAY from the ground: darken on a light ground, lighten on a dark one.
  const groundIsLight = luminance(ground) > 0.18;
  let best = accent, bestRatio = contrastRatio(accent, ground);
  // 100 steps across the full lightness range is finer than the eye resolves, and cheap.
  for (let i = 0; i <= 100; i++) {
    const l = groundIsLight ? 0.5 - (i / 100) * 0.5 : 0.5 + (i / 100) * 0.5;
    const candidate = hslToHex(h, s, l);
    const r = contrastRatio(candidate, ground);
    if (r > bestRatio) { best = candidate; bestRatio = r; }
    // Stop at the FIRST colour that clears the bar — the closest to the original that works,
    // so the palette shifts as little as possible.
    if (r >= target) return candidate;
  }
  return best;
}
