"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Loader2,
  MessageSquarePlus,
  Send,
  Server,
  Sparkles,
  Unplug
} from "lucide-react";
import { io, Socket } from "socket.io-client";
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
};

type AgentError = {
  sessionId?: string;
  message?: string;
};

type AgentHistory = {
  sessionId?: string;
  agentId?: string;
  messages?: ChatMessage[];
  error?: string;
};

type AgentChatProps = {
  mode?: "chat" | "builder";
  agentId?: string;
  contained?: boolean;
};

function sessionStorageKey(
  mode: "chat" | "builder",
  agentId?: string,
): string {
  return mode === "builder"
    ? "ivoolve-agent-builder-session"
    : agentId
      ? `ivoolve-agent-session:${agentId}`
      : "ivoolve-agent-session";
}

function getOrCreateSessionId(
  mode: "chat" | "builder",
  agentId?: string,
): string {
  const storageKey = sessionStorageKey(mode, agentId);
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const created = crypto.randomUUID();
  window.localStorage.setItem(storageKey, created);
  return created;
}

export function AgentChat({ mode = "chat", agentId, contained = false }: AgentChatProps) {
  const socketRef = useRef<Socket | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const isBuilder = mode === "builder";
  const eventPrefix = isBuilder ? "agent-builder" : "agent";

  const [health, setHealth] = useState<Health | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [fallback, setFallback] = useState("jorge");
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const initialMessage = useMemo<ChatMessage>(
    () => ({
      role: "assistant",
      content: isBuilder
        ? "Hola. Soy Jorge. Vamos a crear un agente conversando. Cuéntame primero qué agente necesitas y qué problema debe resolver."
        : agentId
          ? `Hola. Soy ${agentId}. Esta sesión se conserva hasta que inicies una nueva.`
          : "Hola. Soy Jorge. Esta sesión se conserva hasta que inicies una nueva."
    }),
    [agentId, isBuilder]
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const currentSessionId = getOrCreateSessionId(mode, agentId);
    setSessionId(currentSessionId);

    const socket = io(
      `${process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5020"}/agents`,
      {
        transports: ["websocket"],
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
      if (!isBuilder) {
        socket.emit("agent:history:request", {
          sessionId: currentSessionId,
          agentId
        });
      }
    });
    socket.on("disconnect", () => {
      setSocketConnected(false);
      setSending(false);
    });

    socket.on(`${eventPrefix}:processing`, () => setSending(true));

    if (!isBuilder) {
      socket.on("agent:history", (history: AgentHistory) => {
        if (history.sessionId !== currentSessionId) return;
        setMessages(
          history.messages && history.messages.length > 0
            ? history.messages
            : [initialMessage]
        );
      });
    } else {
      setMessages([initialMessage]);
    }

    socket.on(`${eventPrefix}:response`, (data: ChatResponse) => {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer }
      ]);
      setSending(false);
    });

    socket.on(`${eventPrefix}:error`, (error: AgentError) => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `No pude completar la petición: ${error.message ?? "Error del agente."}`
        }
      ]);
      setSending(false);
    });

    async function loadAuxiliaryState() {
      const [healthResponse, agentsResponse] = await Promise.allSettled([
        fetch("/api/backend/health", { cache: "no-store" }),
        fetch("/api/backend/agents", { cache: "no-store" })
      ]);

      if (healthResponse.status === "fulfilled") {
        setHealth((await healthResponse.value.json()) as Health);
      }

      if (agentsResponse.status === "fulfilled") {
        const data = (await agentsResponse.value.json()) as AgentsResponse;
        setAgents(data.agents ?? []);
        setFallback(data.fallback ?? "jorge");
      }
    }

    void loadAuxiliaryState();

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [agentId, eventPrefix, initialMessage, isBuilder, mode]);

  // Argos template library prepares a DRAFT only. The user can edit it and
  // must manually press Enter or click Send; selecting never executes a task.
  useEffect(() => {
    if (agentId !== 'argos-prospector' || mode !== 'chat') return;
    const receiveDraft = (event: Event) => {
      const value = (event as CustomEvent<{ text?: string }>).detail?.text;
      if (typeof value !== 'string' || !value.trim()) return;
      if (sending) return;
      setInput(value);
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        textarea?.focus();
        textarea?.setSelectionRange(0, 0);
      });
    };
    window.addEventListener('argos:template:draft', receiveDraft);
    return () => window.removeEventListener('argos:template:draft', receiveDraft);
  }, [agentId, mode, sending]);

  const agentLabel = useMemo(
    () => (agents.length > 0 ? agents.join(", ") : fallback),
    [agents, fallback]
  );

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth"
      });
    });
  }, [messages, sending]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const message = input.trim();
    const socket = socketRef.current;

    if (!message || !sessionId || sending || !socket?.connected) return;

    setInput("");
    setSending(true);
    setMessages((current) => [...current, { role: "user", content: message }]);

    socket.emit(`${eventPrefix}:message`, {
      sessionId,
      message,
      agentId
    });
  }

  function startNewSession() {
    if (sending) return;

    const created = crypto.randomUUID();
    window.localStorage.setItem(sessionStorageKey(mode, agentId), created);
    setSessionId(created);
    setInput("");
    setSending(false);
    setMessages([initialMessage]);
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div
      className={
        isBuilder || contained
          ? "flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-zinc-200/80 bg-white shadow-soft sm:rounded-[28px]"
          : "overflow-hidden rounded-[32px] border border-zinc-200/80 bg-white shadow-soft"
      }
    >
      <div className="shrink-0 border-b border-zinc-100 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-zinc-950">{agentId ?? "Jorge"}</p>
              <p className="truncate text-xs text-zinc-500 sm:text-sm">
                {isBuilder
                  ? "Agent Builder · creación guiada"
                  : "Orquestador · hilo Socket.IO"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isBuilder ? (
              <button
                type="button"
                onClick={startNewSession}
                disabled={sending}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:border-violet-300 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                title="Iniciar una nueva sesión"
                aria-label="Nueva sesión"
              >
                <MessageSquarePlus className="h-4 w-4" />
                <span className="hidden sm:inline">Nueva sesión</span>
              </button>
            ) : null}
            <StatusPill online={socketConnected} />
          </div>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-zinc-100 bg-zinc-50/70 p-2 sm:grid-cols-4 sm:gap-3 sm:p-3">
        <InfoCard
          icon={<Unplug className="h-3.5 w-3.5" />}
          label="Socket"
          value={socketConnected ? "Conectado" : "Desconectado"}
        />
        <InfoCard
          icon={<Server className="h-3.5 w-3.5" />}
          label="Redis"
          value={health?.redis === "PONG" ? "Conectado" : "Pendiente"}
        />
        <InfoCard
          icon={<BrainCircuit className="h-3.5 w-3.5" />}
          label="Agentes"
          value={agentLabel}
        />
        <InfoCard
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Sesión"
          value={sessionId ? sessionId.slice(0, 8) : "Creando..."}
        />
      </div>

      <div
        ref={messagesContainerRef}
        className={
          isBuilder || contained
            ? "min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4"
            : "h-[500px] space-y-4 overflow-y-auto px-4 py-6 sm:px-6"
        }
      >
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[88%] whitespace-pre-wrap break-words rounded-3xl rounded-br-lg bg-zinc-950 px-4 py-3 text-sm leading-6 text-white sm:max-w-[80%]"
                  : "max-w-[92%] whitespace-pre-wrap break-words rounded-3xl rounded-bl-lg bg-violet-50 px-4 py-3 text-sm leading-6 text-zinc-800 sm:max-w-[82%]"
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
              {isBuilder
                ? "Jorge está actualizando la definición del agente..."
                : "Jorge está procesando el evento del socket..."}
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={sendMessage}
        className="shrink-0 border-t border-zinc-100 bg-white p-2.5 sm:p-3"
      >
        <div className="flex items-end gap-2 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5 pl-3 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100 sm:rounded-3xl sm:p-2 sm:pl-4">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleComposerKeyDown}
            placeholder={
              socketConnected
                ? isBuilder
                  ? "Describe el agente o responde la pregunta de Jorge..."
                  : "Escribe una tarea para Jorge..."
                : "Esperando conexión Socket.IO..."
            }
            rows={1}
            className="max-h-28 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={!socketConnected || sending || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300 sm:rounded-2xl"
            aria-label="Enviar mensaje"
          >
            {sending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>

        <p className="mt-1.5 hidden items-center gap-2 px-1 text-[11px] text-zinc-500 sm:flex">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          Enter envía · Shift+Enter nueva línea · conversación por Socket.IO.
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
    <div className="min-w-0 rounded-xl border border-zinc-200 bg-white px-3 py-2 sm:rounded-2xl">
      <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400 sm:text-xs">
        {icon}
        {label}
      </div>
      <p className="truncate text-xs font-semibold capitalize text-zinc-900 sm:text-sm">
        {value}
      </p>
    </div>
  );
}
