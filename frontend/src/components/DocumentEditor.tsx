"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

type DocumentResponse = {
  id: number;
  title: string;
  currentRev: number;
};

type AccessResponse = {
  role: "OWNER" | "EDITOR" | "VIEWER";
  canEdit: boolean;
};

type Collaborator = {
  id: number | string;
  name: string;
  color: string;
};

type StatusState = "Connecting..." | "Connected" | "Synced" | "Disconnected" | "Auth failed";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const COLLAB_URL =
  process.env.NEXT_PUBLIC_COLLAB_URL ?? "ws://localhost:1234";

const COLOR_PALETTE = [
  "#FF7A1A",
  "#2F6BFF",
  "#00A676",
  "#D64550",
  "#8E5CD4",
  "#F4B400",
  "#0088A9",
  "#E056A7",
];

const STATUS_LABELS: Record<string, StatusState> = {
  connecting: "Connecting...",
  connected: "Connected",
  disconnected: "Disconnected",
};

export default function DocumentEditor() {
  const params = useParams();
  const router = useRouter();
  const documentId = useMemo(
    () => Number(params?.documentId ?? 0),
    [params]
  );
  const documentName = useMemo(
    () => (documentId ? `document:${documentId}` : null),
    [documentId]
  );

  const [token] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("scribeloop_token");
  });
  const [title, setTitle] = useState("Loading...");
  const [status, setStatus] = useState<StatusState>("Connecting...");
  const [canEdit, setCanEdit] = useState(true);
  const [accessRole, setAccessRole] = useState<AccessResponse["role"]>(
    "VIEWER"
  );
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const ydoc = useMemo(
    () => new Y.Doc({ guid: documentName ?? undefined }),
    [documentName]
  );

  const user = useMemo(() => {
    if (!token) return null;
    const claims = decodeJwt(token);
    const name = claims?.sub ?? "Collaborator";
    const id = claims?.uid ?? name;
    return {
      id,
      name,
      color: pickColor(String(id)),
    };
  }, [token]);

  const loadMetadata = useCallback(
    async (authToken: string, docId: number) => {
      const [docResponse, accessResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/documents/${docId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
        fetch(`${API_BASE_URL}/documents/${docId}/access`, {
          headers: { Authorization: `Bearer ${authToken}` },
        }),
      ]);

      if (
        docResponse.status === 401 ||
        docResponse.status === 403 ||
        accessResponse.status === 401 ||
        accessResponse.status === 403
      ) {
        router.push("/auth");
        return;
      }

      if (!docResponse.ok) {
        throw new Error("Unable to load document.");
      }

      const docData = (await docResponse.json()) as DocumentResponse;
      setTitle(docData.title);

      if (accessResponse.ok) {
        const accessData = (await accessResponse.json()) as AccessResponse;
        setCanEdit(accessData.canEdit);
        setAccessRole(accessData.role);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!token) {
      router.push("/auth");
    }
  }, [router, token]);

  useEffect(() => {
    if (!token || !documentId || !documentName) return;
    let active = true;

    const run = async () => {
      try {
        await loadMetadata(token, documentId);
      } catch (error) {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : "Unable to load document."
        );
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [documentId, documentName, loadMetadata, token]);

  const provider = useMemo(() => {
    if (!token || !documentName) return null;
    return new HocuspocusProvider({
      url: COLLAB_URL,
      name: documentName,
      document: ydoc,
      token,
    });
  }, [documentName, token, ydoc]);

  useEffect(() => {
    if (!provider) return;

    const handleStatus = ({ status: nextStatus }: { status: string }) => {
      setStatus(STATUS_LABELS[nextStatus] ?? "Disconnected");
    };

    const handleSynced = () => {
      setStatus("Synced");
    };

    const handleAuthFailed = () => {
      setStatus("Auth failed");
    };

    const handleAwarenessChange = ({
      states,
    }: {
      states: Array<Record<string, unknown>>;
    }) => {
      const next = new Map<string | number, Collaborator>();
      states.forEach((state) => {
        const userState = state.user as Collaborator | undefined;
        if (!userState) return;
        next.set(userState.id ?? userState.name, userState);
      });
      setCollaborators(Array.from(next.values()));
    };

    provider.on("status", handleStatus);
    provider.on("synced", handleSynced);
    provider.on("authenticationFailed", handleAuthFailed);
    provider.on("awarenessChange", handleAwarenessChange);

    return () => {
      provider.off("status", handleStatus);
      provider.off("synced", handleSynced);
      provider.off("authenticationFailed", handleAuthFailed);
      provider.off("awarenessChange", handleAwarenessChange);
      provider.destroy();
    };
  }, [provider]);

  useEffect(() => {
    if (!provider || !user) return;
    provider.setAwarenessField("user", user);
  }, [provider, user]);

  useEffect(() => {
    return () => {
      ydoc.destroy();
    };
  }, [ydoc]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          history: false,
        }),
        Collaboration.configure({
          document: ydoc,
        }),
        ...(provider && user
          ? [
              CollaborationCaret.configure({
                provider,
                user,
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class:
            "min-h-[420px] w-full rounded-2xl border border-[color:var(--surface-border)] bg-white p-4 text-sm leading-6 outline-none",
        },
      },
      editable: canEdit,
    },
    [ydoc, provider, user, canEdit]
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEdit);
  }, [editor, canEdit]);

  if (loadError) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Document
          </p>
          <h1 className="text-2xl font-semibold tracking-tight font-[family-name:var(--font-display)]">
            {title}
          </h1>
          <p className="mt-1 text-xs text-[color:var(--muted)]">{status}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[color:var(--surface-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]">
            {accessRole}
          </span>
          {!canEdit ? (
            <span className="rounded-full bg-[color:var(--accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-strong)]">
              Read only
            </span>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pb-24">
        <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_20px_50px_rgba(23,23,23,0.08)]">
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="text-sm text-[color:var(--muted)]">
              Loading editor...
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(23,23,23,0.08)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Active collaborators
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {collaborators.length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                No active cursors yet.
              </p>
            ) : (
              collaborators.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 rounded-full border border-[color:var(--surface-border)] px-4 py-2 text-xs font-semibold"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  {member.name}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function decodeJwt(token: string): { uid?: number; sub?: string } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(atob(normalized));
    return decoded;
  } catch {
    return null;
  }
}

function pickColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}
