# 02 — Mover runtime a backend

Fecha: 2026-09-20

## Objetivo

Preparar el repositorio para incorporar un frontend Next.js al mismo nivel que el backend.

## Contexto

La primera fase dejó NestJS, agentes, Redis, BullMQ, scripts y documentación directamente en la raíz.

## Decisión

Mover toda la implementación específica del runtime a `backend/` y reservar la raíz como contenedor del monorepo.

## Alcance

Movido a `backend/`:

- `.env.example`;
- `apps/`;
- `agents/`;
- `docs/`;
- `scripts/`;
- `package.json`;
- `nest-cli.json`;
- `tsconfig.json`;
- `docker-compose.yml`.

Se conservaron en raíz por ser transversales o requeridos por GitHub:

- `.github/`;
- `.gitignore`;
- `README.md`;
- `Agent.md`;
- `AGENTS.md`.

## Correcciones

- CI configurada con `working-directory: backend`.
- README raíz actualizado.
- metodología global actualizada.
- decisión ADR-003 agregada.

## Pruebas ejecutadas

No se ejecutó build local desde el conector GitHub.

La CI queda encargada de instalar dependencias y compilar desde `backend/`.

## Resultado

La estructura queda preparada para crear posteriormente:

```text
frontend/
```

sin mezclar dependencias ni configuración con NestJS.

## Riesgos

Cualquier entorno local que ya hubiese clonado la estructura anterior deberá ejecutar `git pull` y luego trabajar desde `backend/`.

## Pendientes

1. validar CI;
2. probar backend localmente;
3. crear frontend Next.js en fase posterior.
