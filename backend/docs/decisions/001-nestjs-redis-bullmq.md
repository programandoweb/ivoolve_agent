# ADR-001 — NestJS + Redis + BullMQ

Fecha: 2026-09-20

Estado: aceptada.

## Contexto

El sistema necesita múltiples agentes y subagentes que puedan conservar estado y ejecutar tareas más largas que una petición HTTP.

## Decisión

- NestJS será el runtime/orquestador.
- Redis conservará estado temporal.
- BullMQ utilizará Redis para trabajos asíncronos.
- Los agentes se definirán por carpetas.
- El acceso al LLM se hará mediante adapter.

## Consecuencias

Se separan claramente ejecución, estado y definición de agentes.

Redis no se convierte en base de negocio y BullMQ no se confunde con memoria.
