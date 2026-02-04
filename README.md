# ScribeLoop

ScribeLoop is a real-time collaborative study notes platform where students organize content by course and week, create shared documents, and edit together with live updates and cursor presence.

## Stack
- Spring Boot (REST API)
- Next.js (frontend)
- Hocuspocus + Yjs (collaboration)
- PostgreSQL

## Architecture
- The **backend** exposes REST endpoints for auth, courses, documents, and sharing, and persists data in PostgreSQL.
- The **collab server** runs a low-latency WebSocket layer (Hocuspocus + Yjs) for live editing, cursor presence, and conflict-free sync.
- The **frontend** consumes the REST API for durable data and connects to the collab server for real-time editing.
- Document updates are stored as Yjs updates for versioned, reconnect-friendly collaboration.

## Local development
- Backend: run from `backend/`
- Collab server: run from `collab/`
- Frontend: run from `frontend/`
