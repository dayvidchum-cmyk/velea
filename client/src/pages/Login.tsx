import { useState } from "react";
import InstallGuide from "@/components/InstallGuide";
import VeleaLoader from "@/components/VeleaLoader";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useQueryClient } from "@tanstack/react-query";
import { useDarkChromeWhile } from "@/contexts/ThemeContext";

/**
 * THE LOGIN IS THE GATE (David 2026-07-18: "Let's do it. One day one night. We can try
 * and see.") — the login screen is the one place the Time Gate is literally true: you
 * stand outside, the lions watch, you enter THROUGH the doorway. David's two ceremonial
 * gate engravings (his art, use-the-file law): GOLD by day, SILVER by night, picked by
 * the local clock (v1: 6am–6pm; upgrade to true sunrise/sunset later). The form sits
 * seated in the doorway's dark slot. Art is shown WHOLE (contain on black — the
 * letterbox is invisible because the art's own ground is black). This page deliberately
 * commits to the night-world look in both app themes.
 */

type Mode = "signin" | "signup";

export default function Login() {
  const [, setLocation] = useLocation();
  // Invite-only signup: the signup form is only offered when arriving via an invite link
  // (…/login?code=XXXX). A plain visit is sign-in only — registration is never public.
  const inviteCode = (typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("code") : null) ?? "";
  const canSignup = inviteCode.trim().length > 0;
  const [mode, setMode] = useState<Mode>(canSignup ? "signup" : "signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const isSignup = mode === "signup";
  useDarkChromeWhile(true, "#050505"); // the gate owns the phone chrome — no white bands

  // One day, one night — the door keeps time.
  const hour = new Date().getHours();
  const isDay = hour >= 6 && hour < 18;
  const METAL = isDay
    ? { hi: "#E7C766", accent: "#C9A84C", deep: "#A87E2E", btnText: "#1a1200" }
    : { hi: "#DDE3EA", accent: "#B9C2CE", deep: "#8E97A6", btnText: "#0d1117" };
  // THE GATE (David's 2026-07-18 drop, Gate.png → login-gate.jpg): the temple over the yantra
  // line-geometry on a starfield, black bled to every edge — the seam-killer re-export. ONE art
  // for day and night now; the METAL (gold by day / silver by night) still turns with the sun.
  // A gold day-variant slot stays open if he paints one.
  const art = "/login-gate.jpg";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (isSignup) {
        await registerMutation.mutateAsync({ email, password, name: name.trim() || undefined, inviteCode: inviteCode.trim() });
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
      // RESET everything, don't just invalidate (onboarding-order bug, 2026-07-18):
      // invalidate keeps serving the PREVIOUS user's cached answers until refetches land —
      // logging in as another account let their tourState ("welcome seen, tours on") leak
      // into the first render, auto-firing the page tour over the new user's first-run
      // beats. Reset wipes the cache so nothing renders from the wrong account.
      await queryClient.resetQueries();
      try { sessionStorage.setItem("velea_splash", "1"); } catch { /* ignore */ }
      setLocation("/");
    } catch (err: any) {
      setError(
        isSignup
          ? (err?.message ?? "Could not create your account.")
          : "Those credentials don't match."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "signin" ? "signup" : "signin"));
    setError("");
    setPassword("");
  };

  // GHOST REGISTER (David: "Email password and enter is way too overpowering") — the
  // doorway's darkness is the field; the form is just hairlines and small caps.
  const inputStyle: React.CSSProperties = {
    background: "transparent",
    border: "none",
    borderBottom: "1px solid color-mix(in srgb, #D4AF37 55%, transparent)", // gold lines (David 2026-07-18)
    borderRadius: 0,
    padding: "0.45rem 0.4rem",
    fontSize: "0.66rem",
    letterSpacing: "0.18em",
    textAlign: "center",
    caretColor: "#D4AF37",
    color: "#F2EFE6",
  };

  const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderBottomColor = "#E7C766"; // bright gold on focus — the line wakes
  };
  const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderBottomColor = "color-mix(in srgb, #D4AF37 55%, transparent)"; // AUDIT M14: match the resting 55% — blur left touched inputs permanently dimmer
  };

  // FIXED inset:0 on TRUE BLACK (David 2026-07-18: "why is it oatmeal under it? just be black to
  // match the image"). As an in-flow 100lvh div it sat inside the app's safe-area padding, so the
  // parchment page background showed as an oatmeal band below the gate. Fixed to all four edges, it
  // owns the whole screen — the black now runs edge to edge behind the art.
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      <style>{`.velea-input::placeholder { color: rgba(212,175,55,0.8); letter-spacing: 0.18em; font-size: 0.66rem; }`}</style>

      {/* THE GATE BOX — the art's exact aspect (3375×6000) at FULL viewport height: David likes
          how the piece is composed (halo above, gate seated, star-sea below), so the whole
          vertical frame always shows — no overscan, no recomposition; narrow phones shave only
          side starfield. Form anchors INSIDE the box, so the doorway seat is pixel-true
          (door slot measured on this art: rows ~46.4–63.6%, center ~55%). */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", aspectRatio: "3375 / 6000", height: "100lvh" }}>
        <img
          src={art}
          alt=""
          aria-hidden="true"
          style={{ width: "100%", height: "100%", objectFit: "cover", userSelect: "none", pointerEvents: "none" }}
        />

      {/* The name — now seated in the STAR-SEA below the gate (his call): the temple stands
          untouched above; name + threshold live in the field of stars. */}
      <h1
        style={{
          position: "absolute",
          top: "12.5%", // ABOVE the natal-chart square's top line (~15.5%), right above the gate's peak (David: the name crowns the composition; the form lives in the star-sea below)
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
          fontWeight: 700,
          fontSize: "clamp(1.5rem, 6vw, 2rem)",
          letterSpacing: "-0.01em",
          lineHeight: 1,
          margin: 0,
          // David 2026-07-18: "make the velea brand word flat gold" — the gradient metal retired.
          color: "#D4AF37",
        }}
      >
        Velea
      </h1>

      {/* THE THRESHOLD — the form, seated in the doorway's own darkness. */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: "absolute",
          zIndex: 2, // AUDIT M14: the form stays typable above the bottom toggle/install strip on short screens
          top: "76%", // EMAIL lands on David's neon-green mark (~70.7% screen); pw + Enter follow below
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(230px, 60vw)",
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
        }}
      >
        {isSignup && (
          <input
            type="text"
            autoComplete="name"
            placeholder="NAME (OPTIONAL)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            maxLength={120}
            className="velea-input w-full outline-none transition-all text-sm font-medium"
            style={inputStyle}
            onFocus={focusBorder}
            onBlur={blurBorder}
          />
        )}

        <input
          type="email"
          autoComplete="email"
          required
          placeholder="EMAIL"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="velea-input w-full outline-none transition-all text-xs font-medium"
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />

        <input
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={isSignup ? 8 : 6}
          placeholder={isSignup ? "PASSWORD (MIN 8)" : "PASSWORD"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          className="velea-input w-full outline-none transition-all text-xs font-medium"
          style={inputStyle}
          onFocus={focusBorder}
          onBlur={blurBorder}
        />

        {error && (
          <p className="text-xs text-center" style={{ color: "#E08A85", margin: 0, textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full transition-all active:scale-[0.98] disabled:opacity-50"
          style={{
            // David 2026-07-18: "can the enter button turn bright gold when its entering" — the
            // moment of crossing ignites; at rest it stays the quiet hairline.
            background: isLoading ? "linear-gradient(180deg, #E7C766, #B8912F)" : "transparent",
            color: isLoading ? "#1a1305" : METAL.hi,
            border: isLoading ? "1px solid #E7C766" : `1px solid color-mix(in srgb, ${METAL.accent} 55%, transparent)`,
            boxShadow: isLoading ? "0 0 18px rgba(212,175,55,0.45)" : "none",
            borderRadius: 999,
            padding: "0.5rem",
            fontSize: "0.62rem",
            fontWeight: 700,
            letterSpacing: "0.26em",
            textTransform: "uppercase",
            marginTop: "0.35rem",
          }}
        >
          {isLoading ? (
            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.55rem" }}>
              <VeleaLoader size={15} />
              {isSignup ? "Opening…" : "Entering…"}
            </span>
          ) : (isSignup ? "Create Account" : "Enter")}
        </button>
      </form>
      </div>

      {/* Below the threshold: invite toggle + install guide */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingBottom: "max(0.9rem, env(safe-area-inset-bottom, 0px))" }}>
        {canSignup && (
          <button
            type="button"
            onClick={toggleMode}
            style={{ background: "none", border: "none", color: "rgba(242,239,230,0.6)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", textAlign: "center", marginBottom: "0.4rem" }}
          >
            {isSignup ? "Already have an account? Sign in" : "Have an invite? Create your account"}
          </button>
        )}
        <div style={{ width: "min(360px, 90vw)" }}>
          <InstallGuide />
        </div>
      </div>
    </div>
  );
}
