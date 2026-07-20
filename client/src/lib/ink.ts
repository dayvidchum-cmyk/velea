import { accentInk, mixHex } from "@shared/accent-ink";
import { cardGround } from "./card-ground";

/**
 * ANY colour, made readable as TEXT on the surface it is actually sitting on.
 *
 * The day-mode accents, the planet inks and the sign colours are SURFACE colours: they fill coins,
 * tint backgrounds, draw rings. Painted as text they fail — measured, every day-mode accent misses
 * the 4.5:1 floor on one ground or the other (shared/accent-ink.ts carries the table).
 *
 * `--day-accent` has a published readable twin (`--day-accent-ink`, set by setDayAccent), so the
 * var form maps straight to it. A hex is solved on the spot against the current card ground.
 * Anything this cannot reason about — color-mix(), oklch(), another var, a gradient — is returned
 * UNTOUCHED rather than guessed at, so nothing is silently mangled.
 *
 * Hue and saturation never move; only lightness, and only when the colour actually fails. A Build
 * day stays gold, Mars stays red — they become versions you can read.
 *
 *   color: inkOf(accent)      ← text
 *   background: accent        ← fills, tints, borders, marks: leave the raw colour alone
 */
/** @param groundVar a CSS custom property naming the surface the text ACTUALLY sits on, when that
 *  is not the card — e.g. "--secondary" for a panel drawn on the secondary fill. Resolved at call
 *  time so it follows the theme; falls back to the card ground when it cannot be read.
 *  Added v822: the profection panel solved its sign colours against the CARD while sitting on
 *  --secondary, which is darker — measured 3.92:1 where 4.5 was intended. That is the same
 *  wrong-ground class this file's own header warns about for tinted chips, from a different cause,
 *  and it is the fourth time a colour fix has been applied to a surface it was not on. */
export function inkOf(color: string | null | undefined, target = 4.5, tintPct = 0, groundVar?: string): string {
  if (!color) return color ?? "";
  const c = String(color).trim();
  // A chip drawn on `color-mix(in srgb, <colour> N%, var(--color-card))` does NOT sit on the card:
  // it sits on the card tinted by the colour being inked. Solving against the untinted card leaves
  // the text short of the bar — measured at 3.9:1 where 4.5 was intended. Callers that draw such a
  // chip pass their N, and the real ground is reconstructed here.
  let src = c;
  if (c === "var(--day-accent)") {
    // No tint: the published twin is exactly right and needs no computation.
    if (!tintPct) return "var(--day-accent-ink)";
    // With a tint we need the real hex to reconstruct the ground, so resolve the variable.
    // If it is unset (Full Spectrum removes it), fall back to the twin rather than guessing.
    const live = typeof document !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--day-accent").trim() : "";
    if (!/^#[0-9a-f]{6}$/i.test(live)) return "var(--day-accent-ink)";
    src = live;
  }
  const hex6 = /^#[0-9a-f]{6}$/i.test(src) ? src
    : /^#[0-9a-f]{3}$/i.test(src) ? "#" + src.slice(1).split("").map((x) => x + x).join("")
    : null;
  if (!hex6) return c; // color-mix / oklch / other vars / gradients — not ours to rewrite
  const base = (() => {
    if (!groundVar || typeof document === "undefined") return cardGround();
    const live = getComputedStyle(document.documentElement).getPropertyValue(groundVar).trim();
    return /^#[0-9a-f]{6}$/i.test(live) ? live : cardGround(); // unreadable → the card, not a guess
  })();
  const ground = tintPct > 0 ? mixHex(hex6, base, tintPct / 100) : base;
  return accentInk(hex6, ground, target);
}
