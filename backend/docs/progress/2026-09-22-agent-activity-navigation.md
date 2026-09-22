# 2026-09-22 — Navegación y trazabilidad visible por agente

## Objetivo
Permitir que un operador entre a un agente desde el listado y vea inmediatamente qué ejecuciones está recibiendo, qué etapa está procesando y el detalle durable de cada ejecución.

## Cambios
- Las tarjetas de `/dashboard/agents` ahora son navegables al detalle del agente.
- Cada tarjeta muestra la última ejecución conocida y si está ejecutando.
- El detalle del agente conserva la tabla de actividad reciente y se actualiza automáticamente cada 4 segundos.
- La vista general `/dashboard/runtime` se presenta en navegación como **Ejecuciones** y se actualiza automáticamente.
- El detalle `/dashboard/runtime/{executionId}` se actualiza cada 3 segundos para mostrar nuevos eventos LLM/tools/errores mientras la ejecución está viva.
- El ingreso SIC ya crea la traza antes de encolar el job, por lo que una petición aceptada por Ivoolve Agent debe aparecer inmediatamente.

## Lectura operacional
- Si SIC muestra `queued` pero Agent no contiene el mismo execution ID, la petición todavía no llegó a Agent.
- Si Agent contiene el execution ID y etapa `queue.enqueued`, Agent la recibió y BullMQ la aceptó.
- Desde `worker.started` en adelante se puede seguir el trabajo real del agente.

## Pruebas
No se ejecutó el despliegue de producción desde esta sesión. Los cambios quedan sujetos al build/CI y a validación en VPS.
