import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import VeleaMark from "@/components/VeleaMark";

/**
 * THE 3RD-OPEN BELL NUDGE (David 2026-07-18: "a pop-up at some point today, perhaps 3rd opening
 * of the app pointing to alerts... built in for all users... but make it on brand.")
 *
 * Rules: counts one open per browser-session; shows ONCE ever (dismiss = never again — the
 * no-nag law); only when push is configured server-side, this device supports it (= the
 * installed PWA, where push actually works), and the user isn't already subscribed.
 */
const OPENS_KEY = "velea_opens";
const COUNTED_KEY = "velea_open_counted";
const DONE_KEY = "velea_bell_nudge_done";

export default function MorningBellNudge() {
  const utils = trpc.useUtils();
  const { data: status } = trpc.push.status.useQuery(undefined, { staleTime: 60_000 });
  const subscribeMut = trpc.push.subscribe.useMutation({ onSettled: () => utils.push.status.invalidate() });
  const [show, setShow] = useState(false);
  const [state, setState] = useState<"ask" | "busy" | "rung" | "blocked" | "error">("ask");

  useEffect(() => {
    try {
      // One count per session; the nudge waits for the third distinct open.
      if (!sessionStorage.getItem(COUNTED_KEY)) {
        sessionStorage.setItem(COUNTED_KEY, "1");
        const n = parseInt(localStorage.getItem(OPENS_KEY) ?? "0", 10) + 1;
        localStorage.setItem(OPENS_KEY, String(n));
      }
      const opens = parseInt(localStorage.getItem(OPENS_KEY) ?? "0", 10);
      const done = localStorage.getItem(DONE_KEY);
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (opens >= 3 && !done && supported && status?.configured && !status.subscribed) {
        const t = setTimeout(() => setShow(true), 1600); // let the day settle in first
        return () => clearTimeout(t);
      }
    } catch { /* storage unavailable — never nag, never crash */ }
  }, [status?.configured, status?.subscribed]);

  if (!show || !status?.configured) return null;

  const dismiss = () => { try { localStorage.setItem(DONE_KEY, "1"); } catch {} setShow(false); };

  const urlBase64ToUint8Array = (base64: string) => {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = window.atob(b64);
    return Uint8Array.from(Array.from(raw).map((c) => c.charCodeAt(0)));
  };

  const ringIt = async () => {
    setState("busy");
    // AUDIT #4: only a denied/failed PERMISSION is "blocked" (→ the device-settings guidance). A
    // permission grant that then fails at subscribe/network/server is a transient error, not a
    // blocked-notifications state — say so and let them retry, don't misdiagnose.
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setState("blocked"); return; }
    } catch { setState("blocked"); return; }
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(status.publicKey!) });
      const json = sub.toJSON() as any;
      await subscribeMut.mutateAsync({ endpoint: sub.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth });
      try { localStorage.setItem(DONE_KEY, "1"); } catch {}
      setState("rung");
      setTimeout(() => setShow(false), 2600);
    } catch { setState("error"); }
  };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(20,15,8,0.45)", backdropFilter: "blur(3px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 1rem calc(2rem + env(safe-area-inset-bottom, 0px))" }} onClick={dismiss}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="parchment"
        style={{ maxWidth: "24rem", width: "100%", borderRadius: 18, background: "var(--parchment)", border: "1px solid color-mix(in srgb, var(--brand-gold, #B08D2E) 45%, transparent)", padding: "1.3rem 1.4rem", boxShadow: "0 18px 50px rgba(0,0,0,0.35)", animation: "slideUpDue 260ms cubic-bezier(0.23, 1, 0.32, 1)" }}
      >
        <style>{`@keyframes slideUpDue { from { transform: translateY(40%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
          <VeleaMark size={20} color="var(--brand-gold, #B08D2E)" />
          <span style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--brand-gold, #B08D2E)" }}>The Morning Bell</span>
        </div>
        {state === "rung" ? (
          <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.5, color: "var(--color-foreground)" }}>
            The bell is set. It rings at 8, your time. 🔔
          </p>
        ) : state === "blocked" ? (
          <>
            <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.5, color: "var(--color-foreground)" }}>
              Notifications are off for Velea on this phone — you can allow them in your device settings, then flip the bell on in Settings.
            </p>
            <button onClick={dismiss} style={{ marginTop: "0.9rem", background: "none", border: "none", color: "var(--color-muted-foreground)", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}>Okay</button>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.55, color: "var(--color-foreground)" }}>
              {state === "error"
                ? "That didn't go through — a hiccup on the way. Try once more?"
                : "One line at 8 each morning — how the stage is set, what's coming, whose day it is. Sometimes trivia. Sometimes gossip about the Moon."}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1.1rem" }}>
              <button
                onClick={ringIt}
                disabled={state === "busy"}
                style={{ flex: 1, borderRadius: 999, padding: "0.65rem 1rem", fontSize: "0.85rem", fontWeight: 800, border: "none", cursor: "pointer", color: "#1a1305", background: "linear-gradient(180deg, #E7C766, #B8912F)", opacity: state === "busy" ? 0.7 : 1 }}
              >
                {state === "busy" ? "Setting…" : state === "error" ? "Try again" : "Ring it"}
              </button>
              <button onClick={dismiss} style={{ background: "none", border: "none", color: "var(--color-muted-foreground)", fontSize: "0.82rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}>
                Not now
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
