# 07 — Corrección de scripts y dependencias de autenticación

Fecha: 2026-09-20

## Problema

El script físico `scripts/hash-password.mjs` existía, pero `package.json` no declaraba `auth:hash`.
También faltaban las dependencias `@nestjs/jwt` y `bcryptjs` requeridas por el dashboard seguro.

## Corrección

Se agregan:

- `auth:hash`;
- `auth:secret`;
- `@nestjs/jwt`;
- `bcryptjs`.

## Acción local requerida

Después de `git pull`, ejecutar:

```powershell
cd D:\ivoolve_agent\backend
npm install
npm run auth:hash -- "TuClaveSegura"
npm run auth:secret
```
