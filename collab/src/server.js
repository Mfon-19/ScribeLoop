import { Server } from "@hocuspocus/server";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { Pool } from "pg";
import * as Y from "yjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPaths = [
  path.resolve(__dirname, "../.env"),
  path.resolve(__dirname, "../.env.local"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../../.env.local"),
];

envPaths.forEach((envPath) => dotenv.config({ path: envPath }));

const PORT = Number(process.env.COLLAB_PORT || process.env.PORT || 1234);
const API_BASE_URL =
  process.env.COLLAB_API_BASE_URL || "http://localhost:8080";
const JWT_SECRET = resolveJwtSecret();

const pool = new Pool(resolveDatabaseConfig());

const server = new Server({
  port: PORT,
  async onAuthenticate(data) {
    const token = data.token;
    if (!token) {
      throw new Error("Missing auth token");
    }

    let claims;
    try {
      claims = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    } catch (error) {
      throw new Error("Invalid token");
    }

    const documentId = parseDocumentId(data.documentName);
    if (!documentId) {
      throw new Error("Invalid document name");
    }

    const access = await fetchAccess(token, documentId);
    if (!access) {
      throw new Error("Unauthorized");
    }

    if (!access.canEdit && data.connection) {
      data.connection.readOnly = true;
    }

    return {
      user: {
        id: claims.uid,
        email: claims.sub,
        role: access.role,
        canEdit: access.canEdit,
      },
    };
  },
  async onLoadDocument({ document, documentName }) {
    const existing = await loadDocument(documentName);
    if (existing) {
      Y.applyUpdate(document, existing);
    }
    return document;
  },
  async onStoreDocument({ document, documentName }) {
    const update = Y.encodeStateAsUpdate(document);
    await storeDocument(documentName, update);
    document.broadcastStateless(
      JSON.stringify({
        type: "saved",
        documentName,
        timestamp: Date.now(),
      })
    );
  },
});

server.listen();
console.log(`Hocuspocus collab server listening on ws://localhost:${PORT}`);

function resolveDatabaseConfig() {
  if (process.env.COLLAB_DATABASE_URL) {
    return { connectionString: process.env.COLLAB_DATABASE_URL };
  }

  const jdbcUrl = process.env.SPRING_DATASOURCE_URL;
  if (!jdbcUrl) {
    throw new Error(
      "COLLAB_DATABASE_URL or SPRING_DATASOURCE_URL must be configured"
    );
  }

  const match = /^jdbc:postgresql:\/\/([^:/?#]+)(?::(\d+))?\/([^?#]+)(\?.*)?$/.exec(
    jdbcUrl
  );
  if (!match) {
    throw new Error("Unable to parse SPRING_DATASOURCE_URL");
  }

  const user = process.env.SPRING_DATASOURCE_USERNAME;
  const password = process.env.SPRING_DATASOURCE_PASSWORD;
  if (!user || !password) {
    throw new Error(
      "SPRING_DATASOURCE_USERNAME and SPRING_DATASOURCE_PASSWORD are required"
    );
  }

  return {
    host: match[1],
    port: match[2] ? Number(match[2]) : 5432,
    database: match[3],
    user,
    password,
  };
}

function resolveJwtSecret() {
  const rawSecret = process.env.COLLAB_JWT_SECRET || process.env.JWT_SECRET;
  if (!rawSecret || !rawSecret.trim()) {
    throw new Error("COLLAB_JWT_SECRET or JWT_SECRET must be configured");
  }

  let keyBuffer;
  if (/^[A-Za-z0-9+/=]+$/.test(rawSecret)) {
    try {
      keyBuffer = Buffer.from(rawSecret, "base64");
    } catch {
      keyBuffer = Buffer.from(rawSecret, "utf8");
    }
  } else {
    keyBuffer = Buffer.from(rawSecret, "utf8");
  }

  if (keyBuffer.length < 32) {
    throw new Error("JWT secret must be at least 32 bytes");
  }

  return keyBuffer;
}

function parseDocumentId(documentName) {
  const match = /^document:(\d+)$/.exec(documentName || "");
  if (!match) return null;
  return Number(match[1]);
}

async function fetchAccess(token, documentId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/documents/${documentId}/access`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

async function loadDocument(documentName) {
  const { rows } = await pool.query(
    "SELECT data FROM yjs_documents WHERE name = $1",
    [documentName]
  );
  if (rows.length === 0) {
    return null;
  }
  return rows[0].data;
}

async function storeDocument(documentName, update) {
  const dataBuffer = Buffer.from(update);
  await pool.query(
    "INSERT INTO yjs_documents (name, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()",
    [documentName, dataBuffer]
  );
}
