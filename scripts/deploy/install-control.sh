#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${IVOOLVE_AGENT_APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
ENV_FILE="$APP_DIR/.env"
SERVICE_NAME="ivoolve-agent-deploy-control"
PORT="${DEPLOY_CONTROL_PORT:-8766}"
USER_NAME="$(id -un)"
GROUP_NAME="$(id -gn)"

log(){ printf '\n==> %s\n' "$*"; }
fail(){ printf '\nERROR: %s\n' "$*" >&2; exit 1; }

for cmd in sudo python3 openssl systemctl; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Falta el comando requerido: $cmd"
done

[[ -f "$ENV_FILE" ]] || fail "Falta $ENV_FILE"

ensure_env() {
  local key="$1" value="$2"
  if grep -qE "^$key=" "$ENV_FILE"; then
    python3 - "$ENV_FILE" "$key" "$value" <<'PY'
from pathlib import Path
import sys
path=Path(sys.argv[1]); key=sys.argv[2]; value=sys.argv[3]
lines=path.read_text().splitlines()
out=[]; replaced=False
for line in lines:
    if line.startswith(key+"="):
        current=line.split("=",1)[1].strip()
        out.append(line if current else f"{key}={value}")
        replaced=True
    else:
        out.append(line)
if not replaced:
    out.append(f"{key}={value}")
path.write_text("\n".join(out)+"\n")
PY
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$ENV_FILE"
  fi
}

TOKEN="$(grep -E '^DEPLOY_CONTROL_TOKEN=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
if [[ -z "$TOKEN" ]]; then
  TOKEN="$(openssl rand -hex 32)"
fi

ensure_env DEPLOY_CONTROL_TOKEN "$TOKEN"
ensure_env DEPLOY_CONTROL_URL "http://host.docker.internal:$PORT"
ensure_env DEPLOY_CONTROL_PORT "$PORT"

log "Instalando servicio systemd $SERVICE_NAME"
sudo tee "/etc/systemd/system/$SERVICE_NAME.service" >/dev/null <<EOF
[Unit]
Description=Ivoolve Agent Deployment Control
After=network.target docker.service
Wants=docker.service

[Service]
Type=simple
User=$USER_NAME
Group=$GROUP_NAME
WorkingDirectory=$APP_DIR
Environment=DEPLOY_CONTROL_TOKEN=$TOKEN
Environment=DEPLOY_APP_DIR=$APP_DIR
Environment=DEPLOY_PROJECT=ivoolve-agent
Environment=DEPLOY_CONTROL_PORT=$PORT
ExecStart=/usr/bin/python3 $APP_DIR/scripts/deploy/control_server.py
Restart=always
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE_NAME" >/dev/null
sudo systemctl restart "$SERVICE_NAME"

sleep 1
systemctl is-active --quiet "$SERVICE_NAME" || fail "El servicio $SERVICE_NAME no quedó activo"

log "Control de despliegue listo"
echo "Servicio: $SERVICE_NAME"
echo "Puerto: $PORT"
echo "Frontend URL interna: http://host.docker.internal:$PORT"
