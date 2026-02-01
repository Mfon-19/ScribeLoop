import Link from "next/link";

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

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 pb-24 pt-10">
        <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-8 shadow-[0_20px_50px_rgba(23,23,23,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Workspace
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            You are in. Build your first course space.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-[color:var(--muted)]">
            The dashboard and collaboration tools will live here. Next up is
            creating courses, weeks, and shared documents.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow-[0_12px_24px_rgba(192,107,44,0.2)]">
              Create course
            </button>
            <button className="rounded-full border border-[color:var(--surface-border)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)]">
              Invite teammates
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
