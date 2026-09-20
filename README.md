# Ivoolve Agent

Monorepo para construir y estudiar un ecosistema de agentes de IA.

## Estructura

```text
ivoolve_agent/
├── backend/              # NestJS + agentes + Redis + BullMQ
├── frontend/             # Next.js + Tailwind + BFF hacia NestJS
├── iniciar.bat           # Inicio completo en Windows
├── .github/              # CI del monorepo
├── Agent.md
├── AGENTS.md
└── README.md
```

## Puertos de desarrollo

| Servicio | Puerto |
| --- | ---: |
| NestJS backend | 5020 |
| Next.js frontend | 5021 |
| Redis | 6379 |
| LM Studio | 1234 |

## Inicio rápido en Windows

Con el proyecto ubicado en `D:\ivoolve_agent`:

```powershell
D:
cd D:\ivoolve_agent
iniciar.bat
```

El script:

1. inicia Redis mediante Docker Compose;
2. abre NestJS en una consola independiente;
3. abre Next.js en otra consola independiente.

## Backend

```powershell
cd backend
Copy-Item .env.example .env
npm install
docker compose up -d redis
npm run start:dev
```

Backend: `http://localhost:5020`

## Frontend

En otra terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Frontend: `http://localhost:5021`

## Flujo

```text
Browser
   |
   v
Next.js :5021
   |
   v
BFF /api/backend/*
   |
   v
NestJS :5020
   |
   +--> Redis :6379
   +--> Jorge
   +--> LLM
```

## Sistema de trabajo

Cada servicio tiene su propio `Agent.md`, documentación de decisiones y bitácora de progreso.

- Backend: `backend/docs/`
- Frontend: `frontend/docs/`

Las decisiones y avances relevantes deben quedar documentados antes de considerar una fase terminada.
