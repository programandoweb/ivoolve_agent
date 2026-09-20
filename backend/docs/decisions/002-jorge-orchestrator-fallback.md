# ADR-002 — Jorge como orquestador y fallback

Fecha: 2026-09-20

Estado: aceptada.

## Contexto

El sistema necesita un punto de entrada estable aunque aún no existan agentes especializados.

## Decisión

El agente `jorge` será:

- entrada por defecto;
- fallback;
- futuro router/orquestador;
- responsable de consolidar respuestas.

## Consecuencia

Se puede iniciar con un solo agente y añadir especialistas progresivamente sin cambiar el contrato HTTP principal.
