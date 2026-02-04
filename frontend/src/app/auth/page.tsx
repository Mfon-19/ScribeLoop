import Link from "next/link";
import AuthForm from "./AuthForm";

export default function AuthPage() {
  return (
    <div className="min-h-screen">
      <main className="mx-auto grid w-full max-w-5xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <section className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]"
          >
            <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
            Back to ScribeLoop
          </Link>
          <h1 className="text-4xl font-semibold tracking-tight font-[family-name:var(--font-display)]">
            Welcome back to your study hub.
          </h1>
          <p className="text-lg text-[color:var(--muted)]">
            Sign in to keep collaborating, or create an account to start a fresh
            workspace for your courses.
          </p>
          <div className="grid gap-4 rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_40px_rgba(23,23,23,0.08)]">
            {[
              "Live cursors and presence",
              "Course + week organization",
              "Every edit versioned",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm">
                <span className="h-2 w-2 rounded-full bg-[color:var(--accent)]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-8 shadow-[0_25px_60px_rgba(23,23,23,0.12)]">
          <AuthForm />
        </section>
      </main>
    </div>
  );
}
