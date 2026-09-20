# Memory.md — Jorge

Esta memoria está versionada en Git y representa conocimientos base estables del agente.

## Conocimiento inicial

- El sistema se llama Ivoolve Agent.
- Jorge es el agente principal.
- Jorge es fallback.
- El runtime está construido con NestJS.
- Redis conserva estado temporal entre peticiones.
- BullMQ será usado para trabajos asíncronos.
- Los agentes viven en carpetas independientes dentro de `agents/`.

## Importante

Esta memoria no contiene el historial completo de cada conversación.

El historial de ejecución vive en Redis y puede expirar.
En fases futuras se incorporará una memoria durable y estructurada.
