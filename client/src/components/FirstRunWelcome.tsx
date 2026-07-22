import { useState } from "react";
import { MapPin, CalendarCheck, X, Loader2, Check, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { captureCurrentLocation, geocodeCity } from "@/lib/capture-location";

/**
 * First-run capture — beat 6 of the choreography (login → manifesto → splash → THIS → reveal).
 * ONE card takes everything the app needs to work properly (David, 2026-07-18): birth data
 * (entered INLINE for a brand-new account — never a mid-onboarding bounce to /profiles) and
 * current location (one tap, done in place). Then the app reveals; the tour is offered, never
 * forced. Rendered ONLY by OverlaySequencer.
 */
export default function FirstRunWelcome({
  profile, locationSet, locationLabel, onTakeTour, onExplore, onDismiss,
}: {
  profile: { id: number; name?: string | null; birthDate?: string | null; birthTime?: string | null; birthLocationCity?: string | null } | null | undefined;
  locationSet: boolean;
  locationLabel: string | null;
  onTakeTour: () => void;
  onExplore: () => void;
  onDismiss: () => void;
}) {
  const utils = trpc.useUtils();
  const btn: React.CSSProperties = {
    width: "100%", minHeight: 52, borderRadius: 14, fontSize: "1.05rem", fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", cursor: "pointer",
  };
  const input: React.CSSProperties = {
    width: "100%", minHeight: 44, borderRadius: 10, border: "1px solid var(--color-border)",
    background: "var(--color-card)", color: "var(--color-foreground)", padding: "0 0.7rem", fontSize: "1rem",
  };
  const label: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--color-muted-foreground)" };

  // ── Birth capture (inline — the fresh-account path) ──
  const hasBirth = !!profile?.birthDate;
  const [bd, setBd] = useState("");
  const [bt, setBt] = useState("");
  const [noTime, setNoTime] = useState(false);
  const [bCity, setBCity] = useState("");
  const [bCoords, setBCoords] = useState<{ city: string; lat: string; lon: string } | null>(null);
  const [bStatus, setBStatus] = useState<"idle" | "finding" | "saving" | "saved" | "error">("idle");
  const [bError, setBError] = useState("");
  const updateProfile = trpc.profiles.update.useMutation();
  const calcChart = trpc.profiles.calculateChart.useMutation();

  async function findBirthCity() {
    if (!bCity.trim()) return;
    setBStatus("finding"); setBError("");
    try {
      const hit = await geocodeCity(bCity.trim());
      if (!hit) { setBStatus("idle"); setBError("City not found — try adding the state or country."); return; }
      setBCoords(hit); setBCity(hit.city); setBStatus("idle");
    } catch { setBStatus("idle"); setBError("Search failed — check your connection."); }
  }

  async function saveBirth() {
    if (!profile?.id || !bd || !bCoords) return;
    setBStatus("saving"); setBError("");
    try {
      let timezone: string | undefined;
      try { timezone = (await utils.settings.resolveTimezone.fetch({ lat: bCoords.lat, lon: bCoords.lon })).timezone ?? undefined; } catch { /* server derives if absent */ }
      const birth = {
        birthDate: bd, birthTime: noTime ? undefined : bt || undefined, birthTimeApprox: false,
        birthLocationCity: bCoords.city, birthLocationLat: bCoords.lat, birthLocationLon: bCoords.lon, birthTimezone: timezone,
      };
      // Q5: hometown seeds from the birth place at capture (same as profile-create), so the
      // day-layer's hometown tier is never empty for accounts born in the app.
      await updateProfile.mutateAsync({
        id: profile.id, ...birth,
        hometownCity: bCoords.city, hometownLat: bCoords.lat, hometownLon: bCoords.lon, hometownTimezone: timezone,
      });
      await calcChart.mutateAsync({ id: profile.id, ...birth, birthLocationCity: bCoords.city });
      utils.invalidate();
      setBStatus("saved");
    } catch (e: any) {
      setBStatus("error"); setBError(e?.message ?? "Could not save — try again.");
    }
  }

  // profile must exist (created just after signup) — without it Save has nowhere to write,
  // so the button stays visibly not-ready instead of silently doing nothing.
  const birthReady = !!profile?.id && !!bd && !!bCoords && (noTime || !!bt);
  const fmtBirthLine = () => {
    if (!profile?.birthDate) return null;
    const d = new Date(profile.birthDate + "T12:00:00");
    const t = profile.birthTime ? ` · ${(() => { const [h, m] = profile.birthTime!.split(":").map(Number); const ap = h >= 12 ? "PM" : "AM"; return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ap}`; })()}` : "";
    return `${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${t}${profile.birthLocationCity ? ` · ${profile.birthLocationCity}` : ""}`;
  };

  // ── One-tap current location (unchanged law: the button DOES it) ──
  const setLocation = trpc.settings.setLocation.useMutation();
  const [locStatus, setLocStatus] = useState<"idle" | "working" | "done">("idle");
  const [localCity, setLocalCity] = useState<string | null>(null);
  const cityShown = localCity ?? locationLabel;
  const isSet = locStatus === "done" || locationSet;
  async function handleLocationTap() {
    if (isSet) { window.dispatchEvent(new Event("velea-open-location")); return; }
    setLocStatus("working");
    try {
      const captured = await captureCurrentLocation();
      await setLocation.mutateAsync(captured);
      utils.invalidate();
      setLocalCity(captured.city);
      setLocStatus("done");
    } catch {
      setLocStatus("idle");
      window.dispatchEvent(new Event("velea-open-location")); // manual city entry fallback
    }
  }

  const name = profile?.name ?? "";
  const birthPending = !hasBirth && bStatus !== "saved"; // the inline capture form is showing
  return (
    // AUDIT 2026-07-19: NO backdrop-to-dismiss. This is the one card that captures the birth data
    // the whole app needs; an accidental backdrop tap used to mark onboarding complete and strand a
    // fresh account with no chart. Dismissing now requires an explicit choice (the × or a footer button).
    <div data-velea-welcome className="fixed inset-0 z-[130] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.62)", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md flex flex-col" style={{ position: "relative", maxHeight: "92vh", background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 22, boxShadow: "0 24px 64px rgba(0,0,0,0.4)", overflow: "hidden" }}>
        <button onClick={onDismiss} aria-label="Dismiss" style={{ position: "absolute", top: 10, right: 10, zIndex: 3, width: 34, height: 34, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-secondary)", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", cursor: "pointer" }}>
          <X size={18} />
        </button>

        <div className="overflow-y-auto" style={{ padding: "1.5rem 1.4rem 0.5rem" }}>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "1.6rem", fontWeight: 800, color: "var(--color-foreground)", margin: 0, lineHeight: 1.1 }}>
            Welcome{name ? `, ${name}` : ""}.
          </h1>
          <p style={{ fontSize: "0.98rem", color: "var(--color-muted-foreground)", lineHeight: 1.5, margin: "0.5rem 0 0" }}>
            Two things make Velea yours — let's make sure they're right.
          </p>

          {/* 1 — birth data: confirm when present, capture inline when not */}
          <div style={{ marginTop: "1.1rem", padding: "0.9rem 1rem", borderRadius: 14, border: "1px solid var(--color-border)", background: "var(--color-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <CalendarCheck size={16} style={{ color: "var(--color-primary)" }} />
              <span style={label}>Your birth details</span>
            </div>
            {hasBirth || bStatus === "saved" ? (
              <>
                <p style={{ fontSize: "1.12rem", fontWeight: 700, color: "var(--color-foreground)", lineHeight: 1.3, margin: "0.4rem 0 0", display: "flex", alignItems: "center", gap: 6 }}>
                  {bStatus === "saved" && <Check size={16} style={{ color: "var(--color-primary)" }} />}
                  {fmtBirthLine() ?? `${bCoords?.city ?? ""} — chart calculated`}
                </p>
                <p style={{ fontSize: "0.88rem", color: "var(--color-muted-foreground)", lineHeight: 1.45, margin: "0.25rem 0 0" }}>
                  {bStatus === "saved" ? "Your chart is cast. You can refine it any time in Profiles." : "If the date or time is even a little off, your whole chart is too. Refine it any time in Profiles."}
                </p>
              </>
            ) : (
              <div style={{ marginTop: "0.6rem", display: "grid", gap: "0.6rem" }}>
                <p style={{ fontSize: "0.88rem", color: "var(--color-muted-foreground)", lineHeight: 1.45, margin: 0 }}>
                  Velea reads your chart from your birth date, time, and place.
                </p>
                <div>
                  <span style={label}>Date</span>
                  <input type="date" value={bd} onChange={(e) => setBd(e.target.value)} style={{ ...input, marginTop: 4 }} />
                </div>
                <div>
                  <span style={label}>Time</span>
                  <input type="time" value={bt} disabled={noTime} onChange={(e) => setBt(e.target.value)} style={{ ...input, marginTop: 4, opacity: noTime ? 0.5 : 1 }} />
                  <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: "0.85rem", color: "var(--color-muted-foreground)" }}>
                    <input type="checkbox" checked={noTime} onChange={(e) => setNoTime(e.target.checked)} />
                    I don't know the time
                  </label>
                </div>
                <div>
                  <span style={label}>Birth city</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <input value={bCity} onChange={(e) => { setBCity(e.target.value); setBCoords(null); }} onKeyDown={(e) => e.key === "Enter" && findBirthCity()} placeholder="City, Country" style={{ ...input, flex: 1 }} />
                    <button onClick={findBirthCity} disabled={bStatus === "finding" || !bCity.trim()} style={{ minWidth: 74, borderRadius: 10, border: "1px solid var(--color-border)", background: "var(--color-card)", color: "var(--color-foreground)", display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: "0.9rem", fontWeight: 700, cursor: "pointer" }}>
                      {bStatus === "finding" ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Find
                    </button>
                  </div>
                  {bCoords && <p style={{ fontSize: "0.82rem", color: "var(--color-primary)", margin: "0.3rem 0 0", display: "flex", alignItems: "center", gap: 4 }}><Check size={13} /> {bCoords.city}</p>}
                </div>
                {bError && <p style={{ fontSize: "0.82rem", color: "oklch(0.6 0.18 25)", margin: 0 }}>{bError}</p>}
                <button onClick={saveBirth} disabled={!birthReady || bStatus === "saving"} style={{ ...btn, minHeight: 46, fontSize: "0.98rem",
                  background: birthReady ? "var(--color-primary)" : "var(--color-secondary)",
                  color: birthReady ? "var(--color-primary-foreground)" : "var(--color-muted-foreground)",
                  border: "1.5px solid var(--color-border)", opacity: bStatus === "saving" ? 0.75 : 1 }}>
                  {bStatus === "saving" ? <><Loader2 size={16} className="animate-spin" /> Casting your chart…</> : "Save my birth details"}
                </button>
              </div>
            )}
          </div>

          {/* 2 — current location: one tap, done in place */}
          <div style={{ marginTop: "0.75rem", padding: "0.9rem 1rem", borderRadius: 14, border: `1px solid ${isSet ? "var(--color-border)" : "color-mix(in srgb, var(--color-primary) 45%, transparent)"}`, background: "var(--color-secondary)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <MapPin size={16} style={{ color: "var(--color-primary)" }} />
              <span style={label}>Where you are now</span>
            </div>
            <p style={{ fontSize: "0.92rem", color: "var(--color-foreground)", lineHeight: 1.45, margin: "0.4rem 0 0" }}>
              <strong>Separate from your birthplace</strong> — it's what tunes today's timing to you.
            </p>
            <button onClick={handleLocationTap} disabled={locStatus === "working"} style={{ ...btn, marginTop: "0.65rem", minHeight: 46, fontSize: "0.98rem",
              background: isSet ? "transparent" : "var(--color-primary)", color: isSet ? "var(--color-primary)" : "var(--color-primary-foreground)",
              border: `1.5px solid var(--color-primary)`, opacity: locStatus === "working" ? 0.75 : 1 }}>
              {locStatus === "working" ? <Loader2 size={16} className="animate-spin" /> : isSet ? <Check size={16} /> : <MapPin size={16} />}
              {locStatus === "working" ? "Finding you…" : isSet ? `${cityShown ?? "Set"} — change it` : "Set my current location"}
            </button>
          </div>
        </div>

        {/* pinned choices — always visible, no scrolling to find them */}
        <div style={{ padding: "0.9rem 1.4rem calc(env(safe-area-inset-bottom,0px) + 1rem)", borderTop: "1px solid var(--color-border)", background: "var(--color-card)" }}>
          {/* AUDIT 2026-07-19: while the birth form is still open, "Save my birth details" is the
              lone primary — "Show me around" drops to outline so there aren't two filled primaries
              competing (and it stops reading as the expected next tap before birth is entered). */}
          <button onClick={onTakeTour} style={{ ...btn,
            background: birthPending ? "transparent" : "var(--color-primary)",
            color: birthPending ? "var(--color-primary)" : "var(--color-primary-foreground)",
            border: birthPending ? "1.5px solid var(--color-primary)" : "none" }}>
            Show me around
          </button>
          <button onClick={onExplore} style={{ ...btn, marginTop: "0.55rem", minHeight: 48, background: "transparent", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)" }}>
            I'll explore on my own
          </button>
        </div>
      </div>
    </div>
  );
}
