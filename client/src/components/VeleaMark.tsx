import type { CSSProperties } from "react";

/**
 * VeleaMark — the Velea logo rendered as a tintable monochrome icon (via CSS mask).
 * Use anywhere an app/brand mark is wanted. (The circle-dot is reserved for the Sun,
 * being its alchemical symbol.) Defaults to currentColor so it inherits like a
 * lucide icon; `strokeWidth` is accepted and ignored for drop-in compatibility.
 */
export default function VeleaMark({
  size = 20,
  color = "currentColor",
  style,
}: {
  size?: number;
  color?: string;
  style?: CSSProperties;
  strokeWidth?: number;
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
