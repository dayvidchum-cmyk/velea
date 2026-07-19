import { useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useDayModeColor } from "@/hooks/useDayModeColor";
import { useSettingsContext } from "@/contexts/SettingsContext";
import GlossaryText from "@/components/GlossaryText";
import { GlossaryLink } from "@/components/GlossaryPopover";

const ORD = ["", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th", "12th"];
const HOUSE_GLOSS: Record<number, string> = {
  1: "self & body", 2: "voice & values", 3: "skill & courage", 4: "home & roots",
  5: "creativity & heart", 6: "work & service", 7: "partnership", 8: "depth & transformation",
  9: "belief & teachers", 10: "vocation & standing", 11: "community & gains", 12: "retreat & release",
};
// What the SIGN on each pole actually MEANS — so the card names WHO you are at your public peak
// and private base, not just what the MC/IC angles are (David's benefit law). Each sign is grounded
// in its Vedic ruler's dharma (Aries/Scorpio→Mars, Taurus/Libra→Venus, Gemini/Virgo→Mercury,
// Cancer→Moon, Leo→Sun, Sagittarius/Pisces→Jupiter, Capricorn/Aquarius→Saturn). Living doc — refine.
const MC_GLOSS: Record<string, string> = {
  Aries: "The world meets you as a starter — direct, brave, first through the door. Mars, its ruler and the warrior, drives your calling through initiative and nerve: breaking new ground and acting before others dare.",
  Taurus: "The world meets you as a builder of worth — steady, grounded, resourceful. Venus, its ruler, works your calling through value and craft: making things solid, beautiful, and built to last.",
  Gemini: "The world meets you as a connector — quick, curious, many-voiced. Mercury, its ruler and the messenger, carries your calling through words and exchange: writing, teaching, linking people and ideas.",
  Cancer: "The world meets you as a nurturer — protective, intuitive, deeply felt. The Moon, its ruler, works your calling through care: tending people and causes, reading the room, building what feels like home.",
  Leo: "The world meets you as a leader — warm, expressive, made to be seen. The Sun, its ruler, works your calling through heart and dignity: taking the stage and letting the work carry your name.",
  Virgo: "The world meets you as a craftsperson — precise, useful, discerning. Mercury, its ruler, works your calling through skill and service: refining the details and making the work genuinely good.",
  Libra: "The world meets you as a harmonizer — fair, gracious, relational. Venus, its ruler, works your calling through balance and beauty: bringing people together and weighing what's just.",
  Scorpio: "The world meets you as an investigator — intense, private, unafraid of the depths. Mars, its ruler, works your calling through depth and transformation: going where others won't and turning crisis into renewal.",
  Sagittarius: "The world meets you as a teacher — expansive, honest, aiming high. Jupiter, its ruler and the guru, works your calling through meaning: teaching, publishing, and pointing people toward the bigger picture.",
  Capricorn: "The world meets you as a builder of structures — disciplined, patient, in for the long climb. Saturn, its ruler, works your calling through mastery and time: earning authority the slow way and carrying weight others can't.",
  Aquarius: "The world meets you as a reformer — original, principled, a step ahead of the room. Saturn, its ruler, works your calling through systems and the collective: building what serves the many with a long, impartial view.",
  Pisces: "The world meets you as a visionary — imaginative, compassionate, porous to the whole. Jupiter, its ruler, works your calling through faith and imagination: art, healing, and devotion.",
};
const IC_GLOSS: Record<string, string> = {
  Aries: "You're rooted in drive and independence. Mars, its ruler, keeps home a place you move freely and act on your own terms; the inner voice you speak from is the pioneer's.",
  Taurus: "You're rooted in steadiness and the senses. Venus, its ruler, makes home a place of comfort and belonging; the inner voice you speak from is the calm, unhurried one.",
  Gemini: "You're rooted in curiosity. Mercury, its ruler, keeps home alive with talk and open questions; the inner voice you speak from is the questioner's.",
  Cancer: "You're rooted in feeling and family. The Moon, its ruler, makes home the true center of your life; the inner voice you speak from is the tender, remembering one.",
  Leo: "You're rooted in the heart. The Sun, its ruler, makes home where you're loved for who you are; the inner voice you speak from is generous and unguarded.",
  Virgo: "You're rooted in order and care. Mercury, its ruler, makes home a place where things work and everything has its place; the inner voice you speak from is the quiet, careful one.",
  Libra: "You're rooted in harmony. Venus, its ruler, makes home a place of peace and good company; the inner voice you speak from is the gentle diplomat's.",
  Scorpio: "You're rooted in depth and privacy. Mars, its ruler, makes home where you can be wholly, secretly yourself; the inner voice you speak from is fierce and unflinching.",
  Sagittarius: "You're rooted in meaning itself. Jupiter, its ruler and the guru, draws you toward belief and room to roam — home is wherever you can keep questioning and stay true to what you hold sacred; the inner voice you speak from is the teacher's.",
  Capricorn: "You're rooted in responsibility and the long view. Saturn, its ruler, makes home a foundation you build to last; the inner voice you speak from is the steady elder's.",
  Aquarius: "You're rooted in principle and chosen kin. Saturn, its ruler, makes home where your values and your people are; the inner voice you speak from is the independent, principled one.",
  Pisces: "You're rooted in imagination and compassion. Jupiter, its ruler, makes home a refuge from the world's hard edges; the inner voice you speak from is the gentle, boundless one.",
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtExact = (iso?: string) => { if (!iso) return null; const [y, m, d] = iso.split("-").map(Number); return `${MON[m - 1]} ${d}, ${y}`; };

type AxisHit = {
  planet: string; pole: "MC" | "IC"; poleLabel: string; orb: number;
  transitSign: string; transitDegree: number; dignity: string;
  natalHouse: number | null; applying: boolean; slow: boolean;
};
type Chapter = {
  planet: string; poleLabel: string; enterMonth: string; exitMonth: string;
  peakDignity: string; natalHouse: number | null; status: "current" | "recent" | "upcoming";
  antardasha?: { open: string; carry: string; close: string };
  retrograde?: boolean;
  stationDirect?: { month: string; sign: string; degree: number };
  stationDirectISO?: string;
  shadowCleared?: boolean;
  shadowClearedMonth?: string;
  shadowClearedISO?: string;
};

/** The "so what" per planet × pole — turns axis data into a one-line orientation.
    MC = the outer/public voice (vocation, calling); IC = the inner/private ground (roots, home). */
const AXIS_READING: Record<string, { MC: string; IC: string }> = {
  Sun:     { MC: "Be seen — step into the visible work.",            IC: "Turn inward — tend your private ground." },
  Mercury: { MC: "Put it in words — pitch, write, speak.",           IC: "Think it through in private before you voice it." },
  Venus:   { MC: "Reputation and relationships favor you now.",      IC: "Soften and beautify home and roots." },
  Mars:    { MC: "Act on the calling — push, don't just plan.",      IC: "Channel the friction into clearing your foundation." },
  Jupiter: { MC: "Say yes to the bigger stage.",                     IC: "Grow your base — invest in home and roots." },
  Saturn:  { MC: "Commit and prove it — no shortcuts.",              IC: "Do the slow, patient work on your foundation." },
  Rahu:    { MC: "Ambition spikes — aim high, stay honest.",         IC: "Restlessness at the root — don't uproot rashly." },
  Ketu:    { MC: "The drive for visibility thins — release, don't force.", IC: "A quiet clearing at the root — let go." },
};
function readAxis(h: AxisHit): string {
  return AXIS_READING[h.planet]?.[h.pole] ?? "";
}

/** One live axis occupant → a plain sentence (courier house + dignity + motion). */
function occLine(h: AxisHit): string {
  const dgn = h.dignity && h.dignity !== "neutral" ? `, ${h.dignity}` : "";
  const motion = h.applying ? "approaching exact" : "separating";
  const courier = h.natalHouse ? `, carrying your ${HOUSE_GLOSS[h.natalHouse] ?? "chart"}` : "";
  return `${h.transitSign} ${h.transitDegree.toFixed(1)}°${dgn} · ${motion} (${h.orb.toFixed(1)}° off)${courier}`;
}

/** Frame each slow chapter as human orientation — ending / threshold / beginning. */
function narrate(ch: Chapter): { headline: string; body: string; reflect?: boolean } {
  const carries = ch.natalHouse ? ` carrying your ${HOUSE_GLOSS[ch.natalHouse] ?? "chart"},` : "";
  const dign = ch.peakDignity !== "neutral" ? `, ${ch.peakDignity} at its height,` : "";
  const ad = ch.antardasha;
  if (ch.status === "current") {
    return {
      headline: `You're inside a chapter — ${ch.planet} on your ${ch.poleLabel}.`,
      body: `${ch.planet}${dign}${carries} has your ${ch.poleLabel} while it's here (${ch.enterMonth} → ${ch.exitMonth}).${ad ? (ad.open === ad.carry ? ` Your ${ad.carry} antardasha is carrying its karma.` : ` Your ${ad.open}→${ad.carry} antardasha is carrying its karma.`) : ""} The ground is ${ch.planet}'s until it moves on — that's where you are.`,
    };
  }
  if (ch.status === "recent") {
    const st = ch.stationDirect;
    const stDate = fmtExact(ch.stationDirectISO) ?? st?.month;
    const clrDate = fmtExact(ch.shadowClearedISO);
    const official = st
      ? `${ch.planet} stationed direct on your ${ch.poleLabel} on ${stDate} (${st.sign} ${st.degree.toFixed(1)}°)${ch.shadowCleared && clrDate ? ` and cleared its shadow on ${clrDate} — the chapter is truly closed` : `, still separating out of its shadow`}.`
      : `${ch.planet} finished crossing your ${ch.poleLabel} around ${ch.exitMonth}${dign ? `, ${ch.peakDignity} at its height` : ""}.`;
    const adPhrase = ad ? (ad.carry === ad.close ? ` It ran under your ${ad.carry} antardasha throughout.` : ` The ${ad.carry} antardasha that carried it has handed off to ${ad.close}.`) : "";
    return {
      headline: `A chapter just closed — ${ch.planet} has left your ${ch.poleLabel}.`,
      body: `${official}${adPhrase} A threshold: an ending, and the opening of what's next.`,
      reflect: true,
    };
  }
  return {
    headline: `A chapter is forming — ${ch.planet} approaches your ${ch.poleLabel}.`,
    body: `Around ${ch.enterMonth}, ${ch.planet}${dign}${carries} reaches your ${ch.poleLabel}.${ad ? ` It opens under your ${ad.open} antardasha.` : ""} A new ground beginning to gather.`,
  };
}

/**
 * The Meridian card — the MC/IC voice axis. Leads with who is ON the axis right now (both
 * poles, live), then the slow-planet chapters (ending · threshold · beginning). Collapsible.
 */
export default function MeridianCard() {
  const accent = useDayModeColor();
  const [, navigate] = useLocation();
  const { settings, saveSettings } = useSettingsContext();
  const { data } = trpc.meridian.current.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const [open, setOpen] = useState(false); // collapsed by default — matches the Chart page's other panels
  // ALL hooks BEFORE the data guard (found 2026-07-19, the Chart-page "Something went
  // sideways" crash class): useUtils + the openClosed state used to sit AFTER
  // `if (!data) return null`, so the component's hook count GREW the render the query
  // resolved — "change in the order of Hooks" → error boundary, whole page down.
  const utils = trpc.useUtils();
  const [openClosed, setOpenClosed] = useState<Set<number>>(new Set());
  if (!data) return null;
  const liftOn = settings.meridianLift;
  // The toggle now TAKES EFFECT immediately (David: "I hate that i have to keep turning
  // it on and off to effect my readings") — flipping it invalidates the ranked list, so
  // one flip is one result; no double-toggling to nudge a stale ranking.
  const toggleLift = () => { saveSettings({ ...settings, meridianLift: !liftOn }); setTimeout(() => utils.tasks.invalidate(), 250); };

  const chapters = (data.chapters ?? []) as Chapter[];
  const hits = ((data as any).hits ?? []) as AxisHit[];
  // The Moon brushes the axis every ~2 days — too fleeting to headline; the notable
  // occupants are Sun/Mercury/Venus/Mars (days) and the slow planets (chapters).
  const occ = hits.filter((h) => h.planet !== "Moon");
  const mcOcc = occ.filter((h) => h.pole === "MC");
  const icOcc = occ.filter((h) => h.pole === "IC");
  const tone: Record<string, string> = { current: accent, recent: "#C0862E", upcoming: "var(--color-muted-foreground)" };
  const summary = occ.length
    ? occ.map((h) => `${h.planet} on your ${h.poleLabel}`).join(" · ")
    : "axis clear right now";

  const Pole = ({ label, note, list }: { label: string; note: string; list: AxisHit[] }) => (
    <div style={{ marginTop: "0.5rem" }}>
      <p style={{ fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: accent, margin: 0 }}>{label} · {note}</p>
      {list.length === 0 ? (
        <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", margin: "0.15rem 0 0", lineHeight: 1.45 }}>Clear right now — no planet on this pole.</p>
      ) : (
        list.map((h, i) => (
          <div key={i} style={{ margin: "0.25rem 0 0" }}>
            <p style={{ fontSize: "0.88rem", color: "var(--foreground)", margin: 0, lineHeight: 1.5 }}>
              <strong style={{ color: accent }}>{h.planet}</strong> — {occLine(h)}.
            </p>
            {readAxis(h) && (
              <p style={{ fontSize: "0.86rem", fontStyle: "italic", color: accent, margin: "0.12rem 0 0", lineHeight: 1.45 }}>
                → {readAxis(h)}
              </p>
            )}
          </div>
        ))
      )}
    </div>
  );

  return (
    <div data-tour="meridian" style={{ borderRadius: "16px", border: "1px solid var(--color-border)", background: "var(--color-card)", padding: "1.1rem 1.25rem", marginBottom: "1.5rem" }}>
      {/* Header — tap to collapse/expand */}
      <button onClick={() => setOpen((o) => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
        <p style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: accent, margin: 0 }}>
          The Meridian <span style={{ color: "var(--color-muted-foreground)", fontWeight: 600, letterSpacing: "0.06em" }}>· your dharma axis</span>
        </p>
        <ChevronDown size={18} style={{ color: "var(--color-muted-foreground)", flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
      </button>

      {!open ? (
        <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", margin: "0.4rem 0 0", lineHeight: 1.45 }}>
          On your axis: <span style={{ color: accent, fontWeight: 600 }}>{summary}</span>.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.3rem" }}>
            <GlossaryLink term="Meridian chapter" underline={false} style={{ fontSize: "0.68rem", color: accent, whiteSpace: "nowrap" }}>What's this?</GlossaryLink>
          </div>
          <div style={{ margin: "0.4rem 0 0", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            <p style={{ fontSize: "0.9rem", color: "var(--foreground)", margin: 0, lineHeight: 1.55 }}>
              <strong style={{ color: accent }}>{data.mc.sign}</strong> on your <strong>Midheaven</strong> — your public calling, your{" "}
              <GlossaryLink term="dharma" underline={false} style={{ color: accent, fontWeight: 700 }}>dharma</GlossaryLink>.{" "}
              {MC_GLOSS[data.mc.sign] ?? "How you appear on the world's stage — career, calling, and the outer voice that carries it."}
            </p>
            <p style={{ fontSize: "0.9rem", color: "var(--foreground)", margin: 0, lineHeight: 1.55 }}>
              Balanced by <strong style={{ color: accent }}>{data.ic.sign}</strong> on your <strong>Imum Coeli</strong> — your roots and private ground.{" "}
              {IC_GLOSS[data.ic.sign] ?? "Home, foundation, and the inner voice you speak from."}
            </p>
          </div>

          {/* WHO'S ON YOUR AXIS NOW — both poles, live */}
          <div style={{ marginTop: "1rem", padding: "0.7rem 0.85rem", borderRadius: 12, background: `color-mix(in srgb, ${accent} 6%, var(--color-card))`, border: "1px solid var(--color-border)" }}>
            <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: 0 }}>On your axis now</p>
            <Pole label="MC" note="outer voice" list={mcOcc} />
            <Pole label="IC" note="inner voice" list={icOcc} />
          </div>

          {/* THE SLOW ARC — chapters */}
          <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-muted-foreground)", margin: "1.1rem 0 0" }}>The slow arc</p>
          {chapters.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--color-muted-foreground)", margin: "0.4rem 0 0", lineHeight: 1.5 }}>
              No slow planet near your axis in this stretch — the larger arc is quiet. The next crossing will open a chapter.
            </p>
          ) : (
            <div style={{ marginTop: "0.6rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
              {chapters.map((ch, i) => {
                const n = narrate(ch);
                // A closed chapter is the PAST — it arrives folded (David 2026-07-16:
                // "can the just closed slow arc collapse?"); one line, opt-in to reopen.
                const folded = ch.status === "recent" && !openClosed.has(i);
                return (
                  <div key={i} style={{ borderLeft: `3px solid ${tone[ch.status]}`, paddingLeft: "0.8rem" }}>
                    <p style={{ fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: tone[ch.status], margin: 0 }}>
                      {ch.status === "current" ? "Now" : ch.status === "recent" ? "Just closed" : "Forming"}
                    </p>
                    {folded ? (
                      <button onClick={() => setOpenClosed((prev) => new Set(prev).add(i))} style={{ display: "flex", alignItems: "baseline", gap: 6, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}>
                        <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--foreground)", lineHeight: 1.4 }}><GlossaryText>{n.headline}</GlossaryText></span>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", flexShrink: 0 }}>more ▾</span>
                      </button>
                    ) : (
                      <>
                        <p style={{ fontSize: "0.92rem", fontWeight: 700, color: "var(--foreground)", margin: "0.2rem 0 0", lineHeight: 1.4 }}><GlossaryText>{n.headline}</GlossaryText></p>
                        <p style={{ fontSize: "0.84rem", color: "var(--color-muted-foreground)", margin: "0.25rem 0 0", lineHeight: 1.55 }}><GlossaryText>{n.body}</GlossaryText></p>
                        {n.reflect && (
                          <button onClick={() => navigate("/reflections")} style={{ marginTop: "0.4rem", fontSize: "0.78rem", fontWeight: 600, color: accent, background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                            What did it land? → Reflect
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* The lift toggle — where the thing is explained, not buried in Settings. */}
          <div style={{ marginTop: "1rem", paddingTop: "0.85rem", borderTop: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", lineHeight: 1.45 }}>
              Let a live chapter gently lift its life-areas — your tasks in those areas (e.g. vocation for the outer voice) rise higher in today's list
            </span>
            <button
              onClick={toggleLift}
              aria-pressed={liftOn}
              style={{ flexShrink: 0, fontSize: "0.75rem", fontWeight: 700, padding: "0.3rem 0.75rem", borderRadius: "999px", cursor: "pointer",
                border: `1px solid ${liftOn ? accent : "var(--color-border)"}`,
                background: liftOn ? `color-mix(in srgb, ${accent} 18%, transparent)` : "transparent",
                color: liftOn ? accent : "var(--color-muted-foreground)" }}
            >
              {liftOn ? "On" : "Off"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
