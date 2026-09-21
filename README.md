# Ivoolve Agent

Monorepo para construir, gestionar y ejecutar agentes de IA con canales externos.

## Stack

- NestJS + Socket.IO: 5020
- Next.js: 5021
- Redis: 6379
- BullMQ: trabajos asíncronos
- LM Studio / API compatible OpenAI
- WhatsApp: Baileys

## Capacidades actuales

- dashboard seguro;
- chat en tiempo real;
- Agent Builder conversacional;
- agentes core y gestionados;
- delegación Jorge → subagentes;
- Tool Registry ejecutable;
- providers multicanal con adapter WhatsApp/Baileys;
- múltiples números WhatsApp independientes;
- QR, reconexión y ACL por agente;
- routing Provider → BullMQ → Agente → Provider;
- sesión independiente por contacto;
- idempotencia de mensajes;
- observabilidad de ejecuciones y colas;
- tests backend dentro de GitHub Actions.

## Dashboard

- `/dashboard` — resumen;
- `/dashboard/agents` — agentes;
- `/dashboard/agents/create` — Agent Builder;
- `/dashboard/providers` — canales/providers;
- `/dashboard/chat` — conversación;
- `/dashboard/runtime` — jobs, infraestructura y ejecuciones;
- `/dashboard/security` — seguridad.

## Inicio local

```powershell
cd D:\ivoolve_agent\backend
npm install
docker compose up -d redis
```

Genera las credenciales administrativas:

```powershell
npm run auth:hash -- "TuClaveSegura"
npm run auth:secret
```

Configura `backend/.env` y luego:

```bat
D:\ivoolve_agent\iniciar.bat
```

Abre:

```text
http://localhost:5021
```

## Persistencia

Redis se usa para coordinación y estado temporal. Los datos de runtime del MVP se almacenan fuera de Git:

- `backend/data/managed-agents/`
- `backend/data/providers/`
- `backend/data/runtime/`

En producción deben montarse sobre almacenamiento persistente.

## Arquitectura multicanal

```text
WhatsApp / futuro Slack
        ↓
     Provider
        ↓
      BullMQ
        ↓
 Provider Router
        ↓
      Agente
    ↙       ↘
  LLM      Tools
        ↓
     Provider
        ↓
      Usuario
```

La arquitectura detallada está en `backend/docs/architecture.md`.
