import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  // Super admins have no clinic_id and use /admin instead of the clinic dashboard
  if (profile?.role === "super_admin" && !profile?.clinic_id) {
    redirect("/admin");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
