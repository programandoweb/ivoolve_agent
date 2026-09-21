# 07 — Directorio raíz explícito para Orchestrator

Fecha: 2026-09-20

## Objetivo

Eliminar la advertencia de TypeScript 6 sobre el directorio común de fuentes del proyecto Orchestrator.

## Cambio realizado

Se añadió `rootDir: "./src"` a `apps/orchestrator/tsconfig.app.json`.

El compilado continúa escribiéndose en `dist/apps/orchestrator` y conserva `main.js` en esa raíz, como requiere el script `npm start`.

Durante la validación se incorporaron las dependencias que usa el módulo de autenticación:

- `@nestjs/jwt`;
- `bcryptjs`;
- `@types/express` como dependencia de desarrollo.

## Pruebas ejecutadas

Se ejecutó `npm.cmd run build` para evitar que la política local de PowerShell bloquee `npm.ps1`.

La advertencia sobre `rootDir` no volvió a aparecer y el build de Orchestrator terminó correctamente.
