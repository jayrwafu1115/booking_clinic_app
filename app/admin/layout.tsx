import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role !== "super_admin" || profile.status !== "active") {
    redirect("/dashboard");
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <div className="hidden w-64 shrink-0 lg:block">
        <AdminSidebar />
      </div>
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
