#!/usr/bin/env python3
"""Minimal deployment control plane for Ivoolve Agent."""

from __future__ import annotations

import hmac
import json
import os
import subprocess
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

APP_DIR = Path(os.environ.get("DEPLOY_APP_DIR", "/home/ubuntu/contenedores/ivoolve_agent")).resolve()
PROJECT = os.environ.get("DEPLOY_PROJECT", "ivoolve-agent")
TOKEN = os.environ.get("DEPLOY_CONTROL_TOKEN", "").strip()
HOST = os.environ.get("DEPLOY_CONTROL_BIND", "0.0.0.0")
PORT = int(os.environ.get("DEPLOY_CONTROL_PORT", "8766"))
STATE_DIR = Path(os.environ.get("DEPLOY_STATE_DIR", str(Path.home() / ".local/state" / PROJECT)))
STATE_FILE = STATE_DIR / "status.json"
LOG_FILE = STATE_DIR / "deploy.log"
DEPLOY_SCRIPT = APP_DIR / "deploy.sh"
STATE_LOCK = threading.Lock()
STATE_DIR.mkdir(parents=True, exist_ok=True)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def load_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {"status": "idle", "project": PROJECT}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"status": "unknown", "project": PROJECT, "message": "No se pudo leer el estado del despliegue."}


def save_state(state: dict[str, Any]) -> None:
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(STATE_FILE)


def process_alive(pid: int | None) -> bool:
    if not pid:
        return False
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def git_head() -> str | None:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=APP_DIR,
            text=True,
            stderr=subprocess.DEVNULL,
            timeout=3,
        ).strip()
    except Exception:
        return None


def log_tail(lines: int = 100) -> list[str]:
    if not LOG_FILE.exists():
        return []
    try:
        return LOG_FILE.read_text(encoding="utf-8", errors="replace").splitlines()[-lines:]
    except OSError:
        return []


def public_status() -> dict[str, Any]:
    state = load_state()
    if state.get("status") == "running" and not process_alive(state.get("pid")):
        state["status"] = "unknown"
        state["message"] = "El proceso ya no está activo y no registró su cierre."
        state["finishedAt"] = state.get("finishedAt") or utc_now()
        save_state(state)
    return {**state, "currentHead": git_head(), "log": log_tail()}


def watch_process(proc: subprocess.Popen[Any], started_at: str) -> None:
    exit_code = proc.wait()
    with STATE_LOCK:
        state = load_state()
        state.update(
            {
                "status": "completed" if exit_code == 0 else "failed",
                "exitCode": exit_code,
                "finishedAt": utc_now(),
                "startedAt": state.get("startedAt", started_at),
                "currentHead": git_head(),
            }
        )
        save_state(state)


def start_deploy() -> tuple[dict[str, Any], int]:
    if not TOKEN:
        return {"error": "DEPLOY_CONTROL_TOKEN no está configurado."}, 503
    if not DEPLOY_SCRIPT.exists():
        return {"error": f"No existe {DEPLOY_SCRIPT}."}, 500

    with STATE_LOCK:
        current = load_state()
        if current.get("status") == "running" and process_alive(current.get("pid")):
            return {**public_status(), "error": "Ya existe un despliegue en ejecución."}, 409

        started_at = utc_now()
        env = os.environ.copy()
        env["IVOOLVE_DEPLOY_CONTROL_REQUEST"] = "1"
        env["IVOOLVE_AGENT_APP_DIR"] = str(APP_DIR)

        with LOG_FILE.open("w", encoding="utf-8") as log:
            proc = subprocess.Popen(
                ["bash", str(DEPLOY_SCRIPT)],
                cwd=APP_DIR,
                stdout=log,
                stderr=subprocess.STDOUT,
                env=env,
                start_new_session=True,
            )

        state = {
            "project": PROJECT,
            "status": "running",
            "pid": proc.pid,
            "startedAt": started_at,
            "finishedAt": None,
            "exitCode": None,
            "requestedHead": git_head(),
        }
        save_state(state)
        threading.Thread(target=watch_process, args=(proc, started_at), daemon=True).start()
        return {**state, "log": []}, 202


class Handler(BaseHTTPRequestHandler):
    server_version = "IvoolveDeployControl/1.0"

    def _authorized(self) -> bool:
        if not TOKEN:
            return False
        received = self.headers.get("Authorization", "")
        if received.lower().startswith("bearer "):
            received = received[7:].strip()
        else:
            received = self.headers.get("X-Deploy-Token", "").strip()
        return bool(received) and hmac.compare_digest(received, TOKEN)

    def _json(self, payload: dict[str, Any], status: int = 200) -> None:
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self) -> None:
        if self.path == "/health":
            self._json({"status": "ok", "project": PROJECT})
            return
        if self.path != "/status":
            self._json({"error": "Not found"}, 404)
            return
        if not self._authorized():
            self._json({"error": "Unauthorized"}, 401)
            return
        self._json(public_status())

    def do_POST(self) -> None:
        if self.path != "/deploy":
            self._json({"error": "Not found"}, 404)
            return
        if not self._authorized():
            self._json({"error": "Unauthorized"}, 401)
            return
        payload, status = start_deploy()
        self._json(payload, status)

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[deploy-control] {self.address_string()} {fmt % args}", flush=True)


if __name__ == "__main__":
    if not TOKEN:
        raise SystemExit("DEPLOY_CONTROL_TOKEN es obligatorio")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"{PROJECT} deploy control escuchando en {HOST}:{PORT}", flush=True)
    server.serve_forever()
