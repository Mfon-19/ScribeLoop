"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  const [state, setState] = useState<LoadState>({
    loading: true,
    error: null,
    courses: [],
  });

  const hasCourses = useMemo(() => state.courses.length > 0, [state.courses]);

  useEffect(() => {
    const token = localStorage.getItem("scribeloop_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const courseResponse = await fetch(`${API_BASE_URL}/courses`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (courseResponse.status === 401) {
          router.push("/auth");
          return;
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

        if (!active) return;
        setState({ loading: false, error: null, courses: docsByCourse });
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
  }, [router]);

  if (state.loading) {
    return (
      <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-8 shadow-[0_20px_50px_rgba(23,23,23,0.08)]">
        <p className="text-sm text-[color:var(--muted)]">Loading workspace…</p>
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

  if (!hasCourses) {
    return (
      <div className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-8 shadow-[0_20px_50px_rgba(23,23,23,0.08)]">
        <h2 className="text-lg font-semibold">No courses yet.</h2>
        <p className="mt-2 text-sm text-[color:var(--muted)]">
          Create your first course to start organizing weekly notes.
        </p>
        <button className="mt-4 rounded-full bg-[color:var(--accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
          Create course
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
              <h2 className="text-xl font-semibold tracking-tight">
                {course.title}
              </h2>
            </div>
            <button className="rounded-full border border-[color:var(--surface-border)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]">
              New doc
            </button>
          </div>

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
