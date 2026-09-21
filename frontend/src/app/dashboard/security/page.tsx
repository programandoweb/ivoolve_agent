import { ShieldCheck } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 lg:px-8 lg:py-10">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
        Seguridad
      </p>
      <h1 className="mt-2 text-3xl font-black text-zinc-950">
        Protección del panel
      </h1>

      <div className="mt-8 rounded-[30px] border border-zinc-200 bg-white p-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          <ShieldCheck className="h-6 w-6" />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[
            ["Contraseña", "Hash bcrypt, nunca texto plano"],
            ["Sesión", "JWT con expiración"],
            ["Cookie", "HttpOnly + SameSite=Lax"],
            ["Socket.IO", "Handshake autenticado"],
            ["REST protegido", "Bearer token desde BFF"],
            ["Secretos", "Solo en backend/.env"]
          ].map(([title, detail]) => (
            <div key={title} className="rounded-2xl bg-zinc-50 p-4">
              <p className="font-bold text-zinc-950">{title}</p>
              <p className="mt-1 text-sm text-zinc-500">{detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
