# 2026-09-22 — Agent detail en dos columnas

## Cambio
La vista de detalle de agente fue reorganizada para escritorio en dos columnas:
- chat del agente a la izquierda;
- actividad reciente a la derecha.

## UX
- El chat usa una altura contenida por el viewport y su historial hace scroll interno.
- La tabla de actividad hace scroll interno independiente.
- En pantallas pequeñas la vista vuelve a una sola columna.
- El encabezado de actividad permanece visible al desplazarse por la tabla.

## Implementación
`AgentChat` incorpora la opción `contained` para poder ocupar la altura del contenedor sin forzar la altura fija histórica de 500 px.

## Pruebas
No se ejecutó build ni QA visual desde esta sesión.
