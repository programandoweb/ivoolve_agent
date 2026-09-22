#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${IVOOLVE_AGENT_APP_DIR:-/home/ubuntu/contenedores/ivoolve_agent}"
LOCK_FILE="/tmp/ivoolve-agent-production-deploy.lock"
SKIP_GIT_SYNC="${IVOOLVE_AGENT_SKIP_GIT_SYNC:-false}"

log() { printf '\n==> %s\n' "$*"; }
fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

on_error() {
  local exit_code=$?
  printf '\nERROR: despliegue interrumpido (código %s).\n' "$exit_code" >&2
  if [[ -d "$APP_DIR" ]]; then
    cd "$APP_DIR" || true
    docker compose ps || true
    docker compose logs --tail=80 backend frontend || true
  fi
  exit "$exit_code"
}
trap on_error ERR

[[ -d "$APP_DIR/.git" ]] || fail "No existe el repositorio en $APP_DIR"

for cmd in git docker curl flock; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Falta el comando requerido: $cmd"
done

docker compose version >/dev/null 2>&1 || fail "Docker Compose no está disponible"
docker info >/dev/null 2>&1 || fail "El usuario actual no puede usar Docker"

exec 9>"$LOCK_FILE"
flock -n 9 || fail "Ya hay otro despliegue de Ivoolve Agent en ejecución"

cd "$APP_DIR"

if [[ "$SKIP_GIT_SYNC" != "true" ]]; then
  log "Sincronizando main"
  git fetch origin main
  git reset --hard origin/main
else
  log "Sincronización Git omitida por el wrapper de despliegue"
fi

[[ -f .env ]] || fail "Falta $APP_DIR/.env"

DATABASE_AUTO_MIGRATE="$(grep -E '^DATABASE_AUTO_MIGRATE=' .env | tail -1 | cut -d= -f2- || true)"
DATABASE_AUTO_MIGRATE="${DATABASE_AUTO_MIGRATE:-true}"
if [[ "${DATABASE_AUTO_MIGRATE,,}" != "true" ]]; then
  fail "DATABASE_AUTO_MIGRATE debe estar en true para garantizar la actualización automática del esquema."
fi

BACKEND_PORT="$(grep -E '^BACKEND_PORT=' .env | tail -1 | cut -d= -f2- || true)"
FRONTEND_PORT="$(grep -E '^FRONTEND_PORT=' .env | tail -1 | cut -d= -f2- || true)"
BACKEND_PORT="${BACKEND_PORT:-5020}"
FRONTEND_PORT="${FRONTEND_PORT:-5021}"

[[ "$BACKEND_PORT" =~ ^[0-9]+$ ]] || fail "BACKEND_PORT inválido: $BACKEND_PORT"
[[ "$FRONTEND_PORT" =~ ^[0-9]+$ ]] || fail "FRONTEND_PORT inválido: $FRONTEND_PORT"

log "Validando Docker Compose"
docker compose config -q

log "Levantando dependencias persistentes"
docker compose up -d mariadb redis

wait_healthy() {
  local container="$1" attempts="${2:-60}"
  for ((i=1; i<=attempts; i++)); do
    local status
    status="$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$container" 2>/dev/null || true)"
    if [[ "$status" == "healthy" || "$status" == "running" ]]; then
      echo "OK: $container -> $status"
      return 0
    fi
    sleep 2
  done
  fail "$container no alcanzó estado saludable"
}

wait_healthy "ivoolve-agent-mariadb"
wait_healthy "ivoolve-agent-redis"

log "Construyendo backend y frontend"
docker compose build --pull backend frontend

log "Buscando migrador explícito del backend"
if docker compose run --rm --no-deps backend node -e "const p=require('./package.json');process.exit(p.scripts&&p.scripts.migrate?0:1)" >/dev/null 2>&1; then
  log "Ejecutando migraciones explícitas del backend"
  docker compose run --rm --no-deps backend npm run migrate
else
  log "No existe script npm migrate; el backend aplicará su esquema durable al arrancar (DATABASE_AUTO_MIGRATE=true)"
fi

log "Recreando servicios de aplicación"
docker compose up -d --force-recreate --remove-orphans backend frontend

wait_http() {
  local name="$1" url="$2" attempts="${3:-60}"
  for ((i=1; i<=attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      echo "OK: $name -> $url"
      return 0
    fi
    sleep 2
  done
  fail "$name no respondió correctamente: $url"
}

log "Health checks"
wait_http "Backend" "http://127.0.0.1:$BACKEND_PORT/health"
wait_http "Frontend" "http://127.0.0.1:$FRONTEND_PORT/login"

log "Resumen Docker"
docker compose ps

log "Commit desplegado"
git rev-parse --short HEAD

log "Deploy completado correctamente"
