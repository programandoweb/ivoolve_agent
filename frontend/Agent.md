# Agent.md — Metodología del frontend

## Propósito

El frontend de Ivoolve Agent existe para visualizar, probar y comprender el runtime multiagente.

## Stack

- Next.js App Router.
- TypeScript estricto.
- Tailwind CSS.
- Socket.IO Client para conversación persistente.
- Route Handlers únicamente para consultas HTTP auxiliares.

## Reglas

1. La conversación con agentes ocurre por Socket.IO.
2. No reintroducir POST REST para mensajes salvo decisión documentada.
3. Health y catálogo de agentes pueden continuar por HTTP.
4. `NEXT_PUBLIC_SOCKET_URL` es necesariamente pública porque el socket lo abre el navegador.
5. La UI debe permanecer simple, didáctica y responsive.
6. No duplicar reglas de agentes en el frontend.
7. El estado canónico de sesión permanece en Redis/backend.
8. El frontend puede guardar identificadores auxiliares como `sessionId`.
9. Cada avance relevante se documenta en `docs/progress/`.
10. Toda decisión arquitectónica se registra en `docs/decisions/`.
11. No afirmar builds o pruebas no ejecutadas.

## Diseño

- layouts espaciosos;
- tipografía fuerte;
- acento violeta;
- fondos suaves;
- cards grandes;
- jerarquía clara.

No copiar branding, textos, logos ni activos de terceros.
