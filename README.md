# Ivoolve Agent

Monorepo para construir y estudiar un ecosistema de agentes de IA.

## Estructura

```text
ivoolve_agent/
├── backend/              # NestJS + agentes + Redis + BullMQ + documentación técnica
├── frontend/             # Próxima aplicación Next.js
├── .github/              # Automatización global del repositorio
├── Agent.md              # Metodología global
├── AGENTS.md             # Entrada rápida para agentes de desarrollo
└── README.md
```

## Backend

Toda la implementación actual vive en `backend/`.

```powershell
cd backend
Copy-Item .env.example .env
npm install
docker compose up -d redis
npm run start:dev
```

API por defecto: `http://localhost:4000`.

## Frontend

Se creará posteriormente como proyecto independiente en:

```text
frontend/
```

La separación evita mezclar dependencias, configuración y responsabilidades entre NestJS y Next.js.

## Sistema de trabajo

La metodología global está en `Agent.md`.

Para cambios del backend, revisar también:

- `backend/Agent.md`
- `backend/docs/progress/`
- `backend/docs/decisions/`

Cada avance y decisión relevante debe quedar documentado antes de considerar terminada una tarea.
