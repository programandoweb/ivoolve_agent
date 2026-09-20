# 01 — Foundation multiagente

Fecha: 2026-09-20

## Objetivo

Crear desde cero una base didáctica para aprender agentes de IA y evolucionarla a un runtime multiagente.

## Contexto

El repositorio estaba vacío.

Se requiere NestJS, Redis, múltiples carpetas de agentes, Jorge como fallback/orquestador y código ampliamente comentado.

## Decisiones

- Monorepo NestJS.
- Redis para estado temporal.
- BullMQ preparado para trabajos largos.
- Definiciones declarativas en `agents/`.
- LLM desacoplado mediante adapter compatible con OpenAI/LM Studio.
- Sistema documental equivalente al enfoque usado en ivoolveERP.

## Alcance

Se creó la infraestructura inicial, el runtime síncrono, registro dinámico de agentes y documentación pedagógica.

## Archivos afectados

Ver commit de esta fase. Incluye raíz, `apps/orchestrator`, `agents/jorge`, `docs` y scripts.

## Cambios realizados

- API NestJS.
- healthcheck.
- conexión Redis.
- sesiones persistidas en Redis con TTL.
- registro dinámico.
- Jorge.
- adapter LLM.
- BullMQ configurado.
- Docker Compose Redis.
- instalación Windows.
- metodología documental.

## Pruebas ejecutadas

No se ejecutaron pruebas locales desde el conector remoto de GitHub.

La validación de compilación debe realizarse después de clonar/actualizar el repositorio y ejecutar `npm install`.

## Resultado

Base funcional escrita y preparada para instalación.

## Riesgos

- El modelo configurado en LM Studio debe existir.
- Redis debe estar iniciado.
- Falta todavía routing real hacia un segundo agente.

## Fuera de alcance

- memoria vectorial;
- base durable;
- tools reales externas;
- websocket;
- frontend;
- segundo agente.

## Pendientes

1. instalar dependencias localmente;
2. ejecutar build;
3. iniciar Redis;
4. probar conversación con Jorge;
5. crear segundo agente;
6. implementar delegación.

## Siguiente paso

Validar el ciclo completo con Jorge y luego crear Pedro como primer subagente para estudiar delegación.
