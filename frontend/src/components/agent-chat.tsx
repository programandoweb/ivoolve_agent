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
  messageCount: number;
};

type AgentError = {
  sessionId?: string;
  message?: string;
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
  // useRef guarda la instancia real del socket sin provocar renders.
  const socketRef = useRef<Socket | null>(null);

  // Referencia al contenedor desplazable del historial del chat.
  // Nos permite llevar el scroll al último mensaje cada vez que cambia el contenido.
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [health, setHealth] = useState<Health | null>(null);
  const [agents, setAgents] = useState<string[]>([]);
  const [fallback, setFallback] = useState("jorge");
  const [sessionId, setSessionId] = useState("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hola. Soy Jorge. Este chat ahora mantiene un hilo Socket.IO abierto con NestJS."
    }
  ]);

  useEffect(() => {
    const currentSessionId = getOrCreateSessionId();
    setSessionId(currentSessionId);

    // El navegador abre UNA conexión persistente con NestJS.
    // Ya no hacemos un POST HTTP por cada mensaje.
    const socket = io(
      `${process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:5020"}/agents`,
      {
        transports: ["websocket"],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000
      }
    );

    socketRef.current = socket;

    socket.on("connect", () => {
      setSocketConnected(true);
    });

    socket.on("disconnect", () => {
      setSocketConnected(false);
      setSending(false);
    });

    socket.on("agent:processing", () => {
      setSending(true);
    });

    socket.on("agent:response", (data: ChatResponse) => {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.answer
        }
      ]);
      setSending(false);
    });

    socket.on("agent:error", (error: AgentError) => {
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
      // Health y catálogo siguen siendo lecturas HTTP auxiliares.
      // La conversación ya no pasa por estas rutas.
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
      // Muy importante: al desmontar el componente cerramos los listeners
      // y la conexión para no crear sockets duplicados.
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const agentLabel = useMemo(() => {
    return agents.length > 0 ? agents.join(", ") : fallback;
  }, [agents, fallback]);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    // Esperamos al siguiente frame para asegurarnos de que React ya pintó
    // el mensaje nuevo o el indicador de "procesando".
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

    if (!message || !sessionId || sending || !socket?.connected) {
      return;
    }

    setInput("");
    setSending(true);
    setMessages((current) => [...current, { role: "user", content: message }]);

    // Este emit reemplaza completamente al antiguo fetch POST /agents/chat.
    socket.emit("agent:message", {
      sessionId,
      message
    });
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
    <div className="overflow-hidden rounded-[32px] border border-zinc-200/80 bg-white shadow-soft">
      <div className="border-b border-zinc-100 px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-zinc-950">Jorge</p>
              <p className="text-sm text-zinc-500">
                Orquestador · hilo Socket.IO
              </p>
            </div>
          </div>

          <StatusPill online={socketConnected} />
        </div>
      </div>

      <div className="grid gap-3 border-b border-zinc-100 bg-zinc-50/70 p-4 sm:grid-cols-4 sm:p-6">
        <InfoCard
          icon={<Unplug className="h-4 w-4" />}
          label="Socket"
          value={socketConnected ? "Conectado" : "Desconectado"}
        />
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

      <div
        ref={messagesContainerRef}
        className="h-[430px] space-y-4 overflow-y-auto px-4 py-6 sm:px-6"
      >
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
              Jorge está procesando el evento del socket...
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
            onKeyDown={handleComposerKeyDown}
            placeholder={
              socketConnected
                ? "Escribe una tarea para Jorge..."
                : "Esperando conexión Socket.IO..."
            }
            rows={2}
            className="max-h-36 min-h-12 flex-1 resize-none bg-transparent py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          />
          <button
            type="submit"
            disabled={!socketConnected || sending || !input.trim()}
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
