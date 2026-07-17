import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * InstallGuide — "pretend you have to tell a nana to do that" (David 2026-07-16).
 * Put-Velea-on-your-phone steps, written for someone's grandmother: no jargon, every
 * button located by where it sits on the screen. Detects the device and shows ONLY
 * that device's steps (the others wait behind small links); collapsed on arrival per
 * the mantra; renders nothing at all once the app is already installed.
 */
type Device = "iphone" | "android" | "desktop";

const STEPS: Record<Device, { label: string; steps: string[] }> = {
  iphone: {
    label: "iPhone or iPad",
    steps: [
      "Open velealor.com in Safari — the compass app you use for the internet.",
      "Tap the little square with the arrow pointing up, at the bottom middle of the screen.",
      "Slide the list up a little and tap “Add to Home Screen.”",
      "Tap “Add” in the top corner. That's it — Velea now lives on your home screen like any other app. Open it from there from now on.",
    ],
  },
  android: {
    label: "Android phone",
    steps: [
      "Open velealor.com in Chrome.",
      "Tap the three little dots in the top right corner.",
      "Tap “Add to Home screen” (on some phones it says “Install app”).",
      "Tap “Install.” That's it — Velea appears with your other apps.",
    ],
  },
  desktop: {
    label: "Computer",
    steps: [
      "Open velealor.com in Chrome or Edge.",
      "Look at the right end of the address bar at the top — there's a small picture of a screen with a little arrow.",
      "Click it, then click “Install.” Velea opens in its own window and stays in your Dock or taskbar.",
      "On a Mac using Safari instead: click “File” at the very top of the screen, then “Add to Dock.”",
    ],
  },
};

export default function InstallGuide() {
  const standalone =
    typeof window !== "undefined" &&
    (window.matchMedia?.("(display-mode: standalone)")?.matches || (navigator as any).standalone === true);
  const detected: Device = /iPad|iPhone|iPod/.test(navigator.userAgent)
    ? "iphone"
    : /Android/i.test(navigator.userAgent)
    ? "android"
    : "desktop";
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<Device>(detected);
  if (standalone) return null;

  return (
    <div className="w-full" style={{ marginTop: "1.4rem" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          background: "none", border: "none", cursor: "pointer",
          color: "var(--color-muted-foreground, #8D8171)", fontSize: "0.8rem", fontWeight: 600,
        }}
      >
        Put Velea on your {device === "desktop" ? "computer" : "phone"}
        <ChevronDown size={17} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }} />
      </button>
      {open && (
        <div
          style={{
            marginTop: "0.7rem", borderRadius: 14, padding: "0.9rem 1rem",
            background: "var(--parchment, #f8f4ea)", border: "1px solid var(--color-border, #E2D7C2)",
            color: "#3E352A", textAlign: "left",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8D8171" }}>
            {STEPS[device].label}
          </p>
          <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {STEPS[device].steps.map((s, i) => (
              <li key={i} style={{ fontSize: "0.85rem", lineHeight: 1.55 }}>{s}</li>
            ))}
          </ol>
          <p style={{ margin: "0.7rem 0 0", fontSize: "0.75rem", color: "#8D8171" }}>
            {(Object.keys(STEPS) as Device[])
              .filter((k) => k !== device)
              .map((k, i) => (
                <span key={k}>
                  {i > 0 && " · "}
                  <button
                    type="button"
                    onClick={() => setDevice(k)}
                    style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#8D8171", fontSize: "0.75rem", textDecoration: "underline" }}
                  >
                    Using {k === "iphone" ? "an iPhone" : k === "android" ? "an Android" : "a computer"}?
                  </button>
                </span>
              ))}
          </p>
        </div>
      )}
    </div>
  );
}
