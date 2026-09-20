# Arquitectura actual

## Flujo síncrono básico

```text
Usuario
  |
  v
POST /agents/chat
  |
  v
AgentsController
  |
  v
AgentRuntimeService
  |
  +--> Redis: recuperar sesión
  |
  +--> AgentRegistry: cargar Jorge
  |
  +--> LLM: generar respuesta
  |
  +--> Redis: guardar sesión
  |
  v
Respuesta HTTP
```

La petición termina, pero el estado queda en Redis.

## Flujo asíncrono futuro

```text
Jorge
  |
  v
BullMQ -> Redis -> Worker -> Resultado
```

Esto permitirá que una tarea continúe incluso cuando la petición HTTP original ya terminó.

## Componentes

### NestJS

Es el proceso servidor que recibe peticiones y ejecuta el runtime.

### Redis

Guarda estado temporal y sirve como infraestructura de coordinación.

### BullMQ

Modela trabajo pendiente/reintentable.

### Agents folder

Contiene identidad declarativa y memoria base de cada agente.

### LLM Adapter

Es la frontera hacia LM Studio u otro proveedor compatible.
