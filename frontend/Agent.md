# Agent.md — Metodología del frontend

## Propósito

El frontend de Ivoolve Agent existe para visualizar, probar y comprender el runtime multiagente.

## Stack

- Next.js App Router.
- TypeScript estricto.
- Tailwind CSS.
- Route Handlers como BFF hacia NestJS.

## Reglas

1. El navegador no debe conocer URLs privadas del backend.
2. Las llamadas a NestJS pasan por `src/app/api/backend/`.
3. `BACKEND_URL` es server-only.
4. La UI debe permanecer simple, didáctica y responsive.
5. No duplicar reglas de agentes en el frontend.
6. El estado canónico de sesión permanece en Redis/backend.
7. El frontend puede guardar únicamente identificadores locales auxiliares, como `sessionId`.
8. Cada avance relevante se documenta en `docs/progress/`.
9. Toda decisión arquitectónica se registra en `docs/decisions/`.
10. No afirmar builds o pruebas no ejecutadas.

## Diseño

Inspiración general:

- layouts espaciosos;
- tipografía fuerte;
- acento violeta;
- fondos suaves;
- cards grandes;
- jerarquía muy clara.

No copiar branding, textos, logos ni activos de terceros.
