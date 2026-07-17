import type { CSSProperties } from "react";

/**
 * GateMark — THE TIME GATE, worn as the lock. Since 2026-07-18 this renders DAVID'S OWN
 * drawn gate (the use-the-file law, same as the crown and the planets): heavy double
 * lintel on trapezoid shoulders, two pillars, and the bindu risen ABOVE the threshold —
 * his file at client/public/gate-mark.png as a CSS mask with a flat tintable fill.
 * (The v637 hand-drawn form-G + Kala crest it replaces lives in git history.)
 * His note shipped with it: "The ones you are using are also too small" — call sites
 * were bumped; default is 18, don't ship it tiny.
 */
export default function GateMark({
  size = 18,
  color = "var(--brand-gold)",
  style,
}: {
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        // call sites tint via the color prop OR style.color — honor both (mask fills
        // from backgroundColor, so a style.color alone would otherwise be ignored)
        backgroundColor: (style as any)?.color ?? color,
        WebkitMaskImage: "url(/gate-mark.png)",
        maskImage: "url(/gate-mark.png)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
    />
  );
}
