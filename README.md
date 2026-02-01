# ScribeLoop

Real-time collaborative study notes platform.

## Structure
- `backend/` Spring Boot API + WebSocket server
- `frontend/` Next.js web app

## Prerequisites
- Java 21+
- Node.js 20+
- Docker (for local Postgres)

## Local Development

1) Start Postgres

```
docker compose up -d
```

2) Backend

```
cd backend
./mvnw spring-boot:run
```

3) Frontend

```
cd frontend
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and the backend on `http://localhost:8080`.

## Env Vars
Copy `.env.example` to `.env` and adjust as needed.
