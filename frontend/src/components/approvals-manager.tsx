"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
  XCircle
} from "lucide-react";

type Approval = {
  id: string;
  tenantId: string;
  agentId: string;
  actionName: string;
  payload: Record<string, unknown>;
  status: "pending" | "processing" | "approved" | "rejected";
  requestedBy?: string;
  decidedBy?: string;
  decisionNote?: string;
  createdAt: string;
  decidedAt?: string;
};

export function ApprovalsManager() {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/backend/approvals", {
      cache: "no-store"
    });
    const data = response.ok ? ((await response.json()) as Approval[]) : [];
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, action: "approve" | "reject") {
    const note =
      window.prompt(
        action === "approve"
          ? "Nota opcional de aprobación"
          : "Motivo opcional del rechazo"
      ) ?? "";

    setBusy(id);
    setError("");

    try {
      const response = await fetch(
        `/api/backend/approvals/${id}/${action}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: note || undefined })
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "No fue posible procesar la aprobación.");
      }

      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No fue posible procesar."
      );
    } finally {
      setBusy(null);
    }
  }

  const pending = items.filter((item) => item.status === "pending").length;

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
        Control humano
      </p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-zinc-950">Aprobaciones</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
            Revisa acciones sensibles solicitadas por los agentes antes de que
            el runtime las ejecute.
          </p>
        </div>
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          {pending} pendientes
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando aprobaciones...
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-emerald-600" />
          <h2 className="mt-4 font-black text-zinc-950">
            No hay decisiones pendientes
          </h2>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-3xl border border-zinc-200 bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Status status={item.status} />
                    <span className="text-xs text-zinc-400">
                      {new Date(item.createdAt).toLocaleString("es-CO")}
                    </span>
                  </div>
                  <h2 className="mt-3 font-black text-zinc-950">
                    {item.actionName}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Agente: <strong>{item.agentId}</strong>
                    {item.requestedBy ? ` · Solicitado por ${item.requestedBy}` : ""}
                  </p>
                </div>

                {item.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => void decide(item.id, "reject")}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Rechazar
                    </button>
                    <button
                      type="button"
                      disabled={busy === item.id}
                      onClick={() => void decide(item.id, "approve")}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === item.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      Aprobar
                    </button>
                  </div>
                )}
              </div>

              <pre className="mt-4 overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-xs leading-5 text-zinc-200">
                {JSON.stringify(item.payload, null, 2)}
              </pre>

              {item.decisionNote && (
                <p className="mt-3 text-sm text-zinc-500">
                  Nota: {item.decisionNote}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Status({ status }: { status: Approval["status"] }) {
  const config = {
    pending: ["Pendiente", "bg-amber-50 text-amber-700"],
    processing: ["Procesando", "bg-violet-50 text-violet-700"],
    approved: ["Aprobada", "bg-emerald-50 text-emerald-700"],
    rejected: ["Rechazada", "bg-rose-50 text-rose-700"]
  } as const;

  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold " +
        config[status][1]
      }
    >
      {status === "pending" && <Clock3 className="h-3.5 w-3.5" />}
      {config[status][0]}
    </span>
  );
}
