import GateMark from "@/components/GateMark";
import NotifyMeButton from "@/components/NotifyMeButton";
import { accentInk } from "@shared/accent-ink";
import { cardGround } from "@/lib/card-ground";

/**
 * LOCKED, NOT BROKEN — the inline gate for a reading the server declined to open.
 *
 * THE CLASS BUG (2026-07-20). Server-side reading procedures return `{ available: false,
 * locked: true }` in a dozen places — the room gate, the chapter gate, year-sight, the pick-a-date
 * window, the yoga picks. The clients only ever tested `available`, so every one of those locks
 * fell through to the FAILURE branch and rendered as "the chapter is quiet right now — try again
 * in a moment", with a retry that could never succeed. A premium gate was presenting itself as a
 * broken app, and inviting the user to keep tapping.
 *
 * One component so the distinction cannot be forgotten at the next call site: a locked reading
 * says what it is and what opens it; a genuine failure keeps its retry, which now means something
 * because it is no longer the locked path too.
 *
 * Colour: the label rides accentInk (the raw day-mode accent fails contrast as text on one ground
 * or the other — see shared/accent-ink.ts); the mark keeps a looser bar since its shape carries
 * the meaning.
 */
export default function LockedRead({
  accent,
  title = "Locked",
  body,
  feature,
}: {
  /** the day-mode accent (#rrggbb) — the caller's colour, made readable here */
  accent: string;
  title?: string;
  /** one plain sentence: what is open, and what this waits behind */
  body: string;
  /** NotifyMeButton feature key; omit to render no button */
  feature?: string;
}) {
  const ground = cardGround();
  const ink = /^#[0-9a-f]{6}$/i.test(accent) ? accentInk(accent, ground) : accent;
  const markInk = /^#[0-9a-f]{6}$/i.test(accent) ? accentInk(accent, ground, 3) : accent;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.45rem" }}>
        <GateMark size={18} style={{ flexShrink: 0, color: markInk }} />
        <span style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ink }}>
          {title}
        </span>
      </div>
      <p style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--color-foreground)", margin: "0 0 0.5rem" }}>
        {body}
      </p>
      {feature ? <NotifyMeButton feature={feature} /> : null}
    </div>
  );
}
