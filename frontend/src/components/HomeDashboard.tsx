"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Course = {
  id: number;
  title: string;
  createdAt: string;
};

type Document = {
  id: number;
  title: string;
  courseId: number;
  weekId: number | null;
  currentRev: number;
  updatedAt: string | null;
};

type CourseWithDocs = Course & { documents: Document[] };

type LoadState = {
  loading: boolean;
  error: string | null;
  courses: CourseWithDocs[];
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export default function HomeDashboard() {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    courses: [],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [docFormCourseId, setDocFormCourseId] = useState<number | null>(null);
  const [docDrafts, setDocDrafts] = useState<Record<number, string>>({});
  const [docErrors, setDocErrors] = useState<Record<number, string | null>>({});
  const [docLoadingId, setDocLoadingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);

  const hasCourses = useMemo(() => state.courses.length > 0, [state.courses]);

  const loadCourses = useCallback(async (token: string) => {
    const courseResponse = await fetch(`${API_BASE_URL}/courses`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (courseResponse.status === 401) {
      router.push("/auth");
      return [];
    }

    if (!courseResponse.ok) {
      throw new Error("Unable to load courses.");
    }

    const courses = (await courseResponse.json()) as Course[];
    const docsByCourse = await Promise.all(
      courses.map(async (course) => {
        const docResponse = await fetch(
          `${API_BASE_URL}/courses/${course.id}/documents`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const documents = docResponse.ok
          ? ((await docResponse.json()) as Document[])
          : [];
        return { ...course, documents };
      })
    );

    return docsByCourse;
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("scribeloop_token");
    if (!token) {
      router.push("/auth");
      return;
    }
    tokenRef.current = token;

    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const load = async () => {
      try {
        const courses = await loadCourses(token);
        if (!active) return;
        setState({ loading: false, error: null, courses });
      } catch (err) {
        if (!active) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : "Something went wrong.",
          courses: [],
        });
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loadCourses, router]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleCreateCourse = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const token = tokenRef.current;
    if (!token) {
      router.push("/auth");
      return;
    }

    if (!createTitle.trim()) {
      setCreateError("Course title is required.");
      return;
    }

    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/courses`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: createTitle.trim() }),
      });

      if (response.status === 401) {
        router.push("/auth");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? "Unable to create course.");
      }

      setCreateTitle("");
      setCreateOpen(false);
      const courses = await loadCourses(token);
      setState({ loading: false, error: null, courses });
      setNotice({ tone: "success", message: "Course created." });
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Unable to create course."
      );
    } finally {
      setCreateLoading(false);
    }
  };

  if (state.loading) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(23,23,23,0.08)]">
          <div className="space-y-3 animate-pulse">
            <div className="h-3 w-20 rounded-full bg-[color:var(--surface-border)]/70" />
            <div className="h-5 w-56 rounded-full bg-[color:var(--surface-border)]/70" />
            <div className="h-9 w-40 rounded-full bg-[color:var(--surface-border)]/70" />
          </div>
        </section>
        {[0, 1].map((index) => (
          <section
            key={index}
            className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(23,23,23,0.08)]"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2 animate-pulse">
                <div className="h-3 w-16 rounded-full bg-[color:var(--surface-border)]/70" />
                <div className="h-5 w-48 rounded-full bg-[color:var(--surface-border)]/70" />
              </div>
              <div className="h-8 w-24 rounded-full bg-[color:var(--surface-border)]/70 animate-pulse" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((card) => (
                <div
                  key={card}
                  className="h-20 rounded-2xl bg-[color:var(--surface-border)]/60 animate-pulse"
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {state.error}
      </div>
    );
  }

  const handleCreateDocument = async (
    courseId: number,
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const token = tokenRef.current;
    if (!token) {
      router.push("/auth");
      return;
    }

    const title = (docDrafts[courseId] ?? "").trim();
    if (!title) {
      setDocErrors((prev) => ({
        ...prev,
        [courseId]: "Document title is required.",
      }));
      return;
    }

    setDocLoadingId(courseId);
    setDocErrors((prev) => ({ ...prev, [courseId]: null }));

    try {
      const response = await fetch(`${API_BASE_URL}/documents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, courseId, weekId: null }),
      });

      if (response.status === 401) {
        router.push("/auth");
        return;
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? "Unable to create document.");
      }

      setDocDrafts((prev) => ({ ...prev, [courseId]: "" }));
      setDocFormCourseId(null);
      const courses = await loadCourses(token);
      setState({ loading: false, error: null, courses });
      setNotice({ tone: "success", message: "Document created." });
    } catch (err) {
      setDocErrors((prev) => ({
        ...prev,
        [courseId]:
          err instanceof Error ? err.message : "Unable to create document.",
      }));
    } finally {
      setDocLoadingId(null);
    }
  };

  if (!hasCourses) {
    return (
      <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-8 shadow-[0_20px_50px_rgba(23,23,23,0.08)]">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">
          No courses yet.
        </h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Create your first course to start organizing weekly notes.
        </p>
        {!createOpen ? (
          <button
            onClick={() => setCreateOpen(true)}
            className="mt-4 rounded-full bg-[color:var(--accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            Create course
          </button>
        ) : (
          <form
            onSubmit={handleCreateCourse}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input
              value={createTitle}
              onChange={(event) => {
                setCreateTitle(event.target.value);
                if (createError) {
                  setCreateError(null);
                }
              }}
              className="w-full rounded-full border border-[color:var(--surface-border)] bg-white px-4 py-2 text-sm"
              placeholder="Course title"
            />
            <button
              type="submit"
              disabled={createLoading}
              className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-70"
            >
              {createLoading ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setCreateError(null);
                setCreateTitle("");
              }}
              className="rounded-full border border-[color:var(--surface-border)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
            >
              Cancel
            </button>
          </form>
        )}
        {createError ? (
          <p className="mt-3 text-sm text-red-600">{createError}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice ? (
        <div
          role="status"
          aria-live="polite"
          className={`fixed right-4 top-24 z-50 rounded-2xl border px-4 py-3 text-sm shadow-[0_12px_24px_rgba(23,23,23,0.12)] ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {notice.message}
        </div>
      ) : null}
      <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(23,23,23,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
              Courses
            </p>
            <h2 className="text-xl font-semibold tracking-tight font-[family-name:var(--font-display)]">
              Keep your classes organized.
            </h2>
          </div>
          <button
            onClick={() => setCreateOpen((prev) => !prev)}
            className="rounded-full bg-[color:var(--accent)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
          >
            {createOpen ? "Close" : "New course"}
          </button>
        </div>

        {createOpen ? (
          <form
            onSubmit={handleCreateCourse}
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input
              value={createTitle}
              onChange={(event) => {
                setCreateTitle(event.target.value);
                if (createError) {
                  setCreateError(null);
                }
              }}
              className="w-full rounded-full border border-[color:var(--surface-border)] bg-white px-4 py-2 text-sm"
              placeholder="Course title"
            />
            <button
              type="submit"
              disabled={createLoading}
              className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-70"
            >
              {createLoading ? "Saving..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateOpen(false);
                setCreateError(null);
                setCreateTitle("");
              }}
              className="rounded-full border border-[color:var(--surface-border)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
            >
              Cancel
            </button>
          </form>
        ) : null}

        {createError ? (
          <p className="mt-3 text-sm text-red-600">{createError}</p>
        ) : null}
      </section>
      {state.courses.map((course) => (
        <section
          key={course.id}
          className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(23,23,23,0.08)]"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Course
              </p>
              <h2 className="text-xl font-semibold tracking-tight font-[family-name:var(--font-display)]">
                {course.title}
              </h2>
            </div>
            <button
              onClick={() => {
                setDocFormCourseId((prev) =>
                  prev === course.id ? null : course.id
                );
                setDocErrors((prev) => ({ ...prev, [course.id]: null }));
              }}
              className="rounded-full border border-[color:var(--surface-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
            >
              New doc
            </button>
          </div>

          {docFormCourseId === course.id ? (
            <form
              onSubmit={(event) => handleCreateDocument(course.id, event)}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input
                value={docDrafts[course.id] ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setDocDrafts((prev) => ({ ...prev, [course.id]: value }));
                  if (docErrors[course.id]) {
                    setDocErrors((prev) => ({ ...prev, [course.id]: null }));
                  }
                }}
                className="w-full rounded-full border border-[color:var(--surface-border)] bg-white px-4 py-2 text-sm"
                placeholder="Document title"
              />
              <button
                type="submit"
                disabled={docLoadingId === course.id}
                className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-70"
              >
                {docLoadingId === course.id ? "Saving..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDocFormCourseId(null);
                  setDocDrafts((prev) => ({ ...prev, [course.id]: "" }));
                  setDocErrors((prev) => ({ ...prev, [course.id]: null }));
                }}
                className="rounded-full border border-[color:var(--surface-border)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
              >
                Cancel
              </button>
            </form>
          ) : null}

          {docFormCourseId === course.id && docErrors[course.id] ? (
            <p className="mt-3 text-sm text-red-600">{docErrors[course.id]}</p>
          ) : null}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {course.documents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--surface-border)] p-4 text-sm text-[color:var(--muted)]">
                No documents yet.
              </div>
            ) : (
              course.documents.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/docs/${doc.id}`}
                  className="rounded-2xl border border-[color:var(--surface-border)] bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(23,23,23,0.08)]"
                >
                  <p className="text-sm font-semibold">{doc.title}</p>
                  <p className="mt-2 text-xs text-[color:var(--muted)]">
                    Rev {doc.currentRev} · Updated {formatDate(doc.updatedAt)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "just now";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}
