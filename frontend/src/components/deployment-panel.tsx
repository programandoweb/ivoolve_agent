"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, LoaderCircle, Rocket } from "lucide-react";

type DeploymentStatus = {
  project?: string;
  status?: "idle" | "running" | "completed" | "failed" | "unknown";
  pid?: number;
  startedAt?: string | null;
  finishedAt?: string | null;
  exitCode?: number | null;
  requestedHead?: string | null;
  currentHead?: string | null;
  message?: string;
  error?: string;
  log?: string[];
};

const statusLabel: Record<string, string> = {
  idle: "Sin despliegues",
  running: "Desplegando",
  completed: "Completado",
  failed: "Fallido",
  unknown: "Estado desconocido"
};

export function DeploymentPanel() {
  const [data, setData] = useState<DeploymentStatus>({ status: "idle", log: [] });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      const response = await fetch("/api/deployments", { cache: "no-store" });
      const payload = (await response.json()) as DeploymentStatus;
      if (!response.ok) throw new Error(payload.error || "No fue posible consultar el despliegue.");
      setData(payload);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible consultar el despliegue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 2500);
    return () => window.clearInterval(timer);
  }, []);

  const deploy = async () => {
    if (!window.confirm("¿Deseas desplegar la versión más reciente de Ivoolve Agent en producción?")) return;
    setStarting(true);
    setError("");
    try {
      const response = await fetch("/api/deployments", { method: "POST" });
      const payload = (await response.json()) as DeploymentStatus;
      if (!response.ok) throw new Error(payload.error || "No fue posible iniciar el despliegue.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible iniciar el despliegue.");
    } finally {
      setStarting(false);
    }
  };

  const running = data.status === "running";
  const duration = useMemo(() => {
    if (!data.startedAt) return "—";
    const end = data.finishedAt ? new Date(data.finishedAt).getTime() : Date.now();
    const seconds = Math.max(0, Math.round((end - new Date(data.startedAt).getTime()) / 1000));
    return seconds < 60 ? seconds + " s" : Math.floor(seconds / 60) + " min " + (seconds % 60) + " s";
  }, [data.finishedAt, data.startedAt, data.status]);

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-black">Control de despliegue no disponible</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-zinc-950">Producción</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Actualiza main, reconstruye backend/frontend y valida los health checks.
            </p>
          </div>
          <span className={
            "rounded-full px-3 py-1 text-xs font-bold " +
            (running
              ? "bg-sky-50 text-sky-700"
              : data.status === "failed"
                ? "bg-rose-50 text-rose-700"
                : data.status === "completed"
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-zinc-100 text-zinc-600")
          }>
            {statusLabel[data.status || "idle"] || data.status}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Commit actual" value={data.currentHead || "—"} />
          <Info label="Commit solicitado" value={data.requestedHead || "—"} />
          <Info label="Duración" value={duration} />
          <Info label="Código de salida" value={data.exitCode === null || data.exitCode === undefined ? "—" : String(data.exitCode)} />
        </div>

        <button
          type="button"
          onClick={deploy}
          disabled={loading || starting || running}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running || starting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          {running ? "Desplegando…" : starting ? "Iniciando…" : "Desplegar"}
        </button>

        <p className="mt-3 text-xs text-zinc-500">
          El proceso continúa en el VPS aunque los contenedores se reinicien durante el despliegue.
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-black text-zinc-950">Salida del despliegue</h2>
          <p className="mt-1 text-xs text-zinc-500">Últimas líneas emitidas por deploy.sh.</p>
        </div>
        {data.log?.length ? (
          <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-words bg-zinc-950 p-5 text-xs leading-5 text-zinc-100">
            {data.log.join("\n")}
          </pre>
        ) : (
          <div className="flex items-center gap-2 px-5 py-8 text-sm text-zinc-500">
            <CheckCircle2 className="h-4 w-4" />
            Aún no hay salida registrada.
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="mt-2 break-all font-mono text-sm font-bold text-zinc-900">{value}</p>
    </div>
  );
}
