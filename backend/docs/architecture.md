# Arquitectura actual

## Flujo conversacional

```text
Dashboard / Socket.IO
      |
      v
AgentRuntimeService
      |
      +--> Redis: sesión temporal
      |
      +--> AgentRegistry: identidad del agente
      |
      +--> ToolRegistry: tools ejecutables
      |
      +--> LLM: razonamiento
      |
      +--> Delegación opcional Jorge -> subagente
      |
      v
Respuesta
```

## Flujo multicanal asíncrono

```text
WhatsApp / futuro Slack / otro canal
      |
      v
Provider Adapter
      |
      v
NormalizedProviderMessage
      |
      v
BullMQ agent-jobs
      |
      v
ProviderMessageProcessor
      |
      v
ProviderRoutingService
      |
      +--> Redis claim: idempotencia
      |
      +--> Agent Registry: ACL + selección
      |
      +--> AgentRuntimeService
      |
      +--> Tool Registry
      |
      +--> LLM
      |
      v
ProvidersService.sendText()
      |
      v
Canal externo
```

Cada contacto mantiene una sesión independiente:

```text
provider:{providerId}:contact:{conversationId}
```

## Componentes

### NestJS

API, Socket.IO, orquestación, workers y adapters.

### Redis

Estado temporal, sesiones, idempotencia y backend de BullMQ.

### BullMQ

Recibe eventos de providers y los ejecuta con reintentos y backoff. Evita que el evento de Baileys quede bloqueado esperando al LLM.

### Agent Registry

Unifica agentes core y agentes gestionados creados desde el dashboard.

### Jorge

Agente principal y supervisor. Puede responder directamente o delegar en un subagente registrado mediante una instrucción estructurada.

### Tool Registry

Frontera de acciones reales. Actualmente:

- `provider.list`
- `provider.send_message`

La declaración de una tool dentro de un agente no concede permisos por sí misma: el runtime valida la ACL del provider.

### Providers

Dominio genérico de canales externos. El primer adapter es `whatsapp_baileys`. El contrato está pensado para incorporar Slack, Telegram, email u otros medios sin modificar el runtime de agentes.

### Observabilidad

Las ejecuciones del MVP se guardan como JSONL bajo `RUNTIME_DATA_PATH` y se consultan desde `/runtime/executions`. El dashboard también consulta estadísticas de BullMQ.

## Persistencia

- Redis: temporal/coordinación.
- `data/managed-agents`: agentes gestionados.
- `data/providers`: metadatos y credenciales de canales.
- `data/runtime`: trazas operativas.

En producción estos directorios deben estar en volumen persistente. Para alta disponibilidad/múltiples instancias, la siguiente evolución es mover metadatos y trazas a una base de datos compartida manteniendo fuera del repositorio las credenciales sensibles.
