import { useState } from "react";
import { Check, Loader2, BellRing } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * "Notify me when it's live" — the waitlist capture on every locked feature (David 2026-07-18:
 * "Price and notify me button that adds them to a list for when it's live"). One tap DOES it
 * (button-does-the-thing law): joins the waitlist under the signed-in email, flips to a done
 * state, and remembers per-feature on this device so it never re-asks.
 */
export default function NotifyMeButton({ feature }: { feature: string }) {
  const KEY = `velea-notify-${feature}`;
  const [state, setState] = useState<"idle" | "working" | "done">(() => {
    try { return localStorage.getItem(KEY) ? "done" : "idle"; } catch { return "idle"; }
  });
  const join = trpc.settings.joinWaitlist.useMutation();

  async function tap() {
    if (state !== "idle") return;
    setState("working");
    try {
      await join.mutateAsync({ feature });
      try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
      setState("done");
    } catch { setState("idle"); }
  }

  return (
    <button
      onClick={tap}
      disabled={state !== "idle"}
      style={{
        width: "100%", padding: "0.7rem", borderRadius: 12, cursor: state === "idle" ? "pointer" : "default",
        border: "1px solid color-mix(in srgb, var(--brand-gold, #C9A84C) 55%, transparent)",
        background: state === "done" ? "transparent" : "var(--brand-gold, #C9A84C)",
        color: state === "done" ? "var(--brand-gold, #C9A84C)" : "#1E1B18",
        fontSize: "0.85rem", fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
      }}
    >
      {state === "working" ? <Loader2 size={15} className="animate-spin" /> : state === "done" ? <Check size={15} /> : <BellRing size={15} />}
      {state === "working" ? "Adding you…" : state === "done" ? "You're on the list" : "Notify me when it's live"}
    </button>
  );
}
