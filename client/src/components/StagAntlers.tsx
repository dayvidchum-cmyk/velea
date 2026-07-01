// Stylized stag antlers — Velea's mark for "today" on the calendar.
export default function StagAntlers({ size = 16, color = "#C9A84C" }: { size?: number; color?: string }) {
  return (
    <svg
      width={size}
      height={size * (40 / 48)}
      viewBox="0 0 48 40"
      fill="none"
      stroke={color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* central stem */}
      <path d="M24 39 V24" />
      {/* left beam + tines */}
      <path d="M24 26 C 20 22, 16 22, 13 16 C 11.5 13, 11 9.5, 10 5" />
      <path d="M16 20 C 13 19, 11 19, 8 17" />
      <path d="M13 15 C 11 14, 9 14, 7 11" />
      {/* right beam + tines (mirror) */}
      <path d="M24 26 C 28 22, 32 22, 35 16 C 36.5 13, 37 9.5, 38 5" />
      <path d="M32 20 C 35 19, 37 19, 40 17" />
      <path d="M35 15 C 37 14, 39 14, 41 11" />
    </svg>
  );
}
