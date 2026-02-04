import AuthAwareLink from "@/components/AuthAwareLink";

export default function Home() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[color:var(--accent)] shadow-[0_0_18px_rgba(192,107,44,0.45)]" />
          <span className="text-lg font-semibold tracking-tight">ScribeLoop</span>
        </div>
        <AuthAwareLink
          className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)] hover:text-[color:var(--foreground)]"
        >
          Sign in
        </AuthAwareLink>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-24 pt-12">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Live collaboration for study groups
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl font-[family-name:var(--font-display)]">
              Build living study guides with your classmates.
            </h1>
            <p className="max-w-xl text-lg text-[color:var(--muted)]">
              Organize notes by course and week, edit together in real time, and
              keep every idea versioned. ScribeLoop turns shared notes into a
              study workspace you can trust.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <AuthAwareLink
                className="rounded-full bg-[color:var(--accent)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white shadow-[0_15px_30px_rgba(192,107,44,0.25)] transition hover:-translate-y-0.5 hover:bg-[color:var(--accent-strong)]"
              >
                Get started
              </AuthAwareLink>
              <a
                href="#features"
                className="rounded-full border border-[color:var(--surface-border)] px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--foreground)] transition hover:bg-[color:var(--surface)]"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-6 -top-6 h-20 w-20 rounded-full border border-[color:var(--surface-border)] bg-[color:var(--surface)]" />
            <div className="absolute -bottom-8 right-6 h-28 w-28 rounded-[32px] border border-[color:var(--surface-border)] bg-[color:var(--surface)]" />
            <div className="relative rounded-[28px] border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_25px_60px_rgba(23,23,23,0.12)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Bio 101 - Week 4
                </span>
                <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-strong)]">
                  Live
                </span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="h-3 w-4/5 rounded-full bg-[color:var(--accent-faint)]" />
                <div className="h-3 w-2/3 rounded-full bg-[color:var(--accent-faint)]" />
                <div className="h-3 w-3/5 rounded-full bg-[color:var(--accent-faint)]" />
              </div>
              <div className="mt-8 rounded-2xl border border-dashed border-[color:var(--surface-border)] bg-[color:var(--accent-faint)] px-4 py-3 text-xs text-[color:var(--muted)]">
                Marta is editing - 2 cursors active
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Organized by course + week",
              description:
                "Keep everything structured so study sessions start instantly.",
            },
            {
              title: "Live presence + cursors",
              description:
                "See who is editing and where, without stepping on ideas.",
            },
            {
              title: "Versions you can trust",
              description:
                "Every change is stored so you can rewind the story of a doc.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(23,23,23,0.08)]"
            >
              <h3 className="text-lg font-semibold tracking-tight font-[family-name:var(--font-display)]">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm text-[color:var(--muted)]">
                {feature.description}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-10 text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
        <span>Built for study teams</span>
        <span>Sync. Structure. Share.</span>
      </footer>
    </div>
  );
}
