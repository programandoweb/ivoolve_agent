# Ivoolve Agent — Backend

Runtime NestJS multiagente de Ivoolve Agent.

## Componentes

- NestJS: API, Socket.IO y orquestación.
- Jorge: agente principal, fallback y supervisor.
- Agent Registry: agentes core + gestionados.
- Tool Registry: acciones ejecutables con ACL.
- Providers: adapters de canales externos.
- Baileys: primer adapter WhatsApp.
- Redis: sesiones, idempotencia y coordinación.
- BullMQ: mensajes y trabajos reintentables.
- LLM adapter: LM Studio/OpenAI-compatible.
- Runtime logs: trazas JSONL del MVP.

## Instalación

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d redis
npm run start:dev
```

## Endpoints principales

```http
GET  /health
GET  /agents
POST /agents/chat

GET    /providers
POST   /providers
GET    /providers/:id
PATCH  /providers/:id
DELETE /providers/:id
POST   /providers/:id/connect
POST   /providers/:id/disconnect
GET    /providers/:id/connection

GET /runtime/executions
GET /runtime/jobs/stats
```

## Tests

```powershell
npm test -- --runInBand
npm run build
```

CI ejecuta tests antes de compilar el backend.

## Documentación

Antes de modificar:

1. `Agent.md`
2. `docs/architecture.md`
3. `docs/progress/`
4. `docs/decisions/`

Cada cambio relevante debe dejar registro documental.
