import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, History, MessageSquareText } from "lucide-react";

import { AgentChat } from "@/components/agent-chat";
import { ArgosBrowserPairing } from "@/components/argos-browser-pairing";
import { ArgosSicOutbox } from "@/components/argos-sic-outbox";
import { AutoRefresh } from "@/components/auto-refresh";
import { authenticatedBackendFetch } from "@/lib/backend";

type AgentDetail = {
  id: string;
  name?: string;
  role?: string;
  primaryGoal?: string;
  source?: "core" | "managed";
};

type Execution = {
  id: string;
  status: string;
  source?: string;
  currentStage?: string;
  startedAt: string;
  durationMs?: number;
  error?: string;
};

type RuntimeEvent = {
  id: number;
  level: string;
  stage: string;
  message: string;
  data?: unknown;
  createdAt: string;
};

type ExecutionDetail = {
  execution: Execution;
  events: RuntimeEvent[];
};

type TabId = "chat" | "activity" | "history" | "connect" | "sync";

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: requestedTab } = await searchParams;
  const tab: TabId =
    requestedTab === "activity" || requestedTab === "history" || (id === "argos-prospector" && (requestedTab === "connect" || requestedTab === "sync"))
      ? requestedTab
      : "chat";

  const [agentsResponse, executionsResponse] = await Promise.all([
    authenticatedBackendFetch("/agents"),
    authenticatedBackendFetch(
      "/runtime/executions?limit=20&agentId=" + encodeURIComponent(id),
    ),
  ]);

  const data = agentsResponse.ok
    ? ((await agentsResponse.json()) as { details?: AgentDetail[] })
    : { details: [] as AgentDetail[] };
  const agent = data.details?.find((item) => item.id === id);
  if (!agent) notFound();

  const executions: Execution[] = executionsResponse.ok
    ? (((await executionsResponse.json()) as { items?: Execution[] }).items ?? [])
    : [];

  const liveExecution =
    executions.find((execution) =>
      ["running", "pending", "queued", "dispatching", "dispatched", "retrying"].includes(
        execution.status,
      ),
    ) ?? executions[0];

  let liveDetail: ExecutionDetail | null = null;
  if (tab === "activity" && liveExecution) {
    const detailResponse = await authenticatedBackendFetch(
      "/runtime/executions/" + encodeURIComponent(liveExecution.id),
    );
    if (detailResponse.ok) {
      liveDetail = (await detailResponse.json()) as ExecutionDetail;
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-4 px-4 py-4 lg:px-6">
      {tab === "activity" ? <AutoRefresh intervalMs={2000} /> : null}
      {tab === "history" ? <AutoRefresh intervalMs={4000} /> : null}

      <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
          {agent.source === "managed" ? "Agente gestionado" : "Agente core"}
        </p>
        <h1 className="mt-1 text-2xl font-black text-zinc-950">
          {agent.name ?? agent.id}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {agent.role ?? "Agente"}
          {agent.primaryGoal ? ` · ${agent.primaryGoal}` : ""}
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 rounded-2xl border border-zinc-200 bg-white p-2">
        <TabLink
          href={"/dashboard/agents/" + encodeURIComponent(agent.id)}
          active={tab === "chat"}
          icon={<MessageSquareText className="h-4 w-4" />}
        >
          Chat
        </TabLink>
        <TabLink
          href={
            "/dashboard/agents/" +
            encodeURIComponent(agent.id) +
            "?tab=activity"
          }
          active={tab === "activity"}
          icon={<Activity className="h-4 w-4" />}
        >
          Actividad en vivo
        </TabLink>
        <TabLink
          href={
            "/dashboard/agents/" +
            encodeURIComponent(agent.id) +
            "?tab=history"
          }
          active={tab === "history"}
          icon={<History className="h-4 w-4" />}
        >
          Historial
        </TabLink>
        {id === "argos-prospector" ? (
          <>
            <TabLink href="/dashboard/agents/argos-prospector?tab=connect" active={tab === "connect"} icon={<Activity className="h-4 w-4" />}>Conectar Chrome</TabLink>
            <TabLink href="/dashboard/agents/argos-prospector?tab=sync" active={tab === "sync"} icon={<History className="h-4 w-4" />}>Sincronización SIC</TabLink>
          </>
        ) : null}
      </nav>

      {id === "argos-prospector" && tab === "sync" ? <ArgosSicOutbox /> : null}
      {id === "argos-prospector" && tab === "connect" ? <ArgosBrowserPairing /> : null}

      {tab === "chat" ? (
        <div className="h-[560px] min-h-0 xl:h-[600px]">
          <AgentChat agentId={agent.id} contained />
        </div>
      ) : null}

      {tab === "activity" ? (
        <LiveActivity
          agentId={agent.id}
          execution={liveDetail?.execution ?? liveExecution}
          events={liveDetail?.events ?? []}
        />
      ) : null}

      {tab === "history" ? <ExecutionHistory agentId={agent.id} executions={executions} /> : null}
    </div>
  );
}

function TabLink({
  href,
  active,
  icon,
  children,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition " +
        (active
          ? "bg-violet-600 text-white shadow-sm"
          : "text-zinc-600 hover:bg-violet-50 hover:text-violet-700")
      }
    >
      {icon}
      {children}
    </Link>
  );
}

function LiveActivity({
  agentId,
  execution,
  events,
}: {
  agentId: string;
  execution?: Execution;
  events: RuntimeEvent[];
}) {
  return (
    <section className="flex h-[560px] min-h-0 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-950 text-zinc-100 xl:h-[600px]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              {execution && execution.status !== "completed" && execution.status !== "failed" ? (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              ) : null}
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <h2 className="font-black">Actividad en vivo</h2>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            Lo que {agentId} está solicitando, pensando, buscando y ejecutando. Actualiza cada 2 segundos.
          </p>
        </div>
        {execution ? (
          <Link
            href={"/dashboard/runtime/" + encodeURIComponent(execution.id)}
            className="text-xs font-semibold text-violet-300 hover:text-violet-200 hover:underline"
          >
            Abrir trazabilidad completa
          </Link>
        ) : null}
      </div>

      {!execution ? (
        <div className="flex flex-1 items-center justify-center px-5 text-center text-sm text-zinc-400">
          Este agente todavía no tiene actividad registrada.
        </div>
      ) : (
        <>
          <div className="grid shrink-0 grid-cols-2 gap-px border-b border-zinc-800 bg-zinc-800 sm:grid-cols-4">
            <LiveMetric label="Estado" value={execution.status} />
            <LiveMetric label="Etapa" value={humanStage(execution.currentStage)} />
            <LiveMetric
              label="Inicio"
              value={new Date(execution.startedAt).toLocaleTimeString("es-CO")}
            />
            <LiveMetric
              label="Duración"
              value={
                execution.durationMs !== undefined
                  ? execution.durationMs + " ms"
                  : "procesando…"
              }
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5">
            {events.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Esperando los primeros eventos…
              </div>
            ) : (
              <div className="space-y-2">
                {[...events].reverse().map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-violet-300">
                        {new Date(event.createdAt).toLocaleTimeString("es-CO")}
                      </span>
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono text-[10px] font-semibold text-zinc-300">
                        {event.stage}
                      </span>
                      <span
                        className={
                          "rounded-full px-2 py-0.5 text-[10px] font-bold " +
                          levelClass(event.level)
                        }
                      >
                        {event.level}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-zinc-100">
                      {activityMessage(event)}
                    </p>
                    {event.data !== undefined ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-zinc-400 hover:text-zinc-200">
                          Ver detalle técnico
                        </summary>
                        <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-black/40 p-3 text-[11px] leading-5 text-zinc-400">
                          {JSON.stringify(event.data, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function ExecutionHistory({
  agentId,
  executions,
}: {
  agentId: string;
  executions: Execution[];
}) {
  return (
    <section className="flex h-[560px] min-h-0 flex-col overflow-hidden rounded-3xl border border-zinc-200 bg-white xl:h-[600px]">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div>
          <h2 className="font-black text-zinc-950">Historial de ejecuciones</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Últimas ejecuciones registradas para {agentId}.
          </p>
        </div>
        <Link
          href={"/dashboard/runtime?agentId=" + encodeURIComponent(agentId)}
          className="text-sm font-semibold text-violet-700 hover:underline"
        >
          Ver runtime
        </Link>
      </div>

      {executions.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-8 text-center text-sm text-zinc-500">
          Aún no hay ejecuciones registradas para este agente.
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
              <tr>
                <th className="px-5 py-3">Ejecución</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3">Etapa</th>
                <th className="px-5 py-3">Inicio</th>
                <th className="px-5 py-3">Duración</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {executions.map((execution) => (
                <tr key={execution.id}>
                  <td className="px-5 py-4">
                    <Link
                      href={"/dashboard/runtime/" + encodeURIComponent(execution.id)}
                      className="font-mono text-xs font-semibold text-violet-700 hover:underline"
                    >
                      {execution.id}
                    </Link>
                    {execution.error ? (
                      <p className="mt-1 max-w-md truncate text-xs text-rose-600">
                        {execution.error}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs font-bold text-zinc-700">
                      {execution.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    {execution.currentStage ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    {new Date(execution.startedAt).toLocaleString("es-CO")}
                  </td>
                  <td className="px-5 py-4 text-zinc-500">
                    {execution.durationMs !== undefined
                      ? execution.durationMs + " ms"
                      : "En curso"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function LiveMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-950 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-zinc-200">{value}</p>
    </div>
  );
}

function humanStage(stage?: string): string {
  if (!stage) return "Esperando";
  if (stage.includes("llm") && stage.endsWith(".request")) return "Pensando";
  if (stage.includes("llm") && stage.endsWith(".response")) return "Respuesta LLM";
  if (stage === "tool.request") return "Solicitando herramienta";
  if (stage === "tool.completed") return "Herramienta completada";
  if (stage === "tool.failed") return "Herramienta falló";
  if (stage === "agent.delegation") return "Delegando";
  if (stage === "agent.routed") return "Enrutando";
  if (stage.includes("prospect.persisted")) return "Guardando prospecto";
  return stage;
}

function activityMessage(event: RuntimeEvent): string {
  const data =
    event.data && typeof event.data === "object"
      ? (event.data as Record<string, unknown>)
      : undefined;

  if (event.stage.includes("llm") && event.stage.endsWith(".request")) {
    return "Pensando y preparando la siguiente decisión con el modelo.";
  }
  if (event.stage.includes("llm") && event.stage.endsWith(".response")) {
    return "El modelo respondió; revisando la respuesta para decidir el siguiente paso.";
  }
  if (event.stage === "tool.request") {
    return data?.tool
      ? `Solicitando la herramienta ${String(data.tool)}.`
      : event.message;
  }
  if (event.stage === "tool.completed") {
    return data?.tool
      ? `La herramienta ${String(data.tool)} respondió correctamente.`
      : event.message;
  }
  if (event.stage === "tool.failed") {
    return data?.tool
      ? `Falló la herramienta ${String(data.tool)}.`
      : event.message;
  }
  if (event.stage === "agent.routed") {
    return data?.effectiveAgent
      ? `La tarea fue enviada al especialista ${String(data.effectiveAgent)}.`
      : event.message;
  }
  if (event.stage === "agent.delegation") {
    return data?.delegate
      ? `Delegando trabajo a ${String(data.delegate)}.`
      : event.message;
  }
  if (event.stage.includes("prospect.persisted")) {
    return data?.name
      ? `Guardando el prospecto ${String(data.name)} en SIC.`
      : "Guardando un prospecto en SIC.";
  }
  return event.message;
}

function levelClass(level: string): string {
  if (level === "error") return "bg-rose-500/20 text-rose-300";
  if (level === "warning") return "bg-amber-500/20 text-amber-300";
  if (level === "debug") return "bg-zinc-700 text-zinc-300";
  return "bg-violet-500/20 text-violet-300";
}
