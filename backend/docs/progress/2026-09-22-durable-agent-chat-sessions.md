# 2026-09-22 — Sesiones de chat durables por agente

## Objetivo

El chat de un agente debe sobrevivir a F5, navegación y reinicios del frontend. La conversación solo debe comenzar limpia cuando el usuario pulse **Nueva sesión**.

## Persistencia

Se añadieron dos tablas MariaDB:

- `agent_chat_sessions`: identifica tenant, agente, usuario y sesión.
- `agent_chat_messages`: conserva cada mensaje de usuario/asistente en orden cronológico.

Redis continúa funcionando como caché rápida de la sesión activa. Cuando Redis no contiene una sesión, el runtime la reconstruye desde MariaDB y vuelve a hidratar Redis.

Las sesiones antiguas que todavía existen únicamente en Redis se migran de forma incremental a MariaDB al continuar conversando.

## UI

`AgentChat`:

- conserva el UUID activo en `localStorage` por agente;
- al reconectar solicita `agent:history:request`;
- restaura el historial mediante `agent:history`;
- incluye botón **Nueva sesión** con icono;
- una nueva sesión genera otro UUID y no elimina la anterior de MariaDB;
- al enviar desde la página de un agente se incluye explícitamente `agentId`.

## Alcance de memoria

La persistencia es memoria conversacional durable de sesión. No modifica los archivos versionados `Memory.md` de los agentes y no mezcla automáticamente conversaciones distintas.

## Migración

El esquema se crea mediante `DATABASE_AUTO_MIGRATE=true` durante el arranque del backend.

## QA

No se ejecutó build ni suite completa desde esta sesión.
