# 2026-09-22 — UI de trazabilidad de ejecuciones

## Objetivo
Permitir inspeccionar qué hizo un agente, en qué etapa está y por qué falló.

## Implementación
- `/dashboard/runtime` enlaza cada ejecución.
- `/dashboard/runtime/[id]` muestra estado, correlación, error, payloads y línea de tiempo completa.
- `/dashboard/agents/[id]` muestra las ejecuciones recientes del agente y enlaza a su trazabilidad.

## Pruebas
No se ejecutaron pruebas locales desde esta sesión; los cambios se validan adicionalmente mediante CI del repositorio.
