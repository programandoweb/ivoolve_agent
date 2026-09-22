#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCK_FILE="/tmp/ivoolve-agent-console-deploy.lock"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

[[ -d "$ROOT_DIR/.git" ]] || fail "Este script debe ejecutarse dentro del repositorio Ivoolve Agent."

command -v git >/dev/null 2>&1 || fail "Git no está instalado."
command -v flock >/dev/null 2>&1 || fail "flock no está disponible."

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Ya existe otro despliegue manual de Ivoolve Agent en ejecución."

cd "$ROOT_DIR"

log "Actualizando repositorio desde origin/main"
git fetch origin main
git reset --hard origin/main

export IVOOLVE_AGENT_APP_DIR="$ROOT_DIR"
export IVOOLVE_AGENT_SKIP_GIT_SYNC=true


log "Ejecutando despliegue de producción"
exec bash "$ROOT_DIR/scripts/deploy/production.sh"
