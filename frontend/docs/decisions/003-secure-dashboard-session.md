# ADR-003 — Sesión administrativa en Next.js

Fecha: 2026-09-20

Estado: aceptada.

Next.js recibe el JWT desde NestJS y lo almacena en una cookie HttpOnly.

El navegador no accede al token desde JavaScript.

Los Route Handlers leen la cookie server-side y agregan Bearer al backend.

Socket.IO utiliza la misma cookie durante el handshake.

El middleware mejora UX, mientras que la validación real se realiza contra /auth/me en NestJS.
