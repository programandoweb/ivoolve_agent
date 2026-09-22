# 2026-09-22 — Corrección de custom job IDs en BullMQ

## Hallazgo

La integración SIC ya alcanzaba correctamente el backend de Ivoolve Agent, pero el endpoint de ingreso respondía HTTP 500 al intentar encolar la campaña.

El runtime usa BullMQ 5.x. Los custom job IDs no deben contener el carácter `:`. El servicio generaba IDs como:

- `sic:<execution-id>`
- `provider:<provider-id>:<message-id>`

Esto puede hacer fallar `Queue.add()` con un error de validación del custom job ID.

## Corrección

Los IDs ahora usan guiones:

- `sic-<execution-id>`
- `provider-<provider-id>-<message-id>`

La semántica idempotente se conserva porque el identificador sigue siendo determinístico por ejecución/mensaje.

## Operación

Es necesario reconstruir y recrear el backend de Ivoolve Agent.

## QA

No se ejecutó el contenedor de producción desde esta sesión.
