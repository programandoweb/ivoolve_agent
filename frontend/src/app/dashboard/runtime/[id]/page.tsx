import Link from "next/link";
import { notFound } from "next/navigation";

import { AutoRefresh } from "@/components/auto-refresh";
import { authenticatedBackendFetch } from "@/lib/backend";

type Execution = {
  id: string;
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
  finishedAt?: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
};

type Event = {
  id: number;
  level: string;
  stage: string;
  message: string;
  data?: unknown;
  createdAt: string;
};

type DetailResponse = {
  execution: Execution;
  events: Event[];
};

export default async function RuntimeExecutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await authenticatedBackendFetch(
    "/runtime/executions/" + encodeURIComponent(id),
  );

  if (response.status === 404) notFound();
  const data = response.ok
    ? ((await response.json()) as DetailResponse)
    : null;

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <Link className="text-sm font-semibold text-violet-700 hover:underline" href="/dashboard/runtime">
          ← Volver al runtime
        </Link>
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-800">
          No fue posible cargar la trazabilidad de esta ejecución.
        </div>
      </div>
    );
  }

  const { execution, events } = data;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <AutoRefresh intervalMs={3000} />
      <Link className="text-sm font-semibold text-violet-700 hover:underline" href="/dashboard/runtime">
        ← Volver al runtime
      </Link>

      <div className="mt-5 flex flex-col gap-4 rounded-3xl border border-zinc-200 bg-white p-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
            Trazabilidad de ejecución
          </p>
          <h1 className="mt-2 break-all font-mono text-xl font-black text-zinc-950">
            {execution.id}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {execution.agentId ?? "Sin agente"} · {execution.source ?? "runtime"}
          </p>
        </div>
        <Status status={execution.status} />
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Info label="Etapa actual" value={execution.currentStage ?? "—"} />
        <Info label="Campaña" value={execution.campaignId ?? "—"} />
        <Info label="Correlation ID" value={execution.correlationId ?? "—"} mono />
        <Info
          label="Duración"
          value={execution.durationMs !== undefined ? execution.durationMs + " ms" : "En curso"}
        />
        <Info label="Eventos" value={String(events.length)} />
      </div>

      {execution.error ? (
        <div className="mt-5 rounded-3xl border border-rose-200 bg-rose-50 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Error</p>
          <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-rose-900">
            {execution.error}
          </pre>
        </div>
      ) : null}

      <section className="mt-6 rounded-3xl border border-zinc-200 bg-white">
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="font-black text-zinc-950">Línea de tiempo completa</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Petición, LLM, tools, persistencia, respuestas y errores registrados en MariaDB.
          </p>
        </div>

        {events.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-500">
            Esta ejecución todavía no tiene eventos detallados.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {events.map((event) => (
              <article key={event.id} className="grid gap-3 px-5 py-5 lg:grid-cols-[190px_220px_1fr]">
                <div>
                  <Level level={event.level} />
                  <p className="mt-2 text-xs text-zinc-500">
                    {new Date(event.createdAt).toLocaleString("es-CO")}
                  </p>
                </div>
                <div className="font-mono text-xs font-semibold text-zinc-700">
                  {event.stage}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{event.message}</p>
                  {event.data !== undefined ? (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-semibold text-violet-700">
                        Ver datos registrados
                      </summary>
                      <pre className="mt-3 max-h-[480px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">
                        {JSON.stringify(event.data, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <Payload label="Entrada registrada" value={execution.inputPreview} />
        <Payload label="Salida registrada" value={execution.outputPreview} />
      </section>
    </div>
  );
}

function Info({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <p className={"mt-2 break-all text-sm font-bold text-zinc-900 " + (mono ? "font-mono" : "")}>
        {value}
      </p>
    </div>
  );
}

function Payload({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">{label}</p>
      <pre className="mt-3 max-h-[360px] overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-zinc-700">
        {value ?? "—"}
      </pre>
    </div>
  );
}

function Status({ status }: { status: string }) {
  const className =
    status === "completed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "failed"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return (
    <span className={"w-fit rounded-full px-3 py-1.5 text-xs font-bold " + className}>
      {status}
    </span>
  );
}

function Level({ level }: { level: string }) {
  const className =
    level === "error"
      ? "bg-rose-50 text-rose-700"
      : level === "warning"
        ? "bg-amber-50 text-amber-700"
        : level === "debug"
          ? "bg-zinc-100 text-zinc-600"
          : "bg-violet-50 text-violet-700";

  return (
    <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-bold " + className}>
      {level}
    </span>
  );
}
