# 08 — Conversational Agent Builder

## Objetivo

Permitir crear agentes desde el dashboard conversando con Jorge.

## Implementado

- skill `agent-builder` documentado dentro de Jorge;
- `AgentDraft` estructurado con identidad, objetivo, responsabilidades, skills, tools, memoria, ejecución, aprobaciones y criterios de finalización;
- extracción estructurada mediante el LLM configurado;
- entrevista por criterios faltantes;
- borrador temporal en Redis;
- confirmación explícita antes de publicar;
- almacenamiento durable en `data/managed-agents/*.json`;
- carga unificada de agentes core y managed;
- recarga inmediata del registry tras crear;
- canal Socket.IO dedicado `agent-builder:*`;
- comentarios pedagógicos en las piezas críticas.

## Decisión de persistencia

Los agentes core continúan versionados en `backend/agents/*`.
Los agentes creados desde UI se almacenan fuera del código fuente en JSON durable.

Redis solo conserva el estado temporal de la entrevista.

Esta separación evita que una acción de usuario escriba sobre archivos fuente del repositorio y mantiene coherencia con la regla existente de Redis como estado temporal.
