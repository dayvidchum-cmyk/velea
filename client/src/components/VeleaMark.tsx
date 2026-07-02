import type { CSSProperties } from "react";

/**
 * VeleaMark — the Velea mark (velea-mark.svg) as a tintable icon via CSS mask.
 * The mask is zoomed so the mark fills the box (the source has ~30% padding), so it
 * reads bold at small sizes instead of shrinking to a faint arc. `strokeWidth` is
 * accepted and ignored for drop-in compatibility with lucide icon slots.
 */
export default function VeleaMark({
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
        width: size,
        height: size,
        background: color,
        WebkitMaskImage: "url(/velea-mark.svg)",
        maskImage: "url(/velea-mark.svg)",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "142%",
        maskSize: "142%",
        ...style,
      }}
    />
  );
}
