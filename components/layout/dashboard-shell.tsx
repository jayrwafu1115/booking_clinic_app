import { getCurrentProfile } from "@/lib/auth/session";
import { getClinicPlanFeatures } from "@/server/queries/billing";
import { getRecentNotifications } from "@/server/queries/notifications";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export async function DashboardShell({ children }: { children: React.ReactNode }) {
  const [profile, notifications, planFeatures] = await Promise.all([
    getCurrentProfile(),
    getRecentNotifications(),
    getClinicPlanFeatures()
  ]);

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-y-0 left-0 hidden w-72 border-r border-border bg-white lg:block">
        <Sidebar role={profile?.role ?? null} aiEnabled={planFeatures.aiEnabled} />
      </div>
      <div className="lg:pl-72">
        <Topbar profile={profile} notifications={notifications} aiEnabled={planFeatures.aiEnabled} />
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
