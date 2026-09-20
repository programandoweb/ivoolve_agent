# Agent.md — Metodología global de Ivoolve Agent

## Propósito

Este repositorio es un monorepo compuesto por servicios independientes.

Estructura objetivo:

```text
backend/   -> NestJS, runtime multiagente, Redis, BullMQ y agentes
frontend/  -> Next.js, interfaz del sistema
```

## Regla principal

Antes de modificar un servicio se debe leer su propia metodología.

Actualmente:

- Backend: `backend/Agent.md`
- Frontend: se documentará cuando sea creado.

## Sistema documental

Cada servicio mantiene sus decisiones, arquitectura, instalación y progreso cerca de su código.

Para backend:

- `backend/docs/progress/`
- `backend/docs/decisions/`
- `backend/docs/architecture.md`

## Reglas del monorepo

1. No mezclar dependencias Node entre backend y frontend.
2. Cada servicio debe tener su propio `package.json`, `.env.example` y scripts.
3. Los secretos nunca se versionan.
4. La CI debe indicar explícitamente el directorio de trabajo.
5. Cada decisión transversal debe documentarse.
6. No afirmar pruebas que no fueron ejecutadas.
7. El código pedagógico del backend debe conservar sus comentarios explicativos.

## Flujo obligatorio

1. Leer este archivo.
2. Leer el `Agent.md` del servicio.
3. Revisar progreso y decisiones recientes.
4. Implementar.
5. Validar.
6. Documentar.
7. Hacer commit/push cuando el usuario lo solicite.
