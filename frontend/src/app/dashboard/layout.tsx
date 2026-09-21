import { redirect } from "next/navigation";
import { authenticatedBackendFetch } from "@/lib/backend";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  try {
    const response = await authenticatedBackendFetch("/auth/me");

    if (!response.ok) {
      redirect("/login");
    }
  } catch {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50 lg:flex">
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
