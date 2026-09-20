# 02 — Puerto estándar del frontend

Fecha: 2026-09-20

## Objetivo

Fijar Next.js en el puerto 5021 y alinear el BFF con NestJS en 5020.

## Cambios

- `npm run dev` ejecuta `next dev -p 5021`.
- `npm run start` ejecuta `next start -p 5021`.
- `BACKEND_URL` pasa a `http://localhost:5020`.
- El launcher raíz `iniciar.bat` inicia el frontend en 5021.

## Pruebas ejecutadas

No se ejecutó el frontend localmente desde el conector GitHub.

## Resultado esperado

Frontend disponible en:

```text
http://localhost:5021
```
