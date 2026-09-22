# 2026-09-22 — Despliegue automático desde consola

## Objetivo
Permitir desplegar Ivoolve Agent desde el VPS con un único comando, incluyendo actualización del repositorio, build Docker, actualización automática del esquema durable y health checks.

## Implementación
- Nuevo `deploy.sh` en la raíz.
- Nuevo `scripts/deploy/production.sh`.
- El wrapper sincroniza `origin/main` y ejecuta la versión recién descargada del script de producción.
- Se valida Docker Compose, acceso al daemon, `.env`, puertos y `DATABASE_AUTO_MIGRATE=true`.
- MariaDB y Redis se levantan primero y se espera su estado saludable.
- Backend y frontend se construyen con `--pull`.
- Si en el futuro existe un script `npm migrate`, se detecta y ejecuta automáticamente antes del arranque del backend.
- Con la arquitectura actual, el esquema durable se actualiza al iniciar NestJS mediante `DatabaseService` y `DATABASE_AUTO_MIGRATE=true`.
- Backend y frontend se recrean sin borrar volúmenes persistentes.
- Se validan `GET /health` y la página `/login`.
- En caso de error se imprimen `docker compose ps` y logs recientes de backend/frontend.

## Uso
```bash
cd /home/ubuntu/contenedores/ivoolve_agent
bash deploy.sh
```

## Persistencia
Los volúmenes `ivoolve_agent_mariadb`, `ivoolve_agent_redis` e `ivoolve_agent_data` no se eliminan durante el despliegue.

## Seguridad
El script reutiliza `.env`, no imprime secretos y no ejecuta `docker compose down -v`.

## Pruebas realmente ejecutadas
No se ejecutó el script directamente sobre el VPS desde esta sesión. El cambio queda sujeto al CI y a la primera ejecución manual controlada.

## Riesgos
`git reset --hard origin/main` elimina cambios locales de código no versionados dentro del repositorio de producción. Los archivos ignorados como `.env` y los volúmenes Docker no se ven afectados.
