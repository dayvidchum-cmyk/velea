import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY } from "@/pages/Glossary";
import { useSettingsContext } from "@/contexts/SettingsContext";

/**
 * GlossaryText — wrap a plain string and any glossary term inside it becomes a
 * dotted-underline word that explains itself in a tap/hover popover. React-native
 * (no DOM mutation), so it can't break rendering. Gated by settings.glossaryTooltips;
 * when off it renders the text untouched.
 *
 * Usage: <GlossaryText>{someProseString}</GlossaryText>
 */

type Entry = { term: string; definition: string };
let INDEX: { re: RegExp; map: Map<string, Entry> } | null = null;
function getIndex() {
  if (INDEX) return INDEX;
  const map = new Map<string, Entry>();
  const aliases: string[] = [];
  for (const g of GLOSSARY) {
    // "Midheaven (MC)" → match both "Midheaven" and "MC"
    const m = g.term.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    const list = m ? [m[1].trim(), m[2].trim()] : [g.term.trim()];
    for (const a of list) {
      const key = a.toLowerCase();
      if (a.length < 2) continue;
      if (!map.has(key)) { map.set(key, { term: g.term, definition: g.definition }); aliases.push(a); }
    }
  }
  aliases.sort((a, b) => b.length - a.length); // prefer longer / multi-word matches
  const source = aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  INDEX = { re: new RegExp(`\\b(${source})\\b`, "gi"), map };
  return INDEX;
}

function GlossTerm({ alias, entry }: { alias: string; entry: Entry }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const show = () => { const r = ref.current?.getBoundingClientRect(); if (r) { setPos({ x: r.left + r.width / 2, y: r.bottom + 6 }); setOpen(true); } };
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [open]);
  return (
    <span
      ref={ref}
      onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : show(); }}
      style={{ borderBottom: "1px dotted var(--brand-gold)", cursor: "help" }}
    >
      {alias}
      {open && pos && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: Math.min(Math.max(12, pos.x - 140), (typeof window !== "undefined" ? window.innerWidth : 400) - 292),
            top: pos.y, width: 280, zIndex: 10000,
            background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12,
            padding: "0.8rem 0.9rem", boxShadow: "0 14px 44px rgba(0,0,0,0.45)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.02em", color: "var(--brand-gold)" }}>{entry.term}</p>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "var(--foreground)", lineHeight: 1.55 }}>{entry.definition}</p>
        </div>,
        document.body,
      )}
    </span>
  );
}

export default function GlossaryText({ children }: { children: ReactNode }) {
  const { settings } = useSettingsContext();
  if (!settings.glossaryTooltips || typeof children !== "string") return <>{children}</>;

  const { re, map } = getIndex();
  const scan = new RegExp(re.source, "gi");
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = scan.exec(children))) {
    const alias = m[1];
    const key = alias.toLowerCase();
    const entry = map.get(key);
    if (!entry || seen.has(key)) continue; // only the first occurrence per string
    seen.add(key);
    if (m.index > last) parts.push(children.slice(last, m.index));
    parts.push(<GlossTerm key={m.index} alias={alias} entry={entry} />);
    last = m.index + alias.length;
  }
  if (parts.length === 0) return <>{children}</>;
  parts.push(children.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}
