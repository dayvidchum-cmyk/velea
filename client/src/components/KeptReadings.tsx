import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Bookmark, BookmarkCheck, ChevronRight, Lock, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Kept Readings — the "pin + archive link" that lives under the day's reading. Your daily readings
 * are already stored with a timestamp; this surfaces them: pin the ones that land, and open the full
 * timestamped archive. Gated (masterMode.access): non-entitled users see an elegant locked teaser;
 * entitled users get the working pin + link. Placed right beneath the reading on the Today page.
 */
export default function KeptReadings({ profileId, date }: { profileId: number; date: string }) {
  const [location, navigate] = useLocation();
  const [teaserOpen, setTeaserOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: access } = trpc.masterMode.access.useQuery(undefined, { staleTime: 1000 * 60 * 30 });
  const entitled = access?.entitled === true;

  const { data: lock } = trpc.narrative.lockStatus.useQuery(
    { profileId, date },
    { enabled: entitled, staleTime: 1000 * 30 },
  );
  const locked = lock?.locked === true;
  const setLock = trpc.narrative.setLock.useMutation({
    onSuccess: () => { utils.narrative.lockStatus.invalidate({ profileId, date }); },
  });

  useEffect(() => {
    if (!teaserOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setTeaserOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [teaserOpen]);

  // Sits in the reading zone of the day card, which uses light text on a saturated ground.
  const ink = "rgba(255,255,255,0.85)";
  const hairline = "1px solid rgba(255,255,255,0.20)";
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
          <Lock size={12} style={{ marginLeft: "auto", opacity: 0.7 }} />
        </button>
        {teaserOpen && createPortal(
          <div onClick={() => setTeaserOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "22rem", width: "100%", borderRadius: 18, background: "var(--color-card)", border: "1px solid var(--color-border)", padding: "1.4rem", boxShadow: "0 20px 60px oklch(0 0 0 / 0.4)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.7rem" }}>
                <Lock size={16} style={{ color: "#C9A84C" }} />
                <span style={{ fontSize: "0.7rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--foreground)" }}>Kept Readings</span>
                <button onClick={() => setTeaserOpen(false)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-foreground)" }}><X size={16} /></button>
              </div>
              <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "var(--foreground)", lineHeight: 1.4 }}>Pin the days that matter — and keep every reading, timestamped.</p>
              <p style={{ margin: "0.7rem 0 0", fontSize: "0.82rem", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>
                Your daily readings are the long thread — the real Time Lord. Pin the ones that land, and revisit the whole archive of your days, each kept with its date and time. A premium layer, not yet unlocked.
              </p>
            </div>
          </div>,
          document.body,
        )}
      </>
    );
  }

  // ── Entitled: working pin + archive link ─────────────────────────────────
  return (
    <div style={{ ...rowStyle, color: ink }}>
      <button
        onClick={() => setLock.mutate({ profileId, date, locked: !locked })}
        disabled={setLock.isPending}
        title={locked ? "Pinned — tap to unpin" : "Pin this reading"}
        style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", background: "none", border: "none", padding: 0, cursor: "pointer", color: locked ? "#C9A84C" : ink, font: "inherit", letterSpacing: "inherit", textTransform: "inherit" }}
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
