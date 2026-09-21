import Link from "next/link";
import {
  Bot,
  Gauge,
  MessageSquareText,
  Network,
  PlugZap,
  ShieldCheck
} from "lucide-react";
import { LogoutButton } from "./logout-button";

const items = [
  { href: "/dashboard", label: "Resumen", icon: Gauge },
  { href: "/dashboard/agents", label: "Agentes", icon: Bot },
  { href: "/dashboard/providers", label: "Providers", icon: PlugZap },
  { href: "/dashboard/chat", label: "Conversación", icon: MessageSquareText },
  { href: "/dashboard/runtime", label: "Runtime", icon: Network },
  { href: "/dashboard/security", label: "Seguridad", icon: ShieldCheck }
];

export function DashboardSidebar() {
  return (
    <aside className="flex min-h-screen w-64 flex-col border-r border-zinc-200 bg-white p-4">
      <div className="mb-8 flex items-center gap-3 px-2 py-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-600 font-black text-white">
          i
        </div>
        <div>
          <p className="font-black tracking-tight text-zinc-950">Ivoolve Agent</p>
          <p className="text-xs text-zinc-500">Control Center</p>
        </div>
      </div>

      <nav className="space-y-1">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-zinc-600 transition hover:bg-violet-50 hover:text-violet-700"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t border-zinc-100 pt-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
