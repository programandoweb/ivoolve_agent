import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { AgentChat } from "@/components/agent-chat";

export default function CreateAgentPage() {
  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
      {/* Cabecera compacta: ocupa solo lo necesario y deja el resto al chat. */}
      <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href="/dashboard/agents"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 transition hover:text-violet-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Link>
            <span className="hidden text-zinc-300 sm:inline">/</span>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600 sm:text-sm">
              Agent Builder
            </p>
          </div>

          <h1 className="mt-1 text-xl font-black tracking-tight text-zinc-950 sm:text-2xl lg:text-3xl">
            Crear agente con Jorge
          </h1>
        </div>

        <p className="hidden max-w-xl text-right text-sm leading-5 text-zinc-500 xl:block">
          Define identidad, memoria, skills, ejecución y criterios mediante conversación.
        </p>
      </div>

      {/* min-h-0 es clave para que el hijo flex pueda usar el alto restante sin
          aumentar el documento ni generar scroll vertical en la página. */}
      <div className="min-h-0 flex-1">
        <AgentChat mode="builder" />
      </div>
    </div>
  );
}
