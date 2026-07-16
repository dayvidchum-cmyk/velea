import type { CSSProperties } from "react";

/**
 * CrownMark — DAVID'S OWN CROWN, HIS ACTUAL FILE (2026-07-16: "My crown"). The shape is
 * his 500px PNG with the white knocked out (client/public/crown-mark.png), rendered as a
 * CSS mask so it takes a FLAT tintable fill ("Can this be the crown, but a flat gold
 * fill?"). No more hand-drawn approximations — these are his pixels.
 * THE SADHAKA MARK (achievement days) everywhere; solitary on a tile it renders big.
 */
export default function CrownMark({
  size = 15,
  color = "#D4AF37",
  style,
}: {
  size?: number;
  color?: string;
  style?: CSSProperties;
}) {
  const mask = 'url("/crown-mark.png")';
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: mask,
        maskImage: mask,
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
