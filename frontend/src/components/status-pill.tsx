import { Circle } from "lucide-react";

type Props = {
  online: boolean;
};

export function StatusPill({ online }: Props) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm">
      <Circle
        className={`h-2.5 w-2.5 fill-current ${online ? "text-emerald-500" : "text-rose-500"}`}
      />
      {online ? "Backend conectado" : "Backend sin conexión"}
    </div>
  );
}
