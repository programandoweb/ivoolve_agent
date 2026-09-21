import { backendFetch } from "@/lib/backend";

export default async function RuntimePage() {
  const response = await backendFetch("/health");
  const health = response.ok ? await response.json() : null;

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
        Runtime
      </p>
      <h1 className="mt-2 text-3xl font-black text-zinc-950">
        Estado del sistema
      </h1>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <RuntimeCard label="NestJS" value={health?.status ?? "offline"} />
        <RuntimeCard label="Redis" value={health?.redis ?? "unknown"} />
        <RuntimeCard label="Socket" value="/agents" />
      </div>
    </div>
  );
}

function RuntimeCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6">
      <p className="text-sm font-semibold text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black capitalize text-zinc-950">
        {value}
      </p>
    </div>
  );
}
