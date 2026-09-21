"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  Bot,
  CheckCircle2,
  CircleOff,
  Loader2,
  MessageCircleMore,
  Pencil,
  PlugZap,
  Plus,
  QrCode,
  RefreshCw,
  Trash2,
  X
} from "lucide-react";

type ProviderStatus =
  | "disconnected"
  | "connecting"
  | "qr_pending"
  | "connected"
  | "error";

type Provider = {
  id: string;
  name: string;
  type: "whatsapp_baileys";
  status: ProviderStatus;
  agentIds: string[];
  autoConnect: boolean;
  phoneNumber?: string;
  displayName?: string;
  lastConnectedAt?: string;
  lastMessageAt?: string;
  lastError?: string;
  qrDataUrl?: string;
};

type Agent = {
  id: string;
  name?: string;
  role?: string;
};

type FormState = {
  name: string;
  agentIds: string[];
  autoConnect: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  agentIds: [],
  autoConnect: true
};

export function ProvidersManager({
  role
}: {
  role: "admin" | "operator" | "viewer";
}) {
  const canMutate = role === "admin" || role === "operator";
  const canDelete = role === "admin";
  const [providers, setProviders] = useState<Provider[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Provider | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [connection, setConnection] = useState<Provider | null>(null);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [providersResponse, agentsResponse] = await Promise.all([
      fetch("/api/backend/providers", { cache: "no-store" }),
      fetch("/api/backend/agents", { cache: "no-store" })
    ]);

    const providersData = providersResponse.ok
      ? ((await providersResponse.json()) as Provider[])
      : [];
    const agentsData = agentsResponse.ok
      ? ((await agentsResponse.json()) as { details?: Agent[] })
      : { details: [] };

    setProviders(providersData);
    setAgents(agentsData.details ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!connectionId) return;

    let cancelled = false;

    async function refreshConnection() {
      const response = await fetch(
        `/api/backend/providers/${connectionId}/connection`,
        { cache: "no-store" }
      );

      if (!response.ok || cancelled) return;

      const data = (await response.json()) as Provider;
      setConnection(data);
      setProviders((current) =>
        current.map((item) => (item.id === data.id ? data : item))
      );
    }

    void refreshConnection();
    const timer = window.setInterval(() => void refreshConnection(), 1500);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [connectionId]);

  const assignedAgentNames = useMemo(() => {
    return new Map(
      agents.map((agent) => [agent.id, agent.name ?? agent.id])
    );
  }, [agents]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setDrawerOpen(true);
  }

  function openEdit(provider: Provider) {
    setEditing(provider);
    setForm({
      name: provider.name,
      agentIds: provider.agentIds,
      autoConnect: provider.autoConnect
    });
    setError("");
    setDrawerOpen(true);
  }

  function toggleAgent(agentId: string) {
    setForm((current) => ({
      ...current,
      agentIds: current.agentIds.includes(agentId)
        ? current.agentIds.filter((id) => id !== agentId)
        : [...current.agentIds, agentId]
    }));
  }

  async function saveProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        editing
          ? `/api/backend/providers/${editing.id}`
          : "/api/backend/providers",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            ...(editing ? {} : { type: "whatsapp_baileys" }),
            agentIds: form.agentIds,
            autoConnect: form.autoConnect
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(". ")
            : data.message ?? "No fue posible guardar el provider."
        );
      }

      setDrawerOpen(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No fue posible guardar."
      );
    } finally {
      setSaving(false);
    }
  }

  async function connectProvider(provider: Provider) {
    setConnectionBusy(true);
    setConnection(provider);
    setConnectionId(provider.id);

    try {
      const response = await fetch(
        `/api/backend/providers/${provider.id}/connect`,
        { method: "POST" }
      );

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message ?? "No fue posible conectar el provider.");
      }

      setConnection(data);
      await load();
    } catch (cause) {
      setConnection((current) =>
        current
          ? {
              ...current,
              status: "error",
              lastError:
                cause instanceof Error
                  ? cause.message
                  : "Error iniciando la conexión."
            }
          : null
      );
    } finally {
      setConnectionBusy(false);
    }
  }

  async function disconnectProvider(provider: Provider) {
    setConnectionBusy(true);

    try {
      await fetch(`/api/backend/providers/${provider.id}/disconnect`, {
        method: "POST"
      });
      setConnectionId(null);
      setConnection(null);
      await load();
    } finally {
      setConnectionBusy(false);
    }
  }

  async function removeProvider(provider: Provider) {
    if (
      !window.confirm(
        `¿Eliminar "${provider.name}"? Se borrará también su sesión de WhatsApp y deberá escanearse nuevamente.`
      )
    ) {
      return;
    }

    await fetch(`/api/backend/providers/${provider.id}`, {
      method: "DELETE"
    });

    await load();
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
            Canales
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
            Providers
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 sm:text-base">
            Conecta cuentas externas y déjalas disponibles para los agentes.
            Hoy usamos WhatsApp vía Baileys; el dominio queda preparado para
            Slack, Telegram u otros adapters.
          </p>
        </div>

        {canMutate && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:bg-violet-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo provider
          </button>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <SummaryCard
          label="Providers"
          value={String(providers.length)}
          icon={<PlugZap className="h-5 w-5" />}
        />
        <SummaryCard
          label="Conectados"
          value={String(
            providers.filter((provider) => provider.status === "connected").length
          )}
          icon={<CheckCircle2 className="h-5 w-5" />}
        />
        <SummaryCard
          label="Agentes asignados"
          value={String(
            new Set(providers.flatMap((provider) => provider.agentIds)).size
          )}
          icon={<Bot className="h-5 w-5" />}
        />
      </div>

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando providers...
        </div>
      ) : providers.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <QrCode className="mx-auto h-10 w-10 text-violet-500" />
          <h2 className="mt-4 text-lg font-black text-zinc-950">
            Todavía no hay canales conectados
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Crea un provider WhatsApp, asígnalo a los agentes que podrán usarlo
            y escanea su QR.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {providers.map((provider) => (
            <article
              key={provider.id}
              className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <MessageCircleMore className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate font-black text-zinc-950">
                      {provider.name}
                    </h2>
                    <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      WhatsApp · Baileys
                    </p>
                  </div>
                </div>
                <StatusBadge status={provider.status} />
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <Row
                  label="Número"
                  value={
                    provider.phoneNumber
                      ? `+${provider.phoneNumber}`
                      : "Pendiente de vincular"
                  }
                />
                <Row
                  label="Cuenta"
                  value={provider.displayName ?? "Sin identificar"}
                />
                <Row
                  label="Auto conectar"
                  value={provider.autoConnect ? "Sí" : "No"}
                />
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
                  Agentes habilitados
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {provider.agentIds.length > 0 ? (
                    provider.agentIds.map((id) => (
                      <span
                        key={id}
                        className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700"
                      >
                        {assignedAgentNames.get(id) ?? id}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-zinc-400">
                      Ninguno asignado
                    </span>
                  )}
                </div>
              </div>

              {provider.lastError && (
                <p className="mt-4 rounded-2xl bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700">
                  {provider.lastError}
                </p>
              )}

              {canMutate && (
                <div className="mt-5 flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                  {provider.status === "connected" ? (
                    <button
                      type="button"
                      onClick={() => void disconnectProvider(provider)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 px-3 py-2.5 text-xs font-bold text-white"
                    >
                      <CircleOff className="h-4 w-4" />
                      Desconectar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void connectProvider(provider)}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white"
                    >
                      <QrCode className="h-4 w-4" />
                      Conectar / QR
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openEdit(provider)}
                    className="rounded-xl border border-zinc-200 p-2.5 text-zinc-600 transition hover:bg-zinc-50"
                    aria-label="Editar provider"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void removeProvider(provider)}
                      className="rounded-xl border border-rose-100 p-2.5 text-rose-600 transition hover:bg-rose-50"
                      aria-label="Eliminar provider"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-zinc-950/30 backdrop-blur-sm">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cerrar"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
                  Provider
                </p>
                <h2 className="mt-1 text-xl font-black text-zinc-950">
                  {editing ? "Editar provider" : "Nuevo provider"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={saveProvider}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-700">
                    Nombre
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value
                      }))
                    }
                    placeholder="Ej. WhatsApp Ventas Pereira"
                    className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-zinc-700">
                    Tipo
                  </label>
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
                    WhatsApp · Baileys
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-bold text-zinc-700">
                    Agentes que pueden usarlo
                  </p>
                  <div className="space-y-2">
                    {agents.map((agent) => (
                      <label
                        key={agent.id}
                        className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 px-4 py-3 transition hover:bg-zinc-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.agentIds.includes(agent.id)}
                          onChange={() => toggleAgent(agent.id)}
                          className="h-4 w-4 accent-violet-600"
                        />
                        <div>
                          <p className="text-sm font-bold text-zinc-900">
                            {agent.name ?? agent.id}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {agent.role ?? agent.id}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl bg-zinc-50 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form.autoConnect}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        autoConnect: event.target.checked
                      }))
                    }
                    className="mt-1 h-4 w-4 accent-violet-600"
                  />
                  <span>
                    <span className="block text-sm font-bold text-zinc-800">
                      Reconectar automáticamente
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      Si ya existe una sesión válida, NestJS volverá a levantar
                      el socket al reiniciar.
                    </span>
                  </span>
                </label>

                {error && (
                  <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </p>
                )}
              </div>

              <div className="border-t border-zinc-100 p-4">
                <button
                  type="submit"
                  disabled={saving || form.name.trim().length < 2}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-bold text-white transition hover:bg-violet-700 disabled:bg-zinc-300"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editing ? "Guardar cambios" : "Crear provider"}
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}

      {connectionId && connection && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-zinc-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[30px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">
                  WhatsApp · Baileys
                </p>
                <h2 className="mt-1 text-xl font-black text-zinc-950">
                  {connection.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setConnectionId(null);
                  setConnection(null);
                }}
                className="rounded-xl p-2 text-zinc-500 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 text-center">
              {connection.status === "connected" ? (
                <>
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-zinc-950">
                    WhatsApp conectado
                  </h3>
                  <p className="mt-2 text-sm text-zinc-500">
                    {connection.phoneNumber
                      ? `+${connection.phoneNumber}`
                      : "Sesión lista para usar"}
                  </p>
                </>
              ) : connection.qrDataUrl ? (
                <>
                  <div className="mx-auto w-fit rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm">
                    <img
                      src={connection.qrDataUrl}
                      alt="QR para vincular WhatsApp"
                      className="h-64 w-64"
                    />
                  </div>
                  <h3 className="mt-4 font-black text-zinc-950">
                    Escanea este QR
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-zinc-500">
                    WhatsApp → Dispositivos vinculados → Vincular dispositivo.
                    El QR se actualiza automáticamente si Baileys genera uno nuevo.
                  </p>
                </>
              ) : connection.status === "error" ? (
                <>
                  <CircleOff className="mx-auto h-12 w-12 text-rose-500" />
                  <p className="mt-4 text-sm leading-6 text-rose-700">
                    {connection.lastError ?? "No fue posible conectar."}
                  </p>
                </>
              ) : (
                <>
                  <Loader2 className="mx-auto h-10 w-10 animate-spin text-violet-600" />
                  <p className="mt-4 text-sm text-zinc-500">
                    Preparando sesión y QR...
                  </p>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => void connectProvider(connection)}
                disabled={connectionBusy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-zinc-200 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${connectionBusy ? "animate-spin" : ""}`}
                />
                Reintentar
              </button>
              {connection.status === "connected" && (
                <button
                  type="button"
                  onClick={() => void disconnectProvider(connection)}
                  disabled={connectionBusy}
                  className="flex-1 rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white"
                >
                  Desconectar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-zinc-400">
          {label}
        </p>
        <span className="text-violet-600">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-zinc-400">{label}</span>
      <span className="truncate font-semibold text-zinc-800">{value}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: ProviderStatus }) {
  const map: Record<ProviderStatus, { label: string; className: string }> = {
    connected: {
      label: "Conectado",
      className: "bg-emerald-50 text-emerald-700"
    },
    connecting: {
      label: "Conectando",
      className: "bg-amber-50 text-amber-700"
    },
    qr_pending: {
      label: "Esperando QR",
      className: "bg-violet-50 text-violet-700"
    },
    disconnected: {
      label: "Desconectado",
      className: "bg-zinc-100 text-zinc-600"
    },
    error: {
      label: "Error",
      className: "bg-rose-50 text-rose-700"
    }
  };

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${map[status].className}`}
    >
      {map[status].label}
    </span>
  );
}
