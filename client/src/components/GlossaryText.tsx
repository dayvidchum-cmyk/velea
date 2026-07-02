import { Fragment, type ReactNode } from "react";
import { GLOSSARY } from "@/pages/Glossary";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { GlossaryLink } from "@/components/GlossaryPopover";

/**
 * GlossaryText — wrap a plain string and any glossary term inside it becomes a
 * dotted-underline word that explains itself in a tap/hover popover (via the shared
 * GlossaryLink). React-native (no DOM mutation), so it can't break rendering. Gated by
 * settings.glossaryTooltips; when off it renders the text untouched.
 *
 * Usage: <GlossaryText>{someProseString}</GlossaryText>
 */

type Entry = { term: string };
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
      if (!map.has(key)) { map.set(key, { term: g.term }); aliases.push(a); }
    }
  }
  aliases.sort((a, b) => b.length - a.length); // prefer longer / multi-word matches
  const source = aliases.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  INDEX = { re: new RegExp(`\\b(${source})\\b`, "gi"), map };
  return INDEX;
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
    parts.push(<GlossaryLink key={m.index} term={entry.term}>{alias}</GlossaryLink>);
    last = m.index + alias.length;
  }
  if (parts.length === 0) return <>{children}</>;
  parts.push(children.slice(last));
  return <>{parts.map((p, i) => <Fragment key={i}>{p}</Fragment>)}</>;
}
