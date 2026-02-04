"use client";

import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { HocuspocusProvider } from "@hocuspocus/provider";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

type ShareRole = "VIEWER" | "EDITOR";

type ShareItem = {
  docId: number;
  userId: number;
  email: string;
  role: ShareRole;
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
  const [saveState, setSaveState] = useState<"Saving..." | "Saved">("Saved");
  const [canEdit, setCanEdit] = useState(true);
  const [accessRole, setAccessRole] = useState<AccessResponse["role"]>(
    "VIEWER"
  );
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [shares, setShares] = useState<ShareItem[]>([]);
  const [shareEmail, setShareEmail] = useState("");
  const [shareRole, setShareRole] = useState<ShareRole>("VIEWER");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareListLoading, setShareListLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const dirtyRef = useRef(false);
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

  const loadShares = useCallback(
    async (authToken: string, docId: number) => {
      setShareListLoading(true);
      setShareError(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/documents/${docId}/shares`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          }
        );
        if (response.status === 401) {
          router.push("/auth");
          return;
        }
        if (response.status === 403) {
          throw new Error("Only owners can view shares.");
        }
        if (!response.ok) {
          throw new Error("Unable to load shares.");
        }
        const data = (await response.json()) as ShareItem[];
        setShares(data);
      } catch (error) {
        setShareError(
          error instanceof Error ? error.message : "Unable to load shares."
        );
      } finally {
        setShareListLoading(false);
      }
    },
    [router]
  );

  const handleShareSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      router.push("/auth");
      return;
    }
    if (!shareEmail.trim()) {
      setShareError("Email is required.");
      return;
    }
    if (!documentId) return;

    setShareLoading(true);
    setShareError(null);
    setShareStatus(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/share`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: shareEmail.trim(),
            role: shareRole,
          }),
        }
      );

      if (response.status === 401) {
        router.push("/auth");
        return;
      }
      if (response.status === 403) {
        throw new Error("Only owners can share this document.");
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? "Unable to share document.");
      }

      setShareEmail("");
      setShareRole("VIEWER");
      setShareStatus("Access granted.");
      await loadShares(token, documentId);
    } catch (error) {
      setShareError(
        error instanceof Error ? error.message : "Unable to share document."
      );
    } finally {
      setShareLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, role: ShareRole) => {
    if (!token || !documentId) return;
    setShareError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/shares/${userId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        }
      );

      if (response.status === 401) {
        router.push("/auth");
        return;
      }
      if (response.status === 403) {
        throw new Error("Only owners can update roles.");
      }

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? "Unable to update role.");
      }

      setShares((prev) =>
        prev.map((share) =>
          share.userId === userId ? { ...share, role } : share
        )
      );
    } catch (error) {
      setShareError(
        error instanceof Error ? error.message : "Unable to update role."
      );
    }
  };

  const handleRevoke = async (userId: number) => {
    if (!token || !documentId) return;
    setShareError(null);
    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${documentId}/shares/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 401) {
        router.push("/auth");
        return;
      }
      if (response.status === 403) {
        throw new Error("Only owners can revoke access.");
      }

      if (!response.ok) {
        throw new Error("Unable to revoke access.");
      }

      setShares((prev) => prev.filter((share) => share.userId !== userId));
    } catch (error) {
      setShareError(
        error instanceof Error ? error.message : "Unable to revoke access."
      );
    }
  };

  useEffect(() => {
    if (!token) {
      router.push("/auth");
    }
  }, [router, token]);

  useEffect(() => {
    if (!documentId) return;
    setAccessRole("VIEWER");
    setCanEdit(false);
    setShares([]);
    setShareEmail("");
    setShareRole("VIEWER");
    setShareError(null);
    setShareStatus(null);
  }, [documentId]);

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

  useEffect(() => {
    if (accessRole !== "OWNER" || !token || !documentId) return;
    void loadShares(token, documentId);
  }, [accessRole, documentId, loadShares, token]);

  const provider = useMemo(() => {
    if (!token || !documentName) return null;

    return new HocuspocusProvider({
      url: COLLAB_URL,
      name: documentName,
      document: ydoc,
      token,
      onStatus: ({ status: nextStatus }) => {
        setStatus(STATUS_LABELS[nextStatus] ?? "Disconnected");
      },
      onSynced: () => {
        setStatus("Synced");
        setSaveState("Saved");
      },
      onAuthenticationFailed: () => {
        setStatus("Auth failed");
      },
      onAwarenessChange: ({ states }) => {
        const next = new Map<string | number, Collaborator>();
        states.forEach((state) => {
          const userState = state.user as Collaborator | undefined;
          if (!userState) return;
          next.set(userState.id ?? userState.name, userState);
        });
        setCollaborators(Array.from(next.values()));
      },
      onStateless: ({ payload }) => {
        if (!payload) return;
        const decoded = decodeStatelessPayload(payload);
        if (decoded === "saved") {
          setSaveState("Saved");
        }
      },
    });
  }, [documentName, token, ydoc]);

  useEffect(() => {
    if (!provider) return;
    return () => {
      provider.destroy();
    };
  }, [provider]);

  useEffect(() => {
    if (!provider || !user) return;
    provider.setAwarenessField("user", user);
  }, [provider, user]);

  useEffect(() => {
    if (!provider || !canEdit) return;

    const typedProvider = provider as unknown as {
      on: (event: string, callback: (count: number) => void) => void;
      off: (event: string, callback: (count: number) => void) => void;
      hasUnsyncedChanges?: boolean;
    };

    const handleUnsynced = (count: number) => {
      if (count > 0) {
        dirtyRef.current = true;
        setSaveState("Saving...");
        return;
      }
      if (dirtyRef.current) {
        dirtyRef.current = false;
        setSaveState("Saved");
      }
    };

    typedProvider.on("unsyncedChanges", handleUnsynced);
    if (typeof typedProvider.hasUnsyncedChanges === "boolean") {
      handleUnsynced(typedProvider.hasUnsyncedChanges ? 1 : 0);
    }

    return () => {
      typedProvider.off("unsyncedChanges", handleUnsynced);
    };
  }, [canEdit, provider]);

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
        Underline,
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

  const toolbarState = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      canUndo: current?.can().chain().focus().undo().run() ?? false,
      canRedo: current?.can().chain().focus().redo().run() ?? false,
      isBold: current?.isActive("bold") ?? false,
      isItalic: current?.isActive("italic") ?? false,
      isUnderline: current?.isActive("underline") ?? false,
      isStrike: current?.isActive("strike") ?? false,
      isHeading1: current?.isActive("heading", { level: 1 }) ?? false,
      isHeading2: current?.isActive("heading", { level: 2 }) ?? false,
      isQuote: current?.isActive("blockquote") ?? false,
      isCode: current?.isActive("code") ?? false,
      isCodeBlock: current?.isActive("codeBlock") ?? false,
      isBulletList: current?.isActive("bulletList") ?? false,
      isOrderedList: current?.isActive("orderedList") ?? false,
    }),
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(canEdit);
  }, [editor, canEdit]);

  useEffect(() => {
    if (!editor || !canEdit) return;

    const handleUpdate = ({
      transaction,
    }: {
      transaction: { docChanged?: boolean };
    }) => {
      if (!transaction?.docChanged) return;
      dirtyRef.current = true;
      setSaveState("Saving...");
    };

    editor.on("update", handleUpdate);
    return () => {
      editor.off("update", handleUpdate);
    };
  }, [canEdit, editor]);

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
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            {status}
            {canEdit ? ` · ${saveState}` : ""}
          </p>
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
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-[color:var(--surface-border)] bg-[color:var(--accent-faint)] px-3 py-2 text-[color:var(--muted)]">
              <ToolbarButton
                label="Bold"
                icon={Bold}
                active={toolbarState.isBold}
                disabled={!canEdit || !editor.can().chain().focus().toggleBold().run()}
                onClick={() => editor.chain().focus().toggleBold().run()}
              />
              <ToolbarButton
                label="Italic"
                icon={Italic}
                active={toolbarState.isItalic}
                disabled={!canEdit || !editor.can().chain().focus().toggleItalic().run()}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              />
              <ToolbarButton
                label="Underline"
                icon={UnderlineIcon}
                active={toolbarState.isUnderline}
                disabled={!canEdit || !editor.can().chain().focus().toggleUnderline().run()}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              />
              <ToolbarButton
                label="Strike"
                icon={Strikethrough}
                active={toolbarState.isStrike}
                disabled={!canEdit || !editor.can().chain().focus().toggleStrike().run()}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              />
              <ToolbarDivider />
              <ToolbarButton
                label="Heading 1"
                icon={Heading1}
                active={toolbarState.isHeading1}
                disabled={!canEdit}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              />
              <ToolbarButton
                label="Heading 2"
                icon={Heading2}
                active={toolbarState.isHeading2}
                disabled={!canEdit}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              />
              <ToolbarButton
                label="Quote"
                icon={Quote}
                active={toolbarState.isQuote}
                disabled={!canEdit}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              />
              <ToolbarButton
                label="Inline code"
                icon={Code}
                active={toolbarState.isCode}
                disabled={!canEdit}
                onClick={() => editor.chain().focus().toggleCode().run()}
              />
              <ToolbarButton
                label="Code block"
                icon={Code}
                active={toolbarState.isCodeBlock}
                disabled={!canEdit}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              />
              <ToolbarDivider />
              <ToolbarButton
                label="Bullet list"
                icon={List}
                active={toolbarState.isBulletList}
                disabled={!canEdit}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              />
              <ToolbarButton
                label="Numbered list"
                icon={ListOrdered}
                active={toolbarState.isOrderedList}
                disabled={!canEdit}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              />
              <ToolbarDivider />
              <ToolbarButton
                label="Undo"
                icon={Undo2}
                active={false}
                disabled={!canEdit || !toolbarState.canUndo}
                onClick={() => editor.chain().focus().undo().run()}
              />
              <ToolbarButton
                label="Redo"
                icon={Redo2}
                active={false}
                disabled={!canEdit || !toolbarState.canRedo}
                onClick={() => editor.chain().focus().redo().run()}
              />
            </div>
          ) : null}
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="text-sm text-[color:var(--muted)]">
              Loading editor...
            </div>
          )}
        </section>

        {accessRole === "OWNER" ? (
          <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(23,23,23,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                  Sharing
                </p>
                <h2 className="text-lg font-semibold tracking-tight font-[family-name:var(--font-display)]">
                  Invite teammates
                </h2>
              </div>
            </div>

            <form
              onSubmit={handleShareSubmit}
              className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <input
                type="email"
                value={shareEmail}
                onChange={(event) => {
                  setShareEmail(event.target.value);
                  if (shareError) setShareError(null);
                  if (shareStatus) setShareStatus(null);
                }}
                className="w-full rounded-full border border-[color:var(--surface-border)] bg-white px-4 py-2 text-sm"
                placeholder="student@school.edu"
                required
              />
              <select
                value={shareRole}
                onChange={(event) => setShareRole(event.target.value as ShareRole)}
                className="rounded-full border border-[color:var(--surface-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
              </select>
              <button
                type="submit"
                disabled={shareLoading}
                className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-70"
              >
                {shareLoading ? "Sharing..." : "Share"}
              </button>
            </form>

            {shareError ? (
              <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {shareError}
              </div>
            ) : null}

            {shareStatus ? (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {shareStatus}
              </div>
            ) : null}

            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
                Shared access
              </p>
              {shareListLoading ? (
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  Loading shares...
                </p>
              ) : shares.length === 0 ? (
                <p className="mt-3 text-sm text-[color:var(--muted)]">
                  No shared users yet.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {shares.map((share) => (
                    <div
                      key={`${share.userId}-${share.docId}`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[color:var(--surface-border)] bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-semibold">{share.email}</p>
                        <p className="mt-1 text-xs text-[color:var(--muted)]">
                          {share.role}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={share.role}
                          onChange={(event) =>
                            handleRoleChange(
                              share.userId,
                              event.target.value as ShareRole
                            )
                          }
                          className="rounded-full border border-[color:var(--surface-border)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em]"
                        >
                          <option value="VIEWER">Viewer</option>
                          <option value="EDITOR">Editor</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handleRevoke(share.userId)}
                          className="rounded-full border border-red-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-red-600"
                        >
                          Revoke
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : null}

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

function decodeStatelessPayload(payload: unknown) {
  if (typeof payload === "string") return payload;
  if (payload instanceof Uint8Array) {
    return new TextDecoder().decode(payload);
  }
  if (payload instanceof ArrayBuffer) {
    return new TextDecoder().decode(new Uint8Array(payload));
  }
  return null;
}

function ToolbarButton({
  label,
  icon: Icon,
  active,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof Bold;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`rounded-full border px-2.5 py-2 text-[0.65rem] font-semibold uppercase tracking-[0.18em] transition ${
        active
          ? "border-[color:var(--accent)] bg-white text-[color:var(--accent-strong)]"
          : "border-transparent text-[color:var(--muted)] hover:border-[color:var(--surface-border)] hover:text-[color:var(--foreground)]"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <span className="h-6 w-px bg-[color:var(--surface-border)]" />;
}
