import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { findGlossaryTerm, type GlossaryTerm } from "@/pages/Glossary";

/**
 * Shared glossary popover. `GlossaryLink` renders `children` as a tappable element
 * that shows a term's definition in a floating card — on tap (mobile) or hover
 * (desktop). Always active; not gated by any setting. Used for explicit links like
 * the Meridian "What's this?" and the Stage retrograde chips, and reused by
 * GlossaryText's auto-linking.
 */

function PopoverCard({ entry, anchor, onClose, extra }: { entry: GlossaryTerm; anchor: DOMRect; onClose: () => void; extra?: ReactNode }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ left: number; top: number }>({ left: -9999, top: -9999 });

  useLayoutEffect(() => {
    const w = cardRef.current?.offsetWidth ?? 280;
    const h = cardRef.current?.offsetHeight ?? 120;
    const vw = window.innerWidth, vh = window.innerHeight;
    let left = anchor.left + anchor.width / 2 - w / 2;
    left = Math.min(Math.max(10, left), vw - w - 10);
    // Prefer below; flip above if it would overflow the viewport bottom.
    let top = anchor.bottom + 8;
    if (top + h > vh - 10) top = Math.max(10, anchor.top - h - 8);
    setStyle({ left, top });
  }, [anchor]);

  useEffect(() => {
    const close = () => onClose();
    // Close on any outside interaction.
    const onDown = (e: MouseEvent) => { if (!cardRef.current?.contains(e.target as Node)) onClose(); };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => { document.removeEventListener("mousedown", onDown); window.removeEventListener("scroll", close, true); window.removeEventListener("resize", close); };
  }, [onClose]);

  return createPortal(
    <div
      ref={cardRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "fixed", left: style.left, top: style.top, width: 280, zIndex: 10000,
        background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12,
        padding: "0.8rem 0.9rem", boxShadow: "0 14px 44px rgba(0,0,0,0.45)",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.02em", color: "var(--brand-gold)" }}>{entry.term}</p>
      <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--foreground)", lineHeight: 1.55 }}>{entry.definition}</p>
      {extra && (
        <p style={{ margin: "0.55rem 0 0", paddingTop: "0.5rem", borderTop: "1px solid var(--color-border)", fontSize: "0.78rem", color: "var(--brand-gold)", lineHeight: 1.5 }}>{extra}</p>
      )}
    </div>,
    document.body,
  );
}

export function GlossaryLink({
  term,
  children,
  style,
  className,
  underline = true,
  extra,
}: {
  term: string;
  children: ReactNode;
  style?: React.CSSProperties;
  className?: string;
  underline?: boolean;
  extra?: ReactNode;
}) {
  const entry = findGlossaryTerm(term);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false); // hover or press
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  if (!entry) return <>{children}</>; // no matching term → render inert

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const r = ref.current?.getBoundingClientRect();
    if (r) { setAnchor(r); setOpen(true); }
  };

  // Prose terms (underline=true): the underline is currentColor — the SAME as the font — so it
  // reads as one with the text and is never "lost" (David: consistency; the old gold line vanished
  // on some grounds, and white-on-dark modes is fine since it just follows the text). A gentle
  // opacity dip on tap is the affordance. Styled chips (underline=false): brightness + press-in.
  const emphasis: React.CSSProperties = underline
    ? {
        fontWeight: 600,
        borderBottom: "1.5px solid currentColor",
        opacity: active || open ? 0.72 : undefined,
      }
    : {
        filter: active || open ? "brightness(1.15)" : undefined,
        transform: active ? "scale(0.96)" : undefined,
      };

  return (
    <span
      ref={ref}
      className={className}
      onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggle(); }}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onPointerDown={() => setActive(true)}
      onPointerUp={() => setActive(false)}
      onPointerCancel={() => setActive(false)}
      style={{ cursor: "pointer", transition: "color 0.15s, filter 0.15s, transform 0.1s", ...emphasis, ...style }}
    >
      {children}
      {open && anchor && <PopoverCard entry={entry} anchor={anchor} onClose={() => setOpen(false)} extra={extra} />}
    </span>
  );
}
