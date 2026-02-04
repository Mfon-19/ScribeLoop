"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type DocumentResponse = {
  id: number;
  title: string;
  currentRev: number;
};

type AccessResponse = {
  role: "OWNER" | "EDITOR" | "VIEWER";
  canEdit: boolean;
};

type SyncResponse = {
  currentRev: number;
  snapshotRev: number;
  snapshotJson: string;
  ops: OperationItem[];
};

type OperationItem = {
  rev: number;
  baseRev: number;
  opJson: string;
  actorId: number;
  actorEmail: string;
  createdAt: string;
};

type PresenceState = {
  actorId: number;
  actorEmail: string;
  cursor?: { start?: number; end?: number };
  selection?: { start?: number; end?: number };
  lastSeen: number;
};

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8080/ws";

const EMPTY_SNAPSHOT = { text: "" };

export default function DocumentEditor() {
  const params = useParams();
  const router = useRouter();
  const documentId = useMemo(
    () => Number(params?.documentId ?? 0),
    [params]
  );

  const [title, setTitle] = useState("Loading...");
  const [content, setContent] = useState("");
  const [rev, setRev] = useState(0);
  const [status, setStatus] = useState("Connecting...");
  const [canEdit, setCanEdit] = useState(true);
  const [accessRole, setAccessRole] = useState<AccessResponse["role"]>("VIEWER");
  const [presence, setPresence] = useState<Record<string, PresenceState>>({});

  const wsRef = useRef<WebSocket | null>(null);
  const pendingRef = useRef(false);
  const dirtyRef = useRef(false);
  const contentRef = useRef("");
  const revRef = useRef(0);
  const userIdRef = useRef<number | null>(null);

  const applySync = useCallback((data: SyncResponse) => {
    const snapshotText = extractSnapshotText(data.snapshotJson);
    let nextText = snapshotText;
    data.ops?.forEach((op) => {
      nextText = applyOpJson(nextText, op.opJson);
    });
    setContent(nextText);
    setRev(data.currentRev);
    pendingRef.current = false;
    dirtyRef.current = false;
    setStatus("Synced");
  }, []);

  const applyOperation = useCallback((nextRev: number, opJson: string) => {
    setContent((current) => applyOpJson(current, opJson));
    setRev(nextRev);
  }, []);

  const sendOperation = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }
    const opJson = JSON.stringify({
      type: "replace",
      text: contentRef.current,
    });
    const snapshotJson = JSON.stringify({
      text: contentRef.current,
    });

    ws.send(
      JSON.stringify({
        type: "op",
        docId: documentId,
        baseRev: revRef.current,
        opJson,
        snapshotJson,
      })
    );
    pendingRef.current = true;
    dirtyRef.current = false;
  }, [documentId]);

  const sendPresence = useCallback(
    (cursor: { start?: number; end?: number }) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return;
      }
      ws.send(
        JSON.stringify({
          type: "presence",
          docId: documentId,
          cursor,
        })
      );
    },
    [documentId]
  );

  const fetchDocument = useCallback(
    async (token: string, docId: number) => {
      const response = await fetch(`${API_BASE_URL}/documents/${docId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.status === 401) {
        router.push("/auth");
        return;
      }
      if (!response.ok) {
        setStatus("Failed to load document.");
        return;
      }
      const data = (await response.json()) as DocumentResponse;
      setTitle(data.title);
      setRev(data.currentRev ?? 0);
    },
    [router]
  );

  const fetchAccess = useCallback(async (token: string, docId: number) => {
    const response = await fetch(`${API_BASE_URL}/documents/${docId}/access`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as AccessResponse;
    setCanEdit(data.canEdit);
    setAccessRole(data.role);
  }, []);

  const fetchSync = useCallback(
    async (token: string, docId: number) => {
      const response = await fetch(
        `${API_BASE_URL}/documents/${docId}/sync?sinceRev=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (!response.ok) {
        return;
      }
      const data = (await response.json()) as SyncResponse;
      applySync(data);
    },
    [applySync]
  );

  const connectWebSocket = useCallback(
    (token: string, docId: number) => {
      const ws = new WebSocket(
        `${WS_BASE_URL}?token=${encodeURIComponent(token)}`
      );

      ws.onopen = () => {
        setStatus("Connected");
        ws.send(
          JSON.stringify({
            type: "join",
            docId,
            lastRev: revRef.current,
          })
        );
      };

      ws.onclose = () => {
        setStatus("Disconnected");
      };

      ws.onerror = () => {
        setStatus("Connection error");
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as Record<string, unknown>;
          const type = message.type as string | undefined;
          if (!type) return;

          if (type === "sync") {
            applySync(message as unknown as SyncResponse);
            return;
          }

          if (type === "op") {
            const opMessage = message as unknown as {
              rev: number;
              opJson: string;
              actorId: number;
            };
            applyOperation(opMessage.rev, opMessage.opJson);
            if (userIdRef.current && opMessage.actorId === userIdRef.current) {
              pendingRef.current = false;
            }
            return;
          }

          if (type === "presence") {
            const presenceMessage = message as unknown as PresenceState & {
              actorId: number;
              actorEmail: string;
              cursor?: { start?: number; end?: number };
            };
            setPresence((prev) => ({
              ...prev,
              [presenceMessage.actorId]: {
                actorId: presenceMessage.actorId,
                actorEmail: presenceMessage.actorEmail,
                cursor: presenceMessage.cursor,
                selection: presenceMessage.selection,
                lastSeen: Date.now(),
              },
            }));
            return;
          }
        } catch {
          setStatus("Message parse error");
        }
      };

      return ws;
    },
    [applyOperation, applySync]
  );

  function handleChange(value: string) {
    if (!canEdit) return;
    setContent(value);
    dirtyRef.current = true;
  }

  function handlePresence(event: React.SyntheticEvent<HTMLTextAreaElement>) {
    const target = event.currentTarget;
    const cursor = {
      start: target.selectionStart ?? undefined,
      end: target.selectionEnd ?? undefined,
    };
    sendPresence(cursor);
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    revRef.current = rev;
  }, [rev]);

  useEffect(() => {
    if (!documentId) return;
    const token = localStorage.getItem("scribeloop_token");
    if (!token) {
      router.push("/auth");
      return;
    }

    const claims = decodeJwt(token);
    if (claims?.uid) {
      userIdRef.current = claims.uid;
    }

    void fetchDocument(token, documentId);
    void fetchAccess(token, documentId);
    void fetchSync(token, documentId);

    const ws = connectWebSocket(token, documentId);
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [
    connectWebSocket,
    documentId,
    fetchAccess,
    fetchDocument,
    fetchSync,
    router,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      setPresence((prev) => {
        const updated: Record<string, PresenceState> = {};
        Object.values(prev).forEach((item) => {
          if (now - item.lastSeen < 20000) {
            updated[item.actorId] = item;
          }
        });
        return updated;
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    if (!dirtyRef.current || pendingRef.current) {
      return;
    }

    const timeout = window.setTimeout(() => {
      sendOperation();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [content, rev, sendOperation]);

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
            Rev {rev} · {status}
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
          <textarea
            value={content}
            onChange={(event) => handleChange(event.target.value)}
            onSelect={handlePresence}
            onKeyUp={handlePresence}
            onMouseUp={handlePresence}
            disabled={!canEdit}
            className="h-[420px] w-full resize-none rounded-2xl border border-[color:var(--surface-border)] bg-white p-4 text-sm leading-6"
            placeholder="Start writing your notes..."
          />
        </section>

        <section className="rounded-3xl border border-[color:var(--surface-border)] bg-[color:var(--surface)] p-6 shadow-[0_12px_32px_rgba(23,23,23,0.08)]">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Active collaborators
          </h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {Object.values(presence).length === 0 ? (
              <p className="text-sm text-[color:var(--muted)]">
                No active cursors yet.
              </p>
            ) : (
              Object.values(presence).map((member) => (
                <div
                  key={member.actorId}
                  className="rounded-full border border-[color:var(--surface-border)] px-4 py-2 text-xs font-semibold"
                >
                  {member.actorEmail}
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function extractSnapshotText(snapshotJson?: string) {
  if (!snapshotJson) {
    return EMPTY_SNAPSHOT.text;
  }
  try {
    const parsed = JSON.parse(snapshotJson) as { text?: string };
    if (typeof parsed?.text === "string") {
      return parsed.text;
    }
  } catch {
    return snapshotJson;
  }
  return EMPTY_SNAPSHOT.text;
}

function applyOpJson(current: string, opJson: string) {
  try {
    const parsed = JSON.parse(opJson) as { type?: string; text?: string };
    if (parsed?.type === "replace" && typeof parsed.text === "string") {
      return parsed.text;
    }
  } catch {
    return current;
  }
  return current;
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
