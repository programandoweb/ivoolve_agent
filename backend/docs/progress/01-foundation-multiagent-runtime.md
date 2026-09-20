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
- CI automática para validar instalación y compilación en cada push.

## Alcance

Se creó la infraestructura inicial, el runtime síncrono, registro dinámico de agentes y documentación pedagógica.

## Archivos afectados

Incluye raíz, `apps/orchestrator`, `agents/jorge`, `docs`, scripts y workflow de CI.

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
- CI de instalación y compilación.

## Pruebas ejecutadas

Se intentó clonar el repositorio desde un entorno de ejecución aislado para ejecutar `npm install` y `npm run build`.

La prueba no pudo comenzar porque ese entorno no pudo resolver `github.com` por DNS.

Por lo tanto, no se afirma que el build haya pasado localmente.

Se agregó GitHub Actions para ejecutar automáticamente:

1. `npm install`;
2. `npm run build`.

## Resultado

Base escrita, publicada en `main` y preparada para instalación y validación automática.

## Riesgos

- El modelo configurado en LM Studio debe existir.
- Redis debe estar iniciado para ejecutar el runtime.
- Falta todavía routing real hacia un segundo agente.
- Hasta que CI o el entorno local ejecuten el build, pueden existir errores de compilación no detectados.

## Fuera de alcance

- memoria vectorial;
- base durable;
- tools externas reales;
- websocket;
- frontend;
- segundo agente.

## Pendientes

1. revisar resultado de CI;
2. iniciar Redis;
3. probar conversación con Jorge;
4. crear segundo agente;
5. implementar delegación.

## Siguiente paso

Validar el ciclo completo con Jorge y luego crear Pedro como primer subagente para estudiar delegación.
