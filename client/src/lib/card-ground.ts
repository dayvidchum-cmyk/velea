import { ESPRESSO, PARCHMENT } from "@shared/accent-ink";

/**
 * The hex of the ground a card's text actually sits on, for contrast maths (shared/accent-ink.ts).
 *
 * --color-card is a CSS variable that may be authored as oklch()/hsl() and changes with the theme,
 * so it cannot be fed to contrast maths directly. The app has exactly two card grounds in practice:
 * the parchment of light mode and the espresso of dark. Full Spectrum is a DARK surface with light
 * text by law, so it reads as espresso here too.
 */
export function cardGround(): string {
  if (typeof document === "undefined") return PARCHMENT; // SSR/tests — light is the safe default
  const root = document.documentElement;
  return root.classList.contains("dark") || root.classList.contains("full-spectrum") ? ESPRESSO : PARCHMENT;
}
