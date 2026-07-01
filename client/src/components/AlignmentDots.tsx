// Gold dot meter (1–5) showing how well a task fits today. Lets a user-pinned
// "Do Now" task reveal its alignment even though the floor forces it to the top.
const GOLD = "#C9A84C";

export default function AlignmentDots({ alignment, size = 6 }: { alignment: number; size?: number }) {
  const filled = Math.max(1, Math.min(5, Math.round(alignment / 20)));
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.6 }}
      title={`${alignment}% aligned with today`}
      aria-label={`${filled} of 5 aligned`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 999,
            background: i < filled ? GOLD : "transparent",
            border: `1px solid ${i < filled ? GOLD : "var(--color-border)"}`,
          }}
        />
      ))}
    </span>
  );
}
