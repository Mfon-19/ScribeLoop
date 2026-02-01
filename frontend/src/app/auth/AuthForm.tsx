"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Mode = "login" | "register";

type AuthResponse = {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setStatus(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setIsSubmitting(true);

    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response
        .json()
        .catch(() => null)) as AuthResponse | { message?: string } | null;

      if (!response.ok) {
        const message =
          payload && "message" in payload && payload.message
            ? payload.message
            : `Request failed (${response.status})`;
        throw new Error(message);
      }

      const data = payload as AuthResponse;
      if (data?.accessToken) {
        localStorage.setItem("scribeloop_token", data.accessToken);
        localStorage.setItem("scribeloop_token_expires", data.expiresAt);
      }

      setStatus(
        mode === "login"
          ? "Signed in. Redirecting."
          : "Account created. Redirecting."
      );
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
        <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
        {mode === "login" ? "Sign in" : "Create account"}
      </div>

      <div className="flex gap-2 rounded-full border border-[color:var(--surface-border)] bg-[#fbf8f3] p-1 text-xs font-semibold uppercase tracking-[0.2em]">
        <button
          type="button"
          onClick={() => toggleMode("login")}
          className={`flex-1 rounded-full px-3 py-2 transition ${
            mode === "login"
              ? "bg-[color:var(--surface)] text-[color:var(--foreground)]"
              : "text-[color:var(--muted)]"
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => toggleMode("register")}
          className={`flex-1 rounded-full px-3 py-2 transition ${
            mode === "register"
              ? "bg-[color:var(--surface)] text-[color:var(--foreground)]"
              : "text-[color:var(--muted)]"
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="grid gap-2 text-sm">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="rounded-2xl border border-[color:var(--surface-border)] bg-white px-4 py-3 text-sm"
            autoComplete="email"
          />
        </label>

        <label className="grid gap-2 text-sm">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            className="rounded-2xl border border-[color:var(--surface-border)] bg-white px-4 py-3 text-sm"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {status ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {status}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting
            ? "Working..."
            : mode === "login"
            ? "Sign in"
            : "Create account"}
        </button>
      </form>

      <p className="text-xs text-[color:var(--muted)]">
        By continuing you agree to keep collaboration respectful and follow your
        course guidelines.
      </p>
    </div>
  );
}
