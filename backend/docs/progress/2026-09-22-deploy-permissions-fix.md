# 2026-09-22 — Corrección de permisos en despliegue

## Hallazgo
La primera activación del control web podía fallar cuando `.env` pertenecía a root y el usuario `ubuntu` no tenía permiso de escritura. Además, una ejecución accidental con `sudo bash deploy.sh` podía dejar el lock global de `/tmp` propiedad de root y bloquear ejecuciones posteriores del usuario normal.

## Corrección
- `scripts/deploy/install-control.sh` modifica `.env` mediante `sudo python3` y `sudo tee`, conservando el archivo existente y evitando exigir que el usuario normal sea propietario.
- `deploy.sh` usa ahora un lock por UID: `/tmp/ivoolve-agent-console-deploy-${UID}.lock`.
- Esto evita que un lock creado por root impida un despliegue posterior con `ubuntu`.

## Operación
El comando recomendado sigue siendo:

```bash
cd /home/ubuntu/contenedores/ivoolve_agent
bash deploy.sh
```

No es necesario usar `sudo bash deploy.sh`; el script eleva privilegios únicamente en las operaciones que realmente lo requieren.

## Pruebas
No se ejecutó el script directamente sobre el VPS desde esta sesión.
