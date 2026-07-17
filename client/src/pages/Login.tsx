import { useState } from "react";
import InstallGuide from "@/components/InstallGuide";
import VeleaLoader from "@/components/VeleaLoader";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
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

// Gate art aspect ratio (both engravings ≈ 900×1123 → 0.8016). The doorway's dark slot
// centers at ~73.5% of the image height; the min() picks the right anchor whether the
// viewport fits the art by height (desktop) or by width (phones).
const DOOR_ANCHOR = "min(73.5dvh, calc(50dvh + 29.3vw))";

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
  const utils = trpc.useUtils();
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
  const art = isDay ? "/login-gate-day.jpg" : "/login-gate-night.jpg";

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
      // Invalidate EVERYTHING, not just auth.me — queries that fired while logged out
      // (subject, natal, profection, charts) have cached empty answers; leaving them
      // stale is the "you haven't filled in birth data until you refresh" bug.
      await utils.invalidate();
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

  const inputStyle: React.CSSProperties = {
    background: "rgba(6,6,9,0.72)",
    border: `1px solid color-mix(in srgb, ${METAL.accent} 62%, transparent)`,
    borderRadius: 11,
    padding: "0.6rem 0.85rem",
    fontSize: "0.68rem",
    letterSpacing: "0.18em",
    textAlign: "center",
    caretColor: METAL.accent,
    color: "#F2EFE6",
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
  };

  const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = METAL.hi;
    e.currentTarget.style.boxShadow = `0 0 0 3px ${METAL.accent}26`;
  };
  const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = `color-mix(in srgb, ${METAL.accent} 62%, transparent)`;
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div style={{ minHeight: "100dvh", background: "#050505", position: "relative", overflow: "hidden" }}>
      <style>{`.velea-input::placeholder { color: rgba(242,239,230,0.55); letter-spacing: 0.18em; font-size: 0.68rem; }`}</style>

      {/* THE GATE — his engraving, whole, on its own black ground. */}
      <img
        src={art}
        alt=""
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", objectPosition: "center", transform: "scale(1.12)", transformOrigin: "center", userSelect: "none", pointerEvents: "none" }}
      />

      {/* Wordmark in the sky above the crest */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "max(2dvh, env(safe-area-inset-top, 0px))" }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
            fontWeight: 700,
            fontSize: "clamp(1.6rem, 6.5vw, 2.2rem)",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            margin: 0,
            background: `linear-gradient(180deg, ${METAL.hi} 0%, ${METAL.accent} 55%, ${METAL.deep} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Velea
        </h1>
      </div>

      {/* THE THRESHOLD — the form, seated in the doorway. */}
      <form
        onSubmit={handleSubmit}
        style={{
          position: "absolute",
          top: DOOR_ANCHOR,
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(264px, 70vw)",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
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
            background: `linear-gradient(180deg, ${METAL.hi}, ${METAL.accent} 55%, ${METAL.deep})`,
            color: METAL.btnText,
            borderRadius: 11,
            padding: "0.6rem",
            fontSize: "0.64rem",
            fontWeight: 700,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
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
