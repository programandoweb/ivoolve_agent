# Ivoolve Agent

Plataforma para construir, operar y supervisar agentes de IA con canales externos.

## Stack

- NestJS + Socket.IO: 5020
- Next.js: 5021
- Redis + BullMQ
- MariaDB
- LM Studio / API compatible OpenAI
- WhatsApp vía Baileys

## Capacidades actuales

- dashboard seguro;
- usuarios, roles y tenants;
- chat en tiempo real;
- Agent Builder conversacional;
- agentes core y gestionados;
- delegación Jorge → subagentes;
- Tool Registry ejecutable;
- Human-in-the-Loop approvals;
- providers tenant-aware;
- WhatsApp/Baileys con QR y reconexión;
- múltiples números independientes;
- ownership multi-instancia mediante leases Redis;
- routing Provider → BullMQ → Agente → Provider;
- idempotencia + retries;
- persistencia durable MariaDB con fallback local;
- métricas, P95 y alertas;
- audit trail;
- CI con tests backend + build backend/frontend.

## Dashboard

- `/dashboard` — resumen;
- `/dashboard/agents` — agentes;
- `/dashboard/agents/create` — Agent Builder, solo admin;
- `/dashboard/providers` — canales/providers;
- `/dashboard/approvals` — decisiones humanas, solo admin;
- `/dashboard/access` — usuarios y roles, solo admin;
- `/dashboard/chat` — conversación;
- `/dashboard/runtime` — jobs, métricas, alertas y ejecuciones;
- `/dashboard/security` — seguridad.

## Inicio local

Backend:

```powershell
cd D:\ivoolve_agent\backend
Copy-Item .env.example .env
npm install
docker compose up -d
```

Genera credenciales:

```powershell
npm run auth:hash -- "TuClaveSegura"
npm run auth:secret
```

Luego inicia el proyecto con el flujo local habitual y abre:

```text
http://localhost:5021
```

## Persistencia

Con `DATABASE_URL`, MariaDB guarda:

- usuarios/tenants;
- agentes gestionados;
- providers;
- ejecuciones;
- approvals;
- auditoría.

Redis queda para estado temporal, BullMQ, idempotencia y leases.

Las credenciales Baileys permanecen fuera de Git y requieren volumen persistente.

## Providers

Adapter implementado y verificable:

- WhatsApp/Baileys.

El contrato está preparado para otros adapters, pero Slack, Telegram y email son expansiones posteriores; no se consideran implementados todavía.

## Estado

Las fases estructurales previas al QA están cerradas.

Plan de QA:

```text
backend/docs/qa/full-qa-plan.md
```

Arquitectura:

```text
backend/docs/architecture.md
```
