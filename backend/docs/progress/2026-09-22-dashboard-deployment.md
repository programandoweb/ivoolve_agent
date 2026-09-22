# 2026-09-22 — Despliegue desde el dashboard

## Objetivo
Permitir que un administrador despliegue Ivoolve Agent desde el dashboard sin depender de consola después de la activación inicial.

## Arquitectura
La UI usa un Route Handler autenticado que llama a un daemon mínimo del host por token. El daemon no acepta comandos arbitrarios; solamente consulta estado o ejecuta el `deploy.sh` fijo de Ivoolve Agent.

## Implementación
- `scripts/deploy/control_server.py`: control de estado/inicio y log del despliegue.
- `scripts/deploy/install-control.sh`: genera token, actualiza `.env` e instala `ivoolve-agent-deploy-control.service`.
- `deploy.sh`: instala/actualiza el control cuando se ejecuta manualmente y evita reiniciarlo cuando el propio daemon dispara un despliegue.
- Docker Compose entrega al frontend `DEPLOY_CONTROL_URL` y `DEPLOY_CONTROL_TOKEN`, y añade `host.docker.internal`.
- `/api/deployments`: BFF disponible solo para rol `admin`.
- `/dashboard/system`: botón **Desplegar**, estado, commit, duración, código de salida y log en vivo.
- Menú **Sistema** añadido al dashboard.

## Seguridad
El navegador nunca recibe el token. El BFF comprueba rol admin y same-origin. El daemon solo ejecuta el script versionado y usa comparación de token en tiempo constante.

## Persistencia
El estado operacional queda en `~/.local/state/ivoolve-agent-deploy/`. Los volúmenes MariaDB, Redis y runtime no se eliminan durante despliegues.

## Activación inicial
Ejecutar una vez:

```bash
cd /home/ubuntu/contenedores/ivoolve_agent
bash deploy.sh
```

Esa ejecución instala el daemon y reconstruye el frontend. A partir de ahí, usar **Sistema > Desplegar**.

## Pruebas realizadas
No se ejecutó el daemon/systemd ni el build directamente en el VPS desde esta sesión. La validación real queda para la primera activación controlada.

## Riesgos
El puerto 8766 escucha en el host para acceso desde el contenedor y está protegido por token. Mantener firewall del VPS cerrado para puertos no públicos.
