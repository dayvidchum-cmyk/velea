import type { CSSProperties } from "react";

/**
 * VeleaLorMark — the "Veleal'or" mark: វេលាល្អ, the auspicious, golden moment. David's own
 * radiant 8-point BURST (his 2026-07-17 art, veleal-or.png), rendered as a tintable CSS mask
 * (use-the-file law). It replaced the ring-and-dot bullseye once that collided with the Sun's
 * classical ☉ glyph — the burst reads unmistakably as light / radiance / the golden moment, and
 * keeps the star-language distinct from the planet symbols. Sibling to VeleaMark; same size/color
 * API for drop-in use. `strokeWidth` is accepted and ignored.
 */
export default function VeleaLorMark({
  size = 22,
  color = "currentColor",
  style,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
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
        backgroundColor: color,
        WebkitMaskImage: "url(/veleal-or.png)",
        maskImage: "url(/veleal-or.png)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        ...style,
      }}
    />
  );
}
