import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AgentChat } from "@/components/agent-chat";

export default function CreateAgentPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="mb-6">
        <Link
          href="/dashboard/agents"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-violet-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a agentes
        </Link>

        <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
          Agent Builder
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
          Crear agente con Jorge
        </h1>
        <p className="mt-3 max-w-3xl text-zinc-600">
          Describe lo que necesitas en lenguaje natural. Jorge completará identidad,
          objetivo, skills, memoria, ejecución y criterios de finalización mediante preguntas.
        </p>
      </div>

      <AgentChat mode="builder" />
    </div>
  );
}
