# Ivoolve Agent

Monorepo para construir y estudiar un ecosistema de agentes de IA.

## Servicios

| Servicio | Puerto |
| --- | ---: |
| NestJS + Socket.IO | 5020 |
| Next.js | 5021 |
| Redis | 6379 |
| LM Studio | 1234 |

## Conversación

```text
Next.js :5021
    |
    | Socket.IO /agents
    v
NestJS :5020
    |
    +--> Jorge
    +--> Redis
    +--> LLM
```

La conversación ya no utiliza POST REST. HTTP permanece para health y consultas auxiliares.

## Inicio en Windows

```bat
D:
cd D:\ivoolve_agent
iniciar.bat
```

El script inicia Redis, backend y frontend.

## Sistema documental

- Backend: `backend/docs/`
- Frontend: `frontend/docs/`

Toda decisión y avance relevante debe quedar versionado.
