# ADR-005 — Seguridad del dashboard administrativo

Fecha: 2026-09-20

Estado: aceptada.

## Decisión

El dashboard se protege con:

- usuario administrador configurado por entorno;
- contraseña almacenada solo como hash bcrypt;
- JWT firmado por NestJS;
- cookie HttpOnly creada por Next.js;
- REST de agentes protegido mediante Bearer;
- Socket.IO autenticado durante el handshake.

## Límites de esta fase

Se implementa un único administrador bootstrap.

Cuando el sistema requiera múltiples usuarios, roles, auditoría avanzada o recuperación de contraseña, se incorporará una base de datos durable.

## Principio

Nunca versionar:

- contraseñas;
- hashes reales de producción;
- JWT_SECRET.
