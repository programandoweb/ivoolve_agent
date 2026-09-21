import { authenticatedBackendFetch } from "@/lib/backend";
import { ProvidersManager } from "@/components/providers-manager";

type UserRole = "admin" | "operator" | "viewer";

export default async function ProvidersPage() {
  const response = await authenticatedBackendFetch("/auth/me");
  const data = response.ok
    ? ((await response.json()) as { user?: { role?: UserRole } })
    : {};

  return <ProvidersManager role={data.user?.role ?? "viewer"} />;
}
