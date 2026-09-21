import { redirect } from "next/navigation";
import { authenticatedBackendFetch } from "@/lib/backend";
import { AccessManager } from "@/components/access-manager";

export default async function AccessPage() {
  const me = await authenticatedBackendFetch("/auth/me");

  if (!me.ok) redirect("/login");

  const data = (await me.json()) as {
    user?: { role?: string };
  };

  if (data.user?.role !== "admin") redirect("/dashboard");

  return <AccessManager />;
}
