import { redirect } from "next/navigation";
import { authenticatedBackendFetch } from "@/lib/backend";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

type UserRole = "admin" | "operator" | "viewer";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  let role: UserRole = "viewer";

  try {
    const response = await authenticatedBackendFetch("/auth/me");

    if (!response.ok) {
      redirect("/login");
    }

    const data = (await response.json()) as {
      user?: { role?: UserRole };
    };
    role = data.user?.role ?? "viewer";
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 lg:flex">
      <div className="hidden lg:block">
        <DashboardSidebar role={role} />
      </div>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
