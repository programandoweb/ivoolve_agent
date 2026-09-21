# 04 — Conversación por Socket.IO

Fecha: 2026-09-20

## Objetivo

Reemplazar el canal REST del chat por un hilo Socket.IO persistente entre frontend y NestJS.

## Backend

Se agregó:

- `@nestjs/websockets`;
- `@nestjs/platform-socket.io`;
- `socket.io`;
- `AgentsGateway`.

El antiguo `POST /agents/chat` se elimina del controlador.

## Frontend

Se agregó `socket.io-client`.

El componente mantiene una instancia de socket durante su ciclo de vida y utiliza:

```text
agent:message -> agent:processing -> agent:response
```

Errores se reciben mediante `agent:error`.

## Persistencia

Redis no cambia. El socket es transporte, no memoria.

## Pruebas ejecutadas

No se ejecutó el navegador ni el build local desde el conector GitHub.

La CI deberá instalar las nuevas dependencias y compilar ambos servicios.

## Siguiente paso

Agregar eventos de trazabilidad del runtime para visualizar:

- recuperación de memoria;
- selección de agente;
- llamada al LLM;
- persistencia en Redis;
- futura delegación a subagentes.
