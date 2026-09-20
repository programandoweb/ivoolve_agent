# ADR-003 — Separación backend/frontend en la raíz

Fecha: 2026-09-20

Estado: aceptada.

## Contexto

El repositorio inició con NestJS y toda su infraestructura directamente en la raíz.

Se incorporará un frontend Next.js independiente.

## Decisión

Mover toda la implementación actual a `backend/`.

La raíz se convierte en contenedor del monorepo:

```text
backend/
frontend/
```

La carpeta `.github/` permanece en la raíz porque GitHub Actions descubre workflows únicamente desde esa ubicación.

Los archivos globales `README.md`, `Agent.md`, `AGENTS.md` y `.gitignore` permanecen en la raíz como documentación y configuración transversal.

## Consecuencias

- NestJS y Next.js podrán tener dependencias independientes.
- Cada servicio tendrá su propio entorno.
- Los comandos del backend deben ejecutarse desde `backend/`.
- La CI debe usar `backend` como working directory.
- La documentación técnica específica del runtime permanece junto al backend.
