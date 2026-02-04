CREATE TABLE IF NOT EXISTS yjs_documents (
    name TEXT PRIMARY KEY,
    data BYTEA NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS yjs_documents_updated_at_idx
    ON yjs_documents (updated_at);
