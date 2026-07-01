// Triple moon (waxing · full · waning) — Velea's mark for a golden-moment day.
// filled = confirmed golden (solid full moon); outline = potential golden.
export default function TripleMoon({ size = 30, color = "#C9A84C", filled = false }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size * (24 / 52)}
      viewBox="0 0 52 24"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* left waxing crescent — opens toward center */}
      <path d="M16 3 A 9 9 0 1 0 16 21" />
      {/* full moon */}
      <circle cx="26" cy="12" r="6" fill={filled ? color : "none"} />
      {/* right waning crescent — mirror */}
      <path d="M36 3 A 9 9 0 1 1 36 21" />
    </svg>
  );
}
