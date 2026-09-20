# Ivoolve Agent

Monorepo didáctico para aprender a construir agentes de IA con NestJS.

> Objetivo: que el código se pueda estudiar paso a paso. Por eso los archivos TypeScript incluyen comentarios que explican la responsabilidad de cada bloque y el flujo de ejecución.

## Idea principal

Un agente **no está vivo dentro de una petición HTTP**. Cada petición ejecuta un ciclo corto:

```text
Usuario
   |
   v
NestJS API
   |
   v
Jorge (orquestador / fallback)
   |
   +----> Redis: recupera estado y memoria de ejecución
   |
   +----> Registry: descubre agentes disponibles
   |
   +----> Router: decide quién debe resolver la tarea
   |
   +----> Agente especializado (cuando exista)
   |
   v
Redis: persiste el nuevo estado
   |
   v
Respuesta
```

Redis es el lugar donde guardamos el estado operativo entre una petición y la siguiente. Los archivos Markdown de cada agente describen identidad, reglas, memoria base y herramientas.

## Estructura

```text
ivoolve_agent/
├─ apps/
│  └─ orchestrator/        # API NestJS y runtime multiagente
├─ agents/
│  └─ jorge/               # Primer agente: orquestador y fallback
│     ├─ Agent.md
│     ├─ Memory.md
│     └─ Tools.md
├─ docs/
│  ├─ 01-como-funciona-un-agente.md
│  ├─ 02-redis-y-el-estado.md
│  └─ 03-crear-un-nuevo-agente.md
├─ docker-compose.yml
├─ .env.example
├─ nest-cli.json
├─ package.json
└─ tsconfig.json
```

## Requisitos

- Node.js 22+
- npm 10+
- Docker Desktop o Redis local

## Inicio rápido

```bash
copy .env.example .env
npm install
docker compose up -d redis
npm run start:dev
```

API: `http://localhost:4000`

### Probar salud

```bash
curl http://localhost:4000/health
```

### Hablar con Jorge

```bash
curl -X POST http://localhost:4000/agents/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"sessionId\":\"jorge-clase-1\",\"message\":\"Explícame qué agentes tienes disponibles\"}"
```

## Principio de diseño

Cada nuevo agente vive en su propia carpeta:

```text
agents/pedro/
├─ Agent.md
├─ Memory.md
└─ Tools.md
```

El runtime descubre automáticamente las carpetas de `agents/`. No se debe crear un `switch` gigante por agente.

## Primer objetivo de aprendizaje

1. Entender la diferencia entre API, agente y estado.
2. Entender por qué Redis permite continuar una conversación.
3. Ver cómo Jorge consulta el registro de agentes.
4. Agregar luego un agente `Pedro` y permitir que Jorge delegue tareas.
5. Después incorporar herramientas reales, colas BullMQ y proveedores LLM adicionales.

## Estado actual

Esta primera base deja preparada la arquitectura multiagente, persistencia de sesión en Redis, proveedor LLM compatible con OpenAI/LM Studio, registro dinámico de agentes, documentación didáctica y Docker para Redis.
