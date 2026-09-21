import { redirect } from "next/navigation";
import { authenticatedBackendFetch } from "@/lib/backend";
import { ApprovalsManager } from "@/components/approvals-manager";

export default async function ApprovalsPage() {
  const me = await authenticatedBackendFetch("/auth/me");

  if (!me.ok) redirect("/login");

  const data = (await me.json()) as {
    user?: { role?: string };
  };

  if (data.user?.role !== "admin") redirect("/dashboard");

  return <ApprovalsManager />;
}
