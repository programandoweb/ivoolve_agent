import { authenticatedBackendFetch } from "@/lib/backend";

type Agent = {
  id: string;
  fallback: boolean;
};

export default async function AgentsPage() {
  const response = await authenticatedBackendFetch("/agents");
  const data = response.ok
    ? ((await response.json()) as { details?: Agent[] })
    : { details: [] as Agent[] };

  const agents = data.details ?? [];

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 lg:px-8 lg:py-10">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
        Gestión
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
        Agentes registrados
      </h1>
      <p className="mt-3 text-zinc-600">
        Cada agente vive en su propio directorio dentro de backend/agents.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {agents.map((agent) => (
          <article
            key={agent.id}
            className="rounded-3xl border border-zinc-200 bg-white p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-black capitalize text-zinc-950">
                {agent.id}
              </h2>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                Activo
              </span>
            </div>
            <p className="mt-3 text-sm text-zinc-500">
              {agent.fallback
                ? "Orquestador principal y fallback del sistema."
                : "Agente especializado registrado."}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
