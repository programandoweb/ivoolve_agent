# Agent.md — Metodología del backend

## Propósito

El backend contiene el runtime multiagente de Ivoolve Agent.

Antes de modificarlo:

1. leer la metodología global `../Agent.md`;
2. revisar `docs/progress/`;
3. revisar `docs/decisions/`;
4. conservar los comentarios pedagógicos;
5. documentar cada cambio relevante.

## Principios

- NestJS es el runtime/orquestador.
- Socket.IO es el canal principal de conversación con agentes.
- Redis conserva estado temporal.
- BullMQ representa trabajos asíncronos.
- Los agentes viven en `agents/<nombre>/`.
- Jorge es fallback y futuro orquestador.
- Los proveedores LLM deben permanecer desacoplados.
- REST se reserva para endpoints auxiliares cuando corresponda.
- No afirmar pruebas no ejecutadas.
