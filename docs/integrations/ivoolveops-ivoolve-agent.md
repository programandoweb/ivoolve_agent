# Integración IvoolveOps ↔ Ivoolve Agent

## Responsabilidad

Ivoolve Agent sigue siendo el motor especializado. No conoce ni consulta la base de datos de IvoolveOps. Recibe contexto mediante un contrato interno autenticado y mantiene referencias externas estables.

## Persistencia propia

Tablas de integración en la base `ivoolve_agent`:

- `integration_contexts`: snapshot inicial de cliente/proyecto con `external_source=ivoolveops`.
- `integration_agent_links`: relación externa Project → Agent y clave de idempotencia.
- `sso_tickets`: hash del ticket, agente, expiración y consumo.

Los agentes continúan almacenándose mediante `managed_agents`.

## Provisioning

```http
POST /internal/v1/integrations/ivoolveops/agents
Authorization: Bearer <IVOOLVEOPS_SERVICE_TOKEN>
Idempotency-Key: <project-id>:customer-support
X-Correlation-Id: <correlation-id>
```

El endpoint:

1. valida el service token;
2. resuelve idempotencia por proyecto/rol;
3. persiste contexto externo;
4. crea un managed agent `customer_support` si no existe;
5. guarda el vínculo externo;
6. audita el evento;
7. devuelve `agent_id` y estado.

## Agente inicial

El agente recibe identidad mínima y hechos confirmados:

- IDs externos;
- nombre de cliente/proyecto;
- dominio;
- contacto/email/WhatsApp si existen.

La definición prohíbe inventar información y mezclar conocimiento entre clientes. La sesión de frontend usa una clave local distinta por `agentId`, además del namespace tenant del runtime.

## Estado

```http
GET /internal/v1/integrations/ivoolveops/agents/{externalProjectId}/customer-support
Authorization: Bearer <service-token>
```

No se exponen memoria ni conversaciones.

## SSO

Creación:

```http
POST /internal/v1/integrations/ivoolveops/sso-tickets
Authorization: Bearer <service-token>
```

Consumo:

```http
GET /integrations/ivoolveops/sso/consume?ticket=<opaque>
```

Características:

- el request incluye `agent_id` + `external_project_id` y se valida que exista un vínculo activo Project → Agent antes de emitir acceso;
- ticket aleatorio opaco;
- solo SHA-256 persistido;
- TTL configurable;
- single-use mediante UPDATE condicional;
- sesión emitida para un administrador activo real;
- Next.js guarda JWT en cookie HttpOnly;
- redirección fija a `/dashboard/agents/{agentId}`;
- sin open redirect.

## Variables

Backend:

```env
IVOOLVEOPS_SERVICE_TOKEN=
IVOOLVEOPS_ALLOWED_ORIGIN=
SSO_TICKET_TTL_SECONDS=60
PUBLIC_APP_URL=http://localhost:5021
```

Frontend mantiene:

```env
BACKEND_URL=http://localhost:5020
NEXT_PUBLIC_SOCKET_URL=http://localhost:5020
NEXT_PUBLIC_APP_URL=http://localhost:5021
```

## Seguridad y observabilidad

- Nunca registrar service tokens ni ticket SSO completo.
- Auditoría usa correlation ID y referencias externas.
- El contrato `/internal/*` no sustituye el runtime Socket.IO.
- No hay acceso a DB IvoolveOps.
- El agente permanece desacoplado de WhatsApp, email, Slack u otros providers.
