import GateMark from "@/components/GateMark";
import NotifyMeButton from "@/components/NotifyMeButton";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Bookmark, BookmarkCheck, ChevronRight,  X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PREMIUM_PRICING } from "@/lib/pricing";

/**
 * Kept Readings — the "pin + archive link" that lives under the day's reading. Your daily readings
 * are already stored with a timestamp; this surfaces them: pin the ones that land, and open the full
 * timestamped archive. Gated (masterMode.access): non-entitled users see an elegant locked teaser;
 * entitled users get the working pin + link. Placed right beneath the reading on the Today page.
 */
export default function KeptReadings({ profileId, date }: { profileId: number; date: string }) {
  const [location, navigate] = useLocation();
  const [teaserOpen, setTeaserOpen] = useState(false);
  // Two-stage pitch (David 2026-07-22: "the pop-up was old"): Subscribe → notify-me, the same
  // pattern as the moment refresh. Kept-readings is a Master-tier feature (PREMIUM_PRICING.monthly),
  // so it shows a bare "Subscribe" while the monthly price is null and auto-fills the number the
  // moment it's set — never an invented price.
  const [subTapped, setSubTapped] = useState(false);
  const utils = trpc.useUtils();
  const { data: access } = trpc.masterMode.access.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const entitled = access?.entitled === true;

  const { data: lock } = trpc.narrative.lockStatus.useQuery(
    { profileId, date },
    { enabled: entitled, staleTime: 1000 * 30 },
  );
  const locked = lock?.locked === true;
  // OPTIMISTIC (David 2026-07-18: "nothing changes visually. I have no idea if it works"):
  // the button flips gold the instant it's tapped; the server's ensure-generate can take
  // seconds, and onSettled re-syncs to the real state (a failed pin reverts itself).
  const setLock = trpc.narrative.setLock.useMutation({
    onMutate: async (vars) => {
      await utils.narrative.lockStatus.cancel({ profileId, date });
      const prev = utils.narrative.lockStatus.getData({ profileId, date });
      utils.narrative.lockStatus.setData({ profileId, date }, { locked: vars.locked } as any);
      return { prev };
    },
    onError: (_e, _v, ctxm: any) => { if (ctxm?.prev) utils.narrative.lockStatus.setData({ profileId, date }, ctxm.prev); },
    onSettled: () => { utils.narrative.lockStatus.invalidate({ profileId, date }); },
  });

  useEffect(() => {
    if (!teaserOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTeaserOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [teaserOpen]);

  // Sits in the reading zone of the day card, which uses light text on a saturated ground.
  // Lives in the hero's reading zone — speaks the hero's tonal ink, never raw white.
  const ink = "color-mix(in srgb, var(--hero-ink) 85%, transparent)";
  const hairline = "1px solid color-mix(in srgb, var(--hero-ink) 20%, transparent)";
  const rowStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.5rem",
    marginTop: "0.5rem", paddingTop: "0.6rem",
    borderTop: hairline,
    fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
  };

  // ── Locked teaser (non-entitled) ─────────────────────────────────────────
  if (!entitled) {
    return (
      <>
        <button onClick={() => setTeaserOpen(true)} style={{ ...rowStyle, background: "none", border: "none", borderTop: hairline, width: "100%", cursor: "pointer", color: ink }}>
          <Bookmark size={14} style={{ flexShrink: 0 }} />
          <span>Keep this reading</span>
          {/* Speak the card's tonal ink, not raw gold (David 2026-07-18: "gold not showing up on
              darker value colors is a recurring issue" — the lock mark vanished on the caution card). */}
          <GateMark size={18} style={{ marginLeft: "auto", opacity: 0.85, color: ink }} />
        </button>
        {teaserOpen && createPortal(
          <div onClick={() => { setTeaserOpen(false); setSubTapped(false); }} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(30, 24, 16, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "22rem", width: "100%", borderRadius: 18, background: "var(--color-card)", border: "1px solid var(--color-border)", padding: "1.4rem", boxShadow: "0 20px 60px oklch(0 0 0 / 0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.7rem" }}>
                <GateMark size={22} style={{ color: "#C9A84C" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--foreground)" }}>Kept Readings</span>
                <button onClick={() => { setTeaserOpen(false); setSubTapped(false); }} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)" }}><X size={16} /></button>
              </div>
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4 }}>Pin the days that land — and keep every reading, timestamped.</p>
              <p style={{ margin: "0.7rem 0 0", fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
                Your daily readings are the long thread — the real Time Lord. Pin the ones that land, and revisit the whole archive of your days, each kept with its date and time.
              </p>
              {!subTapped ? (
                <>
                  <button
                    onClick={() => setSubTapped(true)}
                    style={{ marginTop: "1rem", width: "100%", background: "linear-gradient(180deg, #E7C766, #C9A84C 55%, #A87E2E)", border: "none", borderRadius: 12, padding: "0.85rem", fontSize: "0.85rem", fontWeight: 800, letterSpacing: "0.04em", color: "#1a1200", cursor: "pointer" }}
                  >
                    {PREMIUM_PRICING.monthly ? `Subscribe · ${PREMIUM_PRICING.monthly}` : "Subscribe"}
                  </button>
                  <div style={{ textAlign: "center" }}>
                    <button onClick={() => { setTeaserOpen(false); setSubTapped(false); }} style={{ marginTop: "0.6rem", background: "transparent", border: "none", fontSize: "0.78rem", color: "var(--color-muted-foreground)", cursor: "pointer", textDecoration: "underline" }}>
                      Not now
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: "1rem" }}>
                  <p style={{ margin: "0 0 0.7rem", fontSize: "0.85rem", color: "var(--color-foreground)", lineHeight: 1.55 }}>
                    Not open just yet — leave your name and I'll tell you the moment it goes live.
                  </p>
                  <NotifyMeButton feature="kept-readings" />
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  // ── Entitled: working pin + archive link ─────────────────────────────────
  // AUDIT 2026-07-19: the pinned state used raw #C9A84C gold, invisible on the dark ruby/rose hero
  // (the recurring gold-on-dark bug). The filled BookmarkCheck icon already signals pinned, so the
  // label rides legible hero-ink in BOTH states — state shown by the icon, not by an unreadable color.
  return (
    <div style={{ ...rowStyle, color: ink }}>
      <button
        onClick={() => setLock.mutate({ profileId, date, locked: !locked })}
        disabled={setLock.isPending}
        title={locked ? "Pinned — tap to unpin" : "Pin this reading"}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", padding: 0, cursor: "pointer", color: ink, font: "inherit", letterSpacing: "inherit", textTransform: "inherit" }}
      >
        {locked ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
        <span>{locked ? "Pinned" : "Pin this reading"}</span>
      </button>
      <button
        onClick={() => navigate("/readings")}
        style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: "0.2rem", background: "none", border: "none", padding: 0, cursor: "pointer", color: ink, font: "inherit", letterSpacing: "inherit", textTransform: "inherit" }}
      >
        <span>Your past readings</span>
        <ChevronRight size={13} />
      </button>
    </div>
  );
}
