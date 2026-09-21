# Fases 15–20 — Production hardening previo a QA

## Fase 15 — Persistencia compartida

Completado:

- MariaDB opcional mediante `DATABASE_URL`;
- auto-migración idempotente con `CREATE TABLE IF NOT EXISTS`;
- tenants y usuarios;
- agentes gestionados;
- providers;
- ejecuciones del runtime;
- approvals;
- auditoría;
- fallback local cuando MariaDB no está configurada;
- servicio MariaDB persistente en Docker Compose.

Redis sigue siendo coordinación/estado temporal y no fuente de verdad durable.

## Fase 16 — Usuarios, roles y tenants

Completado:

- JWT con `userId`, `tenantId` y `role`;
- roles `admin`, `operator`, `viewer`;
- login y validación de sesión contra MariaDB;
- deshabilitar usuario invalida la sesión en la siguiente validación;
- aislamiento de providers, sesiones Redis, ejecuciones y métricas por tenant;
- provider tools limitadas al tenant;
- Agent Builder reservado a admin;
- administración de usuarios desde `/dashboard/access`;
- gestión global de tenants limitada al `bootstrap-admin`.

Matriz resumida:

| Acción | Admin | Operator | Viewer |
| --- | --- | --- | --- |
| Ver dashboard/chat/runtime | Sí | Sí | Sí |
| Crear/editar/conectar provider | Sí | Sí | No |
| Eliminar provider | Sí | No | No |
| Crear agentes | Sí | No | No |
| Gestionar usuarios | Sí | No | No |
| Resolver approvals | Sí | No | No |
| Tool de escritura interactiva | Con approval | Con approval | No |

## Fase 17 — Human-in-the-loop approvals

Completado:

- estado `pending → processing → approved/rejected`;
- transición atómica en MariaDB;
- fallback JSON local;
- `provider.send_message` requiere aprobación por defecto;
- una solicitud no ejecuta la acción antes de aprobarse;
- si la ejecución aprobada falla vuelve a `pending`;
- UI `/dashboard/approvals`;
- auditoría de solicitud, aprobación, rechazo y fallo.

La respuesta automática de un provider a su conversación normal no se convierte en approval; el approval protege una tool explícita de acción.

## Fase 18 — Métricas y alertas

Completado:

- tasa de éxito por ventana;
- promedio de duración;
- P95;
- total completadas/fallidas;
- agregación por agente/provider;
- alertas de tasa de fallos y P95 configurable;
- health incluye Redis y MariaDB;
- dashboard Runtime muestra indicadores y alertas;
- observabilidad aislada por tenant.

## Fase 19 — Multi-instancia

Completado:

- lease distribuido Redis por provider;
- acquire/renew/release atómicos;
- TTL configurable;
- una sola instancia puede ser dueña de un número;
- si una instancia pierde el lease cierra el socket Baileys;
- leases liberados en disconnect/shutdown;
- auto-connect seguro entre réplicas.

Las credenciales Baileys continúan siendo archivos y deben residir en volumen persistente/compartido acorde al modelo de despliegue.

## Fase 20 — Contrato de adapters

Completado:

- catálogo de adapters;
- capacidades declaradas;
- endpoint `GET /providers/adapters`;
- WhatsApp/Baileys aparece como adapter activo verificable;
- el runtime permanece desacoplado del canal concreto.

No se marcan Slack, Telegram o email como implementados. Son expansiones de producto posteriores y requieren sus adapters/credenciales reales.

## Seguridad y auditoría

Completado:

- RBAC en controladores;
- RBAC dentro del runtime para evitar bypass por lenguaje natural;
- tenant context propagado hasta tools;
- audit log durable en MariaDB o JSONL local;
- trazabilidad de usuarios, tenants y approvals.

## Estado previo al QA

La arquitectura necesaria para un QA integral está terminada. El QA debe validar instalación limpia, auth/RBAC, aislamiento multi-tenant, Agent Builder, providers, WhatsApp real, BullMQ, delegación, approvals, leases, persistencia/restart, métricas, auditoría y responsive UI.
