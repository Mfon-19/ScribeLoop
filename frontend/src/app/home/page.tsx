import Link from "next/link";
import HomeDashboard from "@/components/HomeDashboard";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[color:var(--accent)] shadow-[0_0_18px_rgba(192,107,44,0.45)]" />
          <span className="text-lg font-semibold tracking-tight">ScribeLoop</span>
        </div>
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        >
          Log out
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-6">
        <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-8 shadow-[0_20px_50px_rgba(23,23,23,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Workspace
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Your courses and shared notes.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[color:var(--muted)]">
            Jump into a document to collaborate live or start a new week of
            notes.
          </p>
        </section>

        <HomeDashboard />
      </main>
    </div>
  );
}
