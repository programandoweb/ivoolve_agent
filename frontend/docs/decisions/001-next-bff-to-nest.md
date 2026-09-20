# ADR-001 — Next.js BFF hacia NestJS

Fecha: 2026-09-20

Estado: aceptada.

## Contexto

El frontend debe interactuar con el runtime NestJS sin exponer detalles internos ni configurar CORS para cada entorno.

## Decisión

Usar Route Handlers de Next.js como BFF:

- `/api/backend/health`
- `/api/backend/agents`
- `/api/backend/chat`

Estos endpoints llaman a NestJS usando `BACKEND_URL` del servidor.

## Consecuencias

La UI queda desacoplada de la ubicación física del backend y se facilita autenticación futura.
