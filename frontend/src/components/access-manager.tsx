"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Plus, UserCog, Users } from "lucide-react";

type Role = "admin" | "operator" | "viewer";
type Status = "active" | "disabled";

type User = {
  id: string;
  tenantId: string;
  username: string;
  role: Role;
  status: Status;
  createdAt: string;
};

export function AccessManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("viewer");

  const load = useCallback(async () => {
    const response = await fetch("/api/backend/admin/users", {
      cache: "no-store"
    });

    if (!response.ok) {
      setError("La gestión de accesos requiere MariaDB configurada.");
      setLoading(false);
      return;
    }

    setUsers((await response.json()) as User[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createUser(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/backend/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "No fue posible crear el usuario.");
      }

      setUsername("");
      setPassword("");
      setRole("viewer");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Error guardando.");
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(
    user: User,
    patch: Partial<Pick<User, "role" | "status">>
  ) {
    setError("");
    const response = await fetch(`/api/backend/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.message ?? "No fue posible actualizar el usuario.");
      return;
    }

    await load();
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">
        Seguridad
      </p>
      <h1 className="mt-2 text-3xl font-black text-zinc-950">
        Usuarios y roles
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600">
        Administra quién puede observar, operar providers o modificar el control
        center dentro de tu tenant.
      </p>

      {error && (
        <p className="mt-5 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white">
          <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
            <Users className="h-5 w-5 text-violet-600" />
            <h2 className="font-black text-zinc-950">
              Usuarios del tenant
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-400">
                  <tr>
                    <th className="px-5 py-3">Usuario</th>
                    <th className="px-5 py-3">Rol</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Alta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4 font-bold text-zinc-900">
                        {user.username}
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={user.role}
                          onChange={(event) =>
                            void updateUser(user, {
                              role: event.target.value as Role
                            })
                          }
                          className="rounded-xl border border-zinc-200 px-3 py-2"
                        >
                          <option value="admin">Admin</option>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            void updateUser(user, {
                              status:
                                user.status === "active"
                                  ? "disabled"
                                  : "active"
                            })
                          }
                          className={
                            user.status === "active"
                              ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                              : "rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-600"
                          }
                        >
                          {user.status === "active" ? "Activo" : "Deshabilitado"}
                        </button>
                      </td>
                      <td className="px-5 py-4 text-zinc-500">
                        {new Date(user.createdAt).toLocaleDateString("es-CO")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <form
          onSubmit={createUser}
          className="h-fit rounded-3xl border border-zinc-200 bg-white p-5"
        >
          <div className="flex items-center gap-3">
            <UserCog className="h-5 w-5 text-violet-600" />
            <h2 className="font-black text-zinc-950">Nuevo usuario</h2>
          </div>

          <div className="mt-5 space-y-4">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Usuario"
              minLength={3}
              required
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña temporal"
              minLength={8}
              required
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-violet-400"
            />
            <select
              value={role}
              onChange={(event) => setRole(event.target.value as Role)}
              className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm"
            >
              <option value="viewer">Viewer · solo lectura</option>
              <option value="operator">Operator · operación</option>
              <option value="admin">Admin · administración</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Crear usuario
          </button>
        </form>
      </div>
    </div>
  );
}
