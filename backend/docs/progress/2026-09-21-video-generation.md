# Generación local de video — 2026-09-21

## Objetivo

Integrar Ivoolve Agent con un worker Python local capaz de generar videos de hasta cinco segundos usando GPU Intel XPU.

## Decisiones

- El backend NestJS sigue siendo orquestador, no host de modelos de video.
- El worker vive en `programandoweb/ivoolve_video_generator_py`.
- Contrato HTTP privado autenticado por token.
- Puerto estándar del worker: `8650`.
- Backend inicial: PyTorch XPU + Diffusers + Wan 2.1 T2V 1.3B.
- Jobs asíncronos y un solo trabajo GPU concurrente.
- No usar CUDA ni IPEX.

## Archivos afectados

- `apps/orchestrator/src/tools/video-generator.service.ts`
- `apps/orchestrator/src/tools/video-generator.service.spec.ts`
- `apps/orchestrator/src/tools/tool-registry.service.ts`
- `apps/orchestrator/src/tools/tool-registry.service.spec.ts`
- `apps/orchestrator/src/tools/tools.module.ts`
- `.env.example`
- documentación de arquitectura y README.

## Tools

- `video.capabilities`
- `video.generate`
- `video.status`

## Seguridad

El token del worker nunca debe salir del backend. El puerto 8650 debe publicarse sólo por red privada/VPN.

## Validación

Se agregaron pruebas unitarias para el cliente HTTP y el Tool Registry. La inferencia GPU real debe validarse físicamente en el PC Intel porque GitHub Actions no dispone de esa GPU.

## Siguiente paso

Instalar `ivoolve_video_generator_py` en Windows, validar `torch.xpu.is_available()`, registrar NSSM y ejecutar el primer job real de cinco segundos.
