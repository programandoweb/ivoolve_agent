# Ivoolve Agent

Monorepo para construir y estudiar un ecosistema de agentes de IA.

## Estructura

```text
ivoolve_agent/
├── backend/              # NestJS + agentes + Redis + BullMQ
├── frontend/             # Next.js + Tailwind + BFF hacia NestJS
├── .github/              # CI del monorepo
├── Agent.md
├── AGENTS.md
└── README.md
```

## Backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
docker compose up -d redis
npm run start:dev
```

Backend: `http://localhost:4000`

## Frontend

En otra terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Frontend: `http://localhost:3000`

## Flujo

```text
Browser
   |
   v
Next.js :3000
   |
   v
BFF /api/backend/*
   |
   v
NestJS :4000
   |
   +--> Redis
   +--> Jorge
   +--> LLM
```

## Sistema de trabajo

Cada servicio tiene su propio `Agent.md`, documentación de decisiones y bitácora de progreso.

- Backend: `backend/docs/`
- Frontend: `frontend/docs/`

Las decisiones y avances relevantes deben quedar documentados antes de considerar una fase terminada.
