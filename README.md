# Ivoolve Agent

Plataforma para construir, operar y supervisar agentes de IA con canales externos.

## Stack

- NestJS + Socket.IO: 5020
- Next.js: 5021
- Redis + BullMQ
- MariaDB
- LM Studio / API compatible OpenAI
- WhatsApp vía Baileys
- Google Maps/Places + Google Search para prospección

## Capacidades actuales

- dashboard seguro;
- usuarios, roles y tenants;
- chat en tiempo real;
- Agent Builder conversacional;
- agentes core y gestionados;
- agente comercial core para Ivoolve ERP;
- búsqueda de prospectos con Google Maps/Places;
- enriquecimiento opcional con Google Search;
- scoring comercial reproducible y handoff humano;
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
- provisioning idempotente de agentes de soporte desde IvoolveOps;
- SSO temporal single-use para abrir un agente sin compartir contraseñas.

## Agente comercial Ivoolve ERP

El agente core `ivoolve-erp-sales` usa Google Maps como fuente primaria y Google Search como enriquecimiento. Su flujo es:

```text
Campaña
  -> Google Maps
  -> enriquecimiento Google Search
  -> scoring
  -> mensaje personalizado
  -> approval humano
  -> provider
  -> seguimiento
  -> handoff a Jorge
```

Configura en `backend/.env`:

```text
GOOGLE_MAPS_API_KEY=
GOOGLE_SEARCH_API_KEY=
GOOGLE_SEARCH_ENGINE_ID=
```

`GOOGLE_MAPS_API_KEY` es obligatoria para descubrimiento. Google Search es opcional mientras no se requiera enriquecimiento web.

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

## Docker completo

El repositorio puede ejecutarse completamente con Docker desde la raíz:

- Frontend Next.js: `http://localhost:5021`
- Backend NestJS + Socket.IO: `http://localhost:5020`
- Redis interno
- MariaDB interna
- Volumen persistente para runtime, agentes gestionados y sesiones de providers/Baileys

### Primer arranque en Windows / PowerShell

```powershell
cd D:\ivoolve_agent
Copy-Item .env.example .env
docker compose build
```

Genera el hash de la contraseña administrativa:

```powershell
docker compose run --rm --no-deps backend npm run auth:hash -- "MiClaveSegura123!"
```

Copia el hash resultante en:

```env
ADMIN_PASSWORD_HASH=...
```

Genera el secreto JWT:

```powershell
docker compose run --rm --no-deps backend npm run auth:secret
```

Copia el valor generado en:

```env
JWT_SECRET=...
```

Luego inicia todo:

```powershell
docker compose up -d --build
```

Estado:

```powershell
docker compose ps
```

Logs:

```powershell
docker compose logs -f --tail=100
```

Detener sin borrar datos:

```powershell
docker compose down
```

Los datos persisten en los volúmenes:

```text
ivoolve_agent_mariadb
ivoolve_agent_redis
ivoolve_agent_data
```

Para LM Studio ejecutándose en el mismo PC, el compose usa por defecto:

```env
LLM_BASE_URL=http://host.docker.internal:1234/v1
```

Si utilizas otra URL, VPN o endpoint compatible OpenAI, cámbiala en `.env`.

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

## Integración con IvoolveOps

El contrato privado, referencias externas, aislamiento de contexto y SSO están documentados en:

```text
docs/integrations/ivoolveops-ivoolve-agent.md
```
