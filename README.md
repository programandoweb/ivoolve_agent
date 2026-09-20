# Ivoolve Agent

Monorepo didáctico para aprender a construir agentes de IA reales con NestJS.

El objetivo no es solamente que funcione: el código y la documentación están diseñados para estudiar cómo se mantiene estado, cómo se llama un LLM y cómo varios agentes podrán delegarse trabajo.

## Arquitectura inicial

```text
Usuario
   |
   v
NestJS / Orchestrator
   |
   v
Jorge
   |
   +----> Agent Registry
   +----> Redis (estado)
   +----> LLM (LM Studio compatible)
   +----> BullMQ (trabajos largos)
   |
   v
Respuesta
```

## Estructura

```text
ivoolve_agent/
├── apps/
│   └── orchestrator/
├── agents/
│   └── jorge/
│       ├── Agent.md
│       ├── Memory.md
│       └── Tools.md
├── docs/
│   ├── decisions/
│   ├── learning/
│   ├── progress/
│   └── setup/
├── scripts/
├── Agent.md
├── AGENTS.md
├── docker-compose.yml
└── package.json
```

## Jorge

Jorge es:

- agente principal;
- fallback;
- futuro orquestador;
- punto de entrada cuando no exista un especialista.

## Instalación

```powershell
git clone https://github.com/programandoweb/ivoolve_agent.git
cd ivoolve_agent
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
npm run start:dev
```

## Endpoints

### Estado

```http
GET /health
```

### Agentes registrados

```http
GET /agents
```

### Conversar

```http
POST /agents/chat
Content-Type: application/json

{
  "sessionId": "clase-1",
  "message": "Hola Jorge, explícame cómo recuerdas esta conversación."
}
```

## Sistema de trabajo

Antes de tocar código leer `Agent.md`.

Todo avance relevante debe registrarse en `docs/progress/`.
Toda decisión de arquitectura debe registrarse en `docs/decisions/`.

El repositorio debe poder explicar no solo **qué hace**, sino **por qué fue construido así**.
