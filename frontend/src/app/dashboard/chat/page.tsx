import { AgentChat } from "@/components/agent-chat";

export default function DashboardChatPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <div className="mb-6">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
          Conversación
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
          Canal con Jorge
        </h1>
      </div>
      <AgentChat />
    </div>
  );
}
