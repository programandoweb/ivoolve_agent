import {
  Bot,
  Database,
  Network,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const cards = [
  {
    title: "Agentes",
    value: "1",
    detail: "Jorge activo como orquestador y fallback",
    icon: Bot,
    href: "/dashboard/agents"
  },
  {
    title: "Transporte",
    value: "Socket.IO",
    detail: "Canal persistente protegido",
    icon: Network,
    href: "/dashboard/chat"
  },
  {
    title: "Estado",
    value: "Redis",
    detail: "Memoria operativa de sesiones",
    icon: Database,
    href: "/dashboard/runtime"
  },
  {
    title: "Seguridad",
    value: "JWT",
    detail: "Cookie HttpOnly + bcrypt",
    icon: ShieldCheck,
    href: "/dashboard/security"
  }
];

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
            Control Center
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-zinc-950">
            Dashboard de agentes
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Supervisa agentes, transporte, memoria operativa y seguridad desde un
            único lugar.
          </p>
        </div>

        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white shadow-lg shadow-violet-200"
        >
          <Sparkles className="h-4 w-4" />
          Hablar con Jorge
        </Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ title, value, detail, icon: Icon, href }) => (
          <Link
            key={title}
            href={href}
            className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-zinc-500">{title}</p>
            <p className="mt-1 text-2xl font-black text-zinc-950">{value}</p>
            <p className="mt-2 text-sm leading-6 text-zinc-500">{detail}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-[30px] border border-zinc-200 bg-white p-7">
        <h2 className="text-xl font-black text-zinc-950">Arquitectura activa</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-5">
          {["Next.js", "Socket.IO", "NestJS", "Redis", "LLM"].map((item, index) => (
            <div
              key={item}
              className="rounded-2xl bg-zinc-50 px-4 py-4 text-center"
            >
              <p className="text-xs font-bold text-violet-600">{index + 1}</p>
              <p className="mt-1 font-bold text-zinc-900">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
