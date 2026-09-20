"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  Send,
  Server,
  Sparkles
} from "lucide-react";
import { StatusPill } from "./status-pill";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Health = {
  status?: string;
  redis?: string;
};

type AgentsResponse = {
  agents?: string[];
  fallback?: string;
};

type ChatResponse = {
  sessionId: string;
  agent: string;
  answer: string;
  messageCount: number;
};

function getOrCreateSessionId(): string {
  const storageKey = "ivoolve-agent-session";
  const existing = window.localStorage.getItem(storageKey);

  if (existing) {
    return existing;
  }

  const created = crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);

  return created;
}

export function AgentChat() {
  const [health, setHealth] = useState<Health | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [fallback, setFallback] = useState("jorge");
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola. Soy Jorge, el agente orquestador. Pregúntame algo y observa cómo Next.js, NestJS, Redis y el LLM participan en el ciclo."
    }
  ]);

  const online = health?.status === "ok";

  useEffect(() => {
    setSessionId(getOrCreateSessionId());

    async function loadRuntimeState() {
      const [healthResponse, agentsResponse] = await Promise.allSettled([
        fetch("/api/backend/health", { cache: "no-store" }),
        fetch("/api/backend/agents", { cache: "no-store" })
      ]);

      if (healthResponse.status === "fulfilled") {
        const data = (await healthResponse.value.json()) as Health;
        setHealth(data);
      } else {
        setHealth({ status: "offline" });
      }

      if (agentsResponse.status === "fulfilled") {
        const data = (await agentsResponse.value.json()) as AgentsResponse;
        setAgents(data.agents ?? []);
        setFallback(data.fallback ?? "jorge");
      }
    }

    void loadRuntimeState();
  }, []);

  const agentLabel = useMemo(() => {
    if (agents.length === 0) {
      return fallback;
    }

    return agents.join(", ");
  }, [agents, fallback]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();

    if (!message || !sessionId || sending) {
      return;
    }

    setInput("");
    setSending(true);
    setMessages((current) => [...current, { role: "user", content: message }]);

    try {
      const response = await fetch("/api/backend/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message
        })
      });

      const data = (await response.json()) as Partial<ChatResponse> & {
        message?: string;
      };

      if (!response.ok || !data.answer) {
        throw new Error(data.message ?? "El backend no respondió correctamente.");
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer as string
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? `No pude completar la petición: ${error.message}`
              : "No pude completar la petición."
        }
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-[32px] border border-zinc-200/80 bg-white shadow-soft">
      <div className="border-b border-zinc-100 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-zinc-950">Jorge</p>
              <p className="text-sm text-zinc-500">Orquestador y fallback</p>
            </div>
          </div>

          <StatusPill online={online} />
        </div>
      </div>

      <div className="grid gap-3 border-b border-zinc-100 bg-zinc-50/70 p-4 sm:grid-cols-3 sm:p-6">
        <InfoCard
          icon={<Server className="h-4 w-4" />}
          label="Redis"
          value={health?.redis === "PONG" ? "Conectado" : "Pendiente"}
        />
        <InfoCard
          icon={<BrainCircuit className="h-4 w-4" />}
          label="Agentes"
          value={agentLabel}
        />
        <InfoCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Sesión"
          value={sessionId ? sessionId.slice(0, 8) : "Creando..."}
        />
      </div>

      <div className="h-[430px] space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] rounded-3xl rounded-br-lg bg-zinc-950 px-4 py-3 text-sm leading-6 text-white"
                  : "max-w-[88%] rounded-3xl rounded-bl-lg bg-violet-50 px-4 py-3 text-sm leading-6 text-zinc-800"
              }
            >
              {message.content}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-3xl rounded-bl-lg bg-violet-50 px-4 py-3 text-sm text-violet-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              Jorge está procesando el ciclo...
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="border-t border-zinc-100 bg-white p-4 sm:p-6"
      >
        <div className="flex items-end gap-3 rounded-3xl border border-zinc-200 bg-zinc-50 p-2 pl-4 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribe una tarea para Jorge..."
            rows={2}
            className="max-h-36 min-h-12 flex-1 resize-none bg-transparent py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={!online || sending || !input.trim()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            aria-label="Enviar mensaje"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          El historial operativo de esta sesión se conserva en Redis.
        </p>
      </form>
    </div>
  );
}

function InfoCard({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
        {icon}
        {label}
      </div>
      <p className="truncate text-sm font-semibold capitalize text-zinc-900">
        {value}
      </p>
    </div>
  );
}
