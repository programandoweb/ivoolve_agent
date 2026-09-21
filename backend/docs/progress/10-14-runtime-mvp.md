# Fases 10–14 — Runtime multicanal MVP

## Fase 10 — Routing Provider ↔ Agente

Completado:

- normalización de mensajes entrantes;
- sesión independiente por contacto;
- selección directa cuando existe un único agente autorizado;
- selección supervisada cuando existen varios;
- respuesta por el mismo provider;
- idempotencia Redis por `providerId + messageId`;
- prevención de mensajes propios mediante `fromMe`.

## Fase 11 — Delegación Jorge → subagentes

Completado:

- Jorge conoce el catálogo de agentes registrado;
- protocolo estructurado de delegación;
- validación de que el agente exista;
- prohibición de autodelegación;
- ejecución del subagente en sesión hija aislada;
- respuesta del subagente devuelta como resultado final.

## Fase 12 — Tools ejecutables + BullMQ

Completado:

- `ToolRegistryService`;
- `provider.list`;
- `provider.send_message`;
- ACL por `agentId`;
- protocolo JSON de tool calls;
- máximo de tres iteraciones de tools por turno;
- cola `agent-jobs`;
- bridge Provider → BullMQ;
- worker con concurrencia 5;
- 3 intentos y backoff exponencial;
- endpoint de estadísticas de cola.

## Fase 13 — Persistencia y observabilidad MVP

Completado:

- trazas JSONL configurables mediante `RUNTIME_DATA_PATH`;
- estado, agente, provider, input/output preview, duración y error;
- endpoint protegido `GET /runtime/executions`;
- dashboard Runtime con infraestructura, cola y ejecuciones;
- datos de runtime excluidos de Git.

Pendiente para alta disponibilidad:

- migrar metadatos/trazas a MariaDB/PostgreSQL;
- locking distribuido por provider para múltiples réplicas;
- almacenamiento centralizado de auditoría.

## Fase 14 — Calidad y CI

Completado:

- Jest + ts-jest;
- test de ACL/listado/envío de tools;
- test de routing e idempotencia;
- test de delegación Jorge → subagente;
- mock aislado de Baileys ESM;
- GitHub Actions ejecuta tests antes del build backend;
- frontend y backend se siguen compilando en CI.

## Resultado funcional

El flujo objetivo del MVP queda implementado:

```text
persona
  -> WhatsApp/Baileys
  -> BullMQ
  -> router
  -> agente autorizado
  -> LLM / tools / delegación
  -> provider
  -> persona
```

## Siguiente horizonte

Lo siguiente ya no es necesario para demostrar el MVP, sino para convertirlo en plataforma productiva:

1. base de datos compartida;
2. usuarios, roles y tenants;
3. approvals humanos para acciones sensibles;
4. nuevos adapters (Slack/Telegram/email);
5. métricas centralizadas y alertas;
6. despliegue multi-instancia con ownership/locking de conexiones;
7. E2E real contra un número sandbox/controlado.
