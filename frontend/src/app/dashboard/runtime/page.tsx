import Link from "next/link";
import { authenticatedBackendFetch, backendFetch } from "@/lib/backend";

type Execution = {
  id: string;
  providerId?: string;
  conversationId?: string;
  agentId?: string;
  source?: string;
  correlationId?: string;
  campaignId?: string;
  currentStage?: string;
  status: string;
  inputPreview?: string;
  outputPreview?: string;
  error?: string;
  startedAt: string;
  durationMs?: number;
};

type ExecutionResponse = {
  items: Execution[];
  count: number;
  failed: number;
  completed: number;
};

type QueueStats = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
};

type Metrics = {
  windowMinutes: number;
  total: number;
  completed: number;
  failed: number;
  successRate: number;
  averageDurationMs: number;
  p95DurationMs: number;
  alerts: Array<{
    code: string;
    severity: "warning" | "critical";
    message: string;
  }>;
};

export default async function RuntimePage({
  searchParams,
}: {
  searchParams: Promise<{ agentId?: string }>;
}) {
  const { agentId } = await searchParams;
  const executionPath =
    "/runtime/executions?limit=30" +
    (agentId ? "&agentId=" + encodeURIComponent(agentId) : "");

  const [healthResponse, executionsResponse, jobsResponse, metricsResponse] =
    await Promise.all([
      backendFetch("/health"),
      authenticatedBackendFetch(executionPath),
      authenticatedBackendFetch("/runtime/jobs/stats"),
      authenticatedBackendFetch("/runtime/metrics")
    ]);

  const health = healthResponse.ok ? await healthResponse.json() : null;
  const executions: ExecutionResponse = executionsResponse.ok
    ? await executionsResponse.json()
    : { items: [], count: 0, failed: 0, completed: 0 };
  const jobs: QueueStats = jobsResponse.ok
    ? await jobsResponse.json()
    : { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
  const metrics: Metrics = metricsResponse.ok
    ? await metricsResponse.json()
    : {
        windowMinutes: 60,
        total: 0,
        completed: 0,
        failed: 0,
        successRate: 1,
        averageDurationMs: 0,
        p95DurationMs: 0,
        alerts: []
      };

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
        Runtime
      </p>
      <h1 className="mt-2 text-3xl font-black text-zinc-950">
        Estado y ejecuciones
      </h1>
      {agentId ? (
        <p className="mt-2 text-sm font-semibold text-violet-700">
          Filtrado por agente: {agentId}
        </p>
      ) : null}
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
        Observa infraestructura, BullMQ, persistencia compartida y el recorrido
        de los mensajes que pasan desde un provider hacia los agentes.
      </p>

      {metrics.alerts.length > 0 && (
        <div className="mt-6 space-y-2">
          {metrics.alerts.map((alert) => (
            <div
              key={alert.code}
              className={
                alert.severity === "critical"
                  ? "rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800"
                  : "rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800"
              }
            >
              {alert.message}
            </div>
          ))}
        </div>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <RuntimeCard label="NestJS" value={health?.status ?? "offline"} />
        <RuntimeCard label="Redis" value={health?.redis ?? "unknown"} />
        <RuntimeCard label="MariaDB" value={health?.database ?? "disabled"} />
        <RuntimeCard label="Jobs activos" value={String(jobs.active)} />
        <RuntimeCard label="Jobs esperando" value={String(jobs.waiting)} />
        <RuntimeCard label="Fallos cola" value={String(jobs.failed)} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <RuntimeCard
          label={"Éxito " + metrics.windowMinutes + "m"}
          value={Math.round(metrics.successRate * 100) + "%"}
        />
        <RuntimeCard
          label="Promedio"
          value={metrics.averageDurationMs + " ms"}
        />
        <RuntimeCard label="P95" value={metrics.p95DurationMs + " ms"} />
        <RuntimeCard label="Completadas" value={String(metrics.completed)} />
        <RuntimeCard label="Fallidas" value={String(metrics.failed)} />
      </div>

      <section className="mt-8 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-black text-zinc-950">Ejecuciones recientes</h2>
          <p className="mt-1 text-xs text-zinc-500">
            MariaDB cuando está configurada; fallback local en desarrollo.
          </p>
        </div>

        {executions.items.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">
            Aún no hay ejecuciones registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-5 py-3">Ejecución</th>
                  <th className="px-5 py-3">Estado</th>
                  <th className="px-5 py-3">Agente</th>
                  <th className="px-5 py-3">Etapa</th>
                  <th className="px-5 py-3">Provider</th>
                  <th className="px-5 py-3">Entrada</th>
                  <th className="px-5 py-3">Duración</th>
                  <th className="px-5 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {executions.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-5 py-4">
                      <Link
                        className="font-mono text-xs font-semibold text-violet-700 hover:underline"
                        href={"/dashboard/runtime/" + encodeURIComponent(item.id)}
                      >
                        {item.id}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <Status status={item.status} />
                    </td>
                    <td className="px-5 py-4 font-semibold text-zinc-800">
                      {item.agentId ?? "—"}
                    </td>
                    <td className="max-w-[220px] px-5 py-4 text-zinc-500">
                      {item.currentStage ?? "—"}
                    </td>
                    <td className="max-w-[180px] truncate px-5 py-4 text-zinc-500">
                      {item.providerId ?? "—"}
                    </td>
                    <td className="max-w-md px-5 py-4 text-zinc-600">
                      <p className="line-clamp-2">
                        {item.error ?? item.inputPreview ?? "—"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {item.durationMs !== undefined
                        ? item.durationMs + " ms"
                        : "—"}
                    </td>
                    <td className="px-5 py-4 text-zinc-500">
                      {new Date(item.startedAt).toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function RuntimeCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black capitalize text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const className =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-rose-50 text-rose-700"
        : status === "ignored"
          ? "bg-zinc-100 text-zinc-600"
          : "bg-amber-50 text-amber-700";

  return (
    <span className={"rounded-full px-2.5 py-1 text-xs font-bold " + className}>
      {status}
    </span>
  );
}
