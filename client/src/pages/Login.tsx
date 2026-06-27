import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

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
    background: "transparent",
    border: "none",
    borderBottom: `1.5px solid ${GOLD}`,
    borderRadius: 0,
    padding: "0.75rem 0.25rem",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: "0.18em",
    caretColor: GOLD,
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-between px-8 py-16"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Full-bleed background image */}
      <img
        src="/starry-night.png"
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center bottom",
          zIndex: 0,
        }}
      />
      {/* Content sits above the image */}
      <div
        className="min-h-screen flex flex-col items-center justify-between px-8 py-16 w-full"
        style={{ position: "relative", zIndex: 1 }}
      >
      {/* Top: logo + wordmark */}
      <div className="flex flex-col items-center flex-1 justify-center w-full" style={{ maxWidth: 360 }}>
        <img
          src="/kala-logo-transparent.png"
          alt="Kala"
          width={160}
          height={160}
          style={{ marginBottom: "1.5rem" }}
        />

        <h1
          style={{
            fontFamily: "'Playfair Display', 'Georgia', ui-serif, serif",
            fontWeight: 700,
            fontSize: "clamp(3rem, 12vw, 4.5rem)",
            letterSpacing: "-0.01em",
            color: GOLD,
            lineHeight: 1,
            marginBottom: "0.6rem",
          }}
        >
          Kala
        </h1>

        <p
          style={{
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.7)",
          }}
        >
          Time.&nbsp; Purpose.&nbsp; Flow.
        </p>
      </div>

      {/* Bottom: form */}
      <div className="w-full" style={{ maxWidth: 360 }}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <input
              type="text"
              autoComplete="name"
              placeholder="NAME (OPTIONAL)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
              maxLength={120}
              className="w-full outline-none transition-all text-center text-sm font-semibold"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.9)"; }}
              onBlur={(e) => { e.currentTarget.style.borderBottomColor = GOLD; }}
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
            className="w-full outline-none transition-all text-center text-sm font-semibold"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.9)"; }}
            onBlur={(e) => { e.currentTarget.style.borderBottomColor = GOLD; }}
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
            className="w-full outline-none transition-all text-center text-sm font-semibold"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderBottomColor = "rgba(255,255,255,0.9)"; }}
            onBlur={(e) => { e.currentTarget.style.borderBottomColor = GOLD; }}
          />

          {error && (
            <p className="text-xs text-center" style={{ color: "#e07070" }}>
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
              borderRadius: "12px",
              padding: "1rem",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginTop: "0.25rem",
            }}
          >
            {isLoading
              ? (isSignup ? "Creating…" : "Signing in…")
              : (isSignup ? "Create Account" : "Sign In")}
          </button>
        </form>

        <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.7)" }}>
          {isSignup ? "Already have an account?" : "New to Kala?"}{" "}
          <button
            type="button"
            onClick={toggleMode}
            style={{ color: GOLD, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            {isSignup ? "Sign in" : "Sign up"}
          </button>
        </p>
      </div>
      </div>
    </div>
  );
}
