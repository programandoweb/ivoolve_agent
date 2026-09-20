# Ivoolve Agent — Backend

Backend NestJS didáctico y multiagente de Ivoolve Agent.

## Componentes

- NestJS: API y orquestación.
- Jorge: agente principal y fallback.
- Redis: estado temporal.
- BullMQ: trabajos asíncronos.
- LLM adapter: compatible con LM Studio/OpenAI API.
- `agents/`: definiciones declarativas de agentes.
- `docs/`: arquitectura, aprendizaje, decisiones y progreso.

## Instalación

Ejecutar desde esta carpeta:

```powershell
Copy-Item .env.example .env
npm install
docker compose up -d redis
npm run start:dev
```

## Endpoints

```http
GET /health
GET /agents
POST /agents/chat
```

Ejemplo:

```json
{
  "sessionId": "clase-1",
  "message": "Hola Jorge, explícame cómo recuerdas esta conversación."
}
```

## Antes de modificar

Leer:

1. `Agent.md`
2. `docs/progress/`
3. `docs/decisions/`

Cada cambio relevante debe dejar registro documental.
