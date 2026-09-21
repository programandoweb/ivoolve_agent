# ADR-002 — Socket.IO como canal de conversación

Fecha: 2026-09-20

Estado: aceptada.

## Contexto

El chat utilizaba un POST REST por cada mensaje. El proyecto busca estudiar agentes que mantengan una comunicación más natural y que posteriormente puedan reportar pasos, herramientas, delegaciones y resultados en tiempo real.

## Decisión

La conversación se mueve a Socket.IO.

Namespace:

```text
/agents
```

Eventos iniciales:

- `agent:message`
- `agent:processing`
- `agent:response`
- `agent:error`

REST permanece únicamente para lecturas auxiliares como health y catálogo.

## Consecuencias

- existe una conexión persistente;
- el servidor puede emitir eventos sin esperar una nueva petición HTTP;
- facilita streaming y trazas futuras;
- se requiere gestionar reconexión y desconexión del cliente;
- `NEXT_PUBLIC_SOCKET_URL` debe ser visible para el navegador.
