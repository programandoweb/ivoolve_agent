# 03 — Puertos estándar y launcher de Windows

Fecha: 2026-09-20

## Objetivo

Estandarizar los puertos locales del monorepo y permitir iniciar el entorno completo desde Windows con un solo archivo BAT.

## Cambios

- NestJS cambia de 4000 a 5020.
- `backend/.env.example` usa `PORT=5020`.
- El fallback de `main.ts` pasa a 5020.
- Se crea `/iniciar.bat` en la raíz del repositorio.
- El BAT inicia Redis y luego abre backend y frontend en consolas separadas.

## Ruta esperada

```text
D:\ivoolve_agent
```

## Comando

```bat
iniciar.bat
```

## Pruebas ejecutadas

No se ejecutó el BAT físicamente en Windows desde el conector GitHub.

## Resultado esperado

- Redis: 6379.
- NestJS: 5020.
- Next.js: 5021.

## Riesgos

Docker Desktop y las dependencias npm deben estar instalados previamente.
