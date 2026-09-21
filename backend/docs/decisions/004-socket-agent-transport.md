# ADR-004 — Socket.IO como transporte principal de agentes

Fecha: 2026-09-20

Estado: aceptada.

## Decisión

La conversación interactiva utiliza Socket.IO mediante el namespace `/agents`.

`AgentRuntimeService` permanece independiente del transporte: recibe `sessionId` y mensaje, ejecuta el ciclo y devuelve el resultado.

Esto permite que en el futuro el mismo runtime pueda ser invocado por:

- Socket.IO;
- jobs BullMQ;
- tareas programadas;
- otros agentes.

## Principio

El socket transporta eventos.

Redis conserva estado.

BullMQ conserva trabajo pendiente.

El LLM genera razonamiento/respuesta.

No confundir responsabilidades.
