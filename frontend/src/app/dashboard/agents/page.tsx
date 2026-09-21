import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { authenticatedBackendFetch } from "@/lib/backend";

type Agent = {
  id: string;
  name?: string;
  role?: string;
  primaryGoal?: string;
  source?: "core" | "managed";
  executionMode?: string;
  fallback: boolean;
};

export default async function AgentsPage() {
  const [agentsResponse, meResponse] = await Promise.all([
    authenticatedBackendFetch("/agents"),
    authenticatedBackendFetch("/auth/me")
  ]);

  const data = agentsResponse.ok
    ? ((await agentsResponse.json()) as { details?: Agent[] })
    : { details: [] as Agent[] };
  const me = meResponse.ok
    ? ((await meResponse.json()) as { user?: { role?: string } })
    : {};

  const agents = data.details ?? [];
  const isAdmin = me.user?.role === "admin";

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
            Gestión
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
            Agentes registrados
          </h1>
          <p className="mt-3 text-zinc-600">
            Agentes core y agentes gestionados desde el constructor conversacional.
          </p>
        </div>

        {isAdmin && (
          <Link
            href="/dashboard/agents/create"
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Crear agente
          </Link>
        )}
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article
            key={agent.id}
            className="rounded-3xl border border-zinc-200 bg-white p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black text-zinc-950">
                {agent.name ?? agent.id}
              </h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Activo
              </span>
            </div>

            <p className="mt-2 text-xs font-bold uppercase tracking-wider text-violet-600">
              {agent.source === "managed" ? "Gestionado" : "Core"}
              {agent.executionMode ? ` · ${agent.executionMode}` : ""}
            </p>

            <p className="mt-3 text-sm font-semibold text-zinc-800">
              {agent.role ??
                (agent.fallback
                  ? "Orquestador principal y fallback"
                  : "Agente especializado")}
            </p>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              {agent.primaryGoal ??
                (agent.fallback
                  ? "Coordina el runtime, conversa con el usuario y crea nuevos agentes."
                  : "Agente especializado registrado.")}
            </p>

            {agent.fallback && isAdmin && (
              <div className="mt-5 flex items-center gap-2 rounded-2xl bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700">
                <Sparkles className="h-4 w-4" />
                Agent Builder disponible
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
