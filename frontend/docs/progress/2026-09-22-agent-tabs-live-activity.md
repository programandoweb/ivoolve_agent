# 2026-09-22 — Tabs de agente con actividad en vivo

## Cambio

El detalle de cada agente ahora se organiza en tres tabs:

1. **Chat**: conversación persistente del agente.
2. **Actividad en vivo**: muestra la ejecución más reciente/activa y su timeline de eventos con refresco cada 2 segundos.
3. **Historial**: conserva la tabla de ejecuciones recientes que antes estaba visible junto al chat.

## Actividad en vivo

La vista usa la trazabilidad durable existente en `runtime_execution_events` y traduce estados técnicos a mensajes operativos más legibles, por ejemplo:

- pensando con el LLM;
- solicitando una herramienta;
- herramienta completada o fallida;
- delegación/enrutamiento;
- persistencia de prospectos en SIC.

Cada evento conserva acceso al detalle técnico JSON y a la trazabilidad completa de la ejecución.

## UX

- Los tabs se representan en la URL mediante `?tab=activity` y `?tab=history`.
- Chat y paneles mantienen alto fijo con scroll interno.
- Actividad en vivo usa una apariencia tipo consola para distinguir claramente observabilidad de conversación.
- Se reutiliza `AutoRefresh` para polling sin crear un segundo canal Socket.IO de observabilidad.

## QA

No se ejecutó build ni QA visual desde esta sesión.
