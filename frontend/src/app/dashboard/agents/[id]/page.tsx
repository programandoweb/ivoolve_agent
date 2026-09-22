import Link from "next/link";
import { notFound } from "next/navigation";
import { AgentChat } from "@/components/agent-chat";
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

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-4 px-4 py-4 lg:px-6">
      <AutoRefresh intervalMs={4000} />
      <div className="rounded-3xl border border-zinc-200 bg-white px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
          {agent.source === "managed" ? "Agente gestionado" : "Agente core"}
        </p>
        <h1 className="mt-1 text-2xl font-black text-zinc-950">
          {agent.name ?? agent.id}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          {agent.role ?? "Agente"}{agent.primaryGoal ? ` · ${agent.primaryGoal}` : ""}
        </p>
      </div>

      <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h2 className="font-black text-zinc-950">Actividad reciente</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Últimas ejecuciones registradas para este agente. Esta vista se actualiza automáticamente cada 4 segundos.
            </p>
          </div>
          <Link
            href={"/dashboard/runtime?agentId=" + encodeURIComponent(agent.id)}
            className="text-sm font-semibold text-violet-700 hover:underline"
          >
            Ver runtime
          </Link>
        </div>

        {executions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-500">
            Aún no hay ejecuciones registradas para este agente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-400">
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

      <div className="min-h-0 flex-1">
        <AgentChat agentId={agent.id} />
      </div>
    </div>
  );
}
