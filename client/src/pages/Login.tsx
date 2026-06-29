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
    background: "#fff",
    border: `1px solid ${GOLD}`,
    borderRadius: 14,
    padding: "1.05rem 1rem",
    color: "#2a2a2a",
    letterSpacing: "0.25em",
    textAlign: "center",
    caretColor: GOLD,
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
        backgroundColor: "#ffffff",
        backgroundImage:
          "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(255,255,255,0.5) 100%), url('/shell-sunset.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="flex flex-col items-center w-full" style={{ maxWidth: 360 }}>
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
            textTransform: "uppercase",
            color: GOLD,
            margin: 0,
          }}
        >
          Why now?
        </p>

        {/* Gold rule */}
        <div style={{ width: 140, height: 1, background: GOLD, opacity: 0.75, margin: "1.25rem 0 2.5rem" }} />

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
              className="w-full outline-none transition-all text-sm font-medium"
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
            className="w-full outline-none transition-all text-xs font-medium"
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
            className="w-full outline-none transition-all text-xs font-medium"
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

        <p className="text-center text-xs mt-6" style={{ color: "#6b6b6b" }}>
          {isSignup ? "Already have an account?" : "New to Velea?"}{" "}
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
  );
}
