"use client";

import { FormEvent, useState } from "react";
import { Bot, LockKeyhole, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "No fue posible iniciar sesión.");
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No fue posible iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-950 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center text-white">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 shadow-xl shadow-violet-950/40">
            <Bot className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Ivoolve Agent</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Consola privada de gestión multiagente
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-[30px] border border-white/10 bg-white p-7 shadow-2xl"
        >
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-violet-50 px-4 py-3 text-sm text-violet-800">
            <ShieldCheck className="h-5 w-5" />
            Acceso protegido mediante sesión segura.
          </div>

          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            Usuario
          </label>
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            className="mb-5 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none ring-violet-100 transition focus:border-violet-500 focus:ring-4"
          />

          <label className="mb-2 block text-sm font-semibold text-zinc-700">
            Contraseña
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-zinc-400" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="w-full rounded-2xl border border-zinc-200 py-3 pl-12 pr-4 outline-none ring-violet-100 transition focus:border-violet-500 focus:ring-4"
            />
          </div>

          {error && (
            <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !username.trim() || password.length < 8}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Entrar al dashboard
          </button>
        </form>
      </div>
    </main>
  );
}
