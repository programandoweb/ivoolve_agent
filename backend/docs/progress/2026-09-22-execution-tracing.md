# 2026-09-22 — Trazabilidad durable de ejecuciones

## Objetivo
Registrar de forma durable y consultable cada ejecución de agentes, especialmente campañas recibidas desde Ivoolve SIC.

## Implementación
- `runtime_executions` conserva estado, agente, fuente, correlation ID, campaign ID y etapa actual.
- `runtime_execution_events` conserva la línea de tiempo completa.
- `ExecutionTraceService` registra inicio, eventos y finalización sin bloquear la ejecución si falla la observabilidad.
- Las campañas SIC registran ingreso HTTP, BullMQ, inicio del worker, LLM, respuestas, tools, argumentos, resultados, persistencia y errores.
- Los fallos se relanzan después de notificarse para que BullMQ conserve el estado real del job.
- Los eventos también se reflejan hacia SIC usando el mismo execution/correlation ID.

## API
- `GET /runtime/executions?limit=100&agentId=...`
- `GET /runtime/executions/:id`

## Persistencia
MariaDB es la persistencia durable. El auto-migrate del backend crea la tabla de eventos y agrega las columnas de correlación requeridas a instalaciones existentes.

## Seguridad
No se registran tokens de configuración. La trazabilidad sí conserva prompts, respuestas y argumentos de tools para diagnóstico operativo.

## Pruebas
No se ejecutaron pruebas locales desde esta sesión; los cambios se validan adicionalmente mediante CI del repositorio.

## Riesgos
El nivel de detalle incrementa el volumen de MariaDB. Debe definirse política de retención cuando el volumen real de ejecuciones lo justifique.
