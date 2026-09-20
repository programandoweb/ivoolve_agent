import {
  ArrowRight,
  Bot,
  Braces,
  Database,
  Network,
  Sparkles
} from "lucide-react";
import { AgentChat } from "@/components/agent-chat";

const steps = [
  {
    icon: Braces,
    label: "1. Next.js",
    detail: "Recibe tu mensaje y lo entrega al BFF."
  },
  {
    icon: Network,
    label: "2. NestJS",
    detail: "Ejecuta el runtime y selecciona el agente."
  },
  {
    icon: Database,
    label: "3. Redis",
    detail: "Recupera y guarda el estado de la sesión."
  },
  {
    icon: Bot,
    label: "4. Jorge",
    detail: "Responde hoy y mañana podrá delegar a subagentes."
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="border-b border-zinc-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 font-bold text-white">
              i
            </div>
            <div>
              <p className="font-bold tracking-tight text-zinc-950">Ivoolve Agent</p>
              <p className="text-xs text-zinc-500">Laboratorio multiagente</p>
            </div>
          </div>

          <nav className="hidden items-center gap-7 text-sm font-medium text-zinc-600 md:flex">
            <a href="#arquitectura" className="transition hover:text-violet-600">
              Arquitectura
            </a>
            <a href="#jorge" className="transition hover:text-violet-600">
              Jorge
            </a>
            <a href="#aprender" className="transition hover:text-violet-600">
              Aprender
            </a>
          </nav>

          <a
            href="#jorge"
            className="rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
          >
            Hablar con Jorge
          </a>
        </div>
      </header>

      <section className="relative">
        <div className="absolute inset-x-0 top-0 -z-10 h-[620px] bg-gradient-to-br from-violet-50/80 via-white to-emerald-50/50" />

        <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:pb-28 lg:pt-24">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              Aprende agentes construyendo agentes
            </div>

            <h1 className="max-w-xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-zinc-950 sm:text-6xl lg:text-7xl">
              No imagines cómo funciona un agente.
              <span className="block text-violet-600">Míralo trabajar.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-600">
              Ivoolve Agent conecta Next.js, NestJS, Redis y un LLM para que puedas
              estudiar cada paso del ciclo. Jorge es el primer agente, el fallback y
              el futuro orquestador de todos los demás.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#jorge"
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3.5 font-semibold text-white shadow-xl shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700"
              >
                Probar a Jorge
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#arquitectura"
                className="rounded-full border border-zinc-300 bg-white px-6 py-3.5 font-semibold text-zinc-800 transition hover:border-violet-300 hover:text-violet-700"
              >
                Ver el flujo
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-zinc-500">
              <span>✓ Estado en Redis</span>
              <span>✓ NestJS orquestador</span>
              <span>✓ LM Studio compatible</span>
            </div>
          </div>

          <div id="jorge" className="relative scroll-mt-24">
            <div className="absolute -right-5 -top-5 hidden rotate-3 rounded-2xl bg-amber-200 px-4 py-3 text-sm font-bold text-amber-950 shadow-lg sm:block">
              tú envías la tarea ✨
            </div>
            <AgentChat />
          </div>
        </div>
      </section>

      <section id="arquitectura" className="border-y border-zinc-100 bg-zinc-50/60">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
              El ciclo
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-zinc-950 sm:text-4xl">
              Cada mensaje es una pequeña ejecución completa.
            </h2>
            <p className="mt-4 text-zinc-600">
              El agente no está pensando eternamente. El sistema recupera contexto,
              ejecuta un ciclo y vuelve a guardar el estado.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {steps.map(({ icon: Icon, label, detail }) => (
              <article
                key={label}
                className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-zinc-950">{label}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="aprender" className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="rounded-[36px] bg-zinc-950 px-6 py-12 text-white sm:px-10 lg:flex lg:items-center lg:justify-between lg:px-14">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-300">
              Siguiente fase
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Cuando Jorge esté claro, creamos el primer subagente.
            </h2>
            <p className="mt-4 leading-7 text-zinc-300">
              Pedro podrá tener su propio Agent.md, Memory.md y Tools.md. Entonces
              veremos cómo Jorge decide delegar y cómo ambos comparten estado.
            </p>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 px-6 py-5 lg:mt-0">
            <p className="text-sm text-zinc-400">Próximo directorio</p>
            <code className="mt-2 block text-lg font-bold text-violet-300">
              backend/agents/pedro/
            </code>
          </div>
        </div>
      </section>
    </main>
  );
}
