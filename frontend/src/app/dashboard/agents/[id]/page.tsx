import { notFound } from "next/navigation";
import { AgentChat } from "@/components/agent-chat";
import { authenticatedBackendFetch } from "@/lib/backend";

type AgentDetail = {
  id: string;
  name?: string;
  role?: string;
  primaryGoal?: string;
  source?: "core" | "managed";
};

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await authenticatedBackendFetch("/agents");
  const data = response.ok
    ? ((await response.json()) as { details?: AgentDetail[] })
    : { details: [] as AgentDetail[] };
  const agent = data.details?.find((item) => item.id === id);
  if (!agent) notFound();

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col gap-4 px-4 py-4 lg:px-6">
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
      <div className="min-h-0 flex-1">
        <AgentChat agentId={agent.id} />
      </div>
    </div>
  );
}
