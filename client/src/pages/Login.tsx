import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";

const GOLD = "#C9A84C";

type Mode = "signin" | "signup";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();
  const loginMutation = trpc.auth.login.useMutation();
  const registerMutation = trpc.auth.register.useMutation();

  const isSignup = mode === "signup";
  const { theme } = useTheme();
  const dark = theme === "dark";
  const ink = dark ? "rgba(255,255,255,0.92)" : "#161616";
  const inkSoft = dark ? "rgba(255,255,255,0.72)" : "rgba(0,0,0,0.6)";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (isSignup) {
        await registerMutation.mutateAsync({ email, password, name: name.trim() || undefined });
      } else {
        await loginMutation.mutateAsync({ email, password });
      }
      await utils.auth.me.invalidate();
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
    background: dark ? "rgba(10,10,20,0.55)" : "rgba(255,255,255,0.18)",
    border: `1px solid ${GOLD}`,
    borderRadius: 14,
    padding: "1.05rem 1rem",
    letterSpacing: "0.25em",
    textAlign: "center",
    caretColor: GOLD,
    color: ink,
    backdropFilter: "blur(3px)",
    WebkitBackdropFilter: "blur(3px)",
  };

  const focusBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#A87E2E";
    e.currentTarget.style.boxShadow = `0 0 0 3px ${GOLD}22`;
  };
  const blurBorder = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = GOLD;
    e.currentTarget.style.boxShadow = "none";
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-8 py-16"
      style={{
        backgroundColor: dark ? "#0b0a14" : "#ffffff",
        backgroundImage: dark
          ? "linear-gradient(180deg, rgba(6,6,16,0.5) 0%, rgba(6,6,16,0.38) 32%, rgba(6,6,16,0.8) 100%), url('/shell-night.jpg')"
          : "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.5) 100%), url('/shell-sunset.jpg')",
        backgroundSize: dark ? "auto 118%" : "cover",
        backgroundPosition: dark ? "center 78%" : "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex flex-col items-center w-full" style={{ maxWidth: 360 }}>
        <style>{`.velea-input::placeholder { color: ${inkSoft}; letter-spacing: 0.25em; }`}</style>
        {/* Emblem — comet / clock / conception. */}
        <img src="/velea-emblem.png" alt="Velea" width={168} height={168} />

        {/* Wordmark */}
        <h1
          style={{
            fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
            fontWeight: 700,
            fontSize: "clamp(3rem, 12vw, 4.5rem)",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            margin: "1.25rem 0 0.5rem",
            background: `linear-gradient(180deg, #E7C766 0%, ${GOLD} 55%, #A87E2E 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Velea
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            letterSpacing: "0.4em",
            paddingLeft: "0.4em", // compensate trailing letter-spacing so it stays centered
            textTransform: "uppercase",
            color: "#ffffff",
            textShadow: "0 1px 8px rgba(0,0,0,0.5), 0 0 2px rgba(0,0,0,0.4)",
            margin: 0,
          }}
        >
          Why now?
        </p>

        {/* Rule */}
        <div style={{ width: 140, height: 1, background: "#ffffff", opacity: 0.95, margin: "1.25rem 0 2.5rem", boxShadow: "0 0 6px rgba(0,0,0,0.45)" }} />

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4">
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
            <p className="text-xs text-center" style={{ color: "#c0504d" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: GOLD,
              color: "#1a1200",
              borderRadius: "14px",
              padding: "1rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginTop: "0.5rem",
            }}
          >
            {isLoading
              ? (isSignup ? "Creating…" : "Signing in…")
              : (isSignup ? "Create Account" : "Sign In")}
          </button>
        </form>

        {/* Signup disabled for now — invite-only. Accounts are provisioned directly. */}
      </div>
    </div>
  );
}
