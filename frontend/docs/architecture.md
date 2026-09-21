# Arquitectura frontend

## Conversación

```text
Browser / Next.js
       |
       | Socket.IO /agents
       | conexión persistente
       v
NestJS :5020
       |
       | agent:message
       v
AgentRuntimeService
       |
       +--> Redis
       +--> Jorge
       +--> LLM
       |
       | agent:response
       v
Browser
```

## Eventos

### Cliente -> servidor

- `agent:message`: `{ sessionId, message }`.

### Servidor -> cliente

- `agent:connected`
- `agent:processing`
- `agent:response`
- `agent:error`

## HTTP auxiliar

Se conservan:

- `GET /health`
- `GET /agents`

Ya no existe un POST REST de conversación en el frontend.

## Idea pedagógica

REST abre una petición, recibe una respuesta y termina.

Socket.IO mantiene un canal abierto. Sobre ese mismo canal pueden viajar muchos eventos durante la vida de la página.
