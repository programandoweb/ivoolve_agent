# 06 — Dashboard administrativo seguro

Fecha: 2026-09-20

## Objetivo

Incorporar autenticación real y proteger la gestión de agentes.

## Backend

- AuthModule.
- login con bcrypt.
- JWT.
- guard para REST.
- autenticación del handshake Socket.IO.
- script para generar hash de contraseña.

## Frontend

- /login.
- /dashboard.
- secciones agentes, chat, runtime y seguridad.
- cookie HttpOnly.
- logout.
- middleware de navegación.
- validación real de sesión desde NestJS en el layout.

## Pruebas

No se ejecutó el stack local desde el conector GitHub.
