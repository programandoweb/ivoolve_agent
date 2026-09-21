# Arquitectura actual

## Visión general

```text
Usuario / Canal externo
        |
        +----------------------+
        |                      |
        v                      v
Dashboard / Socket.IO      Provider Adapter
        |                      |
        v                      v
 Auth + RBAC            NormalizedProviderMessage
        |                      |
        |                    BullMQ
        |                      |
        +----------+-----------+
                   |
                   v
          AgentRuntimeService
                   |
       +-----------+-----------+
       |           |           |
       v           v           v
 AgentRegistry   LLM      ToolRegistry
       |                       |
       |                 Approval Gate
       |                       |
       +-----------+-----------+
                   |
                   v
              Provider
                   |
                   v
               Usuario
```

## Persistencia

### MariaDB

Fuente durable compartida cuando `DATABASE_URL` está configurada:

- tenants;
- usuarios y roles;
- agentes gestionados;
- metadatos de providers;
- ejecuciones del runtime;
- approvals;
- audit events;
- contextos/referencias externas de IvoolveOps;
- tickets SSO hasheados y single-use.

Las migraciones bootstrap son idempotentes mediante `CREATE TABLE IF NOT EXISTS`.

### Redis

Redis no es la fuente durable. Se usa para:

- sesiones temporales;
- BullMQ;
- idempotencia de mensajes;
- leases distribuidos de providers.

### Fallback local

Sin MariaDB, desarrollo puede seguir usando archivos bajo `backend/data` para agentes, providers, approvals, auditoría y trazas.

## Multi-tenancy y RBAC

El JWT contiene:

- `sub` / user id;
- `username`;
- `role`;
- `tenantId`.

Roles:

- `admin`: administración y decisiones humanas;
- `operator`: operación de providers;
- `viewer`: observación/chat sin tools de escritura.

El tenant se propaga por:

```text
JWT
 -> Socket/REST
 -> RuntimeInvocationContext
 -> ToolRegistry
 -> Provider/Execution/Approval store
```

Las sesiones interactivas usan prefijo:

```text
tenant:{tenantId}:{sessionId}
```

y las conversaciones de provider:

```text
tenant:{tenantId}:provider:{providerId}:contact:{conversationId}
```

## Agent runtime

Jorge sigue siendo el supervisor/fallback. Puede:

- responder directamente;
- ejecutar tools registradas;
- delegar a un subagente real mediante sesión hija;
- crear agentes mediante Agent Builder cuando el actor es admin.

Los agentes gestionados son capacidades globales del runtime; por eso el Builder está reservado a administradores mientras no exista un catálogo de agentes por tenant.

## Tools y approvals

Tools ejecutables actuales:

- `provider.list`;
- `provider.send_message`;
- `prospecting.google_maps_search`;
- `prospecting.google_search`;
- `prospecting.score_lead`;
- `video.capabilities`;
- `video.generate`;
- `video.status`.

Una declaración en Markdown no concede permisos. El runtime valida ACL, tenant y rol.

Por defecto `provider.send_message` pasa por Human-in-the-Loop:

```text
Agente
  -> ToolRegistry
  -> Approval pending
  -> Admin approve/reject
  -> execute
```

La respuesta automática de una conversación entrante no usa este approval; el gate protege acciones explícitas iniciadas como tool.


## Generación audiovisual

La inferencia de video permanece fuera del backend NestJS. El runtime llama mediante HTTP privado al servicio `ivoolve_video_generator_py`, normalmente ejecutado en el PC con GPU Intel:

```text
LLM / Agente
   |
   v
ToolRegistry
   |
   +-- video.generate --------+
   |                          |
   +-- video.status           v
                     Python :8650
                         |
                         v
                    PyTorch XPU
                         |
                         v
                 Wan 2.1 T2V 1.3B
```

El contrato es asíncrono: `video.generate` devuelve inmediatamente un `jobId`; el agente consulta `video.status` hasta obtener `completed` o `failed`.

La conexión usa `VIDEO_GENERATOR_BASE_URL` y `VIDEO_GENERATOR_TOKEN`. El token sólo existe en backend y nunca se entrega al navegador. El worker serializa la inferencia a un job GPU por vez para evitar presión de VRAM.

## Providers y adapters

El dominio Provider está desacoplado del canal.

Adapter activo:

- `whatsapp_baileys`.

El catálogo se consulta en:

```http
GET /providers/adapters
```

Slack, Telegram y email no están implementados todavía. El contrato ya permite agregarlos posteriormente sin modificar el núcleo del runtime.

## WhatsApp multi-instancia

Cada provider obtiene un lease Redis:

```text
ivoolve:provider-owner:{providerId}
```

Flujo:

1. una instancia adquiere el lease con NX + TTL;
2. renueva periódicamente;
3. otra instancia no puede abrir el mismo provider;
4. si se pierde ownership, el socket local se cierra;
5. disconnect/shutdown libera el lease.

Las credenciales Baileys siguen siendo archivos sensibles y deben montarse en almacenamiento persistente apropiado.

## BullMQ e idempotencia

```text
Baileys
 -> normalized message
 -> BullMQ agent-jobs
 -> ProviderMessageProcessor
 -> Redis claim
 -> ProviderRoutingService
 -> AgentRuntimeService
 -> respuesta
```

El claim se mantiene cuando el turno completa y se libera si el procesamiento falla, permitiendo retries reales con backoff.

## Observabilidad

`/runtime/metrics` entrega por tenant:

- success rate;
- completadas/fallidas;
- promedio de duración;
- P95;
- agregados por agente/provider;
- alertas configurables.

`/runtime/executions` entrega trazas recientes del tenant.

`/health` incluye Redis y MariaDB.

## Auditoría

Eventos sensibles se guardan en MariaDB o fallback JSONL:

- creación/cambio de usuarios;
- creación de tenant;
- solicitud de approval;
- aprobación/rechazo;
- fallo al ejecutar una aprobación.

## Seguridad de datos

No deben versionarse:

- `.env`;
- sesiones/credenciales Baileys;
- datos de runtime;
- agentes gestionados creados en ejecución.

El siguiente bloque de trabajo es QA integral, definido en `backend/docs/qa/full-qa-plan.md`.

## IvoolveOps

IvoolveOps consume un contrato HTTP interno autenticado para crear o resolver agentes `customer_support`, consultar estado y solicitar tickets SSO.

Las referencias `external_customer_id` y `external_project_id` permanecen en la base de Ivoolve Agent, pero nunca crean FKs ni acceso a la base de IvoolveOps. El managed agent conserva identidad/instrucciones y conocimiento inicial; las sesiones interactivas del frontend se separan por `agentId` para evitar contaminación entre proyectos.

Detalle completo: `../docs/integrations/ivoolveops-ivoolve-agent.md`.
