# 07 — Conversational Agent Builder UI

## Implementado

- botón `Crear agente` en `/dashboard/agents`;
- nueva ruta `/dashboard/agents/create`;
- reutilización de `AgentChat` con modo `builder`;
- misma experiencia del chat existente:
  - Socket.IO;
  - auto-scroll;
  - Enter para enviar;
  - Shift+Enter para nueva línea;
  - indicador de procesamiento;
- sesión independiente para no mezclar el chat normal con la creación;
- cards de agentes muestran origen core/managed y metadatos disponibles.
