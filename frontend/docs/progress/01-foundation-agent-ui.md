# 01 — Foundation UI para Jorge

Fecha: 2026-09-20

## Objetivo

Crear un frontend Next.js básico para interactuar con el backend NestJS y visualizar el funcionamiento inicial de Jorge.

## Referencia visual

Se tomó como referencia general la composición visual de Aleluya: hero amplio, jerarquía tipográfica fuerte, acento violeta, superficies blancas y cards flotantes.

No se copiaron logos, activos ni contenido comercial.

## Alcance

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- landing inicial.
- panel de chat con Jorge.
- health del backend.
- listado de agentes.
- sessionId persistido en localStorage.
- BFF hacia NestJS.
- documentación propia.

## Integración

El frontend consume:

- `GET /health`;
- `GET /agents`;
- `POST /agents/chat`.

## Pruebas ejecutadas

No se ejecutó build local desde el conector GitHub.

La CI fue ampliada para instalar y compilar el frontend.

## Resultado

Base lista para ejecutar localmente en puerto 3000 mientras NestJS trabaja en 4000.

## Pendientes

1. validar CI;
2. probar conversación end-to-end con LM Studio y Redis;
3. agregar streaming;
4. mostrar trazas del ciclo del agente;
5. crear segundo agente y visualizar delegación.
