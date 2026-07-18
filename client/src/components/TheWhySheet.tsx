import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { GlossaryLink } from "@/components/GlossaryPopover";
import VeleaLoader from "@/components/VeleaLoader";

/**
 * THE WHY — the receipts behind today's read, AREA-FIRST (David 2026-07-18: "instead of
 * listing planet, where it is, what that means... list the main areas that are being
 * affected, and then after each area you write what's going on with each planet in
 * there — with the glossary links. People like to learn.")
 *
 * The story lives in the reading; this popup is the ledger under it: the lived areas as
 * headers, each planet's live condition in plain words beneath, every term a glossary
 * door. Deterministic (narrative.currentTransits — pure ephemeris, no LLM, free), fetched
 * only when opened (Door Law).
 */
const HOUSE_GLOSS: Record<number, string> = {
  1: "self, body, how you are seen",
  2: "money, possessions, self-worth, speech",
  3: "communication, siblings & close circle, short trips, skill",
  4: "home, roots, mother, the inner ground",
  5: "creativity, children, romance, the heart's expression",
  6: "work, service, health, daily duty",
  7: "partnership, clients, the one across from you",
  8: "intimacy, shared resources, transformation, the hidden",
  9: "belief, teachers, higher learning, long journeys",
  10: "career, public standing, reputation",
  11: "networks, community, gains, hopes",
  12: "rest, retreat, release, the unseen",
};

// Pantheon pronouns (Venus = she, Moon = they, the rest he) — the same voice as the prose.
const POSS: Record<string, string> = { Venus: "her", Moon: "their" };
const poss = (p: string) => POSS[p] ?? "his";

const TIER_PHRASE: Record<string, (p: string) => string> = {
  exalted: () => "exalted — running at full strength",
  moolatrikona: () => "in moolatrikona — deeply rooted, strong",
  own: (p) => `in ${poss(p)} own sign — at home, steady`,
  friend: () => "in a friend's sign — supported",
  neutral: () => "on neutral ground",
  enemy: () => "in an enemy's sign — uncomfortable lodging",
  debilitated: () => "debilitated — running low",
};
// Glossary door for the dignity word (canonical term names from the Glossary page).
const TIER_TERM: Record<string, string> = {
  exalted: "Exaltation (Uccha)",
  debilitated: "Debilitation (Neecha)",
};

function ConditionLine({ t, timeLord, accent }: { t: any; timeLord: string; accent: string }) {
  const tierKey: string | undefined = t.strength?.tier;
  const tierPhrase = tierKey ? TIER_PHRASE[tierKey]?.(t.planet) : null;
  const tierTerm = tierKey ? TIER_TERM[tierKey] : undefined;
  const bits: React.ReactNode[] = [];
  bits.push(
    <span key="sign">
      moving through <GlossaryLink term={t.sign}><span style={{ textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>{t.sign}</span></GlossaryLink>
    </span>,
  );
  if (tierPhrase) bits.push(
    <span key="tier">
      {", "}
      {tierTerm
        ? <GlossaryLink term={tierTerm}><span style={{ textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>{tierPhrase}</span></GlossaryLink>
        : tierPhrase}
    </span>,
  );
  if (t.combust) bits.push(<span key="comb">, swallowed by the Sun's glare (combust)</span>);
  if (t.nodal?.node) bits.push(<span key="nodal">, gripped close by <GlossaryLink term={t.nodal.node}><span style={{ textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>{t.nodal.node}</span></GlossaryLink></span>);
  if (t.retrograde) bits.push(
    <span key="rx">
      , <GlossaryLink term="Retrograde (Vakri)"><span style={{ textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>retracing {poss(t.planet)} steps</span></GlossaryLink>
    </span>,
  );
  if (t.hitsNatalPoint) bits.push(<span key="hit">, standing on your natal {t.hitsNatalPoint}</span>);

  return (
    <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6, color: "var(--color-foreground)" }}>
      <GlossaryLink term={t.planet}><strong style={{ textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2 }}>{t.planet}</strong></GlossaryLink>
      {t.planet === timeLord && (
        <span style={{ marginLeft: "0.4rem", fontSize: "0.6rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: accent }}>runs this year</span>
      )}
      {" — "}
      {bits}
      .
    </p>
  );
}

export default function TheWhySheet({ profileId, date, modeColor, onClose }: { profileId: number; date: string; modeColor: string; onClose: () => void }) {
  const { data } = trpc.narrative.currentTransits.useQuery(
    { profileId, date },
    { staleTime: 10 * 60 * 1000 },
  );

  const groups = (() => {
    if (!data?.available) return [];
    const byHouse = new Map<number, any[]>();
    for (const t of (data.transits as any[]) ?? []) {
      if (!t?.houseFromLagna) continue;
      if (!byHouse.has(t.houseFromLagna)) byHouse.set(t.houseFromLagna, []);
      byHouse.get(t.houseFromLagna)!.push(t);
    }
    // Order: the year's activated house first, then houses holding the Time Lord, a
    // spotlight, or a natal hit — then the rest of the sky in house order.
    const weight = (h: number, ts: any[]) =>
      (h === data.activatedHouse ? 100 : 0) +
      (ts.some((t) => t.planet === data.timeLord) ? 50 : 0) +
      (ts.some((t) => t.spotlight || t.hitsNatalPoint) ? 25 : 0);
    return Array.from(byHouse.entries())
      .map(([house, ts]) => ({ house, ts, w: weight(house, ts) }))
      .sort((a, b) => b.w - a.w || a.house - b.house);
  })();

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: "var(--dialog-overlay)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md"
        style={{ background: "var(--color-card)", borderRadius: 20, border: "1px solid var(--color-border)", padding: "1.4rem", maxHeight: "80vh", overflowY: "auto" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: modeColor, margin: 0 }}>The why</p>
            <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", margin: "0.3rem 0 0", lineHeight: 1.45 }}>
              The sky behind today's read — tap any name to learn.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 999, border: "none", background: "var(--color-secondary)", color: "var(--color-foreground)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={17} />
          </button>
        </div>

        {!data ? (
          <div style={{ padding: "1.6rem 0" }}><VeleaLoader size={22} label="Reading the sky…" /></div>
        ) : !data.available || groups.length === 0 ? (
          <p style={{ fontSize: "0.88rem", color: "var(--color-muted-foreground)", margin: "1rem 0 0" }}>The sky's ledger couldn't load just now — try again in a moment.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.15rem", marginTop: "1.1rem" }}>
            {groups.map(({ house, ts }) => (
              <div key={house}>
                <p style={{ fontSize: "0.66rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: house === data.activatedHouse ? modeColor : "var(--color-muted-foreground)", margin: "0 0 0.45rem" }}>
                  {HOUSE_GLOSS[house] ?? "this part of life"}
                  {house === data.activatedHouse && <span style={{ marginLeft: "0.45rem", opacity: 0.85 }}>· this year's house</span>}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", borderLeft: `3px solid color-mix(in srgb, ${modeColor} ${house === data.activatedHouse ? "80%" : "35%"}, transparent)`, paddingLeft: "0.75rem" }}>
                  {ts.map((t: any) => <ConditionLine key={t.planet} t={t} timeLord={data.timeLord} accent={modeColor} />)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
