# Ivoolve Agent — Backend

Runtime NestJS multiagente, multi-tenant y orientado a providers.

## Componentes

- NestJS: API, Socket.IO y orquestación.
- Jorge: agente principal, fallback y supervisor.
- Agent Registry: agentes core + gestionados.
- Tool Registry: acciones ejecutables con ACL, tenant y RBAC.
- Human approvals: gate para acciones sensibles.
- Providers: contrato genérico de canales externos.
- Baileys: adapter WhatsApp activo.
- Redis: sesiones, BullMQ, idempotencia y leases distribuidos.
- MariaDB: persistencia durable compartida.
- Runtime Metrics: success rate, promedio, P95 y alertas.
- Audit Service: trazabilidad de operaciones sensibles.
- LLM adapter: LM Studio/OpenAI-compatible.

## Instalación

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d
npm run start:dev
```

Docker Compose levanta Redis y MariaDB persistentes.

Si `DATABASE_URL` no está configurado, el backend conserva fallback local para desarrollo.

## Endpoints principales

```http
GET  /health
GET  /agents

GET    /providers
GET    /providers/adapters
POST   /providers
GET    /providers/:id
PATCH  /providers/:id
DELETE /providers/:id
POST   /providers/:id/connect
POST   /providers/:id/disconnect
GET    /providers/:id/connection

GET  /approvals
POST /approvals/:id/approve
POST /approvals/:id/reject

GET   /admin/users
POST  /admin/users
PATCH /admin/users/:id
GET   /admin/tenants
POST  /admin/tenants

GET /runtime/executions
GET /runtime/metrics
GET /runtime/jobs/stats
```

## Roles

- admin: administración, Agent Builder, approvals y delete de providers;
- operator: operación de providers;
- viewer: lectura/chat sin mutaciones ni write tools.

## Tests

```powershell
npm test -- --runInBand
npm run build
```

GitHub Actions ejecuta tests antes del build y también compila Next.js.

## QA

El plan completo está en:

```text
backend/docs/qa/full-qa-plan.md
```

La prueba E2E final de WhatsApp requiere un número real/controlado.

## Documentación

Antes de modificar:

1. `Agent.md`
2. `docs/architecture.md`
3. `docs/progress/`
4. `docs/decisions/`
5. `docs/qa/`
